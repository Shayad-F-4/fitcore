import mongoose, { Document, Schema } from 'mongoose';

export interface IGymSettings extends Document {
  gymName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  logoUrl?: string;
  gstin?: string;
  isTaxEnabled: boolean;
  taxRatePercent: number;
  currency: string;
  currencySymbol: string;
  timezone: string;
  whatsapp: {
    enabled: boolean;
    autoReminder2DaysEnabled: boolean;
    phoneNumberId?: string;
    accessToken?: string;
    templateName: string;
    businessAccountId?: string;
    autoSendHour: number; // 24-hr format (e.g. 9 for 09:00 AM IST)
  };
  createdAt: Date;
  updatedAt: Date;
}

const GymSettingsSchema = new Schema<IGymSettings>(
  {
    gymName: { type: String, default: 'FitCore Fitness Club', trim: true },
    tagline: { type: String, default: 'Train Smarter. Manage Better.', trim: true },
    address: { type: String, default: 'Plot 42, Sector 18, Commercial Belt' },
    city: { type: String, default: 'Noida' },
    state: { type: String, default: 'Uttar Pradesh' },
    pincode: { type: String, default: '201301' },
    phone: { type: String, default: '+91 98765 43210' },
    email: { type: String, default: 'desk@fitcore.in' },
    logoUrl: { type: String, default: '' },
    gstin: { type: String, default: '', uppercase: true, trim: true },
    isTaxEnabled: { type: Boolean, default: false },
    taxRatePercent: { type: Number, default: 18, min: 0, max: 100 },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    whatsapp: {
      enabled: { type: Boolean, default: false },
      autoReminder2DaysEnabled: { type: Boolean, default: true },
      phoneNumberId: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      templateName: { type: String, default: 'membership_expiry_reminder' },
      businessAccountId: { type: String, default: '' },
      autoSendHour: { type: Number, default: 9, min: 0, max: 23 },
    },
  },
  { timestamps: true }
);

// Singleton helper to fetch or initialize settings
GymSettingsSchema.statics.getSettings = async function (): Promise<IGymSettings> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export const GymSettings = mongoose.model<IGymSettings, mongoose.Model<IGymSettings> & { getSettings: () => Promise<IGymSettings> }>(
  'GymSettings',
  GymSettingsSchema
);
