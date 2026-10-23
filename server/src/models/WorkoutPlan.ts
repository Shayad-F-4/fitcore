import mongoose, { Document, Schema } from 'mongoose';

export type PlanApprovalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type PlanSource = 'AI_GENERATED' | 'MANUAL';

export interface IWorkoutExercise {
  exerciseName: string;
  targetMuscle: string;
  equipment?: string;
  sets: number;
  reps: string; // e.g. "8-12" or "15" or "To Failure"
  restSeconds: number; // e.g. 60, 90, 120
  tempo?: string; // e.g. "3-0-1-0"
  techniqueNotes?: string;
  alternatives?: string[];
  estimatedCaloriesBurned?: number; // Labeled estimate
}

export interface IWorkoutDaySchedule {
  dayName: string; // "Monday", "Day 1", etc.
  workoutTitle: string; // "Push - Chest, Shoulders & Triceps" or "Rest & Recovery"
  isRestDay: boolean;
  targetMuscleGroups: string[];
  warmUp?: string; // e.g. "5 mins treadmill walk + arm circles & band dislocates"
  coolDown?: string; // e.g. "5 mins static stretching for chest, delts, lats"
  estimatedDurationMins: number; // e.g. 45 or 60
  exercises: IWorkoutExercise[];
  notes?: string;
}

export interface IWorkoutPlan extends Document {
  name: string;
  member: mongoose.Types.ObjectId;
  fitnessGoal: string;
  experienceLevel: string;
  availableEquipment: string;
  daysPerWeek: number;
  startDate: Date;
  endDate?: Date;
  schedule: IWorkoutDaySchedule[];
  approvalStatus: PlanApprovalStatus;
  version: number;
  source: PlanSource;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  limitationsConsidered?: string[];
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutExerciseSchema = new Schema<IWorkoutExercise>(
  {
    exerciseName: { type: String, required: true, trim: true },
    targetMuscle: { type: String, required: true, trim: true },
    equipment: { type: String, trim: true, default: 'Barbell/Dumbbell' },
    sets: { type: Number, required: true, min: 1, default: 3 },
    reps: { type: String, required: true, default: '10-12' },
    restSeconds: { type: Number, required: true, default: 60 },
    tempo: { type: String, trim: true },
    techniqueNotes: { type: String, trim: true },
    alternatives: [{ type: String, trim: true }],
    estimatedCaloriesBurned: { type: Number, default: 0 },
  },
  { _id: true }
);

const WorkoutDayScheduleSchema = new Schema<IWorkoutDaySchedule>(
  {
    dayName: { type: String, required: true, trim: true },
    workoutTitle: { type: String, required: true, trim: true },
    isRestDay: { type: Boolean, default: false },
    targetMuscleGroups: [{ type: String, trim: true }],
    warmUp: { type: String, trim: true },
    coolDown: { type: String, trim: true },
    estimatedDurationMins: { type: Number, default: 45 },
    exercises: [WorkoutExerciseSchema],
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    name: {
      type: String,
      required: [true, 'Workout plan name is required'],
      trim: true,
      index: true,
    },
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member reference is required'],
      index: true,
    },
    fitnessGoal: {
      type: String,
      required: true,
      default: 'GENERAL_FITNESS',
    },
    experienceLevel: {
      type: String,
      required: true,
      default: 'BEGINNER',
    },
    availableEquipment: {
      type: String,
      default: 'FULL_GYM',
    },
    daysPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
      default: 4,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    schedule: [WorkoutDayScheduleSchema],
    approvalStatus: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
      default: 'APPROVED',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    source: {
      type: String,
      enum: ['AI_GENERATED', 'MANUAL'],
      default: 'MANUAL',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    limitationsConsidered: [{ type: String, trim: true }],
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

WorkoutPlanSchema.index({ member: 1, approvalStatus: 1 });
WorkoutPlanSchema.index({ createdAt: -1 });

export const WorkoutPlan = mongoose.model<IWorkoutPlan>('WorkoutPlan', WorkoutPlanSchema);
