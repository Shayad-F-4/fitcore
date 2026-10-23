import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { FoodItem } from '../models/FoodItem.js';
import { DietPlan, IMealSchedule, IMealItem, FitnessGoal } from '../models/DietPlan.js';
import { WeightProgress } from '../models/WeightProgress.js';
import { Member } from '../models/Member.js';
import {
  calculateCalorieAndMacros,
  calculateBMI,
  CalorieCalculationInput,
} from '../utils/nutritionCalculator.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// Enforce admin-only access for all Diet & Calorie Management endpoints
router.use(authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'));

/* ==========================================================================
   1. DIET & NUTRITION DASHBOARD
   ========================================================================== */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [totalPlans, activePlans, weightLossPlans, muscleGainPlans, maintenancePlans] =
      await Promise.all([
        DietPlan.countDocuments(),
        DietPlan.countDocuments({ status: 'ACTIVE' }),
        DietPlan.countDocuments({ status: 'ACTIVE', fitnessGoal: 'WEIGHT_LOSS' }),
        DietPlan.countDocuments({ status: 'ACTIVE', fitnessGoal: 'MUSCLE_GAIN' }),
        DietPlan.countDocuments({ status: 'ACTIVE', fitnessGoal: 'MAINTENANCE' }),
      ]);

    // Active diet plans populated with member details
    const activePlanDocs = await DietPlan.find({ status: 'ACTIVE' })
      .select('member')
      .lean();

    const activeMemberIds = activePlanDocs
      .map((p) => p.member)
      .filter((m) => m != null);

    // Identify members with active plans who have not recorded progress in the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentProgresses = await WeightProgress.find({
      member: { $in: activeMemberIds },
      date: { $gte: fourteenDaysAgo },
    })
      .select('member')
      .lean();

    const recentMemberIdsSet = new Set(
      recentProgresses.map((p) => p.member.toString())
    );

    const pendingUpdateMemberIds = activeMemberIds.filter(
      (mId) => !recentMemberIdsSet.has(mId.toString())
    );

    // Fetch details for members requiring progress check-ins
    const membersNeedingCheckIn = await Member.find({
      _id: { $in: pendingUpdateMemberIds },
      status: { $ne: 'ARCHIVED' },
    })
      .select('_id memberId fullName phone photoUrl')
      .limit(10)
      .lean();

    // Recently updated diet plans
    const recentPlans = await DietPlan.find()
      .populate('member', 'memberId fullName phone photoUrl')
      .populate('createdBy', 'fullName email')
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean();

    // Total food items available in the database
    const totalFoodItems = await FoodItem.countDocuments({ status: 'ACTIVE' });

    sendSuccess(res, 'Diet dashboard metrics retrieved successfully', {
      kpi: {
        totalPlans,
        activePlans,
        weightLossPlans,
        muscleGainPlans,
        maintenancePlans,
        membersRequiringUpdateCount: pendingUpdateMemberIds.length,
        totalFoodItems,
      },
      membersNeedingCheckIn,
      recentPlans,
    });
  } catch (error: any) {
    console.error('[Diet Dashboard Error]', error);
    sendError(res, error.message || 'Failed to fetch diet dashboard metrics', 500);
  }
});

/* ==========================================================================
   2. CALORIE & MACRO CALCULATOR
   ========================================================================== */
router.post('/calculate-calories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { age, gender, heightCm, weightKg, activityLevel, fitnessGoal } = req.body;

    if (!age || !gender || !heightCm || !weightKg || !activityLevel || !fitnessGoal) {
      sendError(res, 'All parameters (age, gender, heightCm, weightKg, activityLevel, fitnessGoal) are required', 400);
      return;
    }

    const input: CalorieCalculationInput = {
      age: Number(age),
      gender: String(gender).toUpperCase() as any,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel: String(activityLevel).toUpperCase() as any,
      fitnessGoal: String(fitnessGoal).toUpperCase() as any,
    };

    const result = calculateCalorieAndMacros(input);
    const bmiResult = calculateBMI(input.weightKg, input.heightCm);

    sendSuccess(res, 'Calorie and macronutrient calculation completed', {
      ...result,
      bmi: bmiResult.bmi,
      bmiCategory: bmiResult.category,
      bmiDescription: bmiResult.description,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Calorie calculation failed', 400);
  }
});

/* ==========================================================================
   3. FOOD DATABASE (CRUD)
   ========================================================================== */
router.get('/foods', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, search, status = 'ACTIVE', page = '1', limit = '50' } = req.query;

    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (search && typeof search === 'string' && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [foods, total] = await Promise.all([
      FoodItem.find(query).sort({ category: 1, name: 1 }).skip(skip).limit(limitNum).lean(),
      FoodItem.countDocuments(query),
    ]);

    sendSuccess(res, 'Food items retrieved successfully', {
      foods,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch food items', 500);
  }
});

router.post('/foods', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      category,
      servingSize,
      servingUnit,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      source,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      sendError(res, 'Food name is required', 400);
      return;
    }

    if (calories == null || calories < 0) {
      sendError(res, 'Valid calories value is required', 400);
      return;
    }

    const food = await FoodItem.create({
      name: name.trim(),
      category: category || 'PROTEINS',
      servingSize: Number(servingSize) || 100,
      servingUnit: (servingUnit || 'g').trim(),
      calories: Number(calories),
      protein: Math.max(0, Number(protein) || 0),
      carbs: Math.max(0, Number(carbs) || 0),
      fat: Math.max(0, Number(fat) || 0),
      fiber: Math.max(0, Number(fiber) || 0),
      source: (source || 'Custom Gym Entry').trim(),
      notes: notes ? notes.trim() : undefined,
      status: 'ACTIVE',
    });

    sendSuccess(res, 'Food item created successfully', { food }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create food item', 400);
  }
});

router.put('/foods/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid food ID', 400);
      return;
    }

    const food = await FoodItem.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!food) {
      sendError(res, 'Food item not found', 404);
      return;
    }

    sendSuccess(res, 'Food item updated successfully', { food });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update food item', 400);
  }
});

router.delete('/foods/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid food ID', 400);
      return;
    }

    const food = await FoodItem.findByIdAndUpdate(
      id,
      { status: 'INACTIVE' },
      { new: true }
    );

    if (!food) {
      sendError(res, 'Food item not found', 404);
      return;
    }

    sendSuccess(res, 'Food item marked as inactive', { food });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete food item', 500);
  }
});

/* ==========================================================================
   HELPER: Recalculate Meal & Daily Nutrition Totals from Trusted Food Data
   ========================================================================== */
async function computeAndVerifyPlanNutrition(mealsInput: any[]): Promise<{
  meals: IMealSchedule[];
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyFiber: number;
}> {
  let dailyCalories = 0;
  let dailyProtein = 0;
  let dailyCarbs = 0;
  let dailyFat = 0;
  let dailyFiber = 0;

  const processedMeals: IMealSchedule[] = [];

  for (const m of mealsInput || []) {
    let mealCalories = 0;
    let mealProtein = 0;
    let mealCarbs = 0;
    let mealFat = 0;
    let mealFiber = 0;

    const processedItems: IMealItem[] = [];

    for (const item of m.items || []) {
      const quantity = Math.max(0.01, Number(item.quantity) || 1);
      let foodDoc = null;

      if (item.foodItem && mongoose.Types.ObjectId.isValid(item.foodItem)) {
        foodDoc = await FoodItem.findById(item.foodItem);
      }

      // Calculate nutrition based on trusted FoodItem database record when available
      let calories = 0;
      let protein = 0;
      let carbs = 0;
      let fat = 0;
      let fiber = 0;
      let foodName = item.foodName || 'Custom Food Item';
      let servingUnit = item.servingUnit || 'g';
      let servingSize = item.servingSize || 100;

      if (foodDoc) {
        foodName = foodDoc.name;
        servingUnit = foodDoc.servingUnit;
        servingSize = foodDoc.servingSize;
        calories = Math.round(foodDoc.calories * quantity);
        protein = Number((foodDoc.protein * quantity).toFixed(1));
        carbs = Number((foodDoc.carbs * quantity).toFixed(1));
        fat = Number((foodDoc.fat * quantity).toFixed(1));
        fiber = Number(((foodDoc.fiber || 0) * quantity).toFixed(1));
      } else {
        calories = Math.round((Number(item.calories) || 0) * quantity);
        protein = Number(((Number(item.protein) || 0) * quantity).toFixed(1));
        carbs = Number(((Number(item.carbs) || 0) * quantity).toFixed(1));
        fat = Number(((Number(item.fat) || 0) * quantity).toFixed(1));
        fiber = Number(((Number(item.fiber) || 0) * quantity).toFixed(1));
      }

      mealCalories += calories;
      mealProtein += protein;
      mealCarbs += carbs;
      mealFat += fat;
      mealFiber += fiber;

      processedItems.push({
        foodItem: foodDoc?._id || (mongoose.Types.ObjectId.isValid(item.foodItem) ? item.foodItem : undefined),
        foodName,
        servingUnit,
        servingSize,
        quantity,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        notes: item.notes,
      });
    }

    mealCalories = Math.round(mealCalories);
    mealProtein = Number(mealProtein.toFixed(1));
    mealCarbs = Number(mealCarbs.toFixed(1));
    mealFat = Number(mealFat.toFixed(1));
    mealFiber = Number(mealFiber.toFixed(1));

    dailyCalories += mealCalories;
    dailyProtein += mealProtein;
    dailyCarbs += mealCarbs;
    dailyFat += mealFat;
    dailyFiber += mealFiber;

    processedMeals.push({
      mealType: m.mealType || 'BREAKFAST',
      name: m.name || m.mealType,
      time: m.time || '',
      items: processedItems,
      mealCalories,
      mealProtein,
      mealCarbs,
      mealFat,
      mealFiber,
    });
  }

  return {
    meals: processedMeals,
    dailyCalories: Math.round(dailyCalories),
    dailyProtein: Number(dailyProtein.toFixed(1)),
    dailyCarbs: Number(dailyCarbs.toFixed(1)),
    dailyFat: Number(dailyFat.toFixed(1)),
    dailyFiber: Number(dailyFiber.toFixed(1)),
  };
}

/* ==========================================================================
   4. DIET PLANS (CRUD, DUPLICATION, PRESERVATION)
   ========================================================================== */
router.get('/plans', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, memberId, goal, status, page = '1', limit = '25' } = req.query;

    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (goal && goal !== 'ALL') {
      query.fitnessGoal = goal;
    }
    if (memberId && mongoose.Types.ObjectId.isValid(memberId as string)) {
      query.member = memberId;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const trimmed = search.trim();
      const matchingMembers = await Member.find({
        $or: [
          { fullName: { $regex: trimmed, $options: 'i' } },
          { memberId: { $regex: trimmed, $options: 'i' } },
          { phone: { $regex: trimmed, $options: 'i' } },
        ],
      }).select('_id');

      const memberIds = matchingMembers.map((m) => m._id);
      query.$or = [
        { name: { $regex: trimmed, $options: 'i' } },
        { member: { $in: memberIds } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [plans, total] = await Promise.all([
      DietPlan.find(query)
        .populate('member', 'memberId fullName phone photoUrl gender dob')
        .populate('createdBy', 'fullName')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DietPlan.countDocuments(query),
    ]);

    sendSuccess(res, 'Diet plans retrieved successfully', {
      plans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch diet plans', 500);
  }
});

router.post('/plans', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      memberId,
      fitnessGoal,
      startDate,
      endDate,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      waterIntakeLiters,
      notes,
      meals,
      status = 'ACTIVE',
    } = req.body;

    if (!name || !name.trim()) {
      sendError(res, 'Diet plan name is required', 400);
      return;
    }

    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      sendError(res, 'Valid member selection is required', 400);
      return;
    }

    const memberExists = await Member.findById(memberId);
    if (!memberExists) {
      sendError(res, 'Selected member does not exist in the database', 404);
      return;
    }

    // Recalculate trusted nutritional totals
    const nutrition = await computeAndVerifyPlanNutrition(meals || []);

    // If new plan is ACTIVE, archive/deactivate any existing ACTIVE plan for this member
    // preserving full historical records
    if (status === 'ACTIVE') {
      await DietPlan.updateMany(
        { member: memberId, status: 'ACTIVE' },
        { $set: { status: 'INACTIVE' } }
      );
    }

    const newPlan = await DietPlan.create({
      name: name.trim(),
      member: memberId,
      fitnessGoal: fitnessGoal || 'WEIGHT_LOSS',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      targetCalories: Number(targetCalories) || nutrition.dailyCalories || 2000,
      targetProtein: Number(targetProtein) || nutrition.dailyProtein || 120,
      targetCarbs: Number(targetCarbs) || nutrition.dailyCarbs || 200,
      targetFat: Number(targetFat) || nutrition.dailyFat || 55,
      waterIntakeLiters: Number(waterIntakeLiters) || 3.5,
      notes: notes ? notes.trim() : undefined,
      status,
      meals: nutrition.meals,
      dailyCalories: nutrition.dailyCalories,
      dailyProtein: nutrition.dailyProtein,
      dailyCarbs: nutrition.dailyCarbs,
      dailyFat: nutrition.dailyFat,
      dailyFiber: nutrition.dailyFiber,
      createdBy: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
    });

    const populated = await DietPlan.findById(newPlan._id)
      .populate('member', 'memberId fullName phone photoUrl gender dob')
      .populate('createdBy', 'fullName');

    sendSuccess(res, 'Diet plan created and assigned successfully', { plan: populated }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create diet plan', 400);
  }
});

router.get('/plans/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid plan ID', 400);
      return;
    }

    const plan = await DietPlan.findById(id)
      .populate('member', 'memberId fullName phone email photoUrl gender dob address')
      .populate('createdBy', 'fullName email')
      .populate('meals.items.foodItem')
      .lean();

    if (!plan) {
      sendError(res, 'Diet plan not found', 404);
      return;
    }

    sendSuccess(res, 'Diet plan retrieved successfully', { plan });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch diet plan', 500);
  }
});

router.put('/plans/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid plan ID', 400);
      return;
    }

    const existingPlan = await DietPlan.findById(id);
    if (!existingPlan) {
      sendError(res, 'Diet plan not found', 404);
      return;
    }

    const {
      name,
      fitnessGoal,
      startDate,
      endDate,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      waterIntakeLiters,
      notes,
      meals,
      status,
    } = req.body;

    let nutritionUpdates = {};
    if (meals && Array.isArray(meals)) {
      const recalculated = await computeAndVerifyPlanNutrition(meals);
      nutritionUpdates = {
        meals: recalculated.meals,
        dailyCalories: recalculated.dailyCalories,
        dailyProtein: recalculated.dailyProtein,
        dailyCarbs: recalculated.dailyCarbs,
        dailyFat: recalculated.dailyFat,
        dailyFiber: recalculated.dailyFiber,
      };
    }

    // If changing to ACTIVE, deactivate any other active plan for this member
    if (status === 'ACTIVE' && existingPlan.status !== 'ACTIVE') {
      await DietPlan.updateMany(
        { member: existingPlan.member, _id: { $ne: existingPlan._id }, status: 'ACTIVE' },
        { $set: { status: 'INACTIVE' } }
      );
    }

    const updated = await DietPlan.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(name ? { name: name.trim() } : {}),
          ...(fitnessGoal ? { fitnessGoal } : {}),
          ...(startDate ? { startDate: new Date(startDate) } : {}),
          ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : undefined } : {}),
          ...(targetCalories != null ? { targetCalories: Number(targetCalories) } : {}),
          ...(targetProtein != null ? { targetProtein: Number(targetProtein) } : {}),
          ...(targetCarbs != null ? { targetCarbs: Number(targetCarbs) } : {}),
          ...(targetFat != null ? { targetFat: Number(targetFat) } : {}),
          ...(waterIntakeLiters != null ? { waterIntakeLiters: Number(waterIntakeLiters) } : {}),
          ...(notes !== undefined ? { notes: notes ? notes.trim() : '' } : {}),
          ...(status ? { status } : {}),
          ...nutritionUpdates,
        },
      },
      { new: true, runValidators: true }
    )
      .populate('member', 'memberId fullName phone photoUrl gender dob')
      .populate('createdBy', 'fullName');

    sendSuccess(res, 'Diet plan updated successfully', { plan: updated });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update diet plan', 400);
  }
});

router.post('/plans/:id/duplicate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { targetMemberId, newPlanName } = req.body;

    const sourcePlan = await DietPlan.findById(id).lean();
    if (!sourcePlan) {
      sendError(res, 'Source diet plan not found', 404);
      return;
    }

    const memberIdToUse = targetMemberId || sourcePlan.member;
    if (!mongoose.Types.ObjectId.isValid(memberIdToUse)) {
      sendError(res, 'Valid target member ID required', 400);
      return;
    }

    const duplicatedPlan = await DietPlan.create({
      name: newPlanName ? newPlanName.trim() : `${sourcePlan.name} (Copy)`,
      member: memberIdToUse,
      fitnessGoal: sourcePlan.fitnessGoal,
      startDate: new Date(),
      endDate: undefined,
      targetCalories: sourcePlan.targetCalories,
      targetProtein: sourcePlan.targetProtein,
      targetCarbs: sourcePlan.targetCarbs,
      targetFat: sourcePlan.targetFat,
      waterIntakeLiters: sourcePlan.waterIntakeLiters,
      notes: sourcePlan.notes,
      status: 'INACTIVE', // default inactive until reviewed and assigned
      meals: sourcePlan.meals,
      dailyCalories: sourcePlan.dailyCalories,
      dailyProtein: sourcePlan.dailyProtein,
      dailyCarbs: sourcePlan.dailyCarbs,
      dailyFat: sourcePlan.dailyFat,
      dailyFiber: sourcePlan.dailyFiber,
      createdBy: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
    });

    const populated = await DietPlan.findById(duplicatedPlan._id)
      .populate('member', 'memberId fullName phone photoUrl')
      .populate('createdBy', 'fullName');

    sendSuccess(res, 'Diet plan duplicated successfully', { plan: populated }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to duplicate diet plan', 500);
  }
});

/* ==========================================================================
   5. MEMBER FITNESS PROFILE & WEIGHT / BODY PROGRESS
   ========================================================================== */
router.get('/members/:memberId/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberId = req.params.memberId as string;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      sendError(res, 'Invalid member ID', 400);
      return;
    }

    const [member, activePlan, previousPlans, progressHistory] = await Promise.all([
      Member.findById(memberId).select('memberId fullName phone email gender dob photoUrl address fitnessGoals createdAt').lean(),
      DietPlan.findOne({ member: memberId, status: 'ACTIVE' })
        .populate('createdBy', 'fullName')
        .sort({ updatedAt: -1 })
        .lean(),
      DietPlan.find({ member: memberId, status: { $ne: 'ACTIVE' } })
        .populate('createdBy', 'fullName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      WeightProgress.find({ member: memberId })
        .sort({ date: -1 })
        .limit(30)
        .lean(),
    ]);

    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const latestProgress = progressHistory[0] || null;
    let bmiData = null;
    if (latestProgress?.weight && latestProgress?.height) {
      try {
        bmiData = calculateBMI(latestProgress.weight, latestProgress.height);
      } catch {
        // Ignore calculation failure
      }
    }

    sendSuccess(res, 'Member diet profile retrieved successfully', {
      member,
      activePlan,
      previousPlans,
      progressHistory,
      latestProgress,
      bmiData,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch member diet profile', 500);
  }
});

router.get('/members/:memberId/progress', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberId = req.params.memberId as string;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      sendError(res, 'Invalid member ID', 400);
      return;
    }

    const history = await WeightProgress.find({ member: memberId })
      .populate('recordedBy', 'fullName')
      .sort({ date: 1 }) // Chronological ascending for charts
      .lean();

    sendSuccess(res, 'Member progress history retrieved successfully', { progress: history });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch member progress history', 500);
  }
});

router.post('/members/:memberId/progress', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberId = req.params.memberId as string;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      sendError(res, 'Invalid member ID', 400);
      return;
    }

    const member = await Member.findById(memberId);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const {
      date,
      weight,
      height,
      waist,
      chest,
      arms,
      hips,
      bodyFat,
      notes,
    } = req.body;

    const weightNum = Number(weight);
    if (!weightNum || weightNum < 20 || weightNum > 350) {
      sendError(res, 'Valid weight between 20 kg and 350 kg is required', 400);
      return;
    }

    const heightNum = height ? Number(height) : undefined;
    let bmi: number | undefined;
    if (heightNum && heightNum >= 50 && heightNum <= 280) {
      bmi = calculateBMI(weightNum, heightNum).bmi;
    }

    const progress = await WeightProgress.create({
      member: memberId,
      date: date ? new Date(date) : new Date(),
      weight: weightNum,
      height: heightNum,
      bmi,
      waist: waist ? Number(waist) : undefined,
      chest: chest ? Number(chest) : undefined,
      arms: arms ? Number(arms) : undefined,
      hips: hips ? Number(hips) : undefined,
      bodyFat: bodyFat ? Number(bodyFat) : undefined,
      notes: notes ? notes.trim() : undefined,
      recordedBy: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
    });

    sendSuccess(res, 'Progress recorded successfully', { progress }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to record progress entry', 400);
  }
});

router.delete('/progress/:progressId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const progressId = req.params.progressId as string;
    if (!mongoose.Types.ObjectId.isValid(progressId)) {
      sendError(res, 'Invalid progress ID', 400);
      return;
    }

    const deleted = await WeightProgress.findByIdAndDelete(progressId);
    if (!deleted) {
      sendError(res, 'Progress entry not found', 404);
      return;
    }

    sendSuccess(res, 'Progress record removed successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete progress record', 500);
  }
});

/* ==========================================================================
   6. PRINT / PDF DIET DOSSIER REPORT DATA
   ========================================================================== */
router.get('/plans/:id/print', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid plan ID', 400);
      return;
    }

    const plan = await DietPlan.findById(id)
      .populate('member', 'memberId fullName phone email gender dob address emergencyContact')
      .populate('createdBy', 'fullName')
      .lean();

    if (!plan) {
      sendError(res, 'Diet plan not found', 404);
      return;
    }

    const memberId = (plan.member as any)._id;
    const progressHistory = await WeightProgress.find({ member: memberId })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    sendSuccess(res, 'Printable diet dossier report retrieved successfully', {
      gymName: 'Sagar Fitness Gym',
      gymLocation: 'Pathardi, Maharashtra',
      plan,
      recentProgress: progressHistory,
      generatedAt: new Date().toISOString(),
      disclaimer:
        'This diet and nutrition protocol was formulated by Sagar Fitness Gym for athletic training and general fitness progress. Consult with a qualified physician before undertaking strenuous dietary modifications.',
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate printable diet report', 500);
  }
});

export default router;
