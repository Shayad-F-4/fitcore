import mongoose, { Document, Schema } from 'mongoose';

export interface IFollowUp extends Document {
  member: mongoose.Types.ObjectId;
  type: 'CALL' | 'SMS' | 'WHATSAPP' | 'IN_PERSON' | 'STAFF_NOTE';
  status: 'PENDING' | 'CONTACTED' | 'RENEWAL_COMPLETED' | 'CANCELLED';
  notes: string;
  followUpDate?: Date;
  contactOutcome?: string;
  recordedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpSchema = new Schema<IFollowUp>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['CALL', 'SMS', 'WHATSAPP', 'IN_PERSON', 'STAFF_NOTE'],
      default: 'CALL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONTACTED', 'RENEWAL_COMPLETED', 'CANCELLED'],
      default: 'CONTACTED',
    },
    notes: {
      type: String,
      required: true,
    },
    followUpDate: {
      type: Date,
    },
    contactOutcome: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

FollowUpSchema.index({ member: 1, createdAt: -1 });

export const FollowUp = mongoose.model<IFollowUp>('FollowUp', FollowUpSchema);
