import { Router, Response } from 'express';
import { Membership } from '../models/Membership.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { GymSettings } from '../models/GymSettings.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { runAutoExpiryReminders, buildExpiryReminderMessage, normalizeIndianPhone } from '../services/whatsappService.js';

const router = Router();

// GET /api/expiry/grouped - Categorized list of memberships for expiry management
router.get('/grouped', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await GymSettings.getSettings();
    const gymName = settings.gymName || 'FitCore Fitness Club';

    // Current time in Asia/Kolkata
    const kolkataFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const now = new Date();
    const todayStr = kolkataFormatter.format(now); // YYYY-MM-DD
    const [y, m, d] = todayStr.split('-').map(Number);

    // Helper to get Kolkata midnight UTC boundaries
    const getKolkataRange = (daysAhead: number) => {
      const targetDate = new Date(Date.UTC(y, m - 1, d + daysAhead, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
      const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      return { start: targetDate, end: new Date(nextDate.getTime() - 1) };
    };

    // 1. Expiring in exactly 2 days (Day +2)
    const day2Range = getKolkataRange(2);
    const day2DateStr = kolkataFormatter.format(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));

    // 2. Expiring in 4 to 5 days (Day +4 and Day +5)
    const day4Range = getKolkataRange(4);
    const day5Range = getKolkataRange(5);
    const day4to5Start = day4Range.start;
    const day4to5End = day5Range.end;

    // 3. Expired memberships (Expiry date < start of today, active or expired status)
    const todayStart = getKolkataRange(0).start;

    // Fetch records
    const [expiring2DaysRaw, expiring4to5DaysRaw, expiredRaw] = await Promise.all([
      Membership.find({
        status: 'ACTIVE',
        expiryDate: { $gte: day2Range.start, $lte: day2Range.end },
      })
        .populate('member')
        .populate('plan'),

      Membership.find({
        status: 'ACTIVE',
        expiryDate: { $gte: day4to5Start, $lte: day4to5End },
      })
        .populate('member')
        .populate('plan')
        .sort({ expiryDate: 1 }),

      Membership.find({
        $or: [{ status: 'EXPIRED' }, { status: 'ACTIVE', expiryDate: { $lt: todayStart } }],
      })
        .populate('member')
        .populate('plan')
        .sort({ expiryDate: -1 })
        .limit(20),
    ]);

    // Attach notification log status to 2-day items
    const expiringIn2Days = await Promise.all(
      expiring2DaysRaw.map(async (sub) => {
        const dedupKey = `EXPIRY_2D_${sub._id}_${day2DateStr}`;
        const log = await NotificationLog.findOne({ dedupKey });

        const [yr, mo, da] = day2DateStr.split('-');
        const expiryFormatted = `${da}/${mo}/${yr}`;

        const member = sub.member as any;
        const prefilledMessage = member
          ? buildExpiryReminderMessage(member.fullName, gymName, expiryFormatted)
          : '';

        return {
          membership: sub,
          member,
          plan: sub.plan,
          expiryDateFormatted: expiryFormatted,
          daysRemaining: 2,
          notificationStatus: log ? log.status : 'SCHEDULED',
          notificationLog: log,
          prefilledMessage,
        };
      })
    );

    // Format 4–5 days items for staff manual WhatsApp messaging
    const expiringIn4To5Days = expiring4to5DaysRaw.map((sub) => {
      const member = sub.member as any;
      const expDate = new Date(sub.expiryDate);
      const diffMs = expDate.getTime() - now.getTime();
      const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const expDateKolkata = kolkataFormatter.format(expDate);
      const [yr, mo, da] = expDateKolkata.split('-');
      const expiryFormatted = `${da}/${mo}/${yr}`;

      const prefilledMessage = member
        ? buildExpiryReminderMessage(member.fullName, gymName, expiryFormatted)
        : '';

      return {
        membership: sub,
        member,
        plan: sub.plan,
        expiryDateFormatted: expiryFormatted,
        daysRemaining,
        prefilledMessage,
      };
    });

    // Format expired items
    const expired = expiredRaw.map((sub) => {
      const member = sub.member as any;
      const expDate = new Date(sub.expiryDate);
      const expDateKolkata = kolkataFormatter.format(expDate);
      const [yr, mo, da] = expDateKolkata.split('-');
      const expiryFormatted = `${da}/${mo}/${yr}`;

      const daysOverdue = Math.max(0, Math.ceil((now.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        membership: sub,
        member,
        plan: sub.plan,
        expiryDateFormatted: expiryFormatted,
        daysOverdue,
      };
    });

    const validExpiringIn2Days = expiringIn2Days.filter((item) => item.member && !item.member.isArchived);
    const validExpiringIn4To5Days = expiringIn4To5Days.filter((item) => item.member && !item.member.isArchived);
    const validExpired = expired.filter((item) => item.member && !item.member.isArchived);

    sendSuccess(res, 'Grouped expiry data', {
      summary: {
        in2DaysCount: validExpiringIn2Days.length,
        in4To5DaysCount: validExpiringIn4To5Days.length,
        expiredCount: validExpired.length,
      },
      expiringIn2Days: validExpiringIn2Days,
      expiringIn4To5Days: validExpiringIn4To5Days,
      expired: validExpired,
      whatsappConfigured: Boolean(settings.whatsapp?.phoneNumberId && settings.whatsapp?.accessToken),
    });
  } catch (error: any) {
    console.error('[Get Grouped Expiry Error]', error);
    sendError(res, error.message || 'Failed to fetch expiry data', 500);
  }
});

// POST /api/expiry/manual-reminder - Log staff manual WhatsApp reminder sent
router.post('/manual-reminder', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { membershipId, memberId, recipientPhone, recipientName, message } = req.body;

    if (!memberId || !recipientPhone) {
      return sendError(res, 'Member ID and recipient phone are required', 400);
    }

    const log = await NotificationLog.create({
      membership: membershipId,
      member: memberId,
      recipientPhone,
      recipientName: recipientName || 'Member',
      type: 'EXPIRY_MANUAL_4_5_DAYS',
      channel: 'WHATSAPP',
      status: 'SENT',
      message: message || 'Manual WhatsApp reminder initiated by staff',
      sentAt: new Date(),
    });

    sendSuccess(res, 'Manual reminder logged successfully', { log });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to log manual reminder', 500);
  }
});

// POST /api/expiry/run-scheduler-now - Manually trigger automated 2-day reminder runner
router.post('/run-scheduler-now', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'GYM_ADMIN') {
      return sendError(res, 'Unauthorized: Only administrators can trigger reminder scheduler', 403);
    }

    const result = await runAutoExpiryReminders();
    sendSuccess(res, 'Automated reminder scheduler executed', result);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to run automated reminder scheduler', 500);
  }
});

// GET /api/expiry/notification-logs - Audit trail of WhatsApp reminders
router.get('/notification-logs', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;

    const filter: any = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    const [logs, total] = await Promise.all([
      NotificationLog.find(filter)
        .populate('member', 'fullName memberId phone photoUrl')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      NotificationLog.countDocuments(filter),
    ]);

    sendSuccess(res, 'Notification logs fetched', {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch notification logs', 500);
  }
});

export default router;
