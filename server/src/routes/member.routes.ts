import { Router, Response } from 'express';
import crypto from 'crypto';
import { Member } from '../models/Member.js';
import { Membership } from '../models/Membership.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Payment } from '../models/Payment.js';
import { Attendance } from '../models/Attendance.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Member statistics
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.query;
    const filter: any = { isArchived: false };
    if (branchId) filter.branch = branchId;

    const [total, active, expired, frozen, pending] = await Promise.all([
      Member.countDocuments(filter),
      Member.countDocuments({ ...filter, status: 'ACTIVE' }),
      Member.countDocuments({ ...filter, status: 'EXPIRED' }),
      Member.countDocuments({ ...filter, status: 'FROZEN' }),
      Member.countDocuments({ ...filter, status: 'PENDING' }),
    ]);

    sendSuccess(res, 'Member statistics retrieved', {
      total,
      active,
      expired,
      frozen,
      pending,
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
    const memberships = await Membership.find({
      member: { $in: memberIds },
      status: { $in: ['ACTIVE', 'FROZEN'] },
    })
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

// Get member profile by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('branch')
      .populate('assignedTrainer', 'fullName email phone');

    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const [memberships, payments, recentAttendance] = await Promise.all([
      Membership.find({ member: member._id }).populate('plan').sort({ createdAt: -1 }),
      Payment.find({ member: member._id }).populate('recordedBy', 'fullName').sort({ paymentDate: -1 }),
      Attendance.find({ member: member._id }).populate('branch', 'name').sort({ checkInTime: -1 }).limit(10),
    ]);

    sendSuccess(res, 'Member profile retrieved', {
      member,
      memberships,
      payments,
      recentAttendance,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch member profile', 500);
  }
});

// Register new member
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
      paymentMethod,
      discount = 0,
    } = req.body;

    if (!fullName || !email || !phone || !branch) {
      sendError(res, 'Full name, email, phone number, and branch are required', 400);
      return;
    }

    // Generate Member ID (e.g., FC-2026-XXXX)
    const count = await Member.countDocuments();
    const memberId = `FC-${(count + 1001).toString()}`;
    const qrCodeToken = `FIT_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const member = await Member.create({
      memberId,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      gender: gender || 'MALE',
      dob: dob ? new Date(dob) : undefined,
      address: address || '',
      emergencyContact: emergencyContact || { name: '', phone: '', relation: '' },
      status: planId ? 'ACTIVE' : 'PENDING',
      branch,
      fitnessGoals: Array.isArray(fitnessGoals) ? fitnessGoals : ['Strength', 'Cardio'],
      photoUrl: photoUrl || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 5000)}?w=150&auto=format&fit=crop&q=80`,
      qrCodeToken,
      notes: notes || '',
      joinDate: new Date(),
      isArchived: false,
    });

    // If an initial plan was selected, create membership and payment
    let createdMembership = null;
    let createdPayment = null;

    if (planId) {
      const plan = await MembershipPlan.findById(planId);
      if (plan) {
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(startDate.getDate() + plan.durationDays);

        const discountNum = Number(discount) || 0;
        const amountDue = Math.max(0, plan.price - discountNum);

        createdMembership = await Membership.create({
          member: member._id,
          plan: plan._id,
          startDate,
          expiryDate,
          originalPrice: plan.price,
          discount: discountNum,
          amountDue,
          amountPaid: amountDue,
          status: 'ACTIVE',
        });

        // Record initial payment receipt
        const paymentCount = await Payment.countDocuments();
        const receiptNumber = `RCP-${new Date().getFullYear()}-${(paymentCount + 5001).toString()}`;

        createdPayment = await Payment.create({
          receiptNumber,
          member: member._id,
          membership: createdMembership._id,
          amount: amountDue,
          paymentMethod: paymentMethod || 'CASH',
          status: 'PAID',
          type: 'MEMBERSHIP',
          balanceRemaining: 0,
          notes: `Initial registration for plan: ${plan.name}`,
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
      details: { memberId: member.memberId, name: member.fullName },
    });

    sendSuccess(
      res,
      'Member registered successfully',
      {
        member,
        membership: createdMembership,
        payment: createdPayment,
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

// Archive / Unarchive member
router.patch('/:id/archive', authenticate, async (req: AuthenticatedRequest, res: Response) => {
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

    sendSuccess(res, `Member ${member.isArchived ? 'archived' : 'restored'} successfully`, member);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to archive member', 500);
  }
});

export default router;
