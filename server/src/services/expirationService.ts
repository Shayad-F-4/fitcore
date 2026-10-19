import { Membership } from '../models/Membership.js';
import { Member } from '../models/Member.js';
import { Notification } from '../models/Notification.js';

export interface ExpirationSummary {
  expiringIn7Days: number;
  expiringToday: number;
  alreadyExpired: number;
  renewalsThisMonth: number;
}

export const runExpirationCheck = async (): Promise<ExpirationSummary> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateStr = now.toISOString().split('T')[0];

  // 1. Process memberships that have expired
  const expiredMemberships = await Membership.find({
    status: 'ACTIVE',
    expiryDate: { $lt: todayStart },
  }).populate('member');

  for (const sub of expiredMemberships) {
    sub.status = 'EXPIRED';
    await sub.save();

    const member = sub.member as any;
    if (member && !member.isArchived) {
      await Member.findByIdAndUpdate(member._id, { status: 'EXPIRED' });

      // Create deduplicated notification
      const dedupKey = `EXPIRED_${member.memberId || member._id}_${dateStr}`;
      try {
        await Notification.create({
          title: 'Membership Expired',
          message: `${member.fullName}'s membership has expired. Follow-up required for renewal.`,
          type: 'EXPIRED',
          member: member._id,
          membership: sub._id,
          targetRole: 'ALL_STAFF',
          dedupKey,
        });
      } catch {
        // Ignored if duplicate key exists
      }
    }
  }

  // 2. Memberships expiring today
  const expiringTodayList = await Membership.find({
    status: 'ACTIVE',
    expiryDate: { $gte: todayStart, $lte: todayEnd },
  }).populate('member');

  for (const sub of expiringTodayList) {
    const member = sub.member as any;
    if (member && !member.isArchived) {
      const dedupKey = `EXP_TODAY_${member.memberId || member._id}_${dateStr}`;
      try {
        await Notification.create({
          title: 'Membership Expiring Today',
          message: `${member.fullName}'s membership expires today. Offer renewal at the front desk.`,
          type: 'EXPIRING_TODAY',
          member: member._id,
          membership: sub._id,
          targetRole: 'ALL_STAFF',
          dedupKey,
        });
      } catch {
        // Ignored if duplicate
      }
    }
  }

  // 3. Memberships expiring within 7 days
  const expiring7DaysList = await Membership.find({
    status: 'ACTIVE',
    expiryDate: { $gt: todayEnd, $lte: in7Days },
  }).populate('member');

  for (const sub of expiring7DaysList) {
    const member = sub.member as any;
    if (member && !member.isArchived) {
      const daysRemaining = Math.max(1, Math.ceil((sub.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const dedupKey = `EXP_7D_${member.memberId || member._id}_${dateStr}`;
      try {
        await Notification.create({
          title: 'Membership Expiring Soon',
          message: `${member.fullName}'s membership expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`,
          type: 'EXPIRING_SOON',
          member: member._id,
          membership: sub._id,
          targetRole: 'ALL_STAFF',
          dedupKey,
        });
      } catch {
        // Ignored if duplicate
      }
    }
  }

  // Compute counts for summary
  const [expiring7, expiring0, expiredCount] = await Promise.all([
    Membership.countDocuments({ status: 'ACTIVE', expiryDate: { $gte: todayStart, $lte: in7Days } }),
    Membership.countDocuments({ status: 'ACTIVE', expiryDate: { $gte: todayStart, $lte: todayEnd } }),
    Membership.countDocuments({ status: 'EXPIRED' }),
  ]);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const renewalsThisMonth = await Membership.countDocuments({
    'renewalHistory.renewedAt': { $gte: startOfMonth },
  });

  return {
    expiringIn7Days: expiring7,
    expiringToday: expiring0,
    alreadyExpired: expiredCount,
    renewalsThisMonth,
  };
};
