import mongoose, { Document, Schema } from 'mongoose';

export interface IMembershipPlan extends Document {
  name: string;
  type: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL' | 'DAY_PASS' | 'TRIAL' | 'PT_PACKAGE';
  durationDays: number;
  price: number;
  description: string;
  features: string[];
  active: boolean;
  isPopular?: boolean;
  badge?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'DAY_PASS', 'TRIAL', 'PT_PACKAGE'],
      default: 'MONTHLY',
    },
    durationDays: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    features: [{ type: String }],
    active: { type: Boolean, default: true, index: true },
    isPopular: { type: Boolean, default: false },
    badge: { type: String, default: '' },
  },
  { timestamps: true }
);

export const MembershipPlan = mongoose.model<IMembershipPlan>('MembershipPlan', MembershipPlanSchema);
