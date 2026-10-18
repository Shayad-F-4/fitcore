/**
 * FitCore Indian WhatsApp Messaging Utilities
 * Generates direct wa.me links with courteous, personalized gym messages.
 */

import { cleanIndianPhone, formatDateIN, formatINR } from './formatters';

export { cleanIndianPhone as cleanWhatsAppPhone };

export interface ExpiryReminderParams {
  name: string;
  phone: string;
  planName?: string;
  expiryDate: string;
  daysRemaining?: number;
  gymName?: string;
}

/**
 * Standard Indian Gym Membership Expiry Message Template
 * "Hi {{member_name}}, your {{gym_name}} gym membership expires on {{expiry_date}}. Please renew your membership on time to continue your workouts without interruption. For renewal assistance, contact our front desk. Thank you!"
 */
export const getExpiryReminderMessage = ({
  name,
  expiryDate,
  gymName = 'FitCore Fitness Club',
}: Omit<ExpiryReminderParams, 'phone'>): string => {
  const formattedDate = formatDateIN(expiryDate);
  return `Hi ${name}, your ${gymName} gym membership expires on ${formattedDate}. Please renew your membership on time to continue your workouts without interruption. For renewal assistance, contact our front desk. Thank you!`;
};

export const getWelcomeMessage = (
  name: string,
  memberId: string,
  gymName = 'FitCore Fitness Club'
): string => {
  return (
    `Welcome to ${gymName}, ${name}! 🏋️🔥\n\n` +
    `Your gym membership is officially active. Your Member ID is *${memberId}*.\n\n` +
    `You can use your digital QR pass or provide your Member ID / phone number at the counter for instant check-in.\n\n` +
    `Let's crush your fitness goals together!\n${gymName}`
  );
};

export const openWhatsApp = (phone: string, message: string): boolean => {
  const cleanPhone = cleanIndianPhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    alert('This member does not have a valid Indian mobile number recorded.');
    return false;
  }

  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};

export const sendWhatsAppReminder = (params: ExpiryReminderParams): boolean => {
  const message = getExpiryReminderMessage(params);
  return openWhatsApp(params.phone, message);
};

export interface ExpiredNoticeParams {
  name: string;
  phone: string;
  planName?: string;
  expiryDate: string;
  gymName?: string;
}

export const getExpiredNoticeMessage = ({
  name,
  expiryDate,
  planName = 'FitCore Membership',
  gymName = 'FitCore Fitness Club',
}: Omit<ExpiredNoticeParams, 'phone'>): string => {
  const formattedDate = formatDateIN(expiryDate);
  return (
    `Hi ${name}! 👋\n\n` +
    `Your gym membership pass (*${planName}*) at *${gymName}* expired on *${formattedDate}*. 🔴\n\n` +
    `Please renew your membership to continue your workout sessions and achieve your fitness goals without disruption.\n\n` +
    `You can renew your pass at the front desk or reply here for renewal assistance.\n\n` +
    `Thank you,\n*${gymName}*`
  );
};

export const sendWhatsAppExpiredNotice = (params: ExpiredNoticeParams): boolean => {
  const message = getExpiredNoticeMessage(params);
  return openWhatsApp(params.phone, message);
};


export interface DueReminderParams {
  name: string;
  phone: string;
  dueAmount?: number;
  amountPending?: number;
  amountDue?: number;
  amountPaid?: number;
  planName?: string;
  currency?: string;
  gymName?: string;
}

export const getDueReminderMessage = ({
  name,
  dueAmount,
  amountPending,
  planName = 'FitCore Membership',
  gymName = 'FitCore Fitness Club',
}: Omit<DueReminderParams, 'phone'>): string => {
  const finalDue = dueAmount ?? amountPending ?? 0;
  const formattedDue = formatINR(finalDue);
  return (
    `Hello ${name}! 👋\n\n` +
    `This is a gentle reminder from *${gymName}* regarding your pending membership fee balance of *${formattedDue}* for your *${planName}*.\n\n` +
    `Kindly clear your pending dues at the reception desk during your next workout session.\n\n` +
    `Thank you,\n*${gymName}*`
  );
};

export const sendWhatsAppDueReminder = (params: DueReminderParams): boolean => {
  const message = getDueReminderMessage(params);
  return openWhatsApp(params.phone, message);
};

export interface PaymentReceiptParams {
  name: string;
  phone: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  planName?: string;
  date?: string;
  balanceRemaining?: number;
  gymName?: string;
}

export const getPaymentReceiptMessage = ({
  name,
  receiptNumber,
  amount,
  paymentMethod,
  planName = 'Gym Membership',
  date,
  balanceRemaining = 0,
  gymName = 'Sagar Fitness Gym',
}: Omit<PaymentReceiptParams, 'phone'>): string => {
  const formattedAmount = formatINR(amount);
  const formattedBalance = formatINR(balanceRemaining);
  const formattedDate = date ? formatDateIN(date) : formatDateIN(new Date().toISOString());

  let msg = `*Payment Receipt - ${gymName}* 🧾\n\n`;
  msg += `Dear *${name}*,\nThank you for your payment! Here are your receipt details:\n\n`;
  msg += `• *Receipt No:* #${receiptNumber}\n`;
  msg += `• *Date:* ${formattedDate}\n`;
  msg += `• *Plan:* ${planName}\n`;
  msg += `• *Amount Paid:* ${formattedAmount}\n`;
  msg += `• *Payment Method:* ${paymentMethod.toUpperCase()}\n`;
  if (balanceRemaining > 0) {
    msg += `• *Remaining Balance:* ${formattedBalance}\n`;
  } else {
    msg += `• *Status:* Paid in Full ✅\n`;
  }
  msg += `\nThank you for training with *${gymName}*! Stay strong! 💪🏋️`;
  return msg;
};

export const sendWhatsAppReceipt = (params: PaymentReceiptParams): boolean => {
  const message = getPaymentReceiptMessage(params);
  return openWhatsApp(params.phone, message);
};

