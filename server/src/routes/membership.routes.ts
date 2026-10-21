import { Router, Response } from 'express';
import { Membership } from '../models/Membership.js';
import { Member } from '../models/Member.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Payment } from '../models/Payment.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';
import { generateReceiptNumber } from '../utils/receipt.js';

const router = Router();

// Expiration Center with summary cards and filtered member lists
router.get('/expiration-center', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filterType = (req.query.filter as string) || 'ALL';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const nonArchivedMemberIds = await Member.find({ isArchived: false }).distinct('_id');

    const [expiringIn7Days, expiringToday, alreadyExpired, renewalsThisMonth] = await Promise.all([
      Membership.countDocuments({
        member: { $in: nonArchivedMemberIds },
        isArchived: { $ne: true },
        status: 'ACTIVE',
        expiryDate: { $gte: todayStart, $lte: in7Days },
      }),
      Membership.countDocuments({
        member: { $in: nonArchivedMemberIds },
        isArchived: { $ne: true },
        status: 'ACTIVE',
        expiryDate: { $gte: todayStart, $lte: todayEnd },
      }),
      Membership.countDocuments({
        member: { $in: nonArchivedMemberIds },
        isArchived: { $ne: true },
        $or: [
          { status: 'EXPIRED' },
          { status: 'ACTIVE', expiryDate: { $lt: todayStart } },
        ],
      }),
      Membership.countDocuments({
        member: { $in: nonArchivedMemberIds },
        isArchived: { $ne: true },
        'renewalHistory.renewedAt': { $gte: startOfMonth },
      }),
    ]);

    let matchQuery: any = {
      member: { $in: nonArchivedMemberIds },
      isArchived: { $ne: true },
    };
    if (filterType === '7_DAYS') {
      matchQuery.status = 'ACTIVE';
      matchQuery.expiryDate = { $gt: todayEnd, $lte: in7Days };
    } else if (filterType === 'TODAY') {
      matchQuery.status = 'ACTIVE';
      matchQuery.expiryDate = { $gte: todayStart, $lte: todayEnd };
    } else if (filterType === 'EXPIRED') {
      matchQuery.$or = [{ status: 'EXPIRED' }, { status: 'ACTIVE', expiryDate: { $lt: todayStart } }];
    } else {
      matchQuery.$or = [
        { status: 'ACTIVE', expiryDate: { $lte: in7Days } },
        { status: 'EXPIRED' },
      ];
    }

    const memberships = await Membership.find(matchQuery)
      .populate('member')
      .populate('plan')
      .sort({ expiryDate: 1 })
      .limit(60);

    const formattedList = memberships
      .filter((m) => m.member)
      .map((sub) => {
        const mem = sub.member as any;
        const expiry = new Date(sub.expiryDate);
        const diffMs = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let urgencyStatus = 'ACTIVE';
        let displayMessage = '';

        if (sub.status === 'FROZEN') {
          urgencyStatus = 'FROZEN';
          displayMessage = 'Membership is currently frozen';
        } else if (diffDays < 0) {
          urgencyStatus = 'EXPIRED';
          displayMessage = `Membership expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
        } else if (diffDays === 0) {
          urgencyStatus = 'EXPIRING_TODAY';
          displayMessage = 'Membership expires today';
        } else if (diffDays === 1) {
          urgencyStatus = 'EXPIRING_SOON';
          displayMessage = 'Membership expires tomorrow';
        } else {
          urgencyStatus = 'EXPIRING_SOON';
          displayMessage = `Membership expires in ${diffDays} days`;
        }

        return {
          membershipId: sub._id,
          memberId: mem._id,
          memberCode: mem.memberId,
          fullName: mem.fullName,
          email: mem.email,
          phone: mem.phone,
          photoUrl: mem.photoUrl,
          branch: mem.branch,
          planName: (sub.plan as any)?.name || 'Custom Plan',
          planPrice: (sub.plan as any)?.price || 0,
          startDate: sub.startDate,
          expiryDate: sub.expiryDate,
          daysRemaining: diffDays,
          status: sub.status,
          urgencyStatus,
          displayMessage,
        };
      });

    sendSuccess(res, 'Membership expiration center data', {
      summary: {
        expiringIn7Days,
        expiringToday,
        alreadyExpired,
        renewalsThisMonth,
      },
      members: formattedList,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch expiration center data', 500);
  }
});

// Expiring memberships alert (next 7 days)
router.get('/expiring', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 7;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const nonArchivedMemberIds = await Member.find({ isArchived: false }).distinct('_id');

    const expiring = await Membership.find({
      member: { $in: nonArchivedMemberIds },
      isArchived: { $ne: true },
      status: 'ACTIVE',
      expiryDate: { $gte: now, $lte: futureDate },
    })
      .select('member plan startDate expiryDate status')
      .populate('member', 'fullName email phone memberId photoUrl isArchived')
      .populate('plan', 'name price type')
      .sort({ expiryDate: 1 })
      .lean();

    sendSuccess(res, `Memberships expiring within ${days} days`, expiring);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch expiring memberships', 500);
  }
});

// Assign new plan to member
router.post('/assign', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, planId, startDate, discount = 0, paymentMethod } = req.body;

    const member = await Member.findById(memberId);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) {
      sendError(res, 'Membership plan not found', 404);
      return;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const expiryDate = new Date(start);
    expiryDate.setDate(start.getDate() + plan.durationDays);

    const discountNum = Number(discount) || 0;
    const amountDue = Math.max(0, plan.price - discountNum);

    // Expire any existing active membership for this member
    await Membership.updateMany(
      { member: member._id, status: 'ACTIVE' },
      { status: 'EXPIRED' }
    );

    const membership = await Membership.create({
      member: member._id,
      plan: plan._id,
      startDate: start,
      expiryDate,
      originalPrice: plan.price,
      discount: discountNum,
      amountDue,
      amountPaid: amountDue,
      status: 'ACTIVE',
    });

    member.status = 'ACTIVE';
    await member.save();

    // Create payment receipt
    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      receiptNumber,
      member: member._id,
      membership: membership._id,
      amount: amountDue,
      paymentMethod: paymentMethod || 'CASH',
      status: 'PAID',
      type: 'MEMBERSHIP',
      balanceRemaining: 0,
      notes: `Subscription to ${plan.name}`,
      recordedBy: req.user?.userId || member._id,
      paymentDate: new Date(),
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'MEMBERSHIP_ASSIGNED',
      entity: 'Membership',
      entityId: membership._id.toString(),
      details: { member: member.fullName, plan: plan.name },
    });

    sendSuccess(res, 'Membership successfully activated', { membership, payment }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to assign membership', 500);
  }
});

// Renew membership
router.post('/:id/renew', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { durationDays, amountPaid, paymentMethod, newPlanId } = req.body;

    const membership = await Membership.findById(req.params.id).populate('plan');
    if (!membership) {
      sendError(res, 'Membership not found', 404);
      return;
    }

    const previousExpiryDate = new Date(membership.expiryDate);
    const baseDate = previousExpiryDate > new Date() ? previousExpiryDate : new Date();

    let plan = membership.plan as any;
    if (newPlanId) {
      plan = await MembershipPlan.findById(newPlanId);
      if (plan) membership.plan = plan._id;
    }

    const addDays = Number(durationDays) || (plan ? plan.durationDays : 30);
    const newExpiryDate = new Date(baseDate);
    newExpiryDate.setDate(baseDate.getDate() + addDays);

    const paid = Number(amountPaid) || (plan ? plan.price : 0);

    membership.renewalHistory.push({
      renewedAt: new Date(),
      previousExpiryDate,
      newExpiryDate,
      amountPaid: paid,
    });

    membership.expiryDate = newExpiryDate;
    membership.status = 'ACTIVE';
    membership.amountPaid += paid;
    await membership.save();

    await Member.findByIdAndUpdate(membership.member, { status: 'ACTIVE' });

    // Payment receipt for renewal
    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      receiptNumber,
      member: membership.member,
      membership: membership._id,
      amount: paid,
      paymentMethod: paymentMethod || 'CASH',
      status: 'PAID',
      type: 'RENEWAL',
      balanceRemaining: 0,
      notes: `Membership renewal extended until ${newExpiryDate.toISOString().split('T')[0]}`,
      recordedBy: req.user?.userId || membership.member,
      paymentDate: new Date(),
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'MEMBERSHIP_RENEWED',
      entity: 'Membership',
      entityId: membership._id.toString(),
      details: { newExpiryDate, amountPaid: paid },
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('member')
      .populate('recordedBy', 'fullName email role')
      .populate({ path: 'membership', populate: { path: 'plan' } });

    sendSuccess(res, 'Membership renewed successfully', { membership, payment: populatedPayment || payment });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to renew membership', 500);
  }
});

// Freeze membership
router.post('/:id/freeze', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      sendError(res, 'Freeze start date, end date, and reason are required', 400);
      return;
    }

    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      sendError(res, 'Membership not found', 404);
      return;
    }

    membership.status = 'FROZEN';
    membership.freezeHistory.push({
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
    });

    await membership.save();
    await Member.findByIdAndUpdate(membership.member, { status: 'FROZEN' });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'MEMBERSHIP_FROZEN',
      entity: 'Membership',
      entityId: membership._id.toString(),
      details: { fromDate, toDate, reason },
    });

    sendSuccess(res, 'Membership frozen successfully', membership);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to freeze membership', 500);
  }
});

// Thaw / Unfreeze membership
router.post('/:id/thaw', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      sendError(res, 'Membership not found', 404);
      return;
    }

    if (membership.status !== 'FROZEN') {
      sendError(res, 'Membership is not currently frozen', 400);
      return;
    }

    // Extend expiry date by days frozen
    const lastFreeze = membership.freezeHistory[membership.freezeHistory.length - 1];
    if (lastFreeze) {
      lastFreeze.thawedAt = new Date();
      const freezeStart = new Date(lastFreeze.fromDate).getTime();
      const freezeEnd = Math.min(new Date(lastFreeze.toDate).getTime(), Date.now());
      const frozenDays = Math.max(1, Math.round((freezeEnd - freezeStart) / (1000 * 3600 * 24)));

      const currentExpiry = new Date(membership.expiryDate);
      currentExpiry.setDate(currentExpiry.getDate() + frozenDays);
      membership.expiryDate = currentExpiry;
    }

    membership.status = 'ACTIVE';
    await membership.save();
    await Member.findByIdAndUpdate(membership.member, { status: 'ACTIVE' });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'MEMBERSHIP_THAWED',
      entity: 'Membership',
      entityId: membership._id.toString(),
    });

    sendSuccess(res, 'Membership un-frozen successfully', membership);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to unfreeze membership', 500);
  }
});

export default router;
