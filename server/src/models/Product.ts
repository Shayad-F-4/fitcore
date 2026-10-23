import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  description?: string;
  purchaseCost: number;
  sellingPrice: number;
  currentStock: number;
  minStockThreshold: number;
  unit: string;
  supplier?: mongoose.Types.ObjectId;
  batchNumber?: string;
  expiryDate?: Date;
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'General',
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    purchaseCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      index: true,
    },
    minStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: 'PIECE',
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
      index: true,
    },
    imageUrl: {
      type: String,
      default: '',
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

ProductSchema.index({ name: 'text', sku: 'text', barcode: 'text', brand: 'text' });
ProductSchema.index({ status: 1, currentStock: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
