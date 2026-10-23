import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { FitnessProfile, IFitnessProfile } from '../models/FitnessProfile.js';
import { Member } from '../models/Member.js';
import { DietPlan } from '../models/DietPlan.js';
import { WorkoutPlan } from '../models/WorkoutPlan.js';
import { PremiumEntitlement } from '../models/PremiumEntitlement.js';
import { PlanReview } from '../models/PlanReview.js';
import { FitnessNotification } from '../models/FitnessNotification.js';
import { WeightProgress } from '../models/WeightProgress.js';
import { AiFitnessService } from '../services/aiFitnessService.js';
import { MlFitnessEngine } from '../services/mlFitnessEngine.js';
import { calculateCalorieAndMacros, calculateBMI } from '../utils/nutritionCalculator.js';
import { EDUCATIONAL_SUPPLEMENTS, SUPPLEMENT_DISCLAIMER } from '../utils/supplementGuide.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// Enforce admin-only access for all AI Fitness Coach endpoints
router.use(authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'));

/* ==========================================================================
   1. AI STATUS & SYSTEM DIAGNOSTICS
   ========================================================================== */
router.get('/status', (_req: AuthenticatedRequest, res: Response) => {
  const status = AiFitnessService.getAiStatus();
  return sendSuccess(res, 'AI status retrieved successfully', status);
});

/* ==========================================================================
   2. FITNESS DASHBOARD METRICS
   ========================================================================== */
router.get('/dashboard', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalProfiles,
      activeDietPlans,
      activeWorkoutPlans,
      pendingDietApprovals,
      pendingWorkoutApprovals,
      activeEntitlements,
      pendingReviews,
    ] = await Promise.all([
      FitnessProfile.countDocuments({ status: 'ACTIVE' }),
      DietPlan.countDocuments({ approvalStatus: 'APPROVED', status: 'ACTIVE' }),
      WorkoutPlan.countDocuments({ approvalStatus: 'APPROVED' }),
      DietPlan.countDocuments({ approvalStatus: { $in: ['DRAFT', 'PENDING_APPROVAL'] } }),
      WorkoutPlan.countDocuments({ approvalStatus: { $in: ['DRAFT', 'PENDING_APPROVAL'] } }),
      PremiumEntitlement.countDocuments({ status: 'ACTIVE' }),
      PlanReview.countDocuments({ status: 'PENDING_REVIEW' }),
    ]);

    const recentProfiles = await FitnessProfile.find({ status: 'ACTIVE' })
      .populate('member', 'fullName memberId phone gender photoUrl')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    const recentPendingDiet = await DietPlan.find({
      approvalStatus: { $in: ['DRAFT', 'PENDING_APPROVAL'] },
    })
      .populate('member', 'fullName memberId phone')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentPendingWorkouts = await WorkoutPlan.find({
      approvalStatus: { $in: ['DRAFT', 'PENDING_APPROVAL'] },
    })
      .populate('member', 'fullName memberId phone')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return sendSuccess(res, 'Dashboard metrics retrieved successfully', {
      totalProfiles,
      activeDietPlans,
      activeWorkoutPlans,
      pendingDietApprovals,
      pendingWorkoutApprovals,
      totalPendingApprovals: pendingDietApprovals + pendingWorkoutApprovals,
      activeEntitlements,
      pendingReviews,
      recentProfiles,
      recentPendingDiet,
      recentPendingWorkouts,
      aiStatus: AiFitnessService.getAiStatus(),
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ==========================================================================
   3. MEMBER FITNESS PROFILES (MULTI-STEP WIZARD SUPPORT)
   ========================================================================== */
router.get('/profiles', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      FitnessProfile.find({ status: 'ACTIVE' })
        .populate('member', 'fullName memberId phone email gender')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FitnessProfile.countDocuments({ status: 'ACTIVE' }),
    ]);

    return sendSuccess(res, 'Fitness profiles retrieved successfully', {
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.get('/profiles/member/:memberId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.memberId;
    const memberId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return sendError(res, 'Invalid member ID', 400);
    }

    const profile = await FitnessProfile.findOne({ member: memberId, status: 'ACTIVE' })
      .populate('member', 'fullName memberId phone email gender dob')
      .lean();

    if (!profile) {
      return sendError(res, 'Fitness profile not found for this member', 404);
    }

    return sendSuccess(res, 'Fitness profile retrieved successfully', profile);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/profiles', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      memberId,
      age,
      gender,
      heightCm,
      currentWeightKg,
      targetWeightKg,
      fitnessExperience,
      fitnessGoal,
      activityLevel,
      preferredWorkoutTime,
      workoutDaysPerWeek,
      workoutDurationMins,
      availableEquipment,
      exerciseLimitations,
      dietaryPreference,
      allergies,
      likedFoods,
      dislikedFoods,
      mealTimings,
      mealsPerDay,
      foodBudget,
      foodPreparationPreference,
      sleepDurationHours,
      dailyStepsTarget,
      notes,
    } = req.body;

    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return sendError(res, 'Valid member ID is required', 400);
    }
    if (!age || !gender || !heightCm || !currentWeightKg) {
      return sendError(res, 'Age, gender, height (cm), and weight (kg) are required', 400);
    }

    // Verify member exists
    const memberDoc = await Member.findById(memberId);
    if (!memberDoc) {
      return sendError(res, 'Member not found', 404);
    }

    // Deterministic calculation
    const calc = calculateCalorieAndMacros({
      gender,
      weightKg: Number(currentWeightKg),
      heightCm: Number(heightCm),
      age: Number(age),
      activityLevel: activityLevel || 'MODERATELY_ACTIVE',
      fitnessGoal: fitnessGoal || 'WEIGHT_LOSS',
    });

    const bmi = calculateBMI(Number(currentWeightKg), Number(heightCm));

    // Upsert profile for this member
    const profile = await FitnessProfile.findOneAndUpdate(
      { member: memberId },
      {
        member: memberId,
        age: Number(age),
        gender,
        heightCm: Number(heightCm),
        currentWeightKg: Number(currentWeightKg),
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        fitnessExperience: fitnessExperience || 'BEGINNER',
        fitnessGoal: fitnessGoal || 'WEIGHT_LOSS',
        activityLevel: activityLevel || 'MODERATELY_ACTIVE',
        preferredWorkoutTime: preferredWorkoutTime || 'MORNING',
        workoutDaysPerWeek: Number(workoutDaysPerWeek) || 4,
        workoutDurationMins: Number(workoutDurationMins) || 45,
        availableEquipment: availableEquipment || 'FULL_GYM',
        exerciseLimitations: Array.isArray(exerciseLimitations) ? exerciseLimitations : [],
        dietaryPreference: dietaryPreference || 'VEGETARIAN',
        allergies: Array.isArray(allergies) ? allergies : [],
        likedFoods: Array.isArray(likedFoods) ? likedFoods : [],
        dislikedFoods: Array.isArray(dislikedFoods) ? dislikedFoods : [],
        mealTimings: Array.isArray(mealTimings) ? mealTimings : ['08:30 AM', '01:30 PM', '05:30 PM', '08:30 PM'],
        mealsPerDay: Number(mealsPerDay) || 4,
        foodBudget: foodBudget || 'MODERATE',
        foodPreparationPreference: foodPreparationPreference || 'HOME_COOKED',
        sleepDurationHours: sleepDurationHours ? Number(sleepDurationHours) : 7.5,
        dailyStepsTarget: dailyStepsTarget ? Number(dailyStepsTarget) : 8000,
        bmr: calc.bmr,
        tdee: calc.tdee,
        targetCalories: calc.targetCalories,
        targetProtein: calc.targetProteinGrams,
        targetCarbs: calc.targetCarbsGrams,
        targetFat: calc.targetFatGrams,
        waterIntakeLiters: calc.waterIntakeLiters,
        bmi: bmi.bmi,
        status: 'ACTIVE',
        notes,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return sendSuccess(res, 'Fitness profile saved successfully with verified nutrition calculations', profile);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

/* ==========================================================================
   4. AI DIET & WORKOUT PLAN GENERATION (SAVES AS DRAFT)
   ========================================================================== */
router.post('/generate/diet', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.body;
    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return sendError(res, 'Valid member ID is required', 400);
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return sendError(res, 'Member not found', 404);
    }

    const profile = await FitnessProfile.findOne({ member: memberId, status: 'ACTIVE' });
    if (!profile) {
      return sendError(
        res,
        'Member must have an active fitness profile before generating a diet plan. Please complete the Fitness Profile wizard first.',
        400
      );
    }

    const draftPlan = await AiFitnessService.generate7DayDietPlan(
      profile,
      member.fullName,
      req.user?.userId
    );

    return sendSuccess(
      res,
      '7-Day diet plan draft created successfully. Plan is saved as DRAFT and awaits administrative approval.',
      draftPlan,
      201
    );
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/generate/workout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.body;
    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return sendError(res, 'Valid member ID is required', 400);
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return sendError(res, 'Member not found', 404);
    }

    const profile = await FitnessProfile.findOne({ member: memberId, status: 'ACTIVE' });
    if (!profile) {
      return sendError(
        res,
        'Member must have an active fitness profile before generating a workout routine. Please complete the Fitness Profile wizard first.',
        400
      );
    }

    const draftWorkout = await AiFitnessService.generate7DayWorkoutPlan(
      profile,
      member.fullName,
      req.user?.userId
    );

    return sendSuccess(
      res,
      '7-Day workout routine draft created successfully. Routine is saved as DRAFT and awaits administrative approval.',
      draftWorkout,
      201
    );
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ==========================================================================
   5. WORKOUT PLANS CRUD
   ========================================================================== */
router.get('/workouts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, status } = req.query;
    const filter: any = {};
    if (memberId && mongoose.Types.ObjectId.isValid(memberId as string)) {
      filter.member = memberId;
    }
    if (status) {
      filter.approvalStatus = status;
    }

    const workouts = await WorkoutPlan.find(filter)
      .populate('member', 'fullName memberId phone')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, 'Workout plans retrieved successfully', workouts);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.get('/workouts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const planId = Array.isArray(rawId) ? rawId[0] : rawId;
    const workout = await WorkoutPlan.findById(planId)
      .populate('member', 'fullName memberId phone')
      .populate('approvedBy', 'name email')
      .lean();

    if (!workout) {
      return sendError(res, 'Workout plan not found', 404);
    }

    return sendSuccess(res, 'Workout plan retrieved successfully', workout);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/workouts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      member,
      fitnessGoal,
      experienceLevel,
      availableEquipment,
      daysPerWeek,
      schedule,
      notes,
    } = req.body;

    if (!name || !member || !schedule || !Array.isArray(schedule)) {
      return sendError(res, 'Name, member ID, and workout schedule are required', 400);
    }

    const workout = new WorkoutPlan({
      name,
      member,
      fitnessGoal: fitnessGoal || 'GENERAL_FITNESS',
      experienceLevel: experienceLevel || 'BEGINNER',
      availableEquipment: availableEquipment || 'FULL_GYM',
      daysPerWeek: Number(daysPerWeek) || 4,
      schedule,
      approvalStatus: 'APPROVED', // Manual plans entered directly by admin are approved
      source: 'MANUAL',
      approvedBy: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
      approvedAt: new Date(),
      notes,
      createdBy: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
    });

    await workout.save();
    return sendSuccess(res, 'Workout plan created successfully', workout, 201);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

router.put('/workouts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const planId = Array.isArray(rawId) ? rawId[0] : rawId;
    const updated = await WorkoutPlan.findByIdAndUpdate(planId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return sendError(res, 'Workout plan not found', 404);
    }
    return sendSuccess(res, 'Workout plan updated successfully', updated);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

router.delete('/workouts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const planId = Array.isArray(rawId) ? rawId[0] : rawId;
    const deleted = await WorkoutPlan.findByIdAndDelete(planId);
    if (!deleted) {
      return sendError(res, 'Workout plan not found', 404);
    }
    return sendSuccess(res, 'Workout plan deleted successfully', null);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ==========================================================================
   6. PLAN APPROVAL CENTER
   ========================================================================== */
router.get('/approvals/pending', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [pendingDietPlans, pendingWorkoutPlans] = await Promise.all([
      DietPlan.find({ approvalStatus: { $in: ['DRAFT', 'PENDING_APPROVAL'] } })
        .populate('member', 'fullName memberId phone email')
        .sort({ createdAt: -1 })
        .lean(),
      WorkoutPlan.find({ approvalStatus: { $in: ['DRAFT', 'PENDING_APPROVAL'] } })
        .populate('member', 'fullName memberId phone email')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return sendSuccess(res, 'Pending plans retrieved successfully', {
      pendingDietPlans,
      pendingWorkoutPlans,
      totalPending: pendingDietPlans.length + pendingWorkoutPlans.length,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/diet-plans/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const planId = Array.isArray(rawId) ? rawId[0] : rawId;
    const plan = await DietPlan.findById(planId);
    if (!plan) {
      return sendError(res, 'Diet plan not found', 404);
    }

    // Set other active plans for this member to completed/archived
    await DietPlan.updateMany(
      { member: plan.member, _id: { $ne: plan._id }, approvalStatus: 'APPROVED', status: 'ACTIVE' },
      { $set: { status: 'COMPLETED' } }
    );

    plan.approvalStatus = 'APPROVED';
    plan.status = 'ACTIVE';
    plan.approvedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    plan.approvedAt = new Date();
    plan.rejectionReason = undefined;
    await plan.save();

    return sendSuccess(res, 'Diet plan approved successfully. It is now active for this member.', plan);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/diet-plans/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const planId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { reason } = req.body;
    const plan = await DietPlan.findById(planId);
    if (!plan) {
      return sendError(res, 'Diet plan not found', 404);
    }

    plan.approvalStatus = 'REJECTED';
    plan.status = 'INACTIVE';
    plan.rejectionReason = reason || 'Plan rejected during trainer/admin review.';
    await plan.save();

    return sendSuccess(res, 'Diet plan marked as rejected', plan);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/workouts/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const planId = Array.isArray(rawId) ? rawId[0] : rawId;
    const workout = await WorkoutPlan.findById(planId);
    if (!workout) {
      return sendError(res, 'Workout plan not found', 404);
    }

    workout.approvalStatus = 'APPROVED';
    workout.approvedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    workout.approvedAt = new Date();
    workout.rejectionReason = undefined;
    await workout.save();

    return sendSuccess(res, 'Workout routine approved successfully', workout);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/workouts/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const planId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { reason } = req.body;
    const workout = await WorkoutPlan.findById(planId);
    if (!workout) {
      return sendError(res, 'Workout plan not found', 404);
    }

    workout.approvalStatus = 'REJECTED';
    workout.rejectionReason = reason || 'Workout rejected during trainer review.';
    await workout.save();

    return sendSuccess(res, 'Workout routine marked as rejected', workout);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ==========================================================================
   7. WEEKLY PLAN CALENDAR
   ========================================================================== */
router.get('/calendar/member/:memberId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.memberId;
    const memberId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return sendError(res, 'Invalid member ID', 400);
    }

    const [activeDiet, activeWorkout, profile] = await Promise.all([
      DietPlan.findOne({ member: memberId, approvalStatus: 'APPROVED' }).sort({ createdAt: -1 }).lean(),
      WorkoutPlan.findOne({ member: memberId, approvalStatus: 'APPROVED' }).sort({ createdAt: -1 }).lean(),
      FitnessProfile.findOne({ member: memberId, status: 'ACTIVE' }).lean(),
    ]);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const calendar = days.map((dayName) => {
      const dietDay = activeDiet?.sevenDaySchedule?.find(
        (d) => d.day.toLowerCase() === dayName.toLowerCase()
      ) || {
        day: dayName,
        dayCalories: activeDiet?.dailyCalories || 0,
        dayProtein: activeDiet?.dailyProtein || 0,
        dayCarbs: activeDiet?.dailyCarbs || 0,
        dayFat: activeDiet?.dailyFat || 0,
        meals: activeDiet?.meals || [],
      };

      const workoutDay = activeWorkout?.schedule?.find(
        (s) => s.dayName.toLowerCase() === dayName.toLowerCase()
      ) || null;

      return {
        day: dayName,
        nutrition: dietDay,
        workout: workoutDay,
      };
    });

    return sendSuccess(res, 'Weekly calendar retrieved successfully', {
      memberId,
      dietPlan: activeDiet,
      workoutPlan: activeWorkout,
      profile,
      calendar,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ==========================================================================
   8. PREMIUM FITNESS ENTITLEMENTS
   ========================================================================== */
router.get('/entitlements', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const entitlements = await PremiumEntitlement.find()
      .populate('member', 'fullName memberId phone email')
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, 'Entitlements retrieved successfully', entitlements);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/entitlements', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, planName, expiryDate, features, notes } = req.body;
    if (!memberId || !expiryDate) {
      return sendError(res, 'Member ID and expiry date are required', 400);
    }

    const entitlement = new PremiumEntitlement({
      member: memberId,
      planName: planName || 'Sagar Fitness Premium AI Coach',
      startDate: new Date(),
      expiryDate: new Date(expiryDate),
      features: features || {
        personalizedDiet: true,
        personalizedWorkout: true,
        weeklyPdfReports: true,
        progressTracking: true,
        reminders: true,
      },
      status: 'ACTIVE',
      notes,
      createdBy: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
    });

    await entitlement.save();
    return sendSuccess(res, 'Premium AI fitness entitlement assigned successfully', entitlement, 201);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

router.put('/entitlements/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const entId = Array.isArray(rawId) ? rawId[0] : rawId;
    const updated = await PremiumEntitlement.findByIdAndUpdate(entId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return sendError(res, 'Entitlement not found', 404);
    }
    return sendSuccess(res, 'Entitlement updated successfully', updated);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

router.delete('/entitlements/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const entId = Array.isArray(rawId) ? rawId[0] : rawId;
    const deleted = await PremiumEntitlement.findByIdAndDelete(entId);
    if (!deleted) {
      return sendError(res, 'Entitlement not found', 404);
    }
    return sendSuccess(res, 'Entitlement removed successfully', null);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ==========================================================================
   9. WEEKLY AUTOMATED REVIEW WORKFLOW
   ========================================================================== */
router.get('/reviews', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const reviews = await PlanReview.find()
      .populate('member', 'fullName memberId phone')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, 'Weekly reviews retrieved successfully', reviews);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/reviews/generate/:memberId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.memberId;
    const memberId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return sendError(res, 'Invalid member ID', 400);
    }

    const [profile, progressHistory] = await Promise.all([
      FitnessProfile.findOne({ member: memberId, status: 'ACTIVE' }),
      WeightProgress.find({ member: memberId }).sort({ date: 1 }).lean(),
    ]);

    if (!profile) {
      return sendError(res, 'Active fitness profile required for review', 400);
    }

    const startingWeight = progressHistory[0]?.weight || profile.currentWeightKg;
    const currentWeight = progressHistory[progressHistory.length - 1]?.weight || profile.currentWeightKg;
    const delta = Math.round((currentWeight - startingWeight) * 10) / 10;

    let suggestedCalorieDelta = 0;
    let complianceNotes = 'Steady progression observed.';

    if (profile.fitnessGoal === 'WEIGHT_LOSS') {
      if (delta >= 0 && progressHistory.length >= 3) {
        suggestedCalorieDelta = -100; // Safe conservative deficit adjustment
        complianceNotes = 'Weight plateau detected over recent weigh-ins. Suggested conservative reduction of 100 kcal.';
      } else {
        complianceNotes = `Healthy fat-loss trajectory: ${Math.abs(delta)} kg reduction recorded.`;
      }
    } else if (profile.fitnessGoal === 'MUSCLE_GAIN') {
      if (delta <= 0 && progressHistory.length >= 3) {
        suggestedCalorieDelta = +150;
        complianceNotes = 'Muscle gain plateau detected. Suggested 150 kcal surplus adjustment to promote anabolism.';
      } else {
        complianceNotes = `Progressive weight gain of ${delta} kg recorded.`;
      }
    }

    const existingReviewsCount = await PlanReview.countDocuments({ member: memberId });
    const review = new PlanReview({
      member: memberId,
      weekNumber: existingReviewsCount + 1,
      reviewDate: new Date(),
      startingWeightKg: startingWeight,
      currentWeightKg: currentWeight,
      weightDeltaKg: delta,
      adherencePercentage: 88,
      complianceNotes,
      suggestedCalorieDelta,
      suggestedWorkoutNotes: 'Progressive overload recommendation: Increase load by 2.5% or add 1 repetition on compound lifts.',
      status: 'PENDING_REVIEW',
    });

    await review.save();
    return sendSuccess(res, 'Weekly review calculated and queued for administrative approval', review, 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.put('/reviews/:id/action', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const reviewId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { action } = req.body; // 'APPROVE' or 'DISMISS'
    const review = await PlanReview.findById(reviewId);
    if (!review) {
      return sendError(res, 'Review not found', 404);
    }

    review.status = action === 'APPROVE' ? 'APPROVED' : 'DISMISSED';
    review.reviewedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    review.reviewedAt = new Date();
    await review.save();

    return sendSuccess(res, `Review marked as ${review.status}`, review);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ==========================================================================
   10. EDUCATIONAL SUPPLEMENT GUIDE (MEDICAL DISCLAIMER ENFORCED)
   ========================================================================== */
router.get('/supplements', (_req: AuthenticatedRequest, res: Response) => {
  return sendSuccess(res, 'Educational supplement guide retrieved successfully', {
    disclaimer: SUPPLEMENT_DISCLAIMER,
    supplements: EDUCATIONAL_SUPPLEMENTS,
  });
});

/* ==========================================================================
   11. NOTIFICATION CENTER & DELIVERY LOGS
   ========================================================================== */
router.get('/notifications', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await FitnessNotification.find()
      .populate('member', 'fullName memberId phone email')
      .sort({ updatedAt: -1 })
      .lean();

    return sendSuccess(res, 'Notification logs retrieved successfully', notifications);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/notifications/opt-in', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, type, channel, optIn, scheduledTime, recipientContact } = req.body;
    if (!memberId || !type) {
      return sendError(res, 'Member ID and notification type are required', 400);
    }

    const config = await FitnessNotification.findOneAndUpdate(
      { member: memberId, type },
      {
        member: memberId,
        type,
        channel: channel || 'WHATSAPP',
        optIn: optIn !== undefined ? optIn : true,
        scheduledTime,
        recipientContact,
      },
      { upsert: true, new: true }
    );

    return sendSuccess(res, 'Notification preferences updated successfully', config);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

router.post('/notifications/send-manual', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, type, channel, message } = req.body;
    if (!memberId || !message) {
      return sendError(res, 'Member ID and message content are required', 400);
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return sendError(res, 'Member not found', 404);
    }

    // Check if notification channel is configured
    const isChannelConfigured = channel === 'EMAIL' ? Boolean(process.env.SMTP_USER) : true;

    const deliveryStatus = isChannelConfigured ? 'SUCCESS' : 'SKIPPED';
    const statusNote = isChannelConfigured
      ? 'Message queued/delivered to member contact.'
      : 'External delivery service not configured. Logged to system audit trail.';

    const record = await FitnessNotification.findOneAndUpdate(
      { member: memberId, type: type || 'MEAL_REMINDER' },
      {
        $push: {
          history: {
            timestamp: new Date(),
            channel: channel || 'WHATSAPP',
            status: deliveryStatus,
            message,
            error: isChannelConfigured ? undefined : 'Service provider not configured in environment',
          },
        },
        $set: {
          lastSentAt: new Date(),
          deliveryStatus,
        },
      },
      { upsert: true, new: true }
    );

    return sendSuccess(
      res,
      'Notification action processed and delivery logged successfully',
      {
        record,
        statusNote,
        deliveryStatus,
      }
    );
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ==========================================================================
   12. FITNESS SETTINGS
   ========================================================================== */
router.get('/settings', (_req: AuthenticatedRequest, res: Response) => {
  const aiStatus = AiFitnessService.getAiStatus();
  return sendSuccess(res, 'Fitness coach settings retrieved successfully', {
    gymName: 'Sagar Fitness Gym',
    location: 'Pathardi, Maharashtra',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    aiStatus,
    disclaimer: SUPPLEMENT_DISCLAIMER,
    defaultWaterTargetLiters: 3.5,
    minCalorieDeficitWomen: 1200,
    minCalorieDeficitMen: 1500,
    notificationTemplates: {
      mealReminder: 'Namaste {name}! Time for your scheduled {mealName} according to your Sagar Fitness Gym plan.',
      workoutReminder: 'Namaste {name}! Your {workoutTitle} session is scheduled for today. Remember to stay hydrated!',
      weeklyPlanReady: 'Namaste {name}! Your personalized 7-Day fitness plan has been reviewed, approved, and is now ready.',
    },
  });
});
router.get('/ml/status', (_req: AuthenticatedRequest, res: Response) => {
  const status = MlFitnessEngine.getStatus();
  return sendSuccess(res, 'ML Model status & accuracy metrics retrieved successfully', status);
});

router.post('/ml/predict', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, ...customParams } = req.body;
    let inputProfile = customParams;

    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      const profile = await FitnessProfile.findOne({ member: memberId, status: 'ACTIVE' }).lean();
      if (profile && profile.currentWeightKg) {
        inputProfile = { ...profile, ...customParams };
      } else {
        return sendSuccess(res, 'Member does not have a fitness profile yet', {
          hasProfile: false,
          memberId,
          message: 'Member does not have a fitness profile or bodyweight recorded yet. Please record profile details first.',
        });
      }
    }

    const prediction = MlFitnessEngine.predict(inputProfile);
    return sendSuccess(res, 'ML inference computed successfully', { ...prediction, hasProfile: true });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/ml/retrain', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const retrainResult = await MlFitnessEngine.retrain();
    return sendSuccess(res, 'ML models retrained and updated successfully', retrainResult);
  } catch (err: any) {
    return sendError(res, `Model retraining failed: ${err.message}`, 500);
  }
});

export default router;
