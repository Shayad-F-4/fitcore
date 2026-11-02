import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  member: mongoose.Types.ObjectId;
  date: string; // 'YYYY-MM-DD' representing the calendar day in Asia/Kolkata
  checkInTime: Date;
  checkOutTime?: Date;
  status: 'PRESENT' | 'ABSENT';
  method: 'MANUAL' | 'QR_CODE' | 'BIOMETRIC';
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT'],
      default: 'PRESENT',
      index: true,
    },
    method: {
      type: String,
      enum: ['MANUAL', 'QR_CODE', 'BIOMETRIC'],
      default: 'MANUAL',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring a member can only have ONE attendance record per calendar date
AttendanceSchema.index({ member: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

