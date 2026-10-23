import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  member: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
  durationMinutes?: number | null;
  method: 'QR_CODE' | 'MANUAL';
  checkedInBy?: mongoose.Types.ObjectId;
  notes?: string;
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
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    checkOutTime: {
      type: Date,
      index: true,
    },
    method: {
      type: String,
      enum: ['QR_CODE', 'MANUAL'],
      default: 'MANUAL',
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AttendanceSchema.virtual('durationMinutes').get(function (this: IAttendance) {
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = this.checkOutTime.getTime() - this.checkInTime.getTime();
    return Math.max(1, Math.round(diffMs / 60000));
  }
  return null;
});

AttendanceSchema.index({ member: 1, checkInTime: -1 });
AttendanceSchema.index({ branch: 1, checkInTime: -1 });
AttendanceSchema.index({ checkInTime: -1, checkOutTime: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
