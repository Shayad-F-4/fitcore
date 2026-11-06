import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { Attendance } from '../models/Attendance.js';
import { Member } from '../models/Member.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Helper: Get today's calendar date in Asia/Kolkata (IST: UTC+5:30) as 'YYYY-MM-DD'
export const getTodayISTString = (): string => {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().split('T')[0];
};

// 1. GET /api/attendance/today - Get today's stats, attendance list, and unmarked active members
router.get('/today', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const today = getTodayISTString();

    // Fetch all active members in gym
    const activeMembers = await Member.find({
      status: { $in: ['ACTIVE', 'EXPIRING'] },
      isArchived: { $ne: true },
    })
      .select('fullName phone memberId photoUrl status')
      .sort({ fullName: 1 })
      .lean();

    // Fetch all today's attendance records
    const records = await Attendance.find({ date: today })
      .populate('member', 'fullName phone memberId photoUrl status')
      .populate('recordedBy', 'fullName email role')
      .sort({ checkInTime: -1 })
      .lean();

    const markedMemberIdSet = new Set(records.map((r: any) => r.member?._id?.toString()).filter(Boolean));

    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;
    const totalActiveMembers = activeMembers.length;
    const unmarkedMembers = activeMembers.filter((m) => !markedMemberIdSet.has(m._id.toString()));
    const unmarkedCount = unmarkedMembers.length;
    const attendanceRate = totalActiveMembers > 0 ? Math.round((presentCount / totalActiveMembers) * 100) : 0;

    sendSuccess(res, "Today's attendance retrieved successfully", {
      date: today,
      stats: {
        presentCount,
        absentCount,
        unmarkedCount,
        totalActiveMembers,
        attendanceRate,
      },
      records,
      unmarkedMembers,
    });
  } catch (error: any) {
    sendError(res, error.message || "Failed to retrieve today's attendance", 500);
  }
});

// 1b. GET /api/attendance/roster - Get daily attendance roster combining all active members with their status
router.get('/roster', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetDate = (req.query.date as string) || getTodayISTString();
    const search = (req.query.search as string || '').trim();

    const memberQuery: any = {
      status: { $in: ['ACTIVE', 'EXPIRING'] },
      isArchived: { $ne: true },
    };

    if (search) {
      memberQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
      ];
    }

    const [activeMembers, allActiveCount, dateRecords] = await Promise.all([
      Member.find(memberQuery)
        .select('fullName phone memberId photoUrl status')
        .sort({ fullName: 1 })
        .lean(),
      Member.countDocuments({
        status: { $in: ['ACTIVE', 'EXPIRING'] },
        isArchived: { $ne: true },
      }),
      Attendance.find({ date: targetDate })
        .populate('recordedBy', 'fullName email')
        .lean(),
    ]);

    const attMap: Record<string, any> = {};
    for (const r of dateRecords) {
      if (r.member) {
        attMap[r.member.toString()] = r;
      }
    }

    const roster = activeMembers.map((m) => {
      const att = attMap[m._id.toString()] || null;
      return {
        _id: m._id,
        memberId: m.memberId,
        fullName: m.fullName,
        phone: m.phone,
        photoUrl: m.photoUrl,
        status: m.status,
        attendance: att
          ? {
              _id: att._id,
              status: att.status,
              checkInTime: att.checkInTime,
              checkOutTime: att.checkOutTime,
              notes: att.notes || '',
              method: att.method || 'MANUAL',
            }
          : null,
      };
    });

    const presentCount = dateRecords.filter((r) => r.status === 'PRESENT').length;
    const absentCount = dateRecords.filter((r) => r.status === 'ABSENT').length;
    const unmarkedCount = Math.max(0, allActiveCount - (presentCount + absentCount));
    const attendanceRate = allActiveCount > 0 ? Math.round((presentCount / allActiveCount) * 100) : 0;

    sendSuccess(res, 'Daily roster retrieved successfully', {
      date: targetDate,
      stats: {
        presentCount,
        absentCount,
        unmarkedCount,
        totalActiveMembers: allActiveCount,
        attendanceRate,
      },
      roster,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve roster', 500);
  }
});

// 1c. POST /api/attendance/quick-mark - 1-Click Toggle/Upsert or Clear attendance for clean UX
router.post('/quick-mark', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, date, status, notes } = req.body;

    if (!memberId) {
      sendError(res, 'Member ID is required', 400);
      return;
    }

    const member = await Member.findById(memberId).select('fullName memberId');
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const targetDate = (date as string) || getTodayISTString();

    // If status is 'CLEAR', remove attendance record
    if (status === 'CLEAR') {
      const existing = await Attendance.findOneAndDelete({ member: memberId, date: targetDate });
      if (existing) {
        await recordAuditLog({
          userId: req.user?.userId,
          userName: req.user?.email,
          userRole: req.user?.role,
          action: 'ATTENDANCE_DELETED',
          entity: 'Attendance',
          entityId: existing._id.toString(),
          details: { member: member.fullName, date: targetDate, reason: 'Quick roster reset' },
        });
      }
      sendSuccess(res, `Attendance cleared for ${member.fullName}`, { cleared: true, memberId, date: targetDate });
      return;
    }

    const attStatus = status === 'ABSENT' ? 'ABSENT' : 'PRESENT';

    // Find existing or create new
    let record = await Attendance.findOne({ member: memberId, date: targetDate });

    if (record) {
      record.status = attStatus;
      if (attStatus === 'PRESENT' && !record.checkInTime) {
        record.checkInTime = new Date();
      }
      if (notes !== undefined) {
        record.notes = notes;
      }
      record.recordedBy = req.user?.userId as any;
      await record.save();

      await recordAuditLog({
        userId: req.user?.userId,
        userName: req.user?.email,
        userRole: req.user?.role,
        action: 'ATTENDANCE_UPDATED',
        entity: 'Attendance',
        entityId: record._id.toString(),
        details: { member: member.fullName, date: targetDate, status: attStatus },
      });
    } else {
      record = await Attendance.create({
        member: memberId,
        date: targetDate,
        status: attStatus,
        checkInTime: new Date(),
        notes: notes || '',
        method: 'MANUAL',
        recordedBy: req.user?.userId,
      });

      await recordAuditLog({
        userId: req.user?.userId,
        userName: req.user?.email,
        userRole: req.user?.role,
        action: 'ATTENDANCE_MARKED',
        entity: 'Attendance',
        entityId: record._id.toString(),
        details: { member: member.fullName, date: targetDate, status: attStatus },
      });
    }

    sendSuccess(res, `Marked ${attStatus} for ${member.fullName}`, record);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update attendance', 500);
  }
});

// 2. GET /api/attendance/reports - Daily breakdown and member-wise monthly summary
router.get('/reports', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = getTodayISTString();
    const monthParam = (req.query.month as string) || today.slice(0, 7); // e.g. "2026-11"

    // Match all attendance records for the selected month prefix 'YYYY-MM'
    const monthRecords = await Attendance.find({
      date: { $regex: `^${monthParam}` },
    })
      .populate('member', 'fullName phone memberId')
      .sort({ date: 1 })
      .lean();

    // 1. Group by calendar date
    const dailyMap: Record<string, { date: string; present: number; absent: number; total: number }> = {};
    for (const r of monthRecords) {
      if (!dailyMap[r.date]) {
        dailyMap[r.date] = { date: r.date, present: 0, absent: 0, total: 0 };
      }
      if (r.status === 'PRESENT') dailyMap[r.date].present++;
      if (r.status === 'ABSENT') dailyMap[r.date].absent++;
      dailyMap[r.date].total++;
    }

    const dailySummary = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Group by member to compute attendance ranking
    const memberMap: Record<
      string,
      {
        memberId: string;
        code: string;
        name: string;
        phone: string;
        presentDays: number;
        absentDays: number;
        totalMarked: number;
      }
    > = {};

    for (const r of monthRecords) {
      const mem = r.member as any;
      if (!mem) continue;
      const id = mem._id?.toString();
      if (!id) continue;

      if (!memberMap[id]) {
        memberMap[id] = {
          memberId: id,
          code: mem.memberId || '',
          name: mem.fullName || 'Athlete',
          phone: mem.phone || '',
          presentDays: 0,
          absentDays: 0,
          totalMarked: 0,
        };
      }
      if (r.status === 'PRESENT') memberMap[id].presentDays++;
      if (r.status === 'ABSENT') memberMap[id].absentDays++;
      memberMap[id].totalMarked++;
    }

    const memberSummaries = Object.values(memberMap).sort((a, b) => b.presentDays - a.presentDays);

    const totalCheckIns = monthRecords.filter((r) => r.status === 'PRESENT').length;
    const activeDaysCount = dailySummary.length;
    const avgDailyCheckIns = activeDaysCount > 0 ? Math.round(totalCheckIns / activeDaysCount) : 0;

    sendSuccess(res, 'Attendance report generated successfully', {
      month: monthParam,
      totalCheckIns,
      activeDaysCount,
      avgDailyCheckIns,
      dailySummary,
      memberSummaries,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate attendance report', 500);
  }
});

// 3. GET /api/attendance - List historical records with search, date range, status, and pagination
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, startDate, endDate, status, search, memberId } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));

    const query: any = {};

    // Specific date or date range filter
    if (date) {
      query.date = date as string;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate as string;
      if (endDate) query.date.$lte = endDate as string;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (memberId) {
      query.member = memberId;
    }

    // Search filter across member's name or phone
    if (search) {
      const matchingMembers = await Member.find({
        $or: [
          { fullName: { $regex: search as string, $options: 'i' } },
          { phone: { $regex: search as string, $options: 'i' } },
          { memberId: { $regex: search as string, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean();

      const memberIds = matchingMembers.map((m) => m._id);
      query.member = { $in: memberIds };
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate('member', 'fullName phone memberId photoUrl status')
      .populate('recordedBy', 'fullName email role')
      .sort({ date: -1, checkInTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    sendPaginated(res, records, total, page, limit, 'Attendance records retrieved');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve attendance records', 500);
  }
});

// 4. POST /api/attendance - Mark attendance (Present or Absent) with duplicate prevention
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, date, status, checkInTime, checkOutTime, notes, method } = req.body;

    if (!memberId) {
      sendError(res, 'Member ID is required', 400);
      return;
    }

    // Verify member exists
    const member = await Member.findById(memberId).select('fullName memberId');
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const targetDate = (date as string) || getTodayISTString();
    const attendanceStatus = status === 'ABSENT' ? 'ABSENT' : 'PRESENT';

    // Duplicate check: Prevent duplicate entry for same member on same date
    const existing = await Attendance.findOne({ member: memberId, date: targetDate });
    if (existing) {
      sendError(
        res,
        `Attendance already marked as ${existing.status} for ${member.fullName} on ${targetDate}. You can edit the existing record.`,
        409
      );
      return;
    }

    const record = await Attendance.create({
      member: memberId,
      date: targetDate,
      status: attendanceStatus,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
      notes: notes || '',
      method: method || 'MANUAL',
      recordedBy: req.user?.userId,
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'ATTENDANCE_MARKED',
      entity: 'Attendance',
      entityId: record._id.toString(),
      details: {
        member: `${member.fullName} (${member.memberId})`,
        date: targetDate,
        status: attendanceStatus,
      },
    });

    const populated = await Attendance.findById(record._id)
      .populate('member', 'fullName phone memberId photoUrl status')
      .populate('recordedBy', 'fullName email role');

    sendSuccess(res, `Attendance marked as ${attendanceStatus} for ${member.fullName}`, populated, 201);
  } catch (error: any) {
    if (error.code === 11000) {
      sendError(res, 'Duplicate entry: Attendance already recorded for this member on this date', 409);
      return;
    }
    sendError(res, error.message || 'Failed to mark attendance', 500);
  }
});

// 5. PUT /api/attendance/:id - Update status, times or notes
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, checkInTime, checkOutTime, notes } = req.body;

    const record = await Attendance.findById(req.params.id);
    if (!record) {
      sendError(res, 'Attendance record not found', 404);
      return;
    }

    if (status && ['PRESENT', 'ABSENT'].includes(status)) {
      record.status = status;
    }
    if (checkInTime) {
      record.checkInTime = new Date(checkInTime);
    }
    if (checkOutTime !== undefined) {
      record.checkOutTime = checkOutTime ? new Date(checkOutTime) : undefined;
    }
    if (notes !== undefined) {
      record.notes = notes;
    }

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'ATTENDANCE_UPDATED',
      entity: 'Attendance',
      entityId: record._id.toString(),
      details: { newStatus: record.status, notes: record.notes },
    });

    await record.save();

    const populated = await Attendance.findById(record._id)
      .populate('member', 'fullName phone memberId photoUrl status')
      .populate('recordedBy', 'fullName email role');

    sendSuccess(res, 'Attendance record updated successfully', populated);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update attendance record', 500);
  }
});

// 6. DELETE /api/attendance/:id - Remove attendance record
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) {
      sendError(res, 'Attendance record not found', 404);
      return;
    }

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'ATTENDANCE_DELETED',
      entity: 'Attendance',
      entityId: req.params.id,
      details: { date: record.date, status: record.status },
    });

    sendSuccess(res, 'Attendance record removed successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete attendance record', 500);
  }
});

export default router;

