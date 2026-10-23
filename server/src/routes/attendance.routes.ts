import { Router, Response } from 'express';
import { Attendance } from '../models/Attendance.js';
import { Member } from '../models/Member.js';
import { Membership } from '../models/Membership.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Get live members currently inside the facility
router.get('/live', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.query;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const filter: any = {
      checkInTime: { $gte: startOfToday },
      checkOutTime: null,
    };
    if (branchId) filter.branch = branchId;

    const liveLogs = await Attendance.find(filter)
      .populate('member', 'fullName memberId phone photoUrl status')
      .populate('branch', 'name code')
      .sort({ checkInTime: -1 });

    sendSuccess(res, 'Current gym occupancy', {
      count: liveLogs.length,
      occupants: liveLogs,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch live occupancy', 500);
  }
});

// Get today's or specific date's check-in log
router.get('/today', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId, date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const filter: any = {
      checkInTime: { $gte: startOfDay, $lte: endOfDay },
    };
    if (branchId) filter.branch = branchId;

    const logs = await Attendance.find(filter)
      .populate('member', 'fullName memberId email phone photoUrl status')
      .populate('branch', 'name code')
      .sort({ checkInTime: -1 });

    const formattedLogs = logs.map((log) => {
      const doc = log.toObject({ virtuals: true });
      let durationMinutes = doc.durationMinutes ?? null;
      if (durationMinutes === null && doc.checkInTime && doc.checkOutTime) {
        const diffMs = new Date(doc.checkOutTime).getTime() - new Date(doc.checkInTime).getTime();
        durationMinutes = Math.max(1, Math.round(diffMs / 60000));
      }
      return {
        ...doc,
        durationMinutes,
      };
    });

    sendSuccess(res, "Daily attendance log", formattedLogs);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch attendance log', 500);
  }
});

// Attendance hourly peak analysis
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.query;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const filter: any = {
      checkInTime: { $gte: startOfToday },
    };
    if (branchId) filter.branch = branchId;

    const logs = await Attendance.find(filter);

    // Group by hour 0-23
    const hourlyCounts: Record<number, number> = {};
    for (let i = 5; i <= 23; i++) {
      hourlyCounts[i] = 0;
    }

    logs.forEach((log) => {
      const hour = new Date(log.checkInTime).getHours();
      if (hourlyCounts[hour] !== undefined) {
        hourlyCounts[hour]++;
      }
    });

    const hourlyChartData = Object.entries(hourlyCounts).map(([hour, count]) => {
      const h = parseInt(hour, 10);
      const label = `${h === 12 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      return { hour: label, count };
    });

    sendSuccess(res, 'Attendance analytics', {
      totalToday: logs.length,
      activeNow: logs.filter((l) => !l.checkOutTime).length,
      hourlyChartData,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch attendance stats', 500);
  }
});

// Check-in member (via QR token, Member ID, or Member Mongo ID)
router.post('/check-in', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { identifier, method = 'MANUAL', branchId } = req.body;

    if (!identifier) {
      sendError(res, 'Member ID, QR Code token, or ID is required', 400);
      return;
    }

    const rawId = identifier.trim();
    const cleanDigits = rawId.replace(/[\s\-\(\)\+]/g, '');
    const phoneFilter = cleanDigits.length >= 7 ? [
      { phone: rawId },
      { phone: new RegExp(cleanDigits.slice(-10), 'i') },
    ] : [];

    // Lookup member by QR token, Member ID, Phone number, or Mongo _id
    const member = await Member.findOne({
      $or: [
        { qrCodeToken: rawId },
        { memberId: rawId.toUpperCase() },
        ...phoneFilter,
        ...(rawId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: rawId }] : []),
      ],
      isArchived: false,
    }).populate('branch');

    if (!member) {
      sendError(res, 'No active member found matching this ID or QR pass', 404);
      return;
    }

    // Check membership status
    const membership = await Membership.findOne({
      member: member._id,
      status: 'ACTIVE',
      expiryDate: { $gte: new Date() },
    }).populate('plan');

    const effectiveBranch = branchId || member.branch?._id;

    // Check if member is already checked in today without checking out
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existingCheckIn = await Attendance.findOne({
      member: member._id,
      checkInTime: { $gte: startOfToday },
      checkOutTime: null,
    });

    if (existingCheckIn) {
      const now = new Date();
      const secondsSinceCheckIn = Math.round((now.getTime() - existingCheckIn.checkInTime.getTime()) / 1000);

      // Duplicate scan prevention: Debounce accidental double scans within 60 seconds
      if (secondsSinceCheckIn < 60) {
        sendError(
          res,
          `Duplicate scan detected: ${member.fullName} was already checked in ${secondsSinceCheckIn}s ago. Please wait at least 1 minute before checking out.`,
          429
        );
        return;
      }

      // Auto check-out after workout session
      existingCheckIn.checkOutTime = now;
      await existingCheckIn.save();

      await recordAuditLog({
        userId: req.user?.userId,
        userName: req.user?.email,
        action: 'MEMBER_CHECK_OUT',
        entity: 'Attendance',
        entityId: existingCheckIn._id.toString(),
        details: { member: member.fullName, checkOutTime: existingCheckIn.checkOutTime },
      });

      sendSuccess(res, `Checked out: ${member.fullName}`, {
        type: 'CHECK_OUT',
        member,
        membershipValid: Boolean(membership),
        attendance: existingCheckIn,
        durationMinutes: Math.round(
          (existingCheckIn.checkOutTime.getTime() - existingCheckIn.checkInTime.getTime()) / 60000
        ),
      });
      return;
    }

    // Prevent accidental re-check-in within 30 seconds of checking out
    const recentCheckOut = await Attendance.findOne({
      member: member._id,
      checkOutTime: { $gte: new Date(Date.now() - 30 * 1000) },
    }).sort({ checkOutTime: -1 });

    if (recentCheckOut) {
      sendError(
        res,
        `Duplicate scan detected: ${member.fullName} just checked out moments ago. Please wait before re-checking in.`,
        429
      );
      return;
    }

    // New check-in
    const attendance = await Attendance.create({
      member: member._id,
      branch: effectiveBranch,
      checkInTime: new Date(),
      method: method === 'QR_CODE' ? 'QR_CODE' : 'MANUAL',
      checkedInBy: req.user?.userId,
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      action: 'MEMBER_CHECK_IN',
      entity: 'Attendance',
      entityId: attendance._id.toString(),
      details: { member: member.fullName, method },
    });

    sendSuccess(
      res,
      `Welcome ${member.fullName}! Check-in recorded.`,
      {
        type: 'CHECK_IN',
        member,
        membershipValid: Boolean(membership),
        membershipDetails: membership,
        attendance,
      },
      201
    );
  } catch (error: any) {
    sendError(res, error.message || 'Failed to process check-in', 500);
  }
});

// Explicit Check-out
router.post('/check-out/:attendanceId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const attendance = await Attendance.findById(req.params.attendanceId).populate('member');
    if (!attendance) {
      sendError(res, 'Attendance record not found', 404);
      return;
    }

    attendance.checkOutTime = new Date();
    await attendance.save();

    const diffMs = attendance.checkOutTime.getTime() - attendance.checkInTime.getTime();
    const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

    sendSuccess(res, 'Check-out recorded successfully', {
      ...attendance.toObject({ virtuals: true }),
      durationMinutes,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to record check-out', 500);
  }
});

export default router;
