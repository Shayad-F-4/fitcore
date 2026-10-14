import { Router, Response } from 'express';
import { Member } from '../models/Member.js';
import { Membership } from '../models/Membership.js';
import { Payment } from '../models/Payment.js';
import { Attendance } from '../models/Attendance.js';
import { AuditLog } from '../models/AuditLog.js';
import { Branch } from '../models/Branch.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.query;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const branchFilter = branchId ? { branch: branchId } : {};

    const [
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      liveOccupancy,
      todayTotalCheckins,
      monthRevenueAgg,
      totalRevenueAgg,
      expiringMemberships,
      recentActivity,
      branchInfo,
    ] = await Promise.all([
      Member.countDocuments({ isArchived: false, ...branchFilter }),
      Member.countDocuments({ status: 'ACTIVE', isArchived: false, ...branchFilter }),
      Member.countDocuments({ joinDate: { $gte: startOfMonth }, isArchived: false, ...branchFilter }),
      Attendance.countDocuments({
        checkInTime: { $gte: startOfToday },
        checkOutTime: null,
        ...branchFilter,
      }),
      Attendance.countDocuments({
        checkInTime: { $gte: startOfToday },
        ...branchFilter,
      }),
      Payment.aggregate([
        { $match: { status: 'PAID', paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Membership.find({
        status: 'ACTIVE',
        expiryDate: { $gte: now, $lte: in7Days },
      })
        .populate('member', 'fullName memberId phone photoUrl')
        .populate('plan', 'name price')
        .sort({ expiryDate: 1 })
        .limit(6),
      AuditLog.find().sort({ createdAt: -1 }).limit(8),
      branchId ? Branch.findById(branchId) : null,
    ]);

    // Monthly revenue trend (past 6 months)
    const monthLabels: string[] = [];
    const monthlyRevenueData: { month: string; revenue: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endD = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = d.toLocaleString('default', { month: 'short' });
      monthLabels.push(label);

      const mAgg = await Payment.aggregate([
        {
          $match: {
            status: 'PAID',
            paymentDate: { $gte: d, $lte: endD },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      monthlyRevenueData.push({ month: label, revenue: mAgg[0]?.total || 0 });
    }

    // Capacity calculation
    const gymCapacity = branchInfo?.capacity || 150;
    const occupancyPercentage = Math.min(100, Math.round((liveOccupancy / gymCapacity) * 100));

    sendSuccess(res, 'Dashboard metrics', {
      metrics: {
        totalMembers,
        activeMembers,
        newMembersThisMonth,
        liveOccupancy,
        gymCapacity,
        occupancyPercentage,
        todayTotalCheckins,
        monthlyRevenue: monthRevenueAgg[0]?.total || 0,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
      },
      expiringMemberships,
      monthlyRevenueData,
      recentActivity,
    });
  } catch (error: any) {
    console.error('[Dashboard Stats Error]', error);
    sendError(res, error.message || 'Failed to fetch dashboard stats', 500);
  }
});

export default router;
