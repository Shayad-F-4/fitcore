import mongoose, { Document, Schema } from 'mongoose';

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'DAMAGE'
  | 'EXPIRY'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUBTRACT';

export interface IStockMovement extends Document {
  product: mongoose.Types.ObjectId;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  referenceType?: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'MANUAL';
  referenceId?: string;
  reason: string;
  performedBy: mongoose.Types.ObjectId;
  performedByName?: string;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    movementType: {
      type: String,
      enum: [
        'PURCHASE',
        'SALE',
        'RETURN',
        'DAMAGE',
        'EXPIRY',
        'ADJUSTMENT_ADD',
        'ADJUSTMENT_SUBTRACT',
      ],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    unitCost: {
      type: Number,
      default: 0,
    },
    referenceType: {
      type: String,
      enum: ['PURCHASE', 'SALE', 'ADJUSTMENT', 'MANUAL'],
      default: 'MANUAL',
    },
    referenceId: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockMovementSchema.index({ createdAt: -1 });
StockMovementSchema.index({ product: 1, createdAt: -1 });
StockMovementSchema.index({ movementType: 1, createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
