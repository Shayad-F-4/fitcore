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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTDateRanges() {
  const nowUTC = new Date();
  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS);
  const istYear = nowIST.getUTCFullYear();
  const istMonth = nowIST.getUTCMonth();
  const istDate = nowIST.getUTCDate();

  // Start of today in IST (00:00:00.000 IST converted to UTC date)
  const startOfTodayIST = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - IST_OFFSET_MS);
  // End of today in IST (23:59:59.999 IST converted to UTC date)
  const endOfTodayIST = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - IST_OFFSET_MS);

  // 30 calendar days including today: 29 days before today at 00:00:00.000 IST
  const startOf30DaysAgoIST = new Date(Date.UTC(istYear, istMonth, istDate - 29, 0, 0, 0) - IST_OFFSET_MS);

  // Expiring soon: from today through next 7 calendar days inclusive (0 to 7 days inclusive)
  const endOf7DaysLaterIST = new Date(Date.UTC(istYear, istMonth, istDate + 7, 23, 59, 59, 999) - IST_OFFSET_MS);

  // This month in IST
  const startOfThisMonthIST = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0) - IST_OFFSET_MS);

  // Last 90 days in IST
  const startOf90DaysAgoIST = new Date(Date.UTC(istYear, istMonth, istDate - 89, 0, 0, 0) - IST_OFFSET_MS);

  // This year in IST
  const startOfThisYearIST = new Date(Date.UTC(istYear, 0, 1, 0, 0, 0) - IST_OFFSET_MS);

  // Next 30 days in IST
  const endOf30DaysLaterIST = new Date(Date.UTC(istYear, istMonth, istDate + 30, 23, 59, 59, 999) - IST_OFFSET_MS);

  return {
    startOfTodayIST,
    endOfTodayIST,
    startOf30DaysAgoIST,
    endOf7DaysLaterIST,
    startOfThisMonthIST,
    startOf90DaysAgoIST,
    startOfThisYearIST,
    endOf30DaysLaterIST,
  };
}

function calculateExpiryDetails(expiryDate: Date | string | null | undefined, istDates: ReturnType<typeof getISTDateRanges>) {
  if (!expiryDate) {
    return {
      daysRemaining: null,
      daysSinceExpiry: null,
      expiryLabel: null,
      isExpiringSoon: false,
      isExpired: false,
    };
  }

  const exp = new Date(expiryDate);
  const diffMs = exp.getTime() - istDates.startOfTodayIST.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let expiryLabel = '';
  let isExpiringSoon = false;
  let isExpired = false;

  if (exp < istDates.startOfTodayIST) {
    isExpired = true;
    const daysSince = Math.max(1, Math.abs(diffDays));
    expiryLabel = daysSince === 1 ? 'Expired 1 day ago' : `Expired ${daysSince} days ago`;
    return {
      daysRemaining: diffDays,
      daysSinceExpiry: daysSince,
      expiryLabel,
      isExpiringSoon: false,
      isExpired: true,
    };
  } else if (diffDays === 0) {
    expiryLabel = 'Expires Today';
    isExpiringSoon = true;
  } else if (diffDays === 1) {
    expiryLabel = 'Expires Tomorrow';
    isExpiringSoon = true;
  } else if (diffDays <= 7) {
    expiryLabel = `Expires in ${diffDays} Days`;
    isExpiringSoon = true;
  } else {
    expiryLabel = `Expires in ${diffDays} Days`;
    isExpiringSoon = false;
  }

  return {
    daysRemaining: diffDays,
    daysSinceExpiry: 0,
    expiryLabel,
    isExpiringSoon,
    isExpired: false,
  };
}

// Member statistics: returns exact live counts from actual database records
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.query;
    const filter: any = { isArchived: false };
    if (branchId && branchId !== 'ALL') filter.branch = branchId;

    const istDates = getISTDateRanges();
    const branchMemberIds = await Member.find(filter).distinct('_id');

    // 1. Total non-archived members
    const total = branchMemberIds.length;

    // Run independent count and membership queries concurrently via Promise.all
    const [
      newMembers,
      active,
      femaleMembers,
      archived,
      frozen,
      pending,
      expiringSoonSubs,
      validActiveSubs,
      membersWithExpiredSubs,
      memberStatusExpired,
      duesFromMemberships,
      duesFromPayments,
    ] = await Promise.all([
      // 2. New Members: joinDate falls within previous 30 calendar days (Asia/Kolkata)
      Member.countDocuments({
        ...filter,
        $or: [
          { joinDate: { $gte: istDates.startOf30DaysAgoIST, $lte: istDates.endOfTodayIST } },
          { joinDate: { $exists: false }, createdAt: { $gte: istDates.startOf30DaysAgoIST, $lte: istDates.endOfTodayIST } },
        ],
      }),

      // 3. Active Members
      Member.countDocuments({ ...filter, status: 'ACTIVE' }),

      // Female members count
      Member.countDocuments({ ...filter, gender: 'FEMALE' }),

      // Archived count
      Member.countDocuments({
        isArchived: true,
        ...(branchId && branchId !== 'ALL' ? { branch: branchId } : {}),
      }),

      // Frozen & Pending count
      Member.countDocuments({ ...filter, status: 'FROZEN' }),
      Member.countDocuments({ ...filter, status: 'PENDING' }),

      // 4. Candidate Expiring Soon: memberships expiring from today through next 7 calendar days inclusive
      Membership.find({
        member: { $in: branchMemberIds },
        isArchived: { $ne: true },
        status: 'ACTIVE',
        expiryDate: { $gte: istDates.startOfTodayIST, $lte: istDates.endOf7DaysLaterIST },
      }).distinct('member'),

      // 5. Valid active memberships (today and future)
      Membership.find({
        member: { $in: branchMemberIds },
        isArchived: { $ne: true },
        status: { $in: ['ACTIVE', 'FROZEN'] },
        expiryDate: { $gte: istDates.startOfTodayIST },
      }).distinct('member'),

      // Expired memberships
      Membership.find({
        member: { $in: branchMemberIds },
        isArchived: { $ne: true },
        $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: istDates.startOfTodayIST } }],
      }).distinct('member'),

      // Members explicitly marked EXPIRED
      Member.find({ ...filter, status: 'EXPIRED' }).distinct('_id'),

      // 6. Dues from memberships and payments
      Membership.find({
        member: { $in: branchMemberIds },
        isArchived: { $ne: true },
        $expr: { $gt: ['$amountDue', '$amountPaid'] },
      }).distinct('member'),

      Payment.find({
        member: { $in: branchMemberIds },
        status: 'PARTIAL',
        balanceRemaining: { $gt: 0 },
      }).distinct('member'),
    ]);

    // Check if any candidate expiring soon has another valid membership extending beyond 7 days
    let expiringSoon = 0;
    if (expiringSoonSubs.length > 0) {
      const futureActiveSubs = await Membership.find({
        member: { $in: expiringSoonSubs },
        isArchived: { $ne: true },
        status: 'ACTIVE',
        expiryDate: { $gt: istDates.endOf7DaysLaterIST },
      }).distinct('member');
      const futureSet = new Set(futureActiveSubs.map((id) => id.toString()));
      const expiringSoonIds = expiringSoonSubs.filter((id) => !futureSet.has(id.toString()));
      expiringSoon = expiringSoonIds.length;
    }

    // Expired calculation
    const validActiveSet = new Set(validActiveSubs.map((id) => id.toString()));
    const expiredIds = Array.from(
      new Set([
        ...membersWithExpiredSubs.map((id) => id.toString()),
        ...memberStatusExpired.map((id) => id.toString()),
      ])
    ).filter((id) => !validActiveSet.has(id));
    const expired = expiredIds.length;

    // Pending dues calculation
    const pendingDuesIds = Array.from(
      new Set([
        ...duesFromMemberships.map((id) => id.toString()),
        ...duesFromPayments.map((id) => id.toString()),
      ])
    );
    const pendingDues = pendingDuesIds.length;

    sendSuccess(res, 'Member statistics retrieved', {
      total,
      newMembers,
      active,
      expiringSoon,
      expired,
      pendingDues,
      femaleMembers,
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

// List members with unified search, category tabs, and composable filters
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 12;
    const search = ((req.query.search as string) || '').trim();
    const status = req.query.status as string;
    const branch = req.query.branch as string;
    const isArchived = req.query.isArchived === 'true';

    // Advanced category and filter parameters
    const tab = ((req.query.tab as string) || 'ALL').toUpperCase();
    const gender = ((req.query.gender as string) || '').toUpperCase();
    const paymentStatus = ((req.query.paymentStatus as string) || '').toUpperCase();
    const plan = req.query.plan as string;
    const joiningDate = ((req.query.joiningDate as string) || '').toUpperCase();
    const expiryPeriod = ((req.query.expiryPeriod as string) || '').toUpperCase();
    const sortBy = req.query.sortBy as string;

    const istDates = getISTDateRanges();
    const filter: any = { isArchived };

    if (branch && branch !== 'ALL') {
      filter.branch = branch;
    }

    // Gender filter (Female Members tab or explicit gender dropdown)
    if (tab === 'FEMALE' || gender === 'FEMALE') {
      filter.gender = 'FEMALE';
    } else if (gender && gender !== 'ALL') {
      filter.gender = gender;
    }

    // Membership Status filter
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    // Joining Date filter (New Members tab or explicit joiningDate dropdown)
    if (tab === 'NEW' || joiningDate === 'LAST_30_DAYS') {
      filter.$or = [
        { joinDate: { $gte: istDates.startOf30DaysAgoIST, $lte: istDates.endOfTodayIST } },
        { joinDate: { $exists: false }, createdAt: { $gte: istDates.startOf30DaysAgoIST, $lte: istDates.endOfTodayIST } },
      ];
    } else if (joiningDate === 'THIS_MONTH') {
      filter.joinDate = { $gte: istDates.startOfThisMonthIST, $lte: istDates.endOfTodayIST };
    } else if (joiningDate === 'LAST_90_DAYS') {
      filter.joinDate = { $gte: istDates.startOf90DaysAgoIST, $lte: istDates.endOfTodayIST };
    } else if (joiningDate === 'THIS_YEAR') {
      filter.joinDate = { $gte: istDates.startOfThisYearIST, $lte: istDates.endOfTodayIST };
    }

    // Collect ID constraint sets from membership, expiry, payment, and plan conditions
    const idConstraintSets: string[][] = [];

    // Plan Filter
    if (plan && plan !== 'ALL') {
      const subsWithPlan = await Membership.find({ plan, isArchived: { $ne: true } }).distinct('member');
      idConstraintSets.push(subsWithPlan.map((id) => id.toString()));
    }

    // Expiring Soon Filter (Tab or Dropdown)
    if (tab === 'EXPIRING_SOON' || expiryPeriod === 'EXPIRING_SOON_7_DAYS' || expiryPeriod === 'EXPIRING_TODAY') {
      const maxExpiry = expiryPeriod === 'EXPIRING_TODAY' ? istDates.endOfTodayIST : istDates.endOf7DaysLaterIST;
      const candidateSubs = await Membership.find({
        isArchived: { $ne: true },
        status: 'ACTIVE',
        expiryDate: { $gte: istDates.startOfTodayIST, $lte: maxExpiry },
      }).distinct('member');

      const futureSubs = await Membership.find({
        member: { $in: candidateSubs },
        isArchived: { $ne: true },
        status: 'ACTIVE',
        expiryDate: { $gt: maxExpiry },
      }).distinct('member');
      const futureSet = new Set(futureSubs.map((id) => id.toString()));
      const validExpiringSoon = candidateSubs.filter((id) => !futureSet.has(id.toString()));
      idConstraintSets.push(validExpiringSoon.map((id) => id.toString()));
    } else if (expiryPeriod === 'NEXT_30_DAYS') {
      const candidateSubs = await Membership.find({
        isArchived: { $ne: true },
        status: 'ACTIVE',
        expiryDate: { $gte: istDates.startOfTodayIST, $lte: istDates.endOf30DaysLaterIST },
      }).distinct('member');
      idConstraintSets.push(candidateSubs.map((id) => id.toString()));
    }

    // Expired Members Filter (Tab or Dropdown)
    if (tab === 'EXPIRED' || expiryPeriod === 'EXPIRED') {
      const validActiveSubs = await Membership.find({
        isArchived: { $ne: true },
        status: { $in: ['ACTIVE', 'FROZEN'] },
        expiryDate: { $gte: istDates.startOfTodayIST },
      }).distinct('member');
      const validActiveSet = new Set(validActiveSubs.map((id) => id.toString()));

      const expiredSubs = await Membership.find({
        isArchived: { $ne: true },
        $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: istDates.startOfTodayIST } }],
      }).distinct('member');

      const memberStatusExpired = await Member.find({ isArchived, status: 'EXPIRED' }).distinct('_id');

      const expiredIds = Array.from(
        new Set([
          ...expiredSubs.map((id) => id.toString()),
          ...memberStatusExpired.map((id) => id.toString()),
        ])
      ).filter((id) => !validActiveSet.has(id));

      idConstraintSets.push(expiredIds);
    }

    // Payment Status Filter (Paid vs Pending Payment)
    if (paymentStatus === 'PENDING_PAYMENT') {
      const duesFromSubs = await Membership.find({
        isArchived: { $ne: true },
        $expr: { $gt: ['$amountDue', '$amountPaid'] },
      }).distinct('member');
      const duesFromPayments = await Payment.find({
        status: 'PARTIAL',
        balanceRemaining: { $gt: 0 },
      }).distinct('member');
      const allDuesIds = Array.from(
        new Set([
          ...duesFromSubs.map((id) => id.toString()),
          ...duesFromPayments.map((id) => id.toString()),
        ])
      );
      idConstraintSets.push(allDuesIds);
    } else if (paymentStatus === 'PAID') {
      const duesFromSubs = await Membership.find({
        isArchived: { $ne: true },
        $expr: { $gt: ['$amountDue', '$amountPaid'] },
      }).distinct('member');
      const duesFromPayments = await Payment.find({
        status: 'PARTIAL',
        balanceRemaining: { $gt: 0 },
      }).distinct('member');
      const allDuesSet = new Set([
        ...duesFromSubs.map((id) => id.toString()),
        ...duesFromPayments.map((id) => id.toString()),
      ]);

      const paidSubs = await Membership.find({
        isArchived: { $ne: true },
        amountPaid: { $gt: 0 },
      }).distinct('member');

      const paidIds = paidSubs
        .map((id) => id.toString())
        .filter((id) => !allDuesSet.has(id));
      idConstraintSets.push(paidIds);
    }

    // Intersect all membership/payment ID constraints
    if (idConstraintSets.length > 0) {
      let intersection = idConstraintSets[0];
      for (let i = 1; i < idConstraintSets.length; i++) {
        const currentSet = new Set(idConstraintSets[i]);
        intersection = intersection.filter((id) => currentSet.has(id));
      }
      filter._id = { $in: intersection };
    }

    // Multi-field search
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      const searchOr = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { memberId: regex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    // Sorting definition
    let sortObj: any = { createdAt: -1 };
    let sortByExpiryOrder: 'asc' | 'desc' | null = null;

    if (sortBy === 'name_asc') {
      sortObj = { fullName: 1 };
    } else if (sortBy === 'join_desc' || (!sortBy && tab === 'NEW')) {
      sortObj = { joinDate: -1, createdAt: -1 };
    } else if (sortBy === 'join_asc') {
      sortObj = { joinDate: 1, createdAt: 1 };
    } else if (sortBy === 'created_desc') {
      sortObj = { createdAt: -1 };
    } else if (sortBy === 'expiry_asc' || (!sortBy && tab === 'EXPIRING_SOON')) {
      sortByExpiryOrder = 'asc';
    } else if (sortBy === 'expiry_desc' || (!sortBy && tab === 'EXPIRED')) {
      sortByExpiryOrder = 'desc';
    }

    const skip = (page - 1) * limit;

    let members: any[] = [];
    let total = 0;

    if (sortByExpiryOrder) {
      // Sort members by their applicable membership expiryDate
      const allMatchingIds = await Member.find(filter).distinct('_id');
      total = allMatchingIds.length;

      const membershipsForSort = await Membership.find({
        member: { $in: allMatchingIds },
        isArchived: { $ne: true },
      })
        .sort({ expiryDate: sortByExpiryOrder === 'asc' ? 1 : -1 })
        .select('member expiryDate')
        .lean();

      const seenIds = new Set<string>();
      const orderedMemberIds: any[] = [];
      for (const sub of membershipsForSort) {
        const idStr = sub.member.toString();
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          orderedMemberIds.push(sub.member);
        }
      }
      for (const id of allMatchingIds) {
        const idStr = id.toString();
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          orderedMemberIds.push(id);
        }
      }

      const pagedMemberIds = orderedMemberIds.slice(skip, skip + limit);
      const fetchedMembers = await Member.find({ _id: { $in: pagedMemberIds } })
        .populate('branch', 'name code')
        .lean();

      const memberMap = new Map<string, any>();
      for (const m of fetchedMembers) {
        memberMap.set(m._id.toString(), m);
      }
      members = pagedMemberIds.map((id) => memberMap.get(id.toString())).filter(Boolean);
    } else {
      [members, total] = await Promise.all([
        Member.find(filter)
          .populate('branch', 'name code')
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .lean(),
        Member.countDocuments(filter),
      ]);
    }

    // Attach current active membership summary, dues, and expiry details
    const memberIds = members.map((m) => m._id);

    const [memberships, payments] = await Promise.all([
      Membership.find({
        member: { $in: memberIds },
        isArchived: { $ne: true },
      })
        .select('member plan startDate expiryDate originalPrice discount amountDue amountPaid status renewalHistory notes')
        .populate('plan', 'name type price durationDays')
        .sort({ expiryDate: -1 })
        .lean(),
      Payment.find({
        member: { $in: memberIds },
        status: { $in: ['PAID', 'PARTIAL'] },
      })
        .select('member balanceRemaining')
        .lean(),
    ]);

    const memberMembershipsMap = new Map<string, any[]>();
    for (const sub of memberships) {
      const memId = sub.member.toString();
      if (!memberMembershipsMap.has(memId)) {
        memberMembershipsMap.set(memId, []);
      }
      memberMembershipsMap.get(memId)!.push(sub);
    }

    const memberPaymentsMap = new Map<string, any[]>();
    for (const pay of payments) {
      const memId = pay.member.toString();
      if (!memberPaymentsMap.has(memId)) {
        memberPaymentsMap.set(memId, []);
      }
      memberPaymentsMap.get(memId)!.push(pay);
    }

    const enrichedMembers = members.map((m) => {
      const memberSubs = memberMembershipsMap.get(m._id.toString()) || [];
      const memberPays = memberPaymentsMap.get(m._id.toString()) || [];

      // Determine applicable membership:
      // 1. First priority: active unexpired membership (status === 'ACTIVE' && expiryDate >= today) or status === 'FROZEN'
      let applicableSub = memberSubs.find(
        (s) => (s.status === 'ACTIVE' && new Date(s.expiryDate) >= istDates.startOfTodayIST) || s.status === 'FROZEN'
      );
      // 2. Second priority: any active membership
      if (!applicableSub) {
        applicableSub = memberSubs.find((s) => s.status === 'ACTIVE');
      }
      // 3. Third priority: latest historical membership (e.g. EXPIRED)
      if (!applicableSub && memberSubs.length > 0) {
        applicableSub = memberSubs[0];
      }

      // Calculate dues
      const totalDue = memberSubs.reduce((acc, s) => acc + (s.amountDue || 0), 0);
      const totalPaid = memberSubs.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
      const subBalanceDue = memberSubs.reduce(
        (acc, s) => acc + Math.max(0, (s.amountDue || 0) - (s.amountPaid || 0)),
        0
      );
      const paymentBalanceDue = memberPays.reduce((acc, p) => acc + (p.balanceRemaining || 0), 0);
      const balanceDue = Math.max(subBalanceDue, paymentBalanceDue);

      let paymentStatus: 'PAID' | 'PENDING_PAYMENT' | 'NO_DUES' = 'NO_DUES';
      if (balanceDue > 0) {
        paymentStatus = 'PENDING_PAYMENT';
      } else if (totalPaid > 0 || memberPays.length > 0) {
        paymentStatus = 'PAID';
      }

      const expiryDetails = calculateExpiryDetails(applicableSub?.expiryDate, istDates);

      return {
        ...m,
        photoUrl: m.photoUrl && m.photoUrl.includes('unsplash.com') ? '' : m.photoUrl,
        currentMembership: applicableSub || null,
        paymentStatus,
        balanceDue,
        totalDue,
        totalPaid,
        daysRemaining: expiryDetails.daysRemaining,
        daysSinceExpiry: expiryDetails.daysSinceExpiry,
        expiryLabel: expiryDetails.expiryLabel,
        isExpiringSoon: expiryDetails.isExpiringSoon,
        isExpired: expiryDetails.isExpired,
      };
    });

    sendPaginated(res, enrichedMembers, total, page, limit, 'Members fetched');
  } catch (error: any) {
    console.error('[Get Members Error]', error);
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
    const memberObj = member.toObject();
    if (memberObj.photoUrl && memberObj.photoUrl.includes('unsplash.com')) {
      memberObj.photoUrl = '';
    }

    sendSuccess(res, 'Member profile retrieved', {
      member: memberObj,
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
      gender: gender ? gender.toUpperCase() : undefined,
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

// Delete member permanently from DB (Admin only)
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    // Permanently remove the member and their linked records from the database
    await Promise.all([
      Member.findByIdAndDelete(member._id),
      member.user ? User.findByIdAndDelete(member.user) : Promise.resolve(),
      Membership.deleteMany({ member: member._id }),
      Attendance.deleteMany({ member: member._id }),
      Payment.deleteMany({ member: member._id }),
      FollowUp.deleteMany({ member: member._id }),
      NotificationLog.deleteMany({ member: member._id }),
    ]);

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
        permanentlyDeleted: true,
      },
    });

    sendSuccess(res, `Member "${member.fullName}" (${member.memberId}) was permanently deleted from the database.`, {
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

    // Synchronize isArchived flag on all memberships
    await Membership.updateMany(
      { member: member._id },
      { $set: { isArchived: false } }
    );

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

// Archive member (Admin only)
router.patch('/:id/archive', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    member.isArchived = true;
    member.status = 'ARCHIVED';
    await member.save();

    // Synchronize isArchived flag on all memberships
    await Membership.updateMany(
      { member: member._id },
      { $set: { isArchived: true } }
    );

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
      },
    });

    sendSuccess(res, `Member "${member.fullName}" (${member.memberId}) was archived successfully.`, member);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to archive member', 500);
  }
});

export default router;
