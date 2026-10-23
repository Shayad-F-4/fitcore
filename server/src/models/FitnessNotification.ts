import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'MEAL_REMINDER'
  | 'WORKOUT_REMINDER'
  | 'WEEKLY_PLAN_READY'
  | 'WEEKLY_REVIEW'
  | 'ENTITLEMENT_EXPIRY';

export type DeliveryChannel = 'WHATSAPP' | 'EMAIL' | 'IN_APP';
export type DeliveryStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PENDING';

export interface IDeliveryLogItem {
  timestamp: Date;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  message: string;
  error?: string;
}

export interface IFitnessNotification extends Document {
  member: mongoose.Types.ObjectId;
  type: NotificationType;
  channel: DeliveryChannel;
  optIn: boolean;
  scheduledTime?: string; // e.g. "08:00 AM"
  recipientContact?: string; // phone or email
  lastSentAt?: Date;
  deliveryStatus: DeliveryStatus;
  history: IDeliveryLogItem[];
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryLogItemSchema = new Schema<IDeliveryLogItem>(
  {
    timestamp: { type: Date, default: Date.now },
    channel: { type: String, enum: ['WHATSAPP', 'EMAIL', 'IN_APP'], required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'SKIPPED', 'PENDING'], required: true },
    message: { type: String, required: true },
    error: { type: String },
  },
  { _id: true }
);

const FitnessNotificationSchema = new Schema<IFitnessNotification>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'MEAL_REMINDER',
        'WORKOUT_REMINDER',
        'WEEKLY_PLAN_READY',
        'WEEKLY_REVIEW',
        'ENTITLEMENT_EXPIRY',
      ],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['WHATSAPP', 'EMAIL', 'IN_APP'],
      default: 'WHATSAPP',
    },
    optIn: {
      type: Boolean,
      default: true,
    },
    scheduledTime: {
      type: String,
      trim: true,
    },
    recipientContact: {
      type: String,
      trim: true,
    },
    lastSentAt: {
      type: Date,
    },
    deliveryStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'SKIPPED', 'PENDING'],
      default: 'PENDING',
    },
    history: [DeliveryLogItemSchema],
  },
  {
    timestamps: true,
  }
);

FitnessNotificationSchema.index({ member: 1, type: 1 });

export const FitnessNotification = mongoose.model<IFitnessNotification>(
  'FitnessNotification',
  FitnessNotificationSchema
);
