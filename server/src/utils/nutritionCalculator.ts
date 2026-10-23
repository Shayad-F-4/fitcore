export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHTLY_ACTIVE'
  | 'MODERATELY_ACTIVE'
  | 'VERY_ACTIVE'
  | 'EXTRA_ACTIVE';

export type GenderType = 'MALE' | 'FEMALE';

export type CalorieGoal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE' | 'ENDURANCE';

export interface CalorieCalculationInput {
  age: number;
  gender: GenderType;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  fitnessGoal: CalorieGoal;
}

export interface CalorieCalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  waterIntakeLiters: number;
  calorieAdjustment: number;
  adjustmentDescription: string;
  formulaUsed: string;
  safetyNotice?: string;
  disclaimer: string;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2, // Office work, little or no exercise
  LIGHTLY_ACTIVE: 1.375, // Light training 1-3 days/week
  MODERATELY_ACTIVE: 1.55, // Moderate gym workouts 3-5 days/week
  VERY_ACTIVE: 1.725, // Hard gym workouts 6-7 days/week
  EXTRA_ACTIVE: 1.9, // Intense athletic training or physical job + gym
};

/**
 * Calculates BMR, TDEE, and recommended daily macronutrient targets
 * using the validated Mifflin-St Jeor equation.
 */
export function calculateCalorieAndMacros(
  input: CalorieCalculationInput
): CalorieCalculationResult {
  const { age, gender, heightCm, weightKg, activityLevel, fitnessGoal } = input;

  // Validation
  if (age < 12 || age > 100) {
    throw new Error('Age must be between 12 and 100 years');
  }
  if (heightCm < 100 || heightCm > 250) {
    throw new Error('Height must be between 100 cm and 250 cm');
  }
  if (weightKg < 30 || weightKg > 300) {
    throw new Error('Weight must be between 30 kg and 300 kg');
  }

  // 1. Mifflin-St Jeor BMR Equation
  // Men: BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
  // Women: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
  let bmrRaw: number;
  if (gender === 'MALE') {
    bmrRaw = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmrRaw = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  const bmr = Math.round(bmrRaw);

  // 2. TDEE (Total Daily Energy Expenditure)
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  const tdee = Math.round(bmr * multiplier);

  // 3. Goal-based Calorie Target
  let targetCalories: number;
  let calorieAdjustment = 0;
  let adjustmentDescription = '';
  let safetyNotice: string | undefined;

  // Safe minimum floor calories to avoid metabolic suppression or malnutrition
  const MIN_SAFE_CALORIES = gender === 'MALE' ? 1500 : 1200;

  switch (fitnessGoal) {
    case 'WEIGHT_LOSS': {
      // Moderate, sustainable 20% deficit (approx 350-500 kcal deficit)
      const rawDeficit = Math.round(tdee * 0.2);
      const cappedDeficit = Math.min(rawDeficit, 600); // Do not prescribe crash deficits
      let calcTarget = tdee - cappedDeficit;

      if (calcTarget < MIN_SAFE_CALORIES) {
        calcTarget = MIN_SAFE_CALORIES;
        safetyNotice = `Calorie target raised to safe physiological minimum of ${MIN_SAFE_CALORIES} kcal/day to ensure adequate micronutrient intake.`;
      }
      targetCalories = calcTarget;
      calorieAdjustment = targetCalories - tdee;
      adjustmentDescription = `Sustainable 15-20% caloric deficit (${calorieAdjustment} kcal/day) for fat loss without excessive muscle loss.`;
      break;
    }

    case 'MUSCLE_GAIN': {
      // Lean hypertrophy surplus: 12% surplus (approx +250 to +350 kcal)
      const surplus = Math.min(Math.round(tdee * 0.12), 400);
      targetCalories = tdee + surplus;
      calorieAdjustment = surplus;
      adjustmentDescription = `Lean hypertrophy surplus (+${surplus} kcal/day) to support muscle protein synthesis while minimizing fat gain.`;
      break;
    }

    case 'ENDURANCE': {
      // 5% surplus to support heavy aerobic expenditure
      const surplus = Math.round(tdee * 0.05);
      targetCalories = tdee + surplus;
      calorieAdjustment = surplus;
      adjustmentDescription = `Endurance performance target (+${surplus} kcal/day) optimized for sustained glycogen replenishment.`;
      break;
    }

    case 'MAINTENANCE':
    default: {
      targetCalories = tdee;
      calorieAdjustment = 0;
      adjustmentDescription = 'Iso-caloric maintenance to preserve current body weight and metabolic equilibrium.';
      break;
    }
  }

  // 4. Macronutrient Distribution
  // Protein: High protein intake scaled by bodyweight in kg
  let proteinPerKg: number;
  if (fitnessGoal === 'WEIGHT_LOSS') {
    proteinPerKg = 2.0; // Higher protein in a deficit prevents muscle catabolism
  } else if (fitnessGoal === 'MUSCLE_GAIN') {
    proteinPerKg = 1.8; // Optimal hypertrophy stimulus
  } else if (fitnessGoal === 'ENDURANCE') {
    proteinPerKg = 1.6;
  } else {
    proteinPerKg = 1.6;
  }

  const targetProteinGrams = Math.round(weightKg * proteinPerKg);
  const proteinCalories = targetProteinGrams * 4;

  // Fat: 25% of total caloric budget (essential for testosterone and hormone synthesis)
  const targetFatCalories = targetCalories * 0.25;
  const targetFatGrams = Math.round(targetFatCalories / 9);

  // Carbohydrates: Remainder of caloric budget (1g carb = 4 kcal)
  const remainingCalories = targetCalories - proteinCalories - targetFatGrams * 9;
  const targetCarbsGrams = Math.max(50, Math.round(remainingCalories / 4));

  // Recommended daily water intake (approx 35-40 ml per kg body weight)
  const waterIntakeLiters = Math.max(2.5, Math.min(5.5, Number(((weightKg * 38) / 1000).toFixed(1))));

  const formulaUsed =
    gender === 'MALE'
      ? 'Mifflin-St Jeor: BMR = (10 × W_kg) + (6.25 × H_cm) - (5 × Age) + 5'
      : 'Mifflin-St Jeor: BMR = (10 × W_kg) + (6.25 × H_cm) - (5 × Age) - 161';

  const disclaimer =
    'This calculator uses the Mifflin-St Jeor equation to estimate energy expenditure for fitness purposes. These estimates do not replace personalized clinical advice from a certified clinical dietitian or medical practitioner.';

  return {
    bmr,
    tdee,
    targetCalories,
    targetProteinGrams,
    targetCarbsGrams,
    targetFatGrams,
    waterIntakeLiters,
    calorieAdjustment,
    adjustmentDescription,
    formulaUsed,
    safetyNotice,
    disclaimer,
  };
}

/**
 * Calculates BMI (Body Mass Index) given weight in kg and height in cm.
 */
export function calculateBMI(weightKg: number, heightCm: number): {
  bmi: number;
  category: 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';
  description: string;
} {
  if (heightCm <= 0 || weightKg <= 0) {
    throw new Error('Valid height and weight are required for BMI calculation');
  }
  const heightMeters = heightCm / 100;
  const bmiRaw = weightKg / (heightMeters * heightMeters);
  const bmi = Number(bmiRaw.toFixed(1));

  let category: 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';
  let description: string;

  if (bmi < 18.5) {
    category = 'UNDERWEIGHT';
    description = 'Underweight (Below 18.5). Gradual caloric surplus recommended.';
  } else if (bmi < 24.9) {
    category = 'NORMAL';
    description = 'Normal healthy weight range (18.5 - 24.9).';
  } else if (bmi < 29.9) {
    category = 'OVERWEIGHT';
    description = 'Overweight range (25.0 - 29.9). Note: Muscular athletes may have higher BMI.';
  } else {
    category = 'OBESE';
    description = 'Obese range (30.0 and above). Structured lifestyle & nutrition plan advised.';
  }

  return { bmi, category, description };
}
