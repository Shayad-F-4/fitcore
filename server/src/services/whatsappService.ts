import { GymSettings } from '../models/GymSettings.js';
import { NotificationLog, NotificationStatus } from '../models/NotificationLog.js';
import { Membership } from '../models/Membership.js';
import { Member } from '../models/Member.js';

export interface WhatsAppSendResult {
  status: NotificationStatus;
  externalId?: string;
  error?: string;
  messageText: string;
}

/**
 * Standardize and validate Indian mobile phone numbers
 * Returns clean E.164 string with '91' prefix (e.g. '919876543210') or null if invalid
 */
export const normalizeIndianPhone = (inputPhone: string): { valid: boolean; formatted: string; error?: string } => {
  if (!inputPhone) {
    return { valid: false, formatted: '', error: 'Phone number is required' };
  }

  // Strip all non-digit characters
  const digits = inputPhone.replace(/\D/g, '');

  let nationalNumber = '';

  if (digits.length === 10) {
    nationalNumber = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    nationalNumber = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    nationalNumber = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith('091')) {
    nationalNumber = digits.slice(3);
  } else {
    return {
      valid: false,
      formatted: digits,
      error: `Invalid length (${digits.length} digits). Standard Indian mobile must have 10 digits.`,
    };
  }

  // Validate Indian mobile range: starts with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
    return {
      valid: false,
      formatted: nationalNumber,
      error: `Invalid Indian mobile starting digit '${nationalNumber[0]}'. Mobile numbers must start with 6, 7, 8, or 9.`,
    };
  }

  return { valid: true, formatted: `91${nationalNumber}` };
};

/**
 * Generates the standardized Indian gym expiry reminder message
 */
export const buildExpiryReminderMessage = (
  memberName: string,
  gymName: string,
  expiryDateStr: string
): string => {
  return `Hi ${memberName}, your ${gymName} gym membership expires on ${expiryDateStr}. Please renew your membership on time to continue your workouts without interruption. For renewal assistance, contact our front desk. Thank you!`;
};

/**
 * Sends a WhatsApp message using Meta WhatsApp Business Platform Cloud API
 * If credentials are not configured, returns NOT_CONFIGURED status.
 */
export const sendWhatsAppCloudMessage = async (params: {
  toPhone: string;
  memberName: string;
  gymName: string;
  expiryDateFormatted: string;
  templateName?: string;
}): Promise<WhatsAppSendResult> => {
  const settings = await GymSettings.getSettings();
  const phoneValidation = normalizeIndianPhone(params.toPhone);

  const messageText = buildExpiryReminderMessage(
    params.memberName,
    params.gymName,
    params.expiryDateFormatted
  );

  if (!phoneValidation.valid) {
    return {
      status: 'FAILED',
      error: phoneValidation.error || 'Invalid Indian mobile number',
      messageText,
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsapp?.phoneNumberId;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || settings.whatsapp?.accessToken;
  const templateName = settings.whatsapp?.templateName || process.env.WHATSAPP_TEMPLATE_NAME || 'membership_expiry_reminder';

  // If credentials are not configured, accurately report setup requirement
  if (!phoneNumberId || !accessToken) {
    return {
      status: 'NOT_CONFIGURED',
      error: 'WhatsApp Business Platform Cloud API credentials (Phone Number ID or Access Token) are not configured. Please configure them in Settings or .env file.',
      messageText,
    };
  }

  const targetRecipient = phoneValidation.formatted; // e.g. '919876543210'

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    // Attempt template message first as per official WhatsApp Business policy
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetRecipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: params.memberName },
              { type: 'text', text: params.gymName },
              { type: 'text', text: params.expiryDateFormatted },
            ],
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.error?.error_user_msg || `Meta API HTTP ${response.status}`;
      return {
        status: 'FAILED',
        error: errorMsg,
        messageText,
      };
    }

    const messageId = data?.messages?.[0]?.id || `wamid.sim_${Date.now()}`;
    return {
      status: 'SENT',
      externalId: messageId,
      messageText,
    };
  } catch (err: any) {
    return {
      status: 'FAILED',
      error: err.message || 'Network exception communicating with WhatsApp Cloud API',
      messageText,
    };
  }
};

/**
 * Automated Daily Job:
 * Identifies active memberships expiring in exactly 2 days in Asia/Kolkata timezone.
 * Sends personalized WhatsApp reminder, logs outcome, and prevents duplicates.
 */
export const runAutoExpiryReminders = async (): Promise<{
  totalIdentified: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  notConfiguredCount: number;
}> => {
  const settings = await GymSettings.getSettings();

  // If auto reminders are switched off in settings, skip
  if (settings.whatsapp && settings.whatsapp.autoReminder2DaysEnabled === false) {
    return { totalIdentified: 0, sentCount: 0, failedCount: 0, skippedCount: 0, notConfiguredCount: 0 };
  }

  // Calculate calendar date exactly 2 days from now in Asia/Kolkata timezone
  const kolkataFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const now = new Date();
  // 2 days in future
  const twoDaysFuture = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const targetDateStr = kolkataFormatter.format(twoDaysFuture); // YYYY-MM-DD in Asia/Kolkata

  // Range in UTC corresponding to that Kolkata calendar day (00:00:00 to 23:59:59 IST)
  // IST is UTC + 5:30 -> 00:00 IST = 18:30 UTC previous day, 23:59:59 IST = 18:29:59 UTC target day
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const startOfDayKolkata = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
  const endOfDayKolkata = new Date(startOfDayKolkata.getTime() + 24 * 60 * 60 * 1000 - 1);

  // Find active memberships expiring on that Kolkata calendar day
  const memberships = await Membership.find({
    status: 'ACTIVE',
    expiryDate: { $gte: startOfDayKolkata, $lte: endOfDayKolkata },
  }).populate('member');

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let notConfiguredCount = 0;

  const gymName = settings.gymName || 'FitCore Fitness Club';

  for (const sub of memberships) {
    const member = sub.member as any;
    if (!member || member.isArchived) {
      skippedCount++;
      continue;
    }

    // Check if membership has already been renewed or superseded
    const newerSub = await Membership.findOne({
      member: member._id,
      status: 'ACTIVE',
      createdAt: { $gt: sub.createdAt },
    });
    if (newerSub) {
      // Member already renewed with another subscription! Do not send stale reminder.
      skippedCount++;
      continue;
    }

    const dedupKey = `EXPIRY_2D_${sub._id}_${targetDateStr}`;

    // Deduplication check: check if a notification log already exists for this membership & expiry date
    const existingLog = await NotificationLog.findOne({ dedupKey });
    if (existingLog && (existingLog.status === 'SENT' || existingLog.status === 'NOT_CONFIGURED')) {
      skippedCount++;
      continue;
    }

    // Format date in Indian style: DD/MM/YYYY
    const [y, m, d] = targetDateStr.split('-');
    const expiryFormatted = `${d}/${m}/${y}`;

    const sendResult = await sendWhatsAppCloudMessage({
      toPhone: member.phone,
      memberName: member.fullName,
      gymName,
      expiryDateFormatted: expiryFormatted,
    });

    try {
      if (existingLog) {
        existingLog.status = sendResult.status;
        existingLog.externalId = sendResult.externalId;
        existingLog.failureReason = sendResult.error;
        existingLog.retryCount = (existingLog.retryCount || 0) + 1;
        existingLog.sentAt = sendResult.status === 'SENT' ? new Date() : undefined;
        await existingLog.save();
      } else {
        await NotificationLog.create({
          membership: sub._id,
          member: member._id,
          recipientPhone: member.phone,
          recipientName: member.fullName,
          type: 'EXPIRY_2_DAYS',
          channel: 'WHATSAPP',
          status: sendResult.status,
          message: sendResult.messageText,
          externalId: sendResult.externalId,
          failureReason: sendResult.error,
          dedupKey,
          sentAt: sendResult.status === 'SENT' ? new Date() : undefined,
        });
      }
    } catch (saveErr) {
      console.error('[NotificationLog DB Save Error]', saveErr);
    }

    if (sendResult.status === 'SENT') {
      sentCount++;
    } else if (sendResult.status === 'NOT_CONFIGURED') {
      notConfiguredCount++;
    } else {
      failedCount++;
    }
  }

  return {
    totalIdentified: memberships.length,
    sentCount,
    failedCount,
    skippedCount,
    notConfiguredCount,
  };
};
