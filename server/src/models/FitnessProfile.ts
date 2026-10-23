import mongoose, { Document, Schema } from 'mongoose';

export type DietaryPreference =
  | 'VEGETARIAN'
  | 'NON_VEGETARIAN'
  | 'EGGETARIAN'
  | 'VEGAN'
  | 'JAIN'
  | 'OTHER';

export type FitnessExperience = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type FitnessGoal =
  | 'WEIGHT_LOSS'
  | 'MUSCLE_GAIN'
  | 'MAINTENANCE'
  | 'ENDURANCE'
  | 'STRENGTH';

export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHTLY_ACTIVE'
  | 'MODERATELY_ACTIVE'
  | 'VERY_ACTIVE'
  | 'EXTRA_ACTIVE';

export type AvailableEquipment =
  | 'FULL_GYM'
  | 'DUMBBELLS_ONLY'
  | 'BODYWEIGHT_HOME'
  | 'RESISTANCE_BANDS';

export type FoodBudget = 'BUDGET' | 'MODERATE' | 'PREMIUM';

export type FoodPrepPreference = 'HOME_COOKED' | 'MEAL_PREP' | 'QUICK_EASY';

export interface IFitnessProfile extends Document {
  member: mongoose.Types.ObjectId;
  age: number;
  gender: 'MALE' | 'FEMALE';
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg?: number;
  fitnessExperience: FitnessExperience;
  fitnessGoal: FitnessGoal;
  activityLevel: ActivityLevel;
  preferredWorkoutTime?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  workoutDaysPerWeek: number; // 3 to 7
  workoutDurationMins: number; // 30, 45, 60, 90
  availableEquipment: AvailableEquipment;
  exerciseLimitations?: string[]; // e.g. ["Lower back pain", "Knee strain"]
  dietaryPreference: DietaryPreference;
  allergies?: string[]; // e.g. ["Dairy", "Peanuts", "Gluten"]
  likedFoods?: string[];
  dislikedFoods?: string[];
  mealTimings?: string[]; // e.g. ["08:30 AM", "01:30 PM", "08:30 PM"]
  mealsPerDay: number; // 3 to 6
  foodBudget?: FoodBudget;
  foodPreparationPreference?: FoodPrepPreference;
  sleepDurationHours?: number;
  dailyStepsTarget?: number;
  // Deterministic nutrition calculation snapshot
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterIntakeLiters: number;
  bmi?: number;
  status: 'ACTIVE' | 'ARCHIVED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FitnessProfileSchema = new Schema<IFitnessProfile>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      unique: true,
      index: true,
    },
    age: {
      type: Number,
      required: true,
      min: [12, 'Age must be at least 12'],
      max: [100, 'Age must be realistic'],
    },
    gender: {
      type: String,
      required: true,
      enum: ['MALE', 'FEMALE'],
      default: 'MALE',
    },
    heightCm: {
      type: Number,
      required: true,
      min: [100, 'Height must be at least 100 cm'],
      max: [250, 'Height must be realistic'],
    },
    currentWeightKg: {
      type: Number,
      required: true,
      min: [30, 'Weight must be at least 30 kg'],
      max: [300, 'Weight must be realistic'],
    },
    targetWeightKg: {
      type: Number,
      min: [30, 'Target weight must be realistic'],
      max: [300, 'Target weight must be realistic'],
    },
    fitnessExperience: {
      type: String,
      required: true,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'BEGINNER',
    },
    fitnessGoal: {
      type: String,
      required: true,
      enum: ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE', 'ENDURANCE', 'STRENGTH'],
      default: 'WEIGHT_LOSS',
    },
    activityLevel: {
      type: String,
      required: true,
      enum: ['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE'],
      default: 'MODERATELY_ACTIVE',
    },
    preferredWorkoutTime: {
      type: String,
      enum: ['MORNING', 'AFTERNOON', 'EVENING'],
      default: 'EVENING',
    },
    workoutDaysPerWeek: {
      type: Number,
      required: true,
      min: [2, 'At least 2 days recommended'],
      max: [7, 'Maximum 7 days per week'],
      default: 4,
    },
    workoutDurationMins: {
      type: Number,
      required: true,
      min: [20, 'At least 20 minutes'],
      max: [180, 'Maximum 180 minutes'],
      default: 60,
    },
    availableEquipment: {
      type: String,
      required: true,
      enum: ['FULL_GYM', 'DUMBBELLS_ONLY', 'BODYWEIGHT_HOME', 'RESISTANCE_BANDS'],
      default: 'FULL_GYM',
    },
    exerciseLimitations: {
      type: [String],
      default: [],
    },
    dietaryPreference: {
      type: String,
      required: true,
      enum: ['VEGETARIAN', 'NON_VEGETARIAN', 'EGGETARIAN', 'VEGAN', 'JAIN', 'OTHER'],
      default: 'VEGETARIAN',
    },
    allergies: {
      type: [String],
      default: [],
    },
    likedFoods: {
      type: [String],
      default: [],
    },
    dislikedFoods: {
      type: [String],
      default: [],
    },
    mealTimings: {
      type: [String],
      default: ['08:30 AM', '11:00 AM', '01:30 PM', '05:30 PM', '08:30 PM'],
    },
    mealsPerDay: {
      type: Number,
      required: true,
      min: [2, 'At least 2 meals'],
      max: [7, 'Max 7 meals'],
      default: 4,
    },
    foodBudget: {
      type: String,
      enum: ['BUDGET', 'MODERATE', 'PREMIUM'],
      default: 'MODERATE',
    },
    foodPreparationPreference: {
      type: String,
      enum: ['HOME_COOKED', 'MEAL_PREP', 'QUICK_EASY'],
      default: 'HOME_COOKED',
    },
    sleepDurationHours: {
      type: Number,
      min: [4, 'Sleep must be realistic'],
      max: [14, 'Sleep must be realistic'],
      default: 7.5,
    },
    dailyStepsTarget: {
      type: Number,
      default: 8000,
    },
    bmr: {
      type: Number,
      required: true,
      default: 1600,
    },
    tdee: {
      type: Number,
      required: true,
      default: 2200,
    },
    targetCalories: {
      type: Number,
      required: true,
      default: 2000,
    },
    targetProtein: {
      type: Number,
      required: true,
      default: 130,
    },
    targetCarbs: {
      type: Number,
      required: true,
      default: 200,
    },
    targetFat: {
      type: Number,
      required: true,
      default: 55,
    },
    waterIntakeLiters: {
      type: Number,
      default: 3.5,
    },
    bmi: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

FitnessProfileSchema.index({ member: 1, status: 1 });

export const FitnessProfile = mongoose.model<IFitnessProfile>('FitnessProfile', FitnessProfileSchema);
