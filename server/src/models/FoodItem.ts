import mongoose, { Document, Schema } from 'mongoose';

export type FoodCategory =
  | 'PROTEINS'
  | 'CARBOHYDRATES'
  | 'HEALTHY_FATS'
  | 'DAIRY'
  | 'VEGETABLES'
  | 'FRUITS'
  | 'SUPPLEMENTS'
  | 'SNACKS_OTHERS';

export interface IFoodItem extends Document {
  name: string;
  category: FoodCategory;
  servingSize: number;
  servingUnit: string; // 'g', 'ml', 'piece', 'scoop', 'cup', 'slice', 'bowl'
  calories: number; // kcal per serving
  protein: number; // grams per serving
  carbs: number; // grams per serving
  fat: number; // grams per serving
  fiber?: number; // grams per serving
  source: string; // 'Standard Gym Nutrition Database (Verified)', 'Custom Gym Entry', etc.
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const FoodItemSchema = new Schema<IFoodItem>(
  {
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'PROTEINS',
        'CARBOHYDRATES',
        'HEALTHY_FATS',
        'DAIRY',
        'VEGETABLES',
        'FRUITS',
        'SUPPLEMENTS',
        'SNACKS_OTHERS',
      ],
      default: 'PROTEINS',
      index: true,
    },
    servingSize: {
      type: Number,
      required: [true, 'Serving size is required'],
      min: [0.1, 'Serving size must be greater than zero'],
      default: 100,
    },
    servingUnit: {
      type: String,
      required: [true, 'Serving unit is required'],
      trim: true,
      default: 'g',
    },
    calories: {
      type: Number,
      required: [true, 'Calories are required'],
      min: [0, 'Calories cannot be negative'],
    },
    protein: {
      type: Number,
      required: [true, 'Protein is required'],
      min: [0, 'Protein cannot be negative'],
      default: 0,
    },
    carbs: {
      type: Number,
      required: [true, 'Carbohydrates are required'],
      min: [0, 'Carbohydrates cannot be negative'],
      default: 0,
    },
    fat: {
      type: Number,
      required: [true, 'Fat is required'],
      min: [0, 'Fat cannot be negative'],
      default: 0,
    },
    fiber: {
      type: Number,
      min: [0, 'Fiber cannot be negative'],
      default: 0,
    },
    source: {
      type: String,
      trim: true,
      default: 'Standard Gym Nutrition Database (Verified)',
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

FoodItemSchema.index({ category: 1, status: 1 });
FoodItemSchema.index({ name: 'text', notes: 'text' });

export const FoodItem = mongoose.model<IFoodItem>('FoodItem', FoodItemSchema);
