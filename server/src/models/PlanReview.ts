import mongoose, { Document, Schema } from 'mongoose';

export type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'DISMISSED';

export interface IPlanReview extends Document {
  member: mongoose.Types.ObjectId;
  weekNumber: number;
  reviewDate: Date;
  startingWeightKg?: number;
  currentWeightKg?: number;
  weightDeltaKg?: number;
  adherencePercentage: number; // 0 to 100
  complianceNotes?: string;
  suggestedCalorieDelta?: number; // e.g. -150 or +100
  suggestedWorkoutNotes?: string;
  status: ReviewStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  draftDietPlanId?: mongoose.Types.ObjectId;
  draftWorkoutPlanId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlanReviewSchema = new Schema<IPlanReview>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    reviewDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    startingWeightKg: { type: Number },
    currentWeightKg: { type: Number },
    weightDeltaKg: { type: Number, default: 0 },
    adherencePercentage: { type: Number, default: 85, min: 0, max: 100 },
    complianceNotes: { type: String, trim: true },
    suggestedCalorieDelta: { type: Number, default: 0 },
    suggestedWorkoutNotes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'DISMISSED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: { type: Date },
    draftDietPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'DietPlan',
    },
    draftWorkoutPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
    },
  },
  {
    timestamps: true,
  }
);

PlanReviewSchema.index({ member: 1, weekNumber: 1 });

export const PlanReview = mongoose.model<IPlanReview>('PlanReview', PlanReviewSchema);
