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

    // Get non-archived member IDs (scoped by branch if requested)
    const nonArchivedMemberIds = await Member.find({ isArchived: false, ...branchFilter }).distinct('_id');

    const expiringMembershipsQuery = {
      member: { $in: nonArchivedMemberIds },
      isArchived: { $ne: true },
      status: 'ACTIVE',
      expiryDate: { $gte: now, $lte: in7Days },
    };

    const expiredMembershipsQuery = {
      member: { $in: nonArchivedMemberIds },
      isArchived: { $ne: true },
      $or: [
        { status: 'EXPIRED' },
        { status: 'ACTIVE', expiryDate: { $lt: now } },
      ],
    };

    const pendingDuesMatch = {
      member: { $in: nonArchivedMemberIds },
      isArchived: { $ne: true },
      status: 'ACTIVE',
      $expr: { $gt: ['$amountDue', '$amountPaid'] },
    };

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      liveOccupancy,
      todayTotalCheckins,
      revenueSummaryAgg,
      pendingDuesAgg,
      expiringMemberships,
      recentMembersRaw,
      expiringMembershipsCount,
      recentActivity,
      branchInfo,
      expiredMemberships,
      expiredMembershipsCount,
      monthlyAgg,
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
      // Single consolidated payment aggregation for today, this month, and all time
      Payment.aggregate([
        { $match: { status: { $in: ['PAID', 'PARTIAL'] } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            monthlyRevenue: {
              $sum: { $cond: [{ $gte: ['$paymentDate', startOfMonth] }, '$amount', 0] },
            },
            todayRevenue: {
              $sum: { $cond: [{ $gte: ['$paymentDate', startOfToday] }, '$amount', 0] },
            },
          },
        },
      ]),
      Membership.aggregate([
        { $match: pendingDuesMatch },
        { $group: { _id: null, total: { $sum: { $subtract: ['$amountDue', '$amountPaid'] } }, count: { $sum: 1 } } },
      ]),
      Membership.find(expiringMembershipsQuery)
        .select('member plan startDate expiryDate status isArchived')
        .populate('member', 'fullName memberId phone photoUrl isArchived branch')
        .populate('plan', 'name price durationDays')
        .sort({ expiryDate: 1 })
        .limit(20)
        .lean(),
      Member.find({ isArchived: false, ...branchFilter })
        .select('fullName memberId email phone photoUrl joinDate status createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Membership.countDocuments(expiringMembershipsQuery),
      AuditLog.find().sort({ createdAt: -1 }).limit(8).lean(),
      branchId ? Branch.findById(branchId).lean() : null,
      Membership.find(expiredMembershipsQuery)
        .select('member plan startDate expiryDate status isArchived')
        .populate('member', 'fullName memberId phone photoUrl isArchived branch')
        .populate('plan', 'name price durationDays')
        .sort({ expiryDate: -1 })
        .limit(20)
        .lean(),
      Membership.countDocuments(expiredMembershipsQuery),
      // Monthly revenue trend (past 6 months) queried in parallel
      Payment.aggregate([
        {
          $match: {
            status: { $in: ['PAID', 'PARTIAL'] },
            paymentDate: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: { date: '$paymentDate', timezone: 'Asia/Kolkata' } },
              month: { $month: { date: '$paymentDate', timezone: 'Asia/Kolkata' } },
            },
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    // Attach active membership plan to each recent member in memory (avoids N+1 query loop)
    const recentMemberIds = recentMembersRaw.map((m: any) => m._id);
    const activeSubsForRecent = await Membership.find({
      member: { $in: recentMemberIds },
      status: 'ACTIVE',
    })
      .select('member plan')
      .populate('plan', 'name')
      .lean();

    const planByMemberId = new Map();
    activeSubsForRecent.forEach((sub: any) => {
      if (sub.member) {
        planByMemberId.set(sub.member.toString(), (sub.plan as any)?.name || 'Standard Pass');
      }
    });

    const recentMembers = recentMembersRaw.map((m: any) => ({
      ...m,
      membershipPlanName: planByMemberId.get(m._id.toString()) || 'Standard Pass',
    }));

    const revenueMap = new Map<string, number>();
    monthlyAgg.forEach((item: any) => {
      const key = `${item._id.year}-${item._id.month}`;
      revenueMap.set(key, item.total);
    });

    const monthlyRevenueData: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-IN', { month: 'short' });
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthlyRevenueData.push({ month: label, revenue: revenueMap.get(key) || 0 });
    }

    // Capacity calculation
    const gymCapacity = branchInfo?.capacity || 150;
    const occupancyPercentage = Math.min(100, Math.round((liveOccupancy / gymCapacity) * 100));

    const visibleExpiring = (expiringMemberships as any[])
      .filter((sub) => sub.member && !sub.member.isArchived)
      .slice(0, 15);

    const visibleExpired = (expiredMemberships as any[])
      .filter((sub) => sub.member && !sub.member.isArchived)
      .slice(0, 15);

    sendSuccess(res, 'Dashboard metrics', {
      metrics: {
        totalMembers,
        activeMembers,
        expiringMemberships: expiringMembershipsCount,
        alreadyExpiredCount: expiredMembershipsCount,
        newMembersThisMonth,
        liveOccupancy,
        gymCapacity,
        occupancyPercentage,
        todayTotalCheckins,
        todayRevenue: revenueSummaryAgg[0]?.todayRevenue || 0,
        monthlyRevenue: revenueSummaryAgg[0]?.monthlyRevenue || 0,
        totalRevenue: revenueSummaryAgg[0]?.totalRevenue || 0,
        pendingDuesTotal: pendingDuesAgg[0]?.total || 0,
        pendingDuesCount: pendingDuesAgg[0]?.count || 0,
      },
      expiringMemberships: visibleExpiring,
      expiredMemberships: visibleExpired,
      recentMembers,
      monthlyRevenueData,
      recentActivity,
    });
  } catch (error: any) {
    console.error('[Dashboard Stats Error]', error);
    sendError(res, error.message || 'Failed to fetch dashboard stats', 500);
  }
});

export default router;
