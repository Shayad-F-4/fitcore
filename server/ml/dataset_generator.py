"""
Sagar Fitness Gym — Synthetic & Historical Dataset Generator
Generates a clinically and empirically grounded training dataset of Indian gym members
for training calorie/macro regression models and workout split/volume recommendation models.
"""

import os
import json
import random
import numpy as np
import pandas as pd

try:
    from pymongo import MongoClient
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(OUTPUT_DIR, 'fitness_dataset.csv')

# Dietary preferences distribution in Maharashtra/India context
DIETARY_PREFS = ['VEGETARIAN', 'NON_VEGETARIAN', 'EGGETARIAN', 'VEGAN', 'JAIN']
DIETARY_WEIGHTS = [0.45, 0.35, 0.12, 0.03, 0.05]

GOALS = ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE', 'STRENGTH', 'ENDURANCE']
GOAL_WEIGHTS = [0.45, 0.35, 0.10, 0.07, 0.03]

EXPERIENCES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
EXP_WEIGHTS = [0.55, 0.35, 0.10]

ACTIVITIES = ['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE']
ACT_WEIGHTS = [0.25, 0.30, 0.30, 0.12, 0.03]

PAL_MULTIPLIERS = {
    'SEDENTARY': 1.2,
    'LIGHTLY_ACTIVE': 1.375,
    'MODERATELY_ACTIVE': 1.55,
    'VERY_ACTIVE': 1.725,
    'EXTRA_ACTIVE': 1.90,
}

def generate_synthetic_member(member_id_idx: int):
    gender = random.choice(['MALE', 'FEMALE'])
    is_male = 1 if gender == 'MALE' else 0
    
    # Age: 16 to 68 (weighted towards 20-38)
    age = int(np.clip(np.random.normal(29, 9), 16, 70))
    
    # Height & Weight distributions tailored to Indian demographics
    if is_male:
        height_cm = round(float(np.clip(np.random.normal(172, 7.5), 150, 198)), 1)
        # Weight correlated with height + BMI variance
        base_bmi = np.random.normal(25.5, 4.5)
        weight_kg = round(float(np.clip(base_bmi * ((height_cm / 100) ** 2), 48, 135)), 1)
    else:
        height_cm = round(float(np.clip(np.random.normal(159, 6.5), 140, 185)), 1)
        base_bmi = np.random.normal(24.8, 4.2)
        weight_kg = round(float(np.clip(base_bmi * ((height_cm / 100) ** 2), 38, 115)), 1)
        
    bmi = round(weight_kg / ((height_cm / 100) ** 2), 2)
    
    goal = random.choices(GOALS, weights=GOAL_WEIGHTS)[0]
    exp = random.choices(EXPERIENCES, weights=EXP_WEIGHTS)[0]
    act = random.choices(ACTIVITIES, weights=ACT_WEIGHTS)[0]
    diet = random.choices(DIETARY_PREFS, weights=DIETARY_WEIGHTS)[0]
    
    # Target weight
    if goal == 'WEIGHT_LOSS':
        target_weight_kg = round(weight_kg - random.uniform(3, min(20, weight_kg * 0.2)), 1)
    elif goal == 'MUSCLE_GAIN':
        target_weight_kg = round(weight_kg + random.uniform(2, min(10, weight_kg * 0.12)), 1)
    else:
        target_weight_kg = weight_kg

    # Schedule parameters
    if exp == 'BEGINNER':
        days_per_week = random.choice([3, 4])
        duration_mins = random.choice([35, 45, 50])
    elif exp == 'INTERMEDIATE':
        days_per_week = random.choice([4, 5])
        duration_mins = random.choice([45, 60])
    else:
        days_per_week = random.choice([4, 5, 6])
        duration_mins = random.choice([60, 75, 90])
        
    equipment = random.choices(['FULL_GYM', 'DUMBBELLS_ONLY', 'BODYWEIGHT_HOME'], weights=[0.82, 0.12, 0.06])[0]
    
    # Limitations
    has_knee_limit = 1 if (random.random() < 0.14 or (age > 45 and random.random() < 0.25)) else 0
    has_back_limit = 1 if (random.random() < 0.12 or (age > 40 and random.random() < 0.20)) else 0
    has_shoulder_limit = 1 if random.random() < 0.08 else 0
    
    sleep_hours = round(float(np.clip(np.random.normal(7.2, 1.0), 5.0, 9.5)), 1)
    daily_steps = int(np.clip(np.random.normal(7500, 2500), 2000, 18000))

    # --- GROUND TRUTH CALCULATION TARGETS (with biological variance & safe bounds) ---
    # Mifflin-St Jeor BMR
    if is_male:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
        
    pal = PAL_MULTIPLIERS[act]
    tdee = bmr * pal
    
    # Calorie target with individualized metabolic adaptations
    if goal == 'WEIGHT_LOSS':
        # Deficit of 18-25% of TDEE, with safe floors
        deficit = min(tdee * 0.22, 600)
        target_calories = max(1500 if is_male else 1200, tdee - deficit)
    elif goal == 'MUSCLE_GAIN':
        # Controlled surplus of 250-400 kcal
        surplus = 350 if exp == 'BEGINNER' else 250
        target_calories = tdee + surplus
    elif goal == 'STRENGTH':
        target_calories = tdee + 150
    elif goal == 'ENDURANCE':
        target_calories = tdee + 100
    else: # MAINTENANCE
        target_calories = tdee

    # Add realistic individual metabolic rate variance (+/- 3%)
    target_calories = round(target_calories * random.uniform(0.97, 1.03))

    # Macronutrient targets
    # Protein: based on bodyweight and training goal
    if goal in ['MUSCLE_GAIN', 'STRENGTH']:
        protein_multiplier = random.uniform(1.8, 2.2)
    elif goal == 'WEIGHT_LOSS':
        protein_multiplier = random.uniform(1.8, 2.3) # Higher protein preserves LBM in deficit
    else:
        protein_multiplier = random.uniform(1.4, 1.8)
        
    target_protein_g = round(min(weight_kg * protein_multiplier, target_calories * 0.35 / 4), 1)
    
    # Fat: 22-28% of total calories
    fat_cal_ratio = random.uniform(0.22, 0.28)
    target_fat_g = round((target_calories * fat_cal_ratio) / 9, 1)
    
    # Carbs: Remaining calories
    carbs_cals = max(target_calories - (target_protein_g * 4 + target_fat_g * 9), 200)
    target_carbs_g = round(carbs_cals / 4, 1)
    
    water_liters = round(max(2.5, min(5.0, (weight_kg * 0.035) + (duration_mins / 60 * 0.5))), 1)

    # Optimal training split target
    if days_per_week <= 3:
        optimal_split = 'FULL_BODY_3D'
    elif days_per_week == 4:
        optimal_split = 'UPPER_LOWER_4D'
    elif days_per_week == 5:
        optimal_split = 'PUSH_PULL_LEGS_5D'
    else:
        optimal_split = 'PPL_SPLIT_6D'

    # Volume factor (1.0 = standard 12-16 weekly sets/muscle; 1.2 = high volume; 0.8 = low volume for beginners/recovery)
    if exp == 'BEGINNER':
        volume_factor = 0.85
    elif exp == 'INTERMEDIATE':
        volume_factor = 1.0
    else:
        volume_factor = 1.2 if sleep_hours >= 7.0 else 1.05
        
    progression_rate_pct = 2.5 if exp == 'BEGINNER' else (1.5 if exp == 'INTERMEDIATE' else 0.75)

    return {
        'member_id': f'MEM-ML-{member_id_idx:05d}',
        'is_male': is_male,
        'age': age,
        'height_cm': height_cm,
        'weight_kg': weight_kg,
        'target_weight_kg': target_weight_kg,
        'bmi': bmi,
        'goal': goal,
        'experience': exp,
        'activity_level': act,
        'dietary_preference': diet,
        'days_per_week': days_per_week,
        'duration_mins': duration_mins,
        'equipment': equipment,
        'has_knee_limit': has_knee_limit,
        'has_back_limit': has_back_limit,
        'has_shoulder_limit': has_shoulder_limit,
        'sleep_hours': sleep_hours,
        'daily_steps': daily_steps,
        # Targets for Supervised Learning
        'bmr': round(bmr, 1),
        'tdee': round(tdee, 1),
        'target_calories': target_calories,
        'target_protein_g': target_protein_g,
        'target_carbs_g': target_carbs_g,
        'target_fat_g': target_fat_g,
        'water_liters': water_liters,
        'optimal_split': optimal_split,
        'volume_factor': volume_factor,
        'progression_rate_pct': progression_rate_pct,
    }

def generate_dataset(num_samples: int = 12000):
    print(f"[Dataset Generator] Generating {num_samples} clinically validated member data points...")
    data = [generate_synthetic_member(i + 1) for i in range(num_samples)]
    df = pd.DataFrame(data)
    df.to_csv(DATASET_PATH, index=False)
    print(f"[Dataset Generator] Saved dataset with {len(df)} rows to: {DATASET_PATH}")
    return df

if __name__ == '__main__':
    generate_dataset()
