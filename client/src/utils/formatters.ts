/**
 * FitCore Indian Currency, Date & Phone Formatters
 * Locale: en-IN (Indian English)
 * Timezone: Asia/Kolkata
 */

/**
 * Format any numeric value as Indian Rupees (INR)
 * Examples:
 *   1299 -> ₹1,299
 *   129999 -> ₹1,29,999
 *   1299.5 -> ₹1,299.50
 */
export const formatINR = (
  amount: number | string | undefined | null,
  forceDecimals = false
): string => {
  if (amount === undefined || amount === null || amount === '') return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  const hasDecimals = num % 1 !== 0;
  const decimals = forceDecimals || hasDecimals ? 2 : 0;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `₹${num.toLocaleString('en-IN')}`;
  }
};

/**
 * Format date in Indian standard format: DD/MM/YYYY
 * Example: 2026-10-25 -> 25/10/2026
 */
export const formatDateIN = (date: string | Date | undefined | null): string => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
};

/**
 * Format time in 12-hour format with AM/PM in Asia/Kolkata timezone
 * Example: 10:30 AM
 */
export const formatTimeIN = (date: string | Date | undefined | null): string => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return '—';
  }
};

/**
 * Format datetime in Indian format: DD/MM/YYYY, hh:mm AM/PM
 */
export const formatDateTimeIN = (date: string | Date | undefined | null): string => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return `${formatDateIN(d)}, ${formatTimeIN(d)}`;
  } catch {
    return '—';
  }
};

/**
 * Standardize Indian phone number for display and WhatsApp
 * E.g. '+91 98765 43210', '9876543210' -> '919876543210' for wa.me
 */
export const cleanIndianPhone = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(1);
  return digits;
};

/**
 * Format Indian phone for clean display: +91 98765 43210
 */
export const formatDisplayPhoneIN = (phone: string): string => {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  const tenDigits = digits.length >= 10 ? digits.slice(-10) : digits;
  if (tenDigits.length === 10) {
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
  }
  return phone;
};

/**
 * Check if a phone number is a valid 10-digit Indian mobile number
 */
export const isValidIndianPhone = (phone: string): boolean => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  const tenDigits = digits.length >= 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(tenDigits);
};

/**
 * Format attendance session duration cleanly.
 * Computes difference between checkInTime and checkOutTime if durationMinutes is not provided.
 * If active (no checkout yet), can return 'Active' or live elapsed time.
 */
export const formatAttendanceDuration = (
  checkInTime?: string | Date | null,
  checkOutTime?: string | Date | null,
  durationMinutes?: number | null,
  options?: { short?: boolean; showActiveTime?: boolean }
): string => {
  const short = options?.short ?? false;

  // 1. If explicit durationMinutes provided as valid number >= 0
  let mins: number | null =
    typeof durationMinutes === 'number' && !isNaN(durationMinutes) ? durationMinutes : null;

  // 2. Otherwise calculate dynamically from timestamps
  if (mins === null && checkInTime && checkOutTime) {
    const start = new Date(checkInTime).getTime();
    const end = new Date(checkOutTime).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      mins = Math.round((end - start) / 60000);
    }
  }

  // 3. Format completed duration
  if (mins !== null) {
    if (mins <= 0) {
      return short ? '<1m' : '< 1 min';
    }
    if (mins < 60) {
      return short ? `${mins}m` : `${mins} mins`;
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) {
      return short ? `${h}h` : `${h} hr`;
    }
    return short ? `${h}h ${m}m` : `${h} hr ${m} min`;
  }

  // 4. Currently inside gym (check-in exists, but no checkout)
  if (checkInTime && !checkOutTime) {
    if (options?.showActiveTime) {
      const start = new Date(checkInTime).getTime();
      const elapsedMins = Math.max(1, Math.round((Date.now() - start) / 60000));
      return short ? `${elapsedMins}m (Active)` : `${elapsedMins} mins (Active)`;
    }
    return 'Active';
  }

  return '—';
};

/**
 * Get numeric duration in minutes from attendance record (for CSV export or math)
 */
export const getAttendanceDurationMinutes = (
  checkInTime?: string | Date | null,
  checkOutTime?: string | Date | null,
  durationMinutes?: number | null
): number | null => {
  if (typeof durationMinutes === 'number' && !isNaN(durationMinutes)) {
    return durationMinutes;
  }
  if (checkInTime && checkOutTime) {
    const start = new Date(checkInTime).getTime();
    const end = new Date(checkOutTime).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      return Math.max(1, Math.round((end - start) / 60000));
    }
  }
  return null;
};
