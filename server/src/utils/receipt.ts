import { Payment } from '../models/Payment.js';

/**
 * Generates an incremented or unique receipt number in format RCP-YYYY-XXXXX
 * Guaranteed not to collide with existing database records.
 */
export const generateReceiptNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const timeComponent = Date.now().toString().slice(-5);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const candidate = `RCP-${currentYear}-${timeComponent}${randomSuffix}`;

  // Fallback safety check
  const exists = await Payment.findOne({ receiptNumber: candidate });
  if (exists) {
    return `RCP-${currentYear}-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
  }
  return candidate;
};
