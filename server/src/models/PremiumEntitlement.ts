import mongoose, { Document, Schema } from 'mongoose';

export type EntitlementStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';

export interface IEntitlementFeatures {
  personalizedDiet: boolean;
  personalizedWorkout: boolean;
  weeklyPdfReports: boolean;
  progressTracking: boolean;
  reminders: boolean;
}

export interface IPremiumEntitlement extends Document {
  member: mongoose.Types.ObjectId;
  planName: string; // e.g. "Sagar Fitness Premium AI Coach"
  features: IEntitlementFeatures;
  startDate: Date;
  expiryDate: Date;
  status: EntitlementStatus;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PremiumEntitlementSchema = new Schema<IPremiumEntitlement>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member reference is required'],
      index: true,
    },
    planName: {
      type: String,
      required: true,
      default: 'Sagar Fitness Premium AI Coach',
      trim: true,
    },
    features: {
      personalizedDiet: { type: Boolean, default: true },
      personalizedWorkout: { type: Boolean, default: true },
      weeklyPdfReports: { type: Boolean, default: true },
      progressTracking: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

PremiumEntitlementSchema.index({ member: 1, status: 1 });
PremiumEntitlementSchema.index({ expiryDate: 1 });

export const PremiumEntitlement = mongoose.model<IPremiumEntitlement>(
  'PremiumEntitlement',
  PremiumEntitlementSchema
);
