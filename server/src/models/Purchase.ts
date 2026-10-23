import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  purchaseCost: number;
  lineTotal: number;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface IPurchase extends Document {
  invoiceNumber: string;
  supplier: mongoose.Types.ObjectId;
  purchaseDate: Date;
  items: IPurchaseItem[];
  overallTotal: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD';
  notes?: string;
  recordedBy: mongoose.Types.ObjectId;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    purchaseCost: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    items: {
      type: [PurchaseItemSchema],
      required: true,
      validate: [(v: IPurchaseItem[]) => v.length > 0, 'Purchase must have at least one product item'],
    },
    overallTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIAL', 'UNPAID'],
      default: 'PAID',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD'],
      default: 'CASH',
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED'],
      default: 'CONFIRMED',
      index: true,
    },
  },
  { timestamps: true }
);

PurchaseSchema.index({ purchaseDate: -1 });
PurchaseSchema.index({ supplier: 1, purchaseDate: -1 });

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema);
