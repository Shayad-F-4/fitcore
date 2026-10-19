import mongoose, { Document, Schema } from 'mongoose';

export interface IMember extends Document {
  memberId: string;
  user?: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dob?: Date;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'ARCHIVED' | 'PENDING';
  branch: mongoose.Types.ObjectId;
  assignedTrainer?: mongoose.Types.ObjectId;
  fitnessGoals: string[];
  photoUrl: string;
  qrCodeToken: string;
  notes?: string;
  joinDate: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    memberId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
    },
    dob: {
      type: Date,
    },
    address: {
      type: String,
    },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'FROZEN', 'ARCHIVED', 'PENDING'],
      default: 'PENDING',
      index: true,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    assignedTrainer: {
      type: Schema.Types.ObjectId,
      ref: 'Trainer',
    },
    fitnessGoals: [{ type: String }],
    photoUrl: {
      type: String,
      default: '',
    },
    qrCodeToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    notes: {
      type: String,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

MemberSchema.index({ fullName: 'text', email: 'text', phone: 'text', memberId: 'text' });

export const Member = mongoose.model<IMember>('Member', MemberSchema);
