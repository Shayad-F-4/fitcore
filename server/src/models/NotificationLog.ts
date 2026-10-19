import mongoose, { Document, Schema } from 'mongoose';

export type NotificationStatus = 'SENT' | 'FAILED' | 'SKIPPED' | 'NOT_CONFIGURED';
export type NotificationType = 'EXPIRY_2_DAYS' | 'EXPIRY_MANUAL_4_5_DAYS' | 'DUE_REMINDER' | 'WELCOME';

export interface INotificationLog extends Document {
  membership?: mongoose.Types.ObjectId;
  member: mongoose.Types.ObjectId;
  recipientPhone: string;
  recipientName: string;
  type: NotificationType;
  channel: 'WHATSAPP';
  status: NotificationStatus;
  message: string;
  externalId?: string; // Meta WhatsApp message id: wamid.XXX
  failureReason?: string;
  retryCount: number;
  dedupKey?: string; // e.g. EXPIRY_2D_<membershipId>_<YYYYMMDD>
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    membership: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      index: true,
    },
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['EXPIRY_2_DAYS', 'EXPIRY_MANUAL_4_5_DAYS', 'DUE_REMINDER', 'WELCOME'],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['WHATSAPP'],
      default: 'WHATSAPP',
    },
    status: {
      type: String,
      enum: ['SENT', 'FAILED', 'SKIPPED', 'NOT_CONFIGURED'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    externalId: {
      type: String,
      sparse: true,
    },
    failureReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    dedupKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    sentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

NotificationLogSchema.index({ createdAt: -1 });

export const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
