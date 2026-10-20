import mongoose, { Document, Schema } from 'mongoose';

export interface IFreezeRecord {
  fromDate: Date;
  toDate: Date;
  reason: string;
  thawedAt?: Date;
}

export interface IRenewalRecord {
  renewedAt: Date;
  previousExpiryDate: Date;
  newExpiryDate: Date;
  amountPaid: number;
}

export interface IMembership extends Document {
  member: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  startDate: Date;
  expiryDate: Date;
  originalPrice: number;
  discount: number;
  amountDue: number;
  amountPaid: number;
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';
  isArchived: boolean;
  freezeHistory: IFreezeRecord[];
  renewalHistory: IRenewalRecord[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountDue: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    freezeHistory: [
      {
        fromDate: { type: Date, required: true },
        toDate: { type: Date, required: true },
        reason: { type: String, required: true },
        thawedAt: { type: Date },
      },
    ],
    renewalHistory: [
      {
        renewedAt: { type: Date, default: Date.now },
        previousExpiryDate: { type: Date, required: true },
        newExpiryDate: { type: Date, required: true },
        amountPaid: { type: Number, required: true },
      },
    ],
    notes: { type: String },
  },
  { timestamps: true }
);

MembershipSchema.index({ member: 1, status: 1 });
MembershipSchema.index({ expiryDate: 1, status: 1 });
MembershipSchema.index({ isArchived: 1, status: 1 });

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);
