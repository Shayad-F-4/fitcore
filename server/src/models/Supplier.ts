import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

SupplierSchema.index({ name: 'text', phone: 'text' });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
