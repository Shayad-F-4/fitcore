import mongoose, { Document, Schema } from 'mongoose';

export type FitnessGoal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE' | 'ENDURANCE';

export type MealType =
  | 'BREAKFAST'
  | 'MORNING_SNACK'
  | 'LUNCH'
  | 'EVENING_SNACK'
  | 'DINNER';

export interface IMealItem {
  foodItem?: mongoose.Types.ObjectId;
  foodName: string;
  servingUnit: string;
  servingSize: number;
  quantity: number; // multiplier of servingSize
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  notes?: string;
}

export interface IMealSchedule {
  mealType: MealType;
  name: string;
  time?: string;
  items: IMealItem[];
  mealCalories: number;
  mealProtein: number;
  mealCarbs: number;
  mealFat: number;
  mealFiber?: number;
}

export interface IDietPlan extends Document {
  name: string;
  member: mongoose.Types.ObjectId;
  fitnessGoal: FitnessGoal;
  startDate: Date;
  endDate?: Date;
  targetCalories: number;
  targetProtein: number; // in grams
  targetCarbs: number; // in grams
  targetFat: number; // in grams
  waterIntakeLiters?: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'ARCHIVED';
  approvalStatus?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  version?: number;
  source?: 'AI_GENERATED' | 'MANUAL';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  allergyWarnings?: string[];
  shoppingList?: Array<{ item: string; quantity: string; category?: string }>;
  sevenDaySchedule?: Array<{
    day: string;
    dayCalories: number;
    dayProtein: number;
    dayCarbs: number;
    dayFat: number;
    meals: IMealSchedule[];
  }>;
  meals: IMealSchedule[];
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyFiber?: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MealItemSchema = new Schema<IMealItem>(
  {
    foodItem: {
      type: Schema.Types.ObjectId,
      ref: 'FoodItem',
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
    },
    servingUnit: {
      type: String,
      required: true,
      default: 'g',
    },
    servingSize: {
      type: Number,
      required: true,
      default: 100,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be positive'],
      default: 1,
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    protein: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    carbs: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    fat: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    fiber: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const MealScheduleSchema = new Schema<IMealSchedule>(
  {
    mealType: {
      type: String,
      required: true,
      enum: ['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'EVENING_SNACK', 'DINNER'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    time: {
      type: String,
      trim: true,
    },
    items: [MealItemSchema],
    mealCalories: {
      type: Number,
      required: true,
      default: 0,
    },
    mealProtein: {
      type: Number,
      required: true,
      default: 0,
    },
    mealCarbs: {
      type: Number,
      required: true,
      default: 0,
    },
    mealFat: {
      type: Number,
      required: true,
      default: 0,
    },
    mealFiber: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const DietPlanSchema = new Schema<IDietPlan>(
  {
    name: {
      type: String,
      required: [true, 'Diet plan name is required'],
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
      required: [true, 'Fitness goal is required'],
      enum: ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE', 'ENDURANCE'],
      default: 'WEIGHT_LOSS',
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    targetCalories: {
      type: Number,
      required: [true, 'Target calories are required'],
      min: [500, 'Target calories must be realistic'],
      default: 2000,
    },
    targetProtein: {
      type: Number,
      required: [true, 'Target protein is required'],
      min: [0, 'Target protein cannot be negative'],
      default: 120,
    },
    targetCarbs: {
      type: Number,
      required: [true, 'Target carbohydrates are required'],
      min: [0, 'Target carbohydrates cannot be negative'],
      default: 200,
    },
    targetFat: {
      type: Number,
      required: [true, 'Target fat is required'],
      min: [0, 'Target fat cannot be negative'],
      default: 55,
    },
    waterIntakeLiters: {
      type: Number,
      default: 3.5,
      min: [1, 'Water intake must be at least 1 liter'],
      max: [10, 'Water intake must be realistic'],
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
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
    allergyWarnings: [{ type: String, trim: true }],
    shoppingList: [
      {
        item: { type: String, required: true },
        quantity: { type: String, required: true },
        category: { type: String },
      },
    ],
    sevenDaySchedule: [
      {
        day: { type: String, required: true },
        dayCalories: { type: Number, default: 0 },
        dayProtein: { type: Number, default: 0 },
        dayCarbs: { type: Number, default: 0 },
        dayFat: { type: Number, default: 0 },
        meals: [MealScheduleSchema],
      },
    ],
    meals: [MealScheduleSchema],
    dailyCalories: {
      type: Number,
      required: true,
      default: 0,
    },
    dailyProtein: {
      type: Number,
      required: true,
      default: 0,
    },
    dailyCarbs: {
      type: Number,
      required: true,
      default: 0,
    },
    dailyFat: {
      type: Number,
      required: true,
      default: 0,
    },
    dailyFiber: {
      type: Number,
      default: 0,
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

DietPlanSchema.index({ member: 1, status: 1 });
DietPlanSchema.index({ createdAt: -1 });

export const DietPlan = mongoose.model<IDietPlan>('DietPlan', DietPlanSchema);
