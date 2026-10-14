import { Router, Response } from 'express';
import { Payment } from '../models/Payment.js';
import { Member } from '../models/Member.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Payment stats & revenue metrics
router.get('/stats', authenticate, async (_req, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalRevenueAgg, monthRevenueAgg, methodBreakdown] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'PAID', paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'PAID' } },
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

// List payments
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const method = req.query.method as string;
    const type = req.query.type as string;

    const filter: any = {};
    if (method && method !== 'ALL') filter.paymentMethod = method;
    if (type && type !== 'ALL') filter.type = type;

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

    if (!memberId || !amount) {
      sendError(res, 'Member ID and amount are required', 400);
      return;
    }

    const member = await Member.findById(memberId);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const paymentCount = await Payment.countDocuments();
    const receiptNumber = `RCP-${new Date().getFullYear()}-${(paymentCount + 5001).toString()}`;

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
