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
  gymName = 'Sagar Fitness Gym',
}: Omit<ExpiryReminderParams, 'phone'>): string => {
  const formattedDate = formatDateIN(expiryDate);
  return `Hi ${name}, your ${gymName} gym membership expires on ${formattedDate}. Please renew your membership on time to continue your workouts without interruption. For renewal assistance, contact our front desk. Thank you!`;
};

export const getWelcomeMessage = (
  name: string,
  memberId: string,
  gymName = 'Sagar Fitness Gym'
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
  try {
    const newWin = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch {
    window.location.href = url;
  }
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
  planName = 'Sagar Fitness Membership',
  gymName = 'Sagar Fitness Gym',
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
  planName = 'Sagar Fitness Membership',
  gymName = 'Sagar Fitness Gym',
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

export interface PosReceiptWhatsAppParams {
  customerName: string;
  phone: string;
  receiptNumber: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  grandTotal: number;
  paymentMethod: string;
  date?: string;
  gymName?: string;
}

export const sendWhatsAppPosReceipt = (params: PosReceiptWhatsAppParams): boolean => {
  const gymName = params.gymName || 'Sagar Fitness Gym';
  const formattedDate = params.date ? formatDateIN(params.date) : formatDateIN(new Date().toISOString());
  const formattedTotal = formatINR(params.grandTotal);

  let msg = `*Product Purchase Receipt — ${gymName}* 🛍️\n\n`;
  msg += `Dear *${params.customerName}*,\nThank you for your purchase at ${gymName}!\n\n`;
  msg += `• *Receipt No:* #${params.receiptNumber}\n`;
  msg += `• *Date:* ${formattedDate}\n`;
  msg += `• *Payment Mode:* ${params.paymentMethod.toUpperCase()}\n\n`;
  msg += `*Items Purchased:*\n`;
  params.items.forEach((it, idx) => {
    msg += `${idx + 1}. ${it.name} (x${it.quantity}) — ${formatINR(it.lineTotal)}\n`;
  });
  msg += `\n*Grand Total Paid:* ${formattedTotal} ✅\n`;
  msg += `\nThank you for choosing *${gymName}*! Stay fit & healthy! 💪`;

  return openWhatsApp(params.phone, msg);
};

export interface DietPlanWhatsAppParams {
  memberName: string;
  phone: string;
  planName: string;
  fitnessGoal: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  waterIntakeLiters?: number;
  notes?: string;
  meals?: {
    mealType?: string;
    name?: string;
    time?: string;
    items?: { foodName: string; quantity: number; servingUnit: string }[];
  }[];
  gymName?: string;
}

export const sendWhatsAppDietPlan = (params: DietPlanWhatsAppParams): boolean => {
  const gymName = params.gymName || 'Sagar Fitness Gym';
  const goalFormatted = (params.fitnessGoal || 'FITNESS').replace(/_/g, ' ');

  let msg = `🥗 *Your Personalized Diet Protocol — ${gymName}* 🏋️‍♂️\n\n`;
  msg += `Dear *${params.memberName}*,\nHere is your custom nutrition & diet protocol prepared by ${gymName}, Pathardi:\n\n`;
  msg += `📋 *Plan:* ${params.planName}\n`;
  msg += `🎯 *Goal:* ${goalFormatted.toUpperCase()}\n`;
  msg += `🔥 *Daily Target:* ${params.dailyCalories} kcal\n`;
  msg += `🥩 *Protein:* ${params.dailyProtein}g  |  🍚 *Carbs:* ${params.dailyCarbs}g  |  🥑 *Fat:* ${params.dailyFat}g\n`;
  if (params.waterIntakeLiters) {
    msg += `💧 *Hydration:* ${params.waterIntakeLiters} Liters / day\n`;
  }

  if (params.notes && params.notes.trim()) {
    msg += `\n*📋 Daily Meal Schedule & Kya Khana Hai:*\n${params.notes.trim()}\n`;
  }

  if (params.meals && params.meals.length > 0 && params.meals.some((m) => m.items && m.items.length > 0)) {
    msg += `\n*Scheduled Foods:*\n`;
    params.meals.forEach((m) => {
      if (m.items && m.items.length > 0) {
        msg += `\n• *${m.name}* ${m.time ? `(${m.time})` : ''}:\n`;
        m.items.forEach((it) => {
          msg += `   - ${it.foodName} (${it.quantity} ${it.servingUnit})\n`;
        });
      }
    });
  }

  msg += `\n*Coaching Note:* Consistency is the key to physique transformation. Stay hydrated, sleep 7-8 hours, and track your weights regularly.\n\n`;
  msg += `*${gymName}, Pathardi, Maharashtra* 💪`;

  return openWhatsApp(params.phone, msg);
};

export interface WorkoutPlanWhatsAppParams {
  memberName: string;
  phone: string;
  planName: string;
  fitnessGoal: string;
  daysPerWeek: number;
  availableEquipment?: string;
  schedule: {
    dayName: string;
    workoutTitle: string;
    isRestDay?: boolean;
    estimatedDurationMins?: number;
    exercises?: {
      exerciseName: string;
      sets: number;
      reps: string;
      targetMuscleGroup?: string;
    }[];
  }[];
  gymName?: string;
}

export const sendWhatsAppWorkoutPlan = (params: WorkoutPlanWhatsAppParams): boolean => {
  const gymName = params.gymName || 'Sagar Fitness Gym';
  const goalFormatted = (params.fitnessGoal || 'FITNESS').replace(/_/g, ' ');

  let msg = `🏋️‍♂️ *Your Personalized Workout Routine — ${gymName}* 🔥\n\n`;
  msg += `Dear *${params.memberName}*,\nHere is your custom 7-day training routine prepared by ${gymName}, Pathardi:\n\n`;
  msg += `📋 *Routine:* ${params.planName}\n`;
  msg += `🎯 *Goal:* ${goalFormatted.toUpperCase()}\n`;
  msg += `📅 *Frequency:* ${params.daysPerWeek} Days / Week\n`;
  if (params.availableEquipment) {
    msg += `⚙️ *Equipment:* ${params.availableEquipment.replace(/_/g, ' ')}\n`;
  }
  msg += `\n*Weekly Training Schedule:*\n`;

  (params.schedule || []).forEach((day) => {
    if (day.isRestDay) {
      msg += `\n🛌 *${day.dayName}:* Rest & Recovery (Active recovery / stretch)\n`;
    } else {
      msg += `\n💪 *${day.dayName} — ${day.workoutTitle}* (${day.estimatedDurationMins || 45} mins):\n`;
      if (day.exercises && day.exercises.length > 0) {
        day.exercises.forEach((ex, idx) => {
          msg += `   ${idx + 1}. ${ex.exerciseName} — ${ex.sets} sets × ${ex.reps}\n`;
        });
      }
    }
  });

  msg += `\n*Coach Tip:* Maintain progressive overload, focus on controlled execution, and warm up thoroughly before compound lifts.\n\n`;
  msg += `*${gymName}, Pathardi, Maharashtra* 🚀`;

  return openWhatsApp(params.phone, msg);
};

export interface MlPlanWhatsAppParams {
  memberName: string;
  phone: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterLiters: number;
  recommendedSplit: string;
  volumeMultiplier: number;
  progressionRate: number;
  gymName?: string;
}

export const sendWhatsAppMlPlanSummary = (params: MlPlanWhatsAppParams): boolean => {
  const gymName = params.gymName || 'Sagar Fitness Gym';
  let msg = `⚡ *Sagar Fitness AI Coaching Targets — ${gymName}* 🎯\n\n`;
  msg += `Namaste *${params.memberName}*! Your biometric machine learning fitness targets are ready:\n\n`;
  msg += `🔥 *Daily Calorie Target:* ${params.targetCalories} kcal\n`;
  msg += `🥩 *Protein:* ${params.targetProtein}g  |  🍚 *Carbs:* ${params.targetCarbs}g  |  🥑 *Fat:* ${params.targetFat}g\n`;
  msg += `💧 *Hydration:* ${params.waterLiters} Liters/day\n\n`;
  msg += `🏋️ *Recommended Routine Split:* ${params.recommendedSplit.replace(/_/g, ' ')}\n`;
  msg += `📈 *Overload Scaling:* ${params.volumeMultiplier}x volume  |  +${params.progressionRate}% weekly rate\n\n`;
  msg += `Visit the gym desk or message your trainer to receive your full 7-day meal and exercise schedule!\n`;
  msg += `*${gymName}, Pathardi* 💪`;
  return openWhatsApp(params.phone, msg);
};


