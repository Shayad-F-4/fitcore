// FitCore Sagar Fitness Gym - WhatsApp Messaging Suite
const whatsapp = {
  cleanPhone(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) return '91' + digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits.slice(-10) ? '91' + digits.slice(-10) : '';
  },

  open(phone, message) {
    const clean = this.cleanPhone(phone);
    if (!clean || clean.length < 12) {
      showToast('WhatsApp Error', 'Member does not have a valid 10-digit mobile number.', 'error');
      return false;
    }
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('WhatsApp Opened', 'Redirecting to WhatsApp chat...', 'success');
    return true;
  },

  // 1. Expiry Reminder
  sendExpiryReminder(name, phone, planName, expiryDate) {
    const gymName = 'Sagar Fitness Gym';
    const msg = `Hi ${name}, your ${gymName} gym membership (${planName || 'Pass'}) expires on ${formatDateIN(expiryDate)}. Please renew your membership on time to continue your workouts without interruption. For renewal assistance, contact our front desk. Thank you!`;
    return this.open(phone, msg);
  },

  // 2. Expired Notice
  sendExpiredNotice(name, phone, planName, expiryDate) {
    const gymName = 'Sagar Fitness Gym';
    const msg = `Hi ${name}! 👋\n\nYour gym membership pass (*${planName || 'Pass'}*) at *${gymName}* expired on *${formatDateIN(expiryDate)}*. 🔴\n\nPlease renew your membership to continue your workout sessions and achieve your fitness goals without disruption.\n\nYou can renew your pass at the front desk or reply here for assistance.\n\nThank you,\n*${gymName}, Pathardi*`;
    return this.open(phone, msg);
  },

  // 3. Due Balance Reminder
  sendDueReminder(name, phone, dueAmount, planName) {
    const gymName = 'Sagar Fitness Gym';
    const msg = `Hello ${name}! 👋\n\nThis is a gentle reminder from *${gymName}* regarding your pending membership fee balance of *${formatINR(dueAmount)}* for your *${planName || 'Membership'}*.\n\nKindly clear your pending dues at the reception desk during your next workout session.\n\nThank you,\n*${gymName}, Pathardi*`;
    return this.open(phone, msg);
  },

  // 4. Payment Receipt
  sendPaymentReceipt(name, phone, receiptNumber, amount, paymentMethod, balanceDue = 0) {
    const gymName = 'Sagar Fitness Gym';
    let msg = `*Payment Receipt - ${gymName}* 🧾\n\n`;
    msg += `Dear *${name}*,\nThank you for your payment! Here are your receipt details:\n\n`;
    msg += `• *Receipt No:* #${receiptNumber}\n`;
    msg += `• *Date:* ${formatDateIN(new Date())}\n`;
    msg += `• *Amount Paid:* ${formatINR(amount)}\n`;
    msg += `• *Payment Mode:* ${paymentMethod.toUpperCase()}\n`;
    if (balanceDue > 0) {
      msg += `• *Remaining Balance:* ${formatINR(balanceDue)}\n`;
    } else {
      msg += `• *Status:* Paid in Full ✅\n`;
    }
    msg += `\nThank you for training with *${gymName}*! Stay strong! 💪🏋️`;
    return this.open(phone, msg);
  },

  // 5. Diet Protocol ("dite send")
  sendDietPlan(name, phone, planName, goal, calories, protein, carbs, fat, notes) {
    const gymName = 'Sagar Fitness Gym';
    let msg = `🥗 *Your Personalized Diet Protocol — ${gymName}* 🏋️‍♂️\n\n`;
    msg += `Dear *${name}*,\nHere is your custom nutrition & diet protocol prepared by ${gymName}, Pathardi:\n\n`;
    msg += `📋 *Plan:* ${planName || 'Custom Diet'}\n`;
    if (goal) msg += `🎯 *Goal:* ${goal.toUpperCase()}\n`;
    if (calories) msg += `🔥 *Daily Target:* ${calories} kcal\n`;
    if (protein) msg += `🥩 *Protein:* ${protein}g  |  🍚 *Carbs:* ${carbs || 0}g  |  🥑 *Fat:* ${fat || 0}g\n`;
    if (notes && notes.trim()) {
      msg += `\n*📋 Daily Meal Schedule & Kya Khana Hai:*\n${notes.trim()}\n`;
    }
    msg += `\n*Coaching Note:* Consistency is the key to physique transformation. Stay hydrated, sleep 7-8 hours, and track your weights regularly.\n\n`;
    msg += `*${gymName}, Pathardi, Maharashtra* 💪`;
    return this.open(phone, msg);
  }
};
