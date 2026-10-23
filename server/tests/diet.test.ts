import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { ENV } from '../src/config/env.js';
import { FoodItem } from '../src/models/FoodItem.js';
import { DietPlan } from '../src/models/DietPlan.js';
import { WeightProgress } from '../src/models/WeightProgress.js';
import { Member } from '../src/models/Member.js';
import { User } from '../src/models/User.js';
import { calculateCalorieAndMacros, calculateBMI } from '../src/utils/nutritionCalculator.js';

describe('Diet & Calorie Management Test Suite (Admin-Only)', () => {
  let adminToken = '';
  let receptionistToken = '';
  let testMemberId = '';
  let testFoodId = '';
  let testPlanId = '';

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

    // 2. Receptionist login
    const recLogin = await request(app).post('/api/auth/login').send({
      email: 'desk@fitcore.com',
      password: 'password123',
    });
    receptionistToken = recLogin.body.data.token;

    // 3. Find or create a test gym member
    let member = await Member.findOne();
    if (!member) {
      member = await Member.create({
        memberId: 'MEM-TEST-DIET',
        fullName: 'Rohan Sharma',
        phone: '9876543210',
        gender: 'MALE',
        status: 'ACTIVE',
        fitnessGoals: ['Weight Loss', 'Hypertrophy'],
        branch: new mongoose.Types.ObjectId(),
      });
    }
    testMemberId = member._id.toString();
  });

  // Test 1: Calorie & Macro Calculator Pure Math
  it('1. Correctly calculates BMR, TDEE, and macro targets using Mifflin-St Jeor equation', () => {
    // 25 year old male, 175cm, 75kg, moderately active (1.55), weight loss
    const result = calculateCalorieAndMacros({
      age: 25,
      gender: 'MALE',
      heightCm: 175,
      weightKg: 75,
      activityLevel: 'MODERATELY_ACTIVE',
      fitnessGoal: 'WEIGHT_LOSS',
    });

    // BMR = 10(75) + 6.25(175) - 5(25) + 5 = 750 + 1093.75 - 125 + 5 = 1723.75 -> 1724
    expect(result.bmr).toBe(1724);
    // TDEE = 1724 * 1.55 = 2672.2 -> 2672
    expect(result.tdee).toBe(2672);
    // Target deficit = 20% of 2672 = 534 -> target approx 2138
    expect(result.targetCalories).toBeLessThan(result.tdee);
    expect(result.targetCalories).toBeGreaterThan(1500); // Safe minimum
    // Protein for weight loss = 75kg * 2.0g/kg = 150g
    expect(result.targetProteinGrams).toBe(150);
    expect(result.waterIntakeLiters).toBeGreaterThanOrEqual(2.5);
  });

  // Test 2: Enforces Safe Floor Caloric Intake
  it('2. Enforces physiological minimum calorie floor for extreme deficit inputs', () => {
    // Sedentary female with small frame
    const result = calculateCalorieAndMacros({
      age: 40,
      gender: 'FEMALE',
      heightCm: 145,
      weightKg: 42,
      activityLevel: 'SEDENTARY',
      fitnessGoal: 'WEIGHT_LOSS',
    });

    // Should never drop below 1200 kcal/day for females
    expect(result.targetCalories).toBeGreaterThanOrEqual(1200);
    expect(result.safetyNotice).toBeDefined();
  });

  // Test 3: Input Validation for Calculator API
  it('3. Validates inputs and rejects invalid parameters in calculate-calories endpoint', async () => {
    const res = await request(app)
      .post('/api/diet/calculate-calories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        age: 5, // invalid age
        gender: 'MALE',
        heightCm: 175,
        weightKg: 75,
        activityLevel: 'MODERATELY_ACTIVE',
        fitnessGoal: 'WEIGHT_LOSS',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Test 4: Food Item Creation & Verification
  it('4. Creates and queries food items with verified nutrition data', async () => {
    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/diet/foods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Greek Yogurt Pro ${timestamp}`,
        category: 'DAIRY',
        servingSize: 100,
        servingUnit: 'g',
        calories: 90,
        protein: 10,
        carbs: 4,
        fat: 3,
        fiber: 0,
        source: 'Standard Gym Nutrition Database (Verified)',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.food.name).toContain('Greek Yogurt Pro');
    testFoodId = res.body.data.food._id;

    // Fetch food items
    const listRes = await request(app)
      .get('/api/diet/foods?category=DAIRY')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.foods.length).toBeGreaterThan(0);
  });

  // Test 5: Meal Planning & Nutritional Totals Recalculation
  it('5. Creates a diet plan and recalculates meal & daily totals from trusted food database', async () => {
    const planRes = await request(app)
      .post('/api/diet/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'High Protein Cutting Protocol',
        memberId: testMemberId,
        fitnessGoal: 'WEIGHT_LOSS',
        targetCalories: 2100,
        targetProtein: 160,
        targetCarbs: 180,
        targetFat: 55,
        meals: [
          {
            mealType: 'BREAKFAST',
            name: 'Breakfast (8:30 AM)',
            time: '08:30 AM',
            items: [
              {
                foodItem: testFoodId,
                quantity: 2, // 2 servings of 90 kcal, 10g protein
              },
            ],
          },
          {
            mealType: 'LUNCH',
            name: 'Post-Workout Lunch (1:30 PM)',
            time: '01:30 PM',
            items: [
              {
                foodName: 'Grilled Chicken Breast',
                servingUnit: 'g',
                servingSize: 100,
                quantity: 1.5,
                calories: 165,
                protein: 31,
                carbs: 0,
                fat: 3.6,
              },
            ],
          },
        ],
      });

    expect(planRes.status).toBe(201);
    expect(planRes.body.success).toBe(true);
    const plan = planRes.body.data.plan;
    testPlanId = plan._id;

    // Breakfast should have 2 * 90 = 180 calories and 2 * 10 = 20g protein
    expect(plan.meals[0].mealCalories).toBe(180);
    expect(plan.meals[0].mealProtein).toBe(20);
    // Daily totals should be sum of meals
    expect(plan.dailyCalories).toBeGreaterThan(0);
    expect(plan.status).toBe('ACTIVE');
  });

  // Test 6: Historical Plan Preservation
  it('6. Automatically preserves previous plan history by deactivating old active plans upon new assignment', async () => {
    // Create a 2nd plan for the same member
    const newPlanRes = await request(app)
      .post('/api/diet/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Hypertrophy Mass Gaining Plan',
        memberId: testMemberId,
        fitnessGoal: 'MUSCLE_GAIN',
        targetCalories: 2800,
        status: 'ACTIVE',
        meals: [],
      });

    expect(newPlanRes.status).toBe(201);
    const newPlanId = newPlanRes.body.data.plan._id;

    // Check old plan: should be marked INACTIVE, not deleted!
    const oldPlan = await DietPlan.findById(testPlanId);
    expect(oldPlan?.status).toBe('INACTIVE');

    // Check new plan: should be ACTIVE
    const newPlan = await DietPlan.findById(newPlanId);
    expect(newPlan?.status).toBe('ACTIVE');
  });

  // Test 7: Duplicate Diet Plan
  it('7. Duplicates an existing diet plan for review or modification', async () => {
    const dupRes = await request(app)
      .post(`/api/diet/plans/${testPlanId}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newPlanName: 'Duplicated Plan for Review',
      });

    expect(dupRes.status).toBe(201);
    expect(dupRes.body.data.plan.name).toBe('Duplicated Plan for Review');
    expect(dupRes.body.data.plan.status).toBe('INACTIVE');
  });

  // Test 8: Weight and Body Progress Logging & BMI Calculation
  it('8. Records weight and body measurements with automatic BMI calculation', async () => {
    const progressRes = await request(app)
      .post(`/api/diet/members/${testMemberId}/progress`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        weight: 76.5,
        height: 175,
        waist: 82,
        chest: 98,
        arms: 38,
        notes: 'End of week 2 check-in. Waist dropped by 1 cm.',
      });

    expect(progressRes.status).toBe(201);
    const progress = progressRes.body.data.progress;
    expect(progress.weight).toBe(76.5);
    // BMI = 76.5 / (1.75 * 1.75) = 24.98 -> 25.0
    expect(progress.bmi).toBeCloseTo(25.0, 1);

    // Fetch member diet profile
    const profileRes = await request(app)
      .get(`/api/diet/members/${testMemberId}/profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.latestProgress.weight).toBe(76.5);
    expect(profileRes.body.data.progressHistory.length).toBeGreaterThan(0);
  });

  // Test 9: Diet Dashboard Metrics
  it('9. Fetches diet dashboard metrics with active goals distribution and check-in reminders', async () => {
    const dashRes = await request(app)
      .get('/api/diet/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.success).toBe(true);
    expect(dashRes.body.data.kpi.totalPlans).toBeGreaterThan(0);
    expect(dashRes.body.data.kpi.activePlans).toBeGreaterThan(0);
  });

  // Test 10: Admin-Only RBAC Enforcement
  it('10. Enforces Admin-Only RBAC: rejects unauthenticated requests and unauthorized roles', async () => {
    // A. Unauthenticated request
    const noAuthRes = await request(app).get('/api/diet/dashboard');
    expect(noAuthRes.status).toBe(401);

    // B. Receptionist role attempting admin diet management
    const recRes = await request(app)
      .get('/api/diet/dashboard')
      .set('Authorization', `Bearer ${receptionistToken}`);
    expect(recRes.status).toBe(403);
    expect(recRes.body.success).toBe(false);

    // C. Receptionist trying to create a diet plan
    const recCreateRes = await request(app)
      .post('/api/diet/plans')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        name: 'Unauthorized Plan',
        memberId: testMemberId,
      });
    expect(recCreateRes.status).toBe(403);
  });
});
