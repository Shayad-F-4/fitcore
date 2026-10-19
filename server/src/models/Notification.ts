import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user?: mongoose.Types.ObjectId;
  targetRole?: string;
  title: string;
  message: string;
  type: 'EXPIRING_SOON' | 'EXPIRING_TODAY' | 'EXPIRED' | 'RENEWAL_SUCCESS' | 'PAYMENT_PENDING' | 'SYSTEM';
  member?: mongoose.Types.ObjectId;
  membership?: mongoose.Types.ObjectId;
  read: boolean;
  dismissed: boolean;
  dedupKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    targetRole: { type: String, default: 'ALL_STAFF' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['EXPIRING_SOON', 'EXPIRING_TODAY', 'EXPIRED', 'RENEWAL_SUCCESS', 'PAYMENT_PENDING', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    member: { type: Schema.Types.ObjectId, ref: 'Member' },
    membership: { type: Schema.Types.ObjectId, ref: 'Membership' },
    read: { type: Boolean, default: false, index: true },
    dismissed: { type: Boolean, default: false, index: true },
    dedupKey: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
