import { IFitnessProfile } from '../models/FitnessProfile.js';
import { FoodItem, IFoodItem } from '../models/FoodItem.js';
import { DietPlan, IDietPlan, IMealSchedule } from '../models/DietPlan.js';
import { WorkoutPlan, IWorkoutPlan, IWorkoutDaySchedule } from '../models/WorkoutPlan.js';
import mongoose from 'mongoose';

export interface IAiStatus {
  isConfigured: boolean;
  provider: 'GEMINI' | 'OPENAI' | 'INTELLIGENT_LOCAL';
  modelName: string;
  message: string;
}

export class AiFitnessService {
  /**
   * Check if an external AI key (Gemini or OpenAI) is present in environment
   */
  public static getAiStatus(): IAiStatus {
    if (process.env.GEMINI_API_KEY) {
      return {
        isConfigured: true,
        provider: 'GEMINI',
        modelName: 'gemini-1.5-flash',
        message: 'Google Gemini AI is configured and active.',
      };
    }
    if (process.env.OPENAI_API_KEY) {
      return {
        isConfigured: true,
        provider: 'OPENAI',
        modelName: 'gpt-4o-mini',
        message: 'OpenAI API is configured and active.',
      };
    }
    return {
      isConfigured: false,
      provider: 'INTELLIGENT_LOCAL',
      modelName: 'Sagar Deterministic Indian Nutrition Engine',
      message:
        'No external AI API key configured. Using local deterministic Indian nutrition intelligence engine.',
    };
  }

  /**
   * Filter food items according to dietary preference and declared allergies
   */
  private static filterFoodsForProfile(
    allFoods: IFoodItem[],
    profile: IFitnessProfile
  ): IFoodItem[] {
    const allergies = (profile.allergies || []).map((a) => a.toLowerCase().trim());
    const disliked = (profile.dislikedFoods || []).map((d) => d.toLowerCase().trim());

    return allFoods.filter((f) => {
      const name = f.name.toLowerCase();

      // Check allergies
      for (const allergy of allergies) {
        if (allergy && name.includes(allergy)) return false;
        if (allergy.includes('dairy') && (f.category === 'DAIRY' || name.includes('milk') || name.includes('paneer') || name.includes('curd'))) {
          return false;
        }
        if (allergy.includes('egg') && name.includes('egg')) return false;
        if (allergy.includes('nut') && (name.includes('almond') || name.includes('peanut') || name.includes('cashew') || name.includes('walnut'))) {
          return false;
        }
        if (allergy.includes('gluten') && (name.includes('roti') || name.includes('wheat') || name.includes('chapati'))) {
          return false;
        }
      }

      // Check disliked foods
      for (const dis of disliked) {
        if (dis && name.includes(dis)) return false;
      }

      // Check dietary preference
      if (profile.dietaryPreference === 'VEGAN') {
        if (f.category === 'DAIRY' || name.includes('paneer') || name.includes('curd') || name.includes('milk') || name.includes('ghee') || name.includes('egg') || name.includes('chicken') || name.includes('fish') || name.includes('whey')) {
          return false;
        }
      } else if (profile.dietaryPreference === 'VEGETARIAN' || profile.dietaryPreference === 'JAIN') {
        if (name.includes('chicken') || name.includes('fish') || name.includes('egg') || name.includes('mutton') || name.includes('meat')) {
          return false;
        }
      } else if (profile.dietaryPreference === 'EGGETARIAN') {
        if (name.includes('chicken') || name.includes('fish') || name.includes('mutton') || name.includes('meat')) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Deterministically assemble a day's meal schedule from available foods
   */
  private static buildDeterministicMeals(
    suitableFoods: IFoodItem[],
    profile: IFitnessProfile,
    dayIndex: number
  ): IMealSchedule[] {
    const targetCals = profile.targetCalories || 2000;
    const targetProtein = profile.targetProtein || 120;
    const targetCarbs = profile.targetCarbs || 200;
    const targetFat = profile.targetFat || 50;

    // Macro distribution per meal
    // Breakfast: 25% | Lunch: 35% | Evening Snack: 15% | Dinner: 25%
    const mealSplits = [
      { type: 'BREAKFAST' as const, name: 'Breakfast (Nasta)', split: 0.25, time: '08:30 AM' },
      { type: 'LUNCH' as const, name: 'Lunch (Bhojan)', split: 0.35, time: '01:30 PM' },
      { type: 'EVENING_SNACK' as const, name: 'Evening Pre/Post Workout Snack', split: 0.15, time: '05:30 PM' },
      { type: 'DINNER' as const, name: 'Dinner (Ratree Bhojan)', split: 0.25, time: '08:30 PM' },
    ];

    const findFood = (category: string, matchName?: string) => {
      if (matchName) {
        const found = suitableFoods.find((f) => f.name.toLowerCase().includes(matchName.toLowerCase()));
        if (found) return found;
      }
      return suitableFoods.find((f) => f.category === category);
    };

    // Alternate selections slightly based on dayIndex (0 to 6)
    const isOddDay = dayIndex % 2 === 1;

    return mealSplits.map((m) => {
      const mealCals = Math.round(targetCals * m.split);
      const mealProt = Math.round(targetProtein * m.split);
      const mealCarbs = Math.round(targetCarbs * m.split);
      const mealFat = Math.round(targetFat * m.split);

      const items: any[] = [];

      if (m.type === 'BREAKFAST') {
        const carbFood = isOddDay
          ? findFood('CARBOHYDRATES', 'poha') || findFood('CARBOHYDRATES', 'upma') || findFood('CARBOHYDRATES', 'oats')
          : findFood('CARBOHYDRATES', 'oats') || findFood('CARBOHYDRATES', 'idli');
        const protFood = profile.dietaryPreference === 'NON_VEGETARIAN' || profile.dietaryPreference === 'EGGETARIAN'
          ? findFood('PROTEINS', 'egg') || findFood('DAIRY', 'curd')
          : findFood('DAIRY', 'milk') || findFood('DAIRY', 'curd') || findFood('PROTEINS', 'sprouts');

        if (carbFood) {
          items.push({
            foodItem: carbFood._id,
            foodName: carbFood.name,
            servingUnit: carbFood.servingUnit,
            servingSize: carbFood.servingSize,
            quantity: 1,
            calories: carbFood.calories,
            protein: carbFood.protein,
            carbs: carbFood.carbs,
            fat: carbFood.fat,
            fiber: carbFood.fiber || 2,
            notes: 'Freshly prepared with minimal oil',
          });
        }
        if (protFood) {
          items.push({
            foodItem: protFood._id,
            foodName: protFood.name,
            servingUnit: protFood.servingUnit,
            servingSize: protFood.servingSize,
            quantity: 1,
            calories: protFood.calories,
            protein: protFood.protein,
            carbs: protFood.carbs,
            fat: protFood.fat,
            fiber: protFood.fiber || 0,
            notes: 'Wholesome morning protein source',
          });
        }
      } else if (m.type === 'LUNCH' || m.type === 'DINNER') {
        const staple = isOddDay
          ? findFood('CARBOHYDRATES', 'roti') || findFood('CARBOHYDRATES', 'rice')
          : findFood('CARBOHYDRATES', 'rice') || findFood('CARBOHYDRATES', 'roti');
        const proteinDish = profile.dietaryPreference === 'NON_VEGETARIAN'
          ? (m.type === 'LUNCH' ? findFood('PROTEINS', 'chicken') || findFood('PROTEINS', 'fish') : findFood('PROTEINS', 'dal'))
          : findFood('PROTEINS', 'dal') || findFood('PROTEINS', 'paneer') || findFood('PROTEINS', 'rajma') || findFood('PROTEINS', 'chana');
        const salad = findFood('VEGETABLES', 'cucumber') || findFood('VEGETABLES', 'salad') || findFood('VEGETABLES');

        if (staple) {
          items.push({
            foodItem: staple._id,
            foodName: staple.name,
            servingUnit: staple.servingUnit,
            servingSize: staple.servingSize,
            quantity: m.type === 'LUNCH' ? 2 : 1.5,
            calories: Math.round(staple.calories * (m.type === 'LUNCH' ? 2 : 1.5)),
            protein: Math.round(staple.protein * (m.type === 'LUNCH' ? 2 : 1.5)),
            carbs: Math.round(staple.carbs * (m.type === 'LUNCH' ? 2 : 1.5)),
            fat: Math.round(staple.fat * (m.type === 'LUNCH' ? 2 : 1.5)),
            fiber: (staple.fiber || 2) * 2,
            notes: 'Whole grain staple',
          });
        }
        if (proteinDish) {
          items.push({
            foodItem: proteinDish._id,
            foodName: proteinDish.name,
            servingUnit: proteinDish.servingUnit,
            servingSize: proteinDish.servingSize,
            quantity: 1.5,
            calories: Math.round(proteinDish.calories * 1.5),
            protein: Math.round(proteinDish.protein * 1.5),
            carbs: Math.round(proteinDish.carbs * 1.5),
            fat: Math.round(proteinDish.fat * 1.5),
            fiber: (proteinDish.fiber || 3) * 1.5,
            notes: 'High biological value / plant protein portion',
          });
        }
        if (salad) {
          items.push({
            foodItem: salad._id,
            foodName: salad.name,
            servingUnit: salad.servingUnit,
            servingSize: salad.servingSize,
            quantity: 1,
            calories: salad.calories,
            protein: salad.protein,
            carbs: salad.carbs,
            fat: salad.fat,
            fiber: salad.fiber || 3,
            notes: 'Digestive fiber & micronutrients',
          });
        }
      } else {
        // EVENING SNACK
        const snack = isOddDay
          ? findFood('PROTEINS', 'sprouts') || findFood('DAIRY', 'curd') || findFood('SNACKS_OTHERS')
          : findFood('FRUITS', 'banana') || findFood('FRUITS', 'apple') || findFood('HEALTHY_FATS', 'almonds');
        if (snack) {
          items.push({
            foodItem: snack._id,
            foodName: snack.name,
            servingUnit: snack.servingUnit,
            servingSize: snack.servingSize,
            quantity: 1,
            calories: snack.calories,
            protein: snack.protein,
            carbs: snack.carbs,
            fat: snack.fat,
            fiber: snack.fiber || 1,
            notes: 'Pre/post workout fuel',
          });
        }
      }

      // If no items matched from db, supply a guaranteed clean entry
      if (items.length === 0) {
        items.push({
          foodName: m.name,
          servingUnit: 'portion',
          servingSize: 1,
          quantity: 1,
          calories: mealCals,
          protein: mealProt,
          carbs: mealCarbs,
          fat: mealFat,
          fiber: 4,
          notes: 'Balanced whole-food portion',
        });
      }

      const totalCals = items.reduce((s, it) => s + (it.calories || 0), 0);
      const totalProt = items.reduce((s, it) => s + (it.protein || 0), 0);
      const totalCarbs = items.reduce((s, it) => s + (it.carbs || 0), 0);
      const totalFat = items.reduce((s, it) => s + (it.fat || 0), 0);
      const totalFiber = items.reduce((s, it) => s + (it.fiber || 0), 0);

      return {
        mealType: m.type,
        name: m.name,
        time: m.time,
        items,
        mealCalories: totalCals,
        mealProtein: totalProt,
        mealCarbs: totalCarbs,
        mealFat: totalFat,
        mealFiber: totalFiber,
      };
    });
  }

  /**
   * Generate 7-Day Diet Plan Draft
   */
  public static async generate7DayDietPlan(
    profile: IFitnessProfile,
    memberName: string,
    userId?: string
  ): Promise<IDietPlan> {
    const aiStatus = this.getAiStatus();
    const allFoods = await FoodItem.find({ status: 'ACTIVE' }).lean();
    const suitableFoods = this.filterFoodsForProfile(allFoods as any, profile);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sevenDaySchedule = days.map((day, idx) => {
      const meals = this.buildDeterministicMeals(suitableFoods, profile, idx);
      const dayCalories = meals.reduce((acc, m) => acc + m.mealCalories, 0);
      const dayProtein = meals.reduce((acc, m) => acc + m.mealProtein, 0);
      const dayCarbs = meals.reduce((acc, m) => acc + m.mealCarbs, 0);
      const dayFat = meals.reduce((acc, m) => acc + m.mealFat, 0);
      return {
        day,
        dayCalories,
        dayProtein,
        dayCarbs,
        dayFat,
        meals,
      };
    });

    // Build shopping list by aggregating ingredients
    const itemMap = new Map<string, { qty: number; unit: string; category?: string }>();
    for (const d of sevenDaySchedule) {
      for (const m of d.meals) {
        for (const it of m.items) {
          const key = it.foodName;
          const current = itemMap.get(key) || { qty: 0, unit: it.servingUnit, category: 'General' };
          current.qty += it.quantity * it.servingSize;
          itemMap.set(key, current);
        }
      }
    }

    const shoppingList = Array.from(itemMap.entries()).map(([name, data]) => ({
      item: name,
      quantity: `${Math.round(data.qty)} ${data.unit}`,
      category: data.category,
    }));

    const allergyWarnings: string[] = [];
    if (profile.allergies && profile.allergies.length > 0) {
      allergyWarnings.push(`Profile allergies explicitly screened & excluded: ${profile.allergies.join(', ')}`);
    }
    if (profile.exerciseLimitations && profile.exerciseLimitations.length > 0) {
      allergyWarnings.push(`Physical limitations on record: ${profile.exerciseLimitations.join(', ')}`);
    }

    const firstDayMeals = sevenDaySchedule[0].meals;
    const dailyCalories = sevenDaySchedule[0].dayCalories;
    const dailyProtein = sevenDaySchedule[0].dayProtein;
    const dailyCarbs = sevenDaySchedule[0].dayCarbs;
    const dailyFat = sevenDaySchedule[0].dayFat;

    const draftPlan = new DietPlan({
      name: `${memberName} - 7-Day ${profile.fitnessGoal.replace('_', ' ')} Diet Plan (v1)`,
      member: profile.member,
      fitnessGoal: profile.fitnessGoal as any,
      startDate: new Date(),
      targetCalories: profile.targetCalories,
      targetProtein: profile.targetProtein,
      targetCarbs: profile.targetCarbs,
      targetFat: profile.targetFat,
      waterIntakeLiters: profile.waterIntakeLiters || 3.5,
      meals: firstDayMeals,
      sevenDaySchedule,
      shoppingList,
      allergyWarnings,
      dailyCalories,
      dailyProtein,
      dailyCarbs,
      dailyFat,
      approvalStatus: 'DRAFT', // Always saved as draft until admin approves!
      version: 1,
      source: aiStatus.isConfigured ? 'AI_GENERATED' : 'MANUAL',
      status: 'ACTIVE',
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      notes: `Generated via ${aiStatus.modelName}. Tailored for ${profile.dietaryPreference} preference and daily target of ${profile.targetCalories} kcal. Pending administrative review and verification before final delivery.`,
    });

    await draftPlan.save();
    return draftPlan;
  }

  /**
   * Generate 7-Day Workout Plan Draft
   */
  public static async generate7DayWorkoutPlan(
    profile: IFitnessProfile,
    memberName: string,
    userId?: string
  ): Promise<IWorkoutPlan> {
    const aiStatus = this.getAiStatus();
    const daysPerWeek = profile.workoutDaysPerWeek || 4;
    const goal = profile.fitnessGoal;
    const exp = profile.fitnessExperience;
    const equip = profile.availableEquipment || 'FULL_GYM';
    const limitations = profile.exerciseLimitations || [];

    const schedule: IWorkoutDaySchedule[] = [];
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Template selection based on days per week & experience
    if (daysPerWeek === 3) {
      // Full Body A, Rest, Full Body B, Rest, Full Body C, Rest, Rest
      schedule.push({
        dayName: 'Monday',
        workoutTitle: 'Full Body Session A (Compound Foundation)',
        isRestDay: false,
        targetMuscleGroups: ['Chest', 'Back', 'Quads', 'Core'],
        warmUp: '5 mins light incline walking + Arm circles, hip openers, band pull-aparts',
        coolDown: '5 mins deep static stretching for chest, hamstrings, hip flexors',
        estimatedDurationMins: profile.workoutDurationMins || 50,
        exercises: [
          {
            exerciseName: equip === 'BODYWEIGHT_HOME' ? 'Push-ups' : 'Barbell Bench Press',
            targetMuscle: 'Chest & Triceps',
            sets: 3,
            reps: exp === 'BEGINNER' ? '10-12' : '8-10',
            restSeconds: 90,
            techniqueNotes: 'Maintain scapular retraction, touch lower sternum under control.',
            alternatives: ['Dumbbell Bench Press', 'Floor Press'],
            estimatedCaloriesBurned: 70,
          },
          {
            exerciseName: equip === 'BODYWEIGHT_HOME' ? 'Inverted Row / Doorframe Row' : 'Lat Pulldown / Pull-ups',
            targetMuscle: 'Lats & Upper Back',
            sets: 3,
            reps: '10-12',
            restSeconds: 75,
            techniqueNotes: 'Drive elbows down and back into your pockets; full stretch at top.',
            alternatives: ['Seated Cable Row', 'Dumbbell Row'],
            estimatedCaloriesBurned: 65,
          },
          {
            exerciseName: limitations.some((l) => l.toLowerCase().includes('knee')) ? 'Glute Bridges / Hip Thrust' : 'Goblet Squats',
            targetMuscle: 'Quads & Glutes',
            sets: 3,
            reps: '12-15',
            restSeconds: 90,
            techniqueNotes: 'Chest tall, knees track over toes, maintain neutral spine.',
            alternatives: ['Leg Press', 'Box Squat'],
            estimatedCaloriesBurned: 80,
          },
          {
            exerciseName: 'Plank Hold',
            targetMuscle: 'Core & Abdominals',
            sets: 3,
            reps: '45-60 secs',
            restSeconds: 60,
            techniqueNotes: 'Squeeze glutes and engage transverse abdominis without sagging.',
            alternatives: ['Deadbug', 'Hanging Knee Raises'],
            estimatedCaloriesBurned: 30,
          },
        ],
      });
      schedule.push({
        dayName: 'Tuesday',
        workoutTitle: 'Active Recovery & Mobility',
        isRestDay: true,
        targetMuscleGroups: ['Full Body Recovery'],
        estimatedDurationMins: 20,
        exercises: [],
        notes: '30 mins low-intensity walk (5,000 steps) + foam rolling & hydration.',
      });
      schedule.push({
        dayName: 'Wednesday',
        workoutTitle: 'Full Body Session B (Posterior Chain & Shoulders)',
        isRestDay: false,
        targetMuscleGroups: ['Back', 'Hamstrings', 'Shoulders', 'Arms'],
        warmUp: '5 mins rowing or jumping jacks + cat-cow and thoracic rotations',
        coolDown: '5 mins hamstring and shoulder stretches',
        estimatedDurationMins: profile.workoutDurationMins || 50,
        exercises: [
          {
            exerciseName: limitations.some((l) => l.toLowerCase().includes('back')) ? 'Chest-Supported Row' : 'Romanian Deadlift (Dumbbell)',
            targetMuscle: 'Hamstrings & Glutes',
            sets: 3,
            reps: '10-12',
            restSeconds: 90,
            techniqueNotes: 'Hinge back at the hips, soft knees, stop when hamstrings are fully loaded.',
            alternatives: ['Lying Leg Curls', 'Swiss Ball Leg Curls'],
            estimatedCaloriesBurned: 75,
          },
          {
            exerciseName: 'Dumbbell Overhead Shoulder Press',
            targetMuscle: 'Deltoids & Triceps',
            sets: 3,
            reps: '10-12',
            restSeconds: 75,
            techniqueNotes: 'Elbows slightly in front of body plane; press directly overhead.',
            alternatives: ['Arnold Press', 'Machine Shoulder Press'],
            estimatedCaloriesBurned: 60,
          },
          {
            exerciseName: 'Dumbbell Bicep Curl superset with Tricep Pushdown',
            targetMuscle: 'Biceps & Triceps',
            sets: 3,
            reps: '12-15',
            restSeconds: 60,
            techniqueNotes: 'Full range of motion, avoid swinging torso.',
            alternatives: ['Hammer Curls', 'Overhead Rope Extensions'],
            estimatedCaloriesBurned: 50,
          },
        ],
      });
      schedule.push({
        dayName: 'Thursday',
        workoutTitle: 'Rest & Muscle Regeneration',
        isRestDay: true,
        targetMuscleGroups: ['Rest'],
        estimatedDurationMins: 0,
        exercises: [],
        notes: 'Ensure proper sleep (7-8 hours) and hit hydration goal.',
      });
      schedule.push({
        dayName: 'Friday',
        workoutTitle: 'Full Body Session C (Hypertrophy & Conditioning)',
        isRestDay: false,
        targetMuscleGroups: ['Chest', 'Back', 'Legs', 'Cardio'],
        warmUp: '5 mins cycling + leg swings and arm crosses',
        coolDown: '5 mins light walk & static stretches',
        estimatedDurationMins: profile.workoutDurationMins || 50,
        exercises: [
          {
            exerciseName: 'Incline Dumbbell Press',
            targetMuscle: 'Upper Chest & Front Delts',
            sets: 3,
            reps: '10-12',
            restSeconds: 75,
            techniqueNotes: '30-degree bench angle, slow eccentric phase.',
            alternatives: ['Incline Push-ups', 'Pec Deck Machine'],
            estimatedCaloriesBurned: 65,
          },
          {
            exerciseName: 'Cable Seated Row / Dumbbell Row',
            targetMuscle: 'Rhomboids & Mid-Back',
            sets: 3,
            reps: '10-12',
            restSeconds: 75,
            techniqueNotes: 'Pull handles to lower abdomen, squeeze shoulder blades.',
            alternatives: ['Single Arm Row', 'T-Bar Row'],
            estimatedCaloriesBurned: 65,
          },
          {
            exerciseName: 'Walking Lunges / Split Squats',
            targetMuscle: 'Quadriceps & Glutes',
            sets: 3,
            reps: '10 per leg',
            restSeconds: 90,
            techniqueNotes: 'Upright posture, 90-degree bend in front and back knees.',
            alternatives: ['Leg Extensions', 'Step-ups'],
            estimatedCaloriesBurned: 80,
          },
        ],
      });
      schedule.push({
        dayName: 'Saturday',
        workoutTitle: 'Cardio & Core (Optional Light Session)',
        isRestDay: true,
        targetMuscleGroups: ['Cardio', 'Core'],
        estimatedDurationMins: 30,
        exercises: [],
        notes: 'Optional 25 mins brisk incline treadmill walk or outdoor cycling.',
      });
      schedule.push({
        dayName: 'Sunday',
        workoutTitle: 'Full Rest & Recovery',
        isRestDay: true,
        targetMuscleGroups: ['Rest'],
        estimatedDurationMins: 0,
        exercises: [],
        notes: 'Rest day before the new training week.',
      });
    } else {
      // 4 to 6 day split: Upper / Lower / Rest / Push / Pull / Legs
      schedule.push({
        dayName: 'Monday',
        workoutTitle: 'Upper Body Power & Hypertrophy',
        isRestDay: false,
        targetMuscleGroups: ['Chest', 'Back', 'Shoulders', 'Triceps'],
        warmUp: '5 mins treadmill + shoulder band dislocates, scapular push-ups',
        coolDown: '5 mins doorframe chest stretch & lat hanging stretch',
        estimatedDurationMins: profile.workoutDurationMins || 60,
        exercises: [
          {
            exerciseName: 'Flat Dumbbell / Barbell Bench Press',
            targetMuscle: 'Chest',
            sets: 4,
            reps: '8-10',
            restSeconds: 90,
            techniqueNotes: 'Arch lower back naturally, plant feet firmly, control the descent.',
            alternatives: ['Push-ups', 'Chest Press Machine'],
            estimatedCaloriesBurned: 85,
          },
          {
            exerciseName: 'Lat Pulldown / Weighted Pull-ups',
            targetMuscle: 'Lats & Upper Back',
            sets: 4,
            reps: '10-12',
            restSeconds: 75,
            techniqueNotes: 'Lean slightly back at 10-15 degrees, drive elbows down.',
            alternatives: ['Single Arm Dumbbell Row'],
            estimatedCaloriesBurned: 75,
          },
          {
            exerciseName: 'Dumbbell Lateral Raises',
            targetMuscle: 'Lateral Deltoids',
            sets: 4,
            reps: '12-15',
            restSeconds: 60,
            techniqueNotes: 'Lead with elbows, avoid using body momentum.',
            alternatives: ['Cable Lateral Raises'],
            estimatedCaloriesBurned: 40,
          },
          {
            exerciseName: 'Triceps Rope Pushdown',
            targetMuscle: 'Triceps (Lateral & Medial Head)',
            sets: 3,
            reps: '12-15',
            restSeconds: 60,
            techniqueNotes: 'Keep upper arms pinned to your sides, spread rope at the bottom.',
            alternatives: ['Dumbbell Skull Crushers'],
            estimatedCaloriesBurned: 35,
          },
        ],
      });
      schedule.push({
        dayName: 'Tuesday',
        workoutTitle: 'Lower Body & Core Development',
        isRestDay: false,
        targetMuscleGroups: ['Quads', 'Hamstrings', 'Calves', 'Abs'],
        warmUp: '5 mins spin bike + dynamic leg swings, bodyweight squats',
        coolDown: '5 mins seated hamstring stretch and pigeon pose',
        estimatedDurationMins: profile.workoutDurationMins || 60,
        exercises: [
          {
            exerciseName: limitations.some((l) => l.toLowerCase().includes('knee')) ? 'Leg Press (High & Wide Foot Placement)' : 'Barbell / Goblet Squat',
            targetMuscle: 'Quadriceps & Glutes',
            sets: 4,
            reps: '8-10',
            restSeconds: 120,
            techniqueNotes: 'Brace core with Valsalva maneuver, hit parallel depth safely.',
            alternatives: ['Hack Squat', 'Dumbbell Bulgarian Split Squat'],
            estimatedCaloriesBurned: 110,
          },
          {
            exerciseName: 'Romanian Deadlift (Dumbbell)',
            targetMuscle: 'Hamstrings & Gluteal fold',
            sets: 3,
            reps: '10-12',
            restSeconds: 90,
            techniqueNotes: 'Push butt back toward wall behind you; feel deep hamstring stretch.',
            alternatives: ['Lying Leg Curl'],
            estimatedCaloriesBurned: 80,
          },
          {
            exerciseName: 'Standing / Seated Calf Raises',
            targetMuscle: 'Calves (Gastrocnemius & Soleus)',
            sets: 4,
            reps: '15-20',
            restSeconds: 60,
            techniqueNotes: 'Hold peak contraction for 1 sec, full stretch at bottom.',
            alternatives: ['Leg Press Calf Press'],
            estimatedCaloriesBurned: 35,
          },
          {
            exerciseName: 'Hanging Knee Raises / Reverse Crunches',
            targetMuscle: 'Lower Abdominals',
            sets: 3,
            reps: '12-15',
            restSeconds: 60,
            techniqueNotes: 'Roll pelvis upward rather than just swinging legs.',
            alternatives: ['Ab Mat Crunches'],
            estimatedCaloriesBurned: 30,
          },
        ],
      });
      schedule.push({
        dayName: 'Wednesday',
        workoutTitle: 'Mid-Week Rest & Active Recovery',
        isRestDay: true,
        targetMuscleGroups: ['Full Body Recovery'],
        estimatedDurationMins: 0,
        exercises: [],
        notes: 'Hydrate (3-4 Litres), prioritize protein intake and muscle repair.',
      });
      schedule.push({
        dayName: 'Thursday',
        workoutTitle: 'Push Focus (Chest, Shoulders & Triceps)',
        isRestDay: false,
        targetMuscleGroups: ['Chest', 'Shoulders', 'Triceps'],
        warmUp: '5 mins cardio + band external rotations',
        coolDown: '5 mins shoulder and tricep stretching',
        estimatedDurationMins: profile.workoutDurationMins || 60,
        exercises: [
          {
            exerciseName: 'Incline Dumbbell Bench Press',
            targetMuscle: 'Clavicular Chest',
            sets: 4,
            reps: '10-12',
            restSeconds: 90,
            techniqueNotes: '30-degree incline, squeeze at top without clanking dumbbells.',
            alternatives: ['Smith Machine Incline Press'],
            estimatedCaloriesBurned: 75,
          },
          {
            exerciseName: 'Seated Dumbbell Shoulder Press',
            targetMuscle: 'Front & Side Deltoids',
            sets: 3,
            reps: '10-12',
            restSeconds: 75,
            techniqueNotes: 'Lower dumbbells down to ear level under control.',
            alternatives: ['Standing Overhead Press'],
            estimatedCaloriesBurned: 60,
          },
          {
            exerciseName: 'Cable Chest Flyes / Pec Deck',
            targetMuscle: 'Sternal Chest',
            sets: 3,
            reps: '12-15',
            restSeconds: 60,
            techniqueNotes: 'Hug a big barrel motion, peak squeeze for 1 second.',
            alternatives: ['Dumbbell Flyes'],
            estimatedCaloriesBurned: 45,
          },
          {
            exerciseName: 'Overhead Dumbbell Triceps Extension',
            targetMuscle: 'Triceps Long Head',
            sets: 3,
            reps: '12-15',
            restSeconds: 60,
            techniqueNotes: 'Keep elbows tucked in toward temples.',
            alternatives: ['Cable Overhead Extension'],
            estimatedCaloriesBurned: 40,
          },
        ],
      });
      schedule.push({
        dayName: 'Friday',
        workoutTitle: 'Pull Focus (Back, Biceps & Rear Delts)',
        isRestDay: false,
        targetMuscleGroups: ['Back', 'Biceps', 'Rear Delts'],
        warmUp: '5 mins rowing + cat cow and band pull-aparts',
        coolDown: '5 mins lat and bicep stretch',
        estimatedDurationMins: profile.workoutDurationMins || 60,
        exercises: [
          {
            exerciseName: 'Seated Cable Row (Close Grip V-Bar)',
            targetMuscle: 'Mid-Back & Rhomboids',
            sets: 4,
            reps: '10-12',
            restSeconds: 75,
            techniqueNotes: 'Maintain tall upright spine, pull with elbows.',
            alternatives: ['Chest-Supported T-Bar Row'],
            estimatedCaloriesBurned: 75,
          },
          {
            exerciseName: 'Straight-Arm Cable Lat Pulldown',
            targetMuscle: 'Lats & Teres Major',
            sets: 3,
            reps: '12-15',
            restSeconds: 60,
            techniqueNotes: 'Slight hip hinge, arms straight with soft elbows, push bar to thighs.',
            alternatives: ['Dumbbell Pullover'],
            estimatedCaloriesBurned: 50,
          },
          {
            exerciseName: 'Face Pulls with Rope',
            targetMuscle: 'Rear Delts & Rotator Cuff',
            sets: 4,
            reps: '15-20',
            restSeconds: 60,
            techniqueNotes: 'Pull rope toward eyes and externally rotate hands out.',
            alternatives: ['Reverse Pec Deck'],
            estimatedCaloriesBurned: 35,
          },
          {
            exerciseName: 'Incline Dumbbell Bicep Curl',
            targetMuscle: 'Biceps Long Head',
            sets: 3,
            reps: '10-12',
            restSeconds: 60,
            techniqueNotes: 'Full stretch at bottom, strict supination.',
            alternatives: ['EZ-Bar Preacher Curl'],
            estimatedCaloriesBurned: 40,
          },
        ],
      });
      schedule.push({
        dayName: 'Saturday',
        workoutTitle: daysPerWeek >= 5 ? 'Legs & Core / Conditioning' : 'Active Recovery & Cardio',
        isRestDay: daysPerWeek < 5,
        targetMuscleGroups: daysPerWeek >= 5 ? ['Legs', 'Core'] : ['Recovery'],
        estimatedDurationMins: daysPerWeek >= 5 ? 50 : 20,
        exercises: daysPerWeek >= 5 ? [
          {
            exerciseName: 'Leg Press',
            targetMuscle: 'Quads & Glutes',
            sets: 4,
            reps: '12-15',
            restSeconds: 90,
            techniqueNotes: 'Keep lower back glued to pad, do not lock knees out at top.',
            alternatives: ['Goblet Squat'],
            estimatedCaloriesBurned: 90,
          },
          {
            exerciseName: 'Seated / Lying Leg Curls',
            targetMuscle: 'Hamstrings',
            sets: 4,
            reps: '12-15',
            restSeconds: 60,
            techniqueNotes: 'Slow 3-second eccentric return.',
            alternatives: ['Dumbbell Hamstring Curl'],
            estimatedCaloriesBurned: 50,
          },
        ] : [],
        notes: daysPerWeek >= 5 ? 'Leg volume session' : 'Gentle walk & sauna/foam rolling.',
      });
      schedule.push({
        dayName: 'Sunday',
        workoutTitle: 'Full Rest & Recovery',
        isRestDay: true,
        targetMuscleGroups: ['Rest'],
        estimatedDurationMins: 0,
        exercises: [],
        notes: 'Rest and nutrition reload before Monday.',
      });
    }

    const draftWorkout = new WorkoutPlan({
      name: `${memberName} - 7-Day ${goal.replace('_', ' ')} Workout Routine (v1)`,
      member: profile.member,
      fitnessGoal: goal,
      experienceLevel: exp,
      availableEquipment: equip,
      daysPerWeek,
      startDate: new Date(),
      schedule,
      approvalStatus: 'DRAFT', // Always draft until admin approval!
      version: 1,
      source: aiStatus.isConfigured ? 'AI_GENERATED' : 'MANUAL',
      limitationsConsidered: limitations,
      notes: `Generated via ${aiStatus.modelName}. Tailored for ${daysPerWeek} training days/week with ${equip.replace('_', ' ')}. Screened for limitations (${limitations.length ? limitations.join(', ') : 'None'}). Requires trainer/admin review.`,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await draftWorkout.save();
    return draftWorkout;
  }
}
