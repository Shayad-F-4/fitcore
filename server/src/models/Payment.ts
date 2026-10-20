import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  receiptNumber: string;
  member: mongoose.Types.ObjectId;
  membership?: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'BANK_TRANSFER';
  transactionRef?: string;
  status: 'PAID' | 'PARTIAL' | 'REFUNDED';
  type: 'MEMBERSHIP' | 'RENEWAL' | 'PERSONAL_TRAINING' | 'DAY_PASS' | 'MERCHANDISE';
  balanceRemaining: number;
  notes?: string;
  recordedBy: mongoose.Types.ObjectId;
  paymentDate: Date;
  refundReason?: string;
  refundDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    membership: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'BANK_TRANSFER'],
      default: 'CASH',
    },
    transactionRef: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PAID', 'PARTIAL', 'REFUNDED'],
      default: 'PAID',
      index: true,
    },
    type: {
      type: String,
      enum: ['MEMBERSHIP', 'RENEWAL', 'PERSONAL_TRAINING', 'DAY_PASS', 'MERCHANDISE'],
      default: 'MEMBERSHIP',
    },
    balanceRemaining: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    refundReason: { type: String },
    refundDate: { type: Date },
  },
  { timestamps: true }
);

PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ member: 1, paymentDate: -1 });
PaymentSchema.index({ status: 1, paymentDate: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
