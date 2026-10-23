import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number; // Cost of goods at the exact time of sale
  unitPrice: number; // Selling price
  lineTotal: number;
  lineCostTotal: number;
}

export interface IInventorySale extends Document {
  receiptNumber: string;
  customerMember?: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  totalCost: number; // COGS
  grossProfit: number; // grandTotal - totalCost
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING';
  paymentStatus: 'PAID' | 'REFUNDED' | 'CANCELLED';
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  cashier: mongoose.Types.ObjectId;
  saleDate: Date;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  refundedAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  refundedBy?: mongoose.Types.ObjectId;
  restockedOnRefund?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
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
    unitCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    lineCostTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const InventorySaleSchema = new Schema<IInventorySale>(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerMember: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Walk-in Customer',
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    items: {
      type: [SaleItemSchema],
      required: true,
      validate: [(v: ISaleItem[]) => v.length > 0, 'Sale must contain at least one item'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    grossProfit: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'NET_BANKING'],
      default: 'CASH',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'REFUNDED', 'CANCELLED'],
      default: 'PAID',
      index: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
      default: 'COMPLETED',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    cashier: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    saleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    cancellationReason: { type: String, trim: true },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    refundedAmount: { type: Number, default: 0, min: 0 },
    refundReason: { type: String, trim: true },
    refundedAt: { type: Date },
    refundedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    restockedOnRefund: { type: Boolean, default: false },
  },
  { timestamps: true }
);

InventorySaleSchema.index({ saleDate: -1 });
InventorySaleSchema.index({ status: 1, saleDate: -1 });
InventorySaleSchema.index({ customerMember: 1, saleDate: -1 });

export const InventorySale = mongoose.model<IInventorySale>('InventorySale', InventorySaleSchema);
