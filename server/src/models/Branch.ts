import mongoose, { Document, Schema } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  openingHours: string;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    openingHours: { type: String, default: 'Mon-Sun: 05:00 AM - 11:00 PM' },
    capacity: { type: Number, default: 200 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);
