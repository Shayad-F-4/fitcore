import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { ENV } from '../src/config/env.js';
import { Member } from '../src/models/Member.js';
import { FitnessProfile } from '../src/models/FitnessProfile.js';
import { DietPlan } from '../src/models/DietPlan.js';
import { WorkoutPlan } from '../src/models/WorkoutPlan.js';
import { PremiumEntitlement } from '../src/models/PremiumEntitlement.js';
import { User } from '../src/models/User.js';

describe('AI Fitness Coach Integration Test Suite (Sagar Fitness Gym)', () => {
  let adminToken = '';
  let receptionistToken = '';
  let testMemberId = '';
  let draftDietPlanId = '';
  let draftWorkoutPlanId = '';
  let entitlementId = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }

    // 1. Admin login
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@fitcore.com',
      password: 'password123',
    });
    adminToken = adminLogin.body.data.token;

    // 2. Receptionist login (should be denied access by requireRole('SUPER_ADMIN', 'GYM_ADMIN'))
    const receptionistEmail = 'desk@fitcore.com';
    let receptionist = await User.findOne({ email: receptionistEmail });
    if (!receptionist) {
      await User.create({
        fullName: 'Receptionist Desk',
        email: receptionistEmail,
        password: 'password123',
        role: 'RECEPTIONIST',
        status: 'ACTIVE',
      });
    }

    const recLogin = await request(app).post('/api/auth/login').send({
      email: receptionistEmail,
      password: 'password123',
    });
    receptionistToken = recLogin.body.data.token;

    // 3. Find or create a test member
    let member = await Member.findOne();
    if (!member) {
      member = await Member.create({
        memberId: 'MEM-AI-TEST-01',
        fullName: 'Vikram Shinde',
        phone: '9881122334',
        gender: 'MALE',
        status: 'ACTIVE',
        fitnessGoals: ['Muscle Gain', 'Strength'],
        branch: new mongoose.Types.ObjectId(),
      });
    }
    testMemberId = member._id.toString();
  });

  it('1. GET /api/ai-coach/status returns active AI or deterministic local engine status', async () => {
    const res = await request(app)
      .get('/api/ai-coach/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('provider');
    expect(res.body.data).toHaveProperty('modelName');
    expect(res.body.data).toHaveProperty('message');
  });

  it('2. Enforces ADMIN-ONLY security (rejects unauthorized staff without appropriate role)', async () => {
    const res = await request(app)
      .get('/api/ai-coach/dashboard')
      .set('Authorization', `Bearer ${receptionistToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. POST /api/ai-coach/profiles creates member fitness profile with verified calculations', async () => {
    const profilePayload = {
      memberId: testMemberId,
      age: 28,
      gender: 'MALE',
      heightCm: 178,
      currentWeightKg: 78,
      targetWeightKg: 82,
      fitnessExperience: 'INTERMEDIATE',
      fitnessGoal: 'MUSCLE_GAIN',
      activityLevel: 'MODERATELY_ACTIVE',
      workoutDaysPerWeek: 5,
      workoutDurationMins: 60,
      availableEquipment: 'FULL_GYM',
      dietaryPreference: 'VEGETARIAN',
      allergies: ['Peanuts'],
      dislikedFoods: ['Bitter Gourd'],
      mealsPerDay: 4,
      sleepDurationHours: 8,
      dailyStepsTarget: 10000,
    };

    const res = await request(app)
      .post('/api/ai-coach/profiles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(profilePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.member).toBe(testMemberId);
    expect(res.body.data.bmr).toBeGreaterThan(1500);
    expect(res.body.data.tdee).toBeGreaterThan(res.body.data.bmr);
    expect(res.body.data.targetCalories).toBeGreaterThan(res.body.data.tdee); // surplus for muscle gain
    expect(res.body.data.targetProtein).toBeGreaterThan(100);
    expect(res.body.data.allergies).toContain('Peanuts');
  });

  it('4. POST /api/ai-coach/generate/diet generates 7-day personalized diet plan saved as DRAFT', async () => {
    const res = await request(app)
      .post('/api/ai-coach/generate/diet')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ memberId: testMemberId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approvalStatus).toBe('DRAFT');
    expect(res.body.data.sevenDaySchedule).toHaveLength(7);
    expect(res.body.data.shoppingList.length).toBeGreaterThan(0);
    expect(res.body.data.allergyWarnings.length).toBeGreaterThan(0);
    draftDietPlanId = res.body.data._id;
  });

  it('5. POST /api/ai-coach/generate/workout generates 7-day workout routine saved as DRAFT', async () => {
    const res = await request(app)
      .post('/api/ai-coach/generate/workout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ memberId: testMemberId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approvalStatus).toBe('DRAFT');
    expect(res.body.data.schedule).toHaveLength(7);
    expect(res.body.data.daysPerWeek).toBe(5);
    draftWorkoutPlanId = res.body.data._id;
  });

  it('6. GET /api/ai-coach/approvals/pending returns the queued draft plans', async () => {
    const res = await request(app)
      .get('/api/ai-coach/approvals/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalPending).toBeGreaterThan(0);
    const hasDiet = res.body.data.pendingDietPlans.some((p: any) => p._id === draftDietPlanId);
    const hasWorkout = res.body.data.pendingWorkoutPlans.some((p: any) => p._id === draftWorkoutPlanId);
    expect(hasDiet).toBe(true);
    expect(hasWorkout).toBe(true);
  });

  it('7. POST /api/ai-coach/diet-plans/:id/approve transitions plan to APPROVED status', async () => {
    const res = await request(app)
      .post(`/api/ai-coach/diet-plans/${draftDietPlanId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.approvalStatus).toBe('APPROVED');
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.approvedBy).toBeDefined();
  });

  it('8. POST /api/ai-coach/workouts/:id/approve transitions workout to APPROVED status', async () => {
    const res = await request(app)
      .post(`/api/ai-coach/workouts/${draftWorkoutPlanId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.approvalStatus).toBe('APPROVED');
    expect(res.body.data.approvedBy).toBeDefined();
  });

  it('9. GET /api/ai-coach/calendar/member/:memberId returns unified weekly meal & workout schedule', async () => {
    const res = await request(app)
      .get(`/api/ai-coach/calendar/member/${testMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.calendar).toHaveLength(7);
    expect(res.body.data.dietPlan).toBeDefined();
    expect(res.body.data.workoutPlan).toBeDefined();
  });

  it('10. Premium Entitlements CRUD works independently of gym membership billing', async () => {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 3);

    const createRes = await request(app)
      .post('/api/ai-coach/entitlements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        memberId: testMemberId,
        planName: 'Sagar Fitness Premium AI Coach (Quarterly)',
        expiryDate: expiry.toISOString(),
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('ACTIVE');
    expect(createRes.body.data.features.personalizedDiet).toBe(true);
    entitlementId = createRes.body.data._id;

    // Fetch list
    const listRes = await request(app)
      .get('/api/ai-coach/entitlements')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it('11. GET /api/ai-coach/supplements enforces strict educational medical disclaimer', async () => {
    const res = await request(app)
      .get('/api/ai-coach/supplements')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.disclaimer).toContain('MEDICAL DISCLAIMER');
    expect(res.body.data.supplements.length).toBeGreaterThan(4);
    const whey = res.body.data.supplements.find((s: any) => s.id === 'whey-protein');
    expect(whey).toBeDefined();
    expect(whey.isEssential).toBe(false);
  });

  it('12. GET /api/ai-coach/settings returns Sagar Fitness Gym configuration and standards', async () => {
    const res = await request(app)
      .get('/api/ai-coach/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.gymName).toBe('Sagar Fitness Gym');
    expect(res.body.data.location).toContain('Pathardi');
    expect(res.body.data.currency).toBe('INR');
  });

  it('13. GET /api/ai-coach/ml/status returns trained Scikit-Learn model metrics and R2 accuracy', async () => {
    const res = await request(app)
      .get('/api/ai-coach/ml/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isTrained).toBe(true);
    expect(res.body.data.nutritionR2Score).toBeGreaterThan(0.80);
    expect(res.body.data.workoutSplitAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(res.body.data.totalTrainingSamples).toBeGreaterThanOrEqual(10000);
    expect(res.body.data.topPredictiveFeatures.length).toBeGreaterThan(0);
  });

  it('14. POST /api/ai-coach/ml/predict computes zero-latency in-process ML inference', async () => {
    const res = await request(app)
      .post('/api/ai-coach/ml/predict')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        memberId: testMemberId,
        workoutDaysPerWeek: 5,
        fitnessGoal: 'MUSCLE_GAIN',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('TRAINED_SCIKIT_LEARN_ML');
    expect(res.body.data.nutrition.targetCalories).toBeGreaterThan(1800);
    expect(res.body.data.nutrition.targetProteinGrams).toBeGreaterThan(100);
    expect(res.body.data.workout.recommendedSplit).toBe('PUSH_PULL_LEGS_5D');
    expect(res.body.data.workout.volumeMultiplier).toBeGreaterThanOrEqual(0.8);
    expect(res.body.data.confidenceScore).toBeGreaterThan(0.85);
  });
});
