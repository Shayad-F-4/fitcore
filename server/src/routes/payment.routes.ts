import { Router, Response } from 'express';
import { Payment } from '../models/Payment.js';
import { Member } from '../models/Member.js';
import { Membership } from '../models/Membership.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';
import { generateReceiptNumber } from '../utils/receipt.js';

const router = Router();

// Payment stats & revenue metrics
router.get('/stats', authenticate, async (_req, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalRevenueAgg, monthRevenueAgg, methodBreakdown] = await Promise.all([
      Payment.aggregate([
        { $match: { status: { $in: ['PAID', 'PARTIAL'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['PAID', 'PARTIAL'] }, paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['PAID', 'PARTIAL'] } } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = totalRevenueAgg[0]?.total || 0;
    const monthRevenue = monthRevenueAgg[0]?.total || 0;

    sendSuccess(res, 'Payment statistics retrieved', {
      totalRevenue,
      monthRevenue,
      methodBreakdown,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch payment stats', 500);
  }
});

// Daily Cash & UPI Shift Settlement Report
router.get('/daily-settlement', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const payments = await Payment.find({
      paymentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['PAID', 'PARTIAL'] },
    })
      .populate('member', 'fullName memberId phone')
      .populate('recordedBy', 'fullName email role')
      .sort({ paymentDate: -1 });

    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let bankTotal = 0;
    let overallTotal = 0;

    payments.forEach((p) => {
      overallTotal += p.amount;
      if (p.paymentMethod === 'CASH') cashTotal += p.amount;
      else if (p.paymentMethod === 'UPI') upiTotal += p.amount;
      else if (p.paymentMethod === 'CREDIT_CARD' || p.paymentMethod === 'DEBIT_CARD') cardTotal += p.amount;
      else if (p.paymentMethod === 'BANK_TRANSFER') bankTotal += p.amount;
      else cashTotal += p.amount;
    });

    sendSuccess(res, 'Daily settlement report retrieved', {
      date: startOfDay.toISOString(),
      transactionCount: payments.length,
      overallTotal,
      cashTotal,
      upiTotal,
      cardTotal,
      bankTotal,
      payments,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch daily settlement', 500);
  }
});

// Get all pending membership fee dues
router.get('/dues', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const nonArchivedMemberIds = await Member.find({ isArchived: false }).distinct('_id');

    const duesMemberships = await Membership.find({
      member: { $in: nonArchivedMemberIds },
      isArchived: { $ne: true },
      status: 'ACTIVE',
      $expr: { $gt: ['$amountDue', '$amountPaid'] },
    })
      .populate('member', 'fullName memberId phone email photoUrl branch isArchived')
      .populate('plan', 'name price durationDays')
      .sort({ updatedAt: -1 });

    const filteredDues = duesMemberships.filter((m: any) => m.member && !m.member.isArchived);

    const totalDuesAmount = filteredDues.reduce(
      (acc, m) => acc + Math.max(0, m.amountDue - m.amountPaid),
      0
    );

    sendSuccess(res, 'Pending dues fetched', {
      duesCount: filteredDues.length,
      totalDuesAmount,
      memberships: filteredDues.map((m: any) => ({
        membershipId: m._id,
        member: m.member,
        plan: m.plan,
        amountDue: m.amountDue,
        amountPaid: m.amountPaid,
        balanceDue: Math.max(0, m.amountDue - m.amountPaid),
        startDate: m.startDate,
        expiryDate: m.expiryDate,
      })),
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch dues', 500);
  }
});

// Collect pending due payment
router.post('/collect-due', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { membershipId, amountPaid, paymentMethod, notes, transactionRef } = req.body;

    if (!membershipId || amountPaid === undefined) {
      sendError(res, 'Membership ID and payment amount are required', 400);
      return;
    }

    const membership = await Membership.findById(membershipId).populate('member').populate('plan');
    if (!membership) {
      sendError(res, 'Membership not found', 404);
      return;
    }

    const curDue = Math.max(0, membership.amountDue - membership.amountPaid);
    if (curDue <= 0) {
      sendError(res, 'No outstanding balance due for this membership', 400);
      return;
    }

    const payAmount = Number(amountPaid);
    if (isNaN(payAmount) || payAmount <= 0) {
      sendError(res, 'Invalid payment amount', 400);
      return;
    }

    // Duplicate payment prevention: debounce accidental double-clicks within 5 seconds
    const recentDuePayment = await Payment.findOne({
      membership: membership._id,
      amount: payAmount,
      paymentDate: { $gte: new Date(Date.now() - 5000) },
    });
    if (recentDuePayment) {
      sendError(
        res,
        `Duplicate payment detected. A payment of ₹${payAmount} was already processed seconds ago (Receipt #${recentDuePayment.receiptNumber}).`,
        409
      );
      return;
    }

    // Update membership amountPaid
    membership.amountPaid += payAmount;
    await membership.save();

    const newBalanceRemaining = Math.max(0, membership.amountDue - membership.amountPaid);
    const paymentStatus = newBalanceRemaining === 0 ? 'PAID' : 'PARTIAL';
    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      receiptNumber,
      member: (membership.member as any)._id,
      membership: membership._id,
      amount: payAmount,
      paymentMethod: paymentMethod || 'CASH',
      transactionRef: transactionRef || '',
      status: paymentStatus,
      type: 'MEMBERSHIP',
      balanceRemaining: newBalanceRemaining,
      notes: notes || `Due clearance for ${(membership.plan as any)?.name || 'Membership'} (Remaining Due: ₹${newBalanceRemaining})`,
      recordedBy: req.user?.userId || (membership.member as any)._id,
      paymentDate: new Date(),
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'PAYMENT_RECORDED',
      entity: 'Payment',
      entityId: payment._id.toString(),
      details: {
        action: 'COLLECT_DUE',
        amount: payAmount,
        receipt: receiptNumber,
        member: (membership.member as any).fullName,
        remainingDue: newBalanceRemaining,
      },
      ip: req.ip,
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('member')
      .populate({
        path: 'membership',
        populate: { path: 'plan' },
      })
      .populate('recordedBy', 'fullName email role');

    sendSuccess(res, 'Due payment successfully collected', populatedPayment, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to collect due payment', 500);
  }
});

// List payments
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const method = req.query.method as string;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const filter: any = {};
    if (method && method !== 'ALL') filter.paymentMethod = method;
    if (type && type !== 'ALL') filter.type = type;
    if (status && status !== 'ALL') filter.status = status;

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        filter.paymentDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = e;
      }
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('member', 'fullName memberId email phone')
        .populate('recordedBy', 'fullName')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    sendPaginated(res, payments, total, page, limit, 'Payments list fetched');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch payments', 500);
  }
});

// Record new manual payment / receipt
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, amount, paymentMethod, type = 'MEMBERSHIP', transactionRef, notes, membershipId } = req.body;

    const payAmount = Number(amount);
    if (!memberId || isNaN(payAmount) || payAmount <= 0) {
      sendError(res, 'Valid member ID and amount are required', 400);
      return;
    }

    // Duplicate payment prevention: debounce accidental double-submits within 5 seconds
    const recentPayment = await Payment.findOne({
      member: memberId,
      amount: payAmount,
      paymentMethod: paymentMethod || 'CASH',
      paymentDate: { $gte: new Date(Date.now() - 5000) },
    });
    if (recentPayment) {
      sendError(
        res,
        `Duplicate payment detected. A payment of ₹${payAmount} was already recorded moments ago (Receipt #${recentPayment.receiptNumber}).`,
        409
      );
      return;
    }

    const member = await Member.findById(memberId);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      receiptNumber,
      member: member._id,
      membership: membershipId || undefined,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'CASH',
      transactionRef: transactionRef || '',
      status: 'PAID',
      type,
      balanceRemaining: 0,
      notes: notes || '',
      recordedBy: req.user?.userId || member._id,
      paymentDate: new Date(),
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      action: 'PAYMENT_RECORDED',
      entity: 'Payment',
      entityId: payment._id.toString(),
      details: { amount: payment.amount, receipt: payment.receiptNumber, member: member.fullName },
    });

    sendSuccess(res, 'Payment recorded successfully', payment, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to record payment', 500);
  }
});

// Get payment receipt by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('member')
      .populate('recordedBy', 'fullName email')
      .populate({
        path: 'membership',
        populate: { path: 'plan' },
      });

    if (!payment) {
      sendError(res, 'Payment receipt not found', 404);
      return;
    }

    sendSuccess(res, 'Payment receipt retrieved', payment);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch receipt', 500);
  }
});

export default router;
