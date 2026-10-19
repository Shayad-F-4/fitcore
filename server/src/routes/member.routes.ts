import { Router, Response } from 'express';
import crypto from 'crypto';
import { Member } from '../models/Member.js';
import { Membership } from '../models/Membership.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Payment } from '../models/Payment.js';
import { Attendance } from '../models/Attendance.js';
import { FollowUp } from '../models/FollowUp.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';
import { generateReceiptNumber } from '../utils/receipt.js';

const router = Router();

// Member statistics
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.query;
    const filter: any = { isArchived: false };
    if (branchId) filter.branch = branchId;

    const [total, active, expired, frozen, pending, archived] = await Promise.all([
      Member.countDocuments(filter),
      Member.countDocuments({ ...filter, status: 'ACTIVE' }),
      Member.countDocuments({ ...filter, status: 'EXPIRED' }),
      Member.countDocuments({ ...filter, status: 'FROZEN' }),
      Member.countDocuments({ ...filter, status: 'PENDING' }),
      Member.countDocuments({ isArchived: true, ...(branchId ? { branch: branchId } : {}) }),
    ]);

    sendSuccess(res, 'Member statistics retrieved', {
      total,
      active,
      expired,
      frozen,
      pending,
      archived,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch member stats', 500);
  }
});

// Fast lookup by QR Code Token
router.get('/by-qr/:qrToken', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findOne({ qrCodeToken: req.params.qrToken, isArchived: false })
      .populate('branch')
      .populate('assignedTrainer', 'fullName email');

    if (!member) {
      sendError(res, 'No member found matching this digital QR pass', 404);
      return;
    }

    const membership = await Membership.findOne({ member: member._id, status: { $in: ['ACTIVE', 'FROZEN'] } })
      .populate('plan')
      .sort({ expiryDate: -1 });

    sendSuccess(res, 'Member identified', {
      member,
      membership,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to lookup member by QR', 500);
  }
});

// List members with search and filter
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 12;
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as string;
    const branch = req.query.branch as string;
    const isArchived = req.query.isArchived === 'true';

    const filter: any = { isArchived };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (branch && branch !== 'ALL') {
      filter.branch = branch;
    }

    const plan = req.query.plan as string;
    if (plan && plan !== 'ALL') {
      const subsWithPlan = await Membership.find({ plan, status: { $in: ['ACTIVE', 'FROZEN'] } }).select('member');
      const memberIds = subsWithPlan.map((s) => s.member);
      filter._id = { $in: memberIds };
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { memberId: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      Member.find(filter)
        .populate('branch', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Member.countDocuments(filter),
    ]);

    // Attach current active membership summary to each member
    const memberIds = members.map((m) => m._id);
    const membershipFilter: any = { member: { $in: memberIds } };
    if (!isArchived) {
      membershipFilter.status = { $in: ['ACTIVE', 'FROZEN'] };
    }

    const memberships = await Membership.find(membershipFilter)
      .populate('plan', 'name type price')
      .sort({ expiryDate: -1 })
      .lean();

    const membershipMap = new Map();
    memberships.forEach((sub) => {
      if (!membershipMap.has(sub.member.toString())) {
        membershipMap.set(sub.member.toString(), sub);
      }
    });

    const enrichedMembers = members.map((m) => ({
      ...m,
      currentMembership: membershipMap.get(m._id.toString()) || null,
    }));

    sendPaginated(res, enrichedMembers, total, page, limit, 'Members fetched');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch members', 500);
  }
});

// Get next auto-generated Member ID
router.get('/next-id', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await Member.countDocuments();
    const nextId = `FC-${(count + 1001).toString()}`;
    sendSuccess(res, 'Next member ID generated', { nextId });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate member ID', 500);
  }
});

// Get member profile by ID (Populates all 7 tabs: Overview, Membership History, Attendance, Payments, Workout, Follow-ups, Audit)
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('branch')
      .populate('assignedTrainer', 'fullName email phone');

    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const [memberships, payments, rawAttendance, followUps, auditHistory] = await Promise.all([
      Membership.find({ member: member._id }).populate('plan').sort({ createdAt: -1 }),
      Payment.find({ member: member._id }).populate('recordedBy', 'fullName').sort({ paymentDate: -1 }),
      Attendance.find({ member: member._id }).populate('branch', 'name').sort({ checkInTime: -1 }).limit(30),
      FollowUp.find({ member: member._id }).populate('recordedBy', 'fullName role').sort({ createdAt: -1 }),
      AuditLog.find({
        $or: [
          { entityId: member._id.toString() },
          { 'details.memberId': member.memberId },
        ],
      }).sort({ createdAt: -1 }).limit(20),
    ]);

    // Compute visit duration for attendance records
    const attendance = rawAttendance.map((att) => {
      let durationMinutes = null;
      if (att.checkOutTime) {
        durationMinutes = Math.round(
          (new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime()) / (1000 * 60)
        );
      }
      return {
        ...att.toObject(),
        durationMinutes,
      };
    });

    const activeMembership = memberships.find((m) => m.status === 'ACTIVE' || m.status === 'FROZEN') || null;

    sendSuccess(res, 'Member profile retrieved', {
      member,
      currentMembership: activeMembership,
      memberships,
      payments,
      attendance,
      followUps,
      auditHistory,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch member profile', 500);
  }
});

// Register new member with multi-step support, camera photo, duplicate check, and validation
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      fullName,
      email,
      phone,
      gender,
      dob,
      address,
      emergencyContact,
      branch,
      fitnessGoals,
      photoUrl,
      notes,
      planId,
      startDate: inputStartDate,
      paymentMethod,
      discount = 0,
      amountPaid: inputAmountPaid,
      transactionRef,
      customMemberId,
    } = req.body;

    if (!fullName || !phone || !branch) {
      sendError(res, 'Full name, phone number, and branch are required', 400);
      return;
    }

    const cleanEmail = email ? email.toLowerCase().trim() : '';
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        sendError(res, 'Please provide a valid email address', 400);
        return;
      }
    }

    // Phone format validation (digits, minimum 7 characters)
    const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.length < 7) {
      sendError(res, 'Please provide a valid mobile/phone number (minimum 7 digits)', 400);
      return;
    }

    // Prevent duplicate registrations by checking phone, and email if provided
    const duplicateQuery: any[] = [{ phone: phone.trim() }];
    if (cleanEmail) {
      duplicateQuery.push({ email: cleanEmail });
    }

    const existingMember = await Member.findOne({
      isArchived: false,
      $or: duplicateQuery,
    });

    if (existingMember) {
      const duplicateField = existingMember.phone === phone.trim() ? 'phone number' : 'email';
      sendError(
        res,
        `A member with this ${duplicateField} already exists (${existingMember.fullName} - ${existingMember.memberId}).`,
        409
      );
      return;
    }

    // Generate Member ID (e.g., FC-1009)
    const count = await Member.countDocuments();
    const memberId = customMemberId?.trim() || `FC-${(count + 1001).toString()}`;
    const qrCodeToken = `FIT_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const member = await Member.create({
      memberId,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      gender: gender || 'MALE',
      dob: dob ? new Date(dob) : undefined,
      address: address || '',
      emergencyContact: emergencyContact || { name: '', phone: '', relation: 'Emergency' },
      status: planId ? 'ACTIVE' : 'PENDING',
      branch,
      fitnessGoals: Array.isArray(fitnessGoals) ? fitnessGoals : ['Strength', 'Cardio'],
      photoUrl: photoUrl || '',
      qrCodeToken,
      notes: notes || '',
      joinDate: new Date(),
      isArchived: false,
    });

    let createdMembership = null;
    let createdPayment = null;

    if (planId) {
      const plan = await MembershipPlan.findById(planId);
      if (plan) {
        const startDate = inputStartDate ? new Date(inputStartDate) : new Date();
        const expiryDate = new Date(startDate);
        expiryDate.setDate(startDate.getDate() + plan.durationDays);

        const discountNum = Number(discount) || 0;
        const amountDue = Math.max(0, plan.price - discountNum);

        // Determine paid amount and status
        const amountPaid = inputAmountPaid !== undefined ? Number(inputAmountPaid) : amountDue;
        const balanceRemaining = Math.max(0, amountDue - amountPaid);
        let paymentStatus: 'PAID' | 'PARTIAL' = 'PAID';
        if (amountPaid === 0) {
          paymentStatus = 'PARTIAL'; // unpaid/due
        } else if (amountPaid < amountDue) {
          paymentStatus = 'PARTIAL';
        }

        createdMembership = await Membership.create({
          member: member._id,
          plan: plan._id,
          startDate,
          expiryDate,
          originalPrice: plan.price,
          discount: discountNum,
          amountDue,
          amountPaid,
          status: 'ACTIVE',
        });

        // Generate unique receipt number (e.g. RCP-2026-XXXXX)
        const receiptNumber = await generateReceiptNumber();

        createdPayment = await Payment.create({
          receiptNumber,
          member: member._id,
          membership: createdMembership._id,
          amount: amountPaid,
          paymentMethod: paymentMethod || 'CASH',
          transactionRef: transactionRef || undefined,
          status: paymentStatus,
          type: 'MEMBERSHIP',
          balanceRemaining,
          notes: `Initial membership registration for ${plan.name}`,
          recordedBy: req.user?.userId || member._id,
          paymentDate: new Date(),
        });
      }
    }

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'MEMBER_REGISTERED',
      entity: 'Member',
      entityId: member._id.toString(),
      details: { memberId: member.memberId, name: member.fullName, email: member.email },
    });

    let populatedPayment = null;
    if (createdPayment) {
      populatedPayment = await Payment.findById(createdPayment._id)
        .populate('member')
        .populate('recordedBy', 'fullName email role')
        .populate({ path: 'membership', populate: { path: 'plan' } });
    }

    sendSuccess(
      res,
      'Member registered successfully',
      {
        member,
        membership: createdMembership,
        payment: populatedPayment || createdPayment,
      },
      201
    );
  } catch (error: any) {
    console.error('[Register Member Error]', error);
    sendError(res, error.message || 'Failed to register member', 500);
  }
});

// Update member
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, email, phone, gender, dob, address, emergencyContact, branch, fitnessGoals, photoUrl, notes, status } = req.body;

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      {
        fullName,
        email,
        phone,
        gender,
        dob: dob ? new Date(dob) : undefined,
        address,
        emergencyContact,
        branch,
        fitnessGoals,
        photoUrl,
        notes,
        status,
      },
      { new: true }
    );

    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    sendSuccess(res, 'Member updated successfully', member);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update member', 500);
  }
});

// Delete member (Admin only) - Archive if linked history exists, or permanently delete if clean
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    // Check linked records across the database
    const [paymentCount, attendanceCount, membershipCount, followUpCount, notificationCount] = await Promise.all([
      Payment.countDocuments({ member: member._id }),
      Attendance.countDocuments({ member: member._id }),
      Membership.countDocuments({ member: member._id }),
      FollowUp.countDocuments({ member: member._id }),
      NotificationLog.countDocuments({ memberId: member._id }),
    ]);

    const totalLinkedRecords = paymentCount + attendanceCount + membershipCount + followUpCount + notificationCount;

    if (totalLinkedRecords > 0) {
      // Archive instead of permanently deleting to preserve financial & audit history
      member.isArchived = true;
      member.status = 'ARCHIVED';
      await member.save();

      await recordAuditLog({
        userId: req.user?.userId,
        userName: req.user?.email,
        userRole: req.user?.role,
        action: 'MEMBER_ARCHIVED',
        entity: 'Member',
        entityId: member._id.toString(),
        details: {
          memberId: member.memberId,
          fullName: member.fullName,
          reason: 'Safely archived because historical records exist',
          paymentCount,
          attendanceCount,
          membershipCount,
        },
      });

      sendSuccess(res, `Member "${member.fullName}" (${member.memberId}) has existing linked records and was safely archived. All historical financial records are preserved.`, {
        archived: true,
        deleted: false,
        member,
        linkedCounts: { paymentCount, attendanceCount, membershipCount },
      });
      return;
    }

    // No linked records exist: safe to permanently delete
    await Member.findByIdAndDelete(member._id);
    if (member.user) {
      await User.findByIdAndDelete(member.user);
    }

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'MEMBER_DELETED',
      entity: 'Member',
      entityId: member._id.toString(),
      details: {
        memberId: member.memberId,
        fullName: member.fullName,
      },
    });

    sendSuccess(res, `Member "${member.fullName}" (${member.memberId}) was permanently deleted as no historical records were linked.`, {
      archived: false,
      deleted: true,
      memberId: member.memberId,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete member', 500);
  }
});

// Restore archived member (Admin only)
router.patch('/:id/restore', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    member.isArchived = false;

    // Determine status based on current active non-expired membership
    const activeSub = await Membership.findOne({
      member: member._id,
      status: 'ACTIVE',
      expiryDate: { $gte: new Date() },
    });

    member.status = activeSub ? 'ACTIVE' : 'EXPIRED';
    await member.save();

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'MEMBER_RESTORED',
      entity: 'Member',
      entityId: member._id.toString(),
      details: {
        memberId: member.memberId,
        fullName: member.fullName,
        restoredStatus: member.status,
      },
    });

    sendSuccess(res, `Member "${member.fullName}" (${member.memberId}) was successfully restored to the active directory.`, member);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to restore member', 500);
  }
});

// Archive / Unarchive member (Admin only)
router.patch('/:id/archive', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    member.isArchived = !member.isArchived;
    if (member.isArchived) {
      member.status = 'ARCHIVED';
    } else {
      member.status = 'ACTIVE';
    }
    await member.save();

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: member.isArchived ? 'MEMBER_ARCHIVED' : 'MEMBER_RESTORED',
      entity: 'Member',
      entityId: member._id.toString(),
      details: {
        memberId: member.memberId,
        fullName: member.fullName,
      },
    });

    sendSuccess(res, `Member ${member.isArchived ? 'archived' : 'restored'} successfully`, member);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to archive member', 500);
  }
});

export default router;
