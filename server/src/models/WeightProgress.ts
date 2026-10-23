import mongoose, { Document, Schema } from 'mongoose';

export interface IWeightProgress extends Document {
  member: mongoose.Types.ObjectId;
  date: Date;
  weight: number; // in kilograms (e.g. 74.5)
  height?: number; // in cm (e.g. 175)
  bmi?: number; // Body Mass Index = weight / (height/100)^2
  waist?: number; // waist circumference in cm
  chest?: number; // chest circumference in cm
  arms?: number; // arm circumference in cm
  hips?: number; // hip circumference in cm
  bodyFat?: number; // body fat percentage (e.g. 16.5)
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WeightProgressSchema = new Schema<IWeightProgress>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member reference is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Measurement date is required'],
      default: Date.now,
      index: true,
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [20, 'Weight must be at least 20 kg'],
      max: [350, 'Weight must be realistic'],
    },
    height: {
      type: Number,
      min: [50, 'Height must be at least 50 cm'],
      max: [280, 'Height must be realistic'],
    },
    bmi: {
      type: Number,
      min: [10, 'BMI must be at least 10'],
      max: [80, 'BMI must be realistic'],
    },
    waist: {
      type: Number,
      min: [30, 'Waist must be realistic'],
      max: [200, 'Waist must be realistic'],
    },
    chest: {
      type: Number,
      min: [30, 'Chest must be realistic'],
      max: [200, 'Chest must be realistic'],
    },
    arms: {
      type: Number,
      min: [15, 'Arms measurement must be realistic'],
      max: [80, 'Arms measurement must be realistic'],
    },
    hips: {
      type: Number,
      min: [30, 'Hips measurement must be realistic'],
      max: [200, 'Hips measurement must be realistic'],
    },
    bodyFat: {
      type: Number,
      min: [3, 'Body fat must be at least 3%'],
      max: [70, 'Body fat must be realistic'],
    },
    notes: {
      type: String,
      trim: true,
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

WeightProgressSchema.index({ member: 1, date: -1 });

export const WeightProgress = mongoose.model<IWeightProgress>('WeightProgress', WeightProgressSchema);
