"""
Sagar Fitness Gym — Machine Learning Training Suite
Trains multi-output nutrition regression and workout recommendation models.
Evaluates accuracy (R2, MAE, RMSE) and exports both pickle/joblib files and
lightweight, portable JSON model definitions for zero-latency in-process Node.js execution.
"""

import os
import json
import time
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor, RandomForestClassifier
from sklearn.multioutput import MultiOutputRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, classification_report
import sys
import joblib
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dataset_generator import generate_dataset, DATASET_PATH

ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(ML_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# Categorical encodings
GOAL_MAP = {'WEIGHT_LOSS': 0, 'MUSCLE_GAIN': 1, 'MAINTENANCE': 2, 'STRENGTH': 3, 'ENDURANCE': 4}
EXP_MAP = {'BEGINNER': 0, 'INTERMEDIATE': 1, 'ADVANCED': 2}
ACT_MAP = {'SEDENTARY': 0, 'LIGHTLY_ACTIVE': 1, 'MODERATELY_ACTIVE': 2, 'VERY_ACTIVE': 3, 'EXTRA_ACTIVE': 4}
DIET_MAP = {'VEGETARIAN': 0, 'NON_VEGETARIAN': 1, 'EGGETARIAN': 2, 'VEGAN': 3, 'JAIN': 4}
EQUIP_MAP = {'FULL_GYM': 0, 'DUMBBELLS_ONLY': 1, 'BODYWEIGHT_HOME': 2}
SPLIT_MAP = {'FULL_BODY_3D': 0, 'UPPER_LOWER_4D': 1, 'PUSH_PULL_LEGS_5D': 2, 'PPL_SPLIT_6D': 3}
REV_SPLIT_MAP = {v: k for k, v in SPLIT_MAP.items()}

FEATURE_COLS = [
    'is_male',
    'age',
    'height_cm',
    'weight_kg',
    'target_weight_kg',
    'bmi',
    'goal_enc',
    'exp_enc',
    'act_enc',
    'diet_enc',
    'days_per_week',
    'duration_mins',
    'equip_enc',
    'has_knee_limit',
    'has_back_limit',
    'has_shoulder_limit',
    'sleep_hours',
    'daily_steps'
]

NUTRITION_TARGETS = [
    'target_calories',
    'target_protein_g',
    'target_carbs_g',
    'target_fat_g',
    'water_liters'
]

def preprocess_dataframe(df):
    kaggle_cols = {'Workout_Frequency (days/week)', 'Session_Duration (hours)', 'Calories_Burned'}
    if kaggle_cols.issubset(set(df.columns)):
        # Kaggle Gym Members Exercise Tracking Dataset
        processed = pd.DataFrame()
        processed['is_male'] = df['Gender'].apply(lambda g: 1 if str(g).strip().lower() == 'male' else 0)
        processed['age'] = df['Age']
        processed['height_cm'] = df['Height (m)'].apply(lambda h: round(h * 100, 1) if h < 3.0 else h)
        processed['weight_kg'] = df['Weight (kg)']
        processed['target_weight_kg'] = processed['weight_kg']
        processed['bmi'] = df['BMI'] if 'BMI' in df.columns else (processed['weight_kg'] / ((processed['height_cm'] / 100) ** 2)).round(1)
        processed['days_per_week'] = df['Workout_Frequency (days/week)']
        processed['duration_mins'] = (df['Session_Duration (hours)'] * 60).round().astype(int)
        processed['exp_enc'] = df['Experience_Level'].apply(lambda e: max(0, min(2, int(e) - 1)) if str(e).isdigit() else 1)

        if 'Workout_Type' in df.columns:
            wt_map = {'Cardio': 0, 'Strength': 1, 'HIIT': 0, 'Yoga': 2}
            processed['goal_enc'] = df['Workout_Type'].map(wt_map).fillna(1).astype(int)
        else:
            processed['goal_enc'] = 1

        processed['act_enc'] = processed['days_per_week'].apply(lambda d: 1 if d <= 2 else (2 if d <= 4 else 3))
        processed['diet_enc'] = 0
        processed['equip_enc'] = 0
        processed['has_knee_limit'] = 0
        processed['has_back_limit'] = 0
        processed['has_shoulder_limit'] = 0
        processed['sleep_hours'] = 7.5
        processed['daily_steps'] = 8000

        # Target variables
        if 'Water_Intake (liters)' in df.columns:
            processed['water_liters'] = df['Water_Intake (liters)']
        else:
            processed['water_liters'] = 3.5

        bmr = 10 * processed['weight_kg'] + 6.25 * processed['height_cm'] - 5 * processed['age'] + (5 * processed['is_male'] - 161 * (1 - processed['is_male']))
        burn = df['Calories_Burned'] if 'Calories_Burned' in df.columns else 400
        processed['target_calories'] = (bmr * 1.35 + burn * 0.4).round()
        processed['target_protein_g'] = (processed['weight_kg'] * 1.8).round(1)
        processed['target_fat_g'] = ((processed['target_calories'] * 0.25) / 9).round(1)
        processed['target_carbs_g'] = ((processed['target_calories'] - (processed['target_protein_g'] * 4 + processed['target_fat_g'] * 9)) / 4).round(1)

        def pick_split(d):
            if d <= 3: return 0
            if d == 4: return 1
            if d == 5: return 2
            return 3
        processed['split_enc'] = processed['days_per_week'].apply(pick_split)
        processed['volume_factor'] = processed['exp_enc'].apply(lambda e: 0.9 if e == 0 else (1.1 if e == 1 else 1.25))
        processed['progression_rate_pct'] = processed['exp_enc'].apply(lambda e: 2.5 if e == 0 else (1.5 if e == 1 else 1.0))
        return processed

    else:
        # Standard synthetic or customized dataset
        processed = df.copy()
        processed['goal_enc'] = processed['goal'].map(GOAL_MAP).fillna(0).astype(int) if 'goal' in processed.columns else 0
        processed['exp_enc'] = processed['experience'].map(EXP_MAP).fillna(0).astype(int) if 'experience' in processed.columns else 0
        processed['act_enc'] = processed['activity_level'].map(ACT_MAP).fillna(2).astype(int) if 'activity_level' in processed.columns else 2
        processed['diet_enc'] = processed['dietary_preference'].map(DIET_MAP).fillna(0).astype(int) if 'dietary_preference' in processed.columns else 0
        processed['equip_enc'] = processed['equipment'].map(EQUIP_MAP).fillna(0).astype(int) if 'equipment' in processed.columns else 0
        processed['split_enc'] = processed['optimal_split'].map(SPLIT_MAP).fillna(1).astype(int) if 'optimal_split' in processed.columns else 1

        for col in FEATURE_COLS:
            if col not in processed.columns:
                processed[col] = 0

        for col in NUTRITION_TARGETS:
            if col not in processed.columns:
                processed[col] = 2000 if 'calories' in col else (100 if 'g' in col else 3.5)

        if 'volume_factor' not in processed.columns:
            processed['volume_factor'] = 1.0
        if 'progression_rate_pct' not in processed.columns:
            processed['progression_rate_pct'] = 2.0

        return processed

def load_and_preprocess_data(dataset_path=None):
    kaggle_candidate = os.path.join(ML_DIR, 'gym_members_exercise_tracking.csv')

    if dataset_path and dataset_path != 'all':
        print(f"Loading single dataset from: {dataset_path}")
        df_raw = pd.read_csv(dataset_path)
        combined = preprocess_dataframe(df_raw)
    else:
        # Load synthetic clinical dataset as foundational anchor
        if not os.path.exists(DATASET_PATH):
            generate_dataset(12000)
        df_synth = pd.read_csv(DATASET_PATH)
        combined = preprocess_dataframe(df_synth)
        print(f"Loaded foundational clinical dataset: {len(combined)} records.")

        # If real Kaggle Gym Members Exercise Dataset is present, merge them
        if os.path.exists(kaggle_candidate):
            df_kaggle = pd.read_csv(kaggle_candidate)
            proc_kaggle = preprocess_dataframe(df_kaggle)
            print(f"Merging real-world Kaggle Gym Members dataset: +{len(proc_kaggle)} records.")
            combined = pd.concat([combined, proc_kaggle], ignore_index=True)

    print(f"Total Combined Training Dataset: {len(combined)} records.")
    X = combined[FEATURE_COLS].copy()
    y_nutrition = combined[NUTRITION_TARGETS].copy()
    y_split = combined['split_enc'].copy()
    y_volume = combined[['volume_factor', 'progression_rate_pct']].copy()

    return combined, X, y_nutrition, y_split, y_volume

def train_and_export(dataset_path=None):
    start_time = time.time()
    print("=" * 65)
    print("SAGAR FITNESS GYM — ML MODEL TRAINING PIPELINE")
    print("=" * 65)

    df, X, y_nutrition, y_split, y_volume = load_and_preprocess_data(dataset_path)
    print(f"Loaded dataset: {len(X)} records across {len(FEATURE_COLS)} biometric & lifestyle features.")
    
    # Split train/test (80/20)
    X_train, X_test, yn_train, yn_test, ys_train, ys_test, yv_train, yv_test = train_test_split(
        X, y_nutrition, y_split, y_volume, test_size=0.20, random_state=42
    )
    
    # Fit Feature Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # -------------------------------------------------------------
    # 1. TRAIN NUTRITION TARGET REGRESSION MODEL
    # -------------------------------------------------------------
    print("\n[1/3] Training Nutrition & Calorie Multi-Output Regressor...")
    # Ridge Regressor provides smooth linear response with optimal zero-latency exportability
    nutrition_model = Ridge(alpha=1.0)
    nutrition_model.fit(X_train_scaled, yn_train)
    
    yn_pred = nutrition_model.predict(X_test_scaled)
    r2_scores = r2_score(yn_test, yn_pred, multioutput='raw_values')
    mae_scores = mean_absolute_error(yn_test, yn_pred, multioutput='raw_values')
    rmse_scores = np.sqrt(mean_squared_error(yn_test, yn_pred, multioutput='raw_values'))
    
    nutrition_metrics = {}
    for idx, target in enumerate(NUTRITION_TARGETS):
        nutrition_metrics[target] = {
            'r2_score': round(float(r2_scores[idx]), 4),
            'mae': round(float(mae_scores[idx]), 2),
            'rmse': round(float(rmse_scores[idx]), 2)
        }
        print(f"   • {target:<18}: R² = {r2_scores[idx]:.4f} | MAE = {mae_scores[idx]:.2f}")
        
    overall_nutrition_r2 = round(float(np.mean(r2_scores)), 4)
    print(f"   Overall Nutrition R² Score: {overall_nutrition_r2:.4f}")
    
    # -------------------------------------------------------------
    # 2. TRAIN WORKOUT SPLIT CLASSIFIER
    # -------------------------------------------------------------
    print("\n[2/3] Training Workout Split Recommendation Classifier...")
    split_model = RandomForestClassifier(n_estimators=60, max_depth=8, random_state=42)
    split_model.fit(X_train, ys_train)
    
    ys_pred = split_model.predict(X_test)
    split_accuracy = round(float(accuracy_score(ys_test, ys_pred)), 4)
    print(f"   Workout Split Accuracy: {split_accuracy * 100:.2f}%")
    
    # Feature importances
    importances = dict(zip(FEATURE_COLS, [round(float(imp), 4) for imp in split_model.feature_importances_]))
    sorted_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:6]
    print("   Top Workout Predictive Features:")
    for feat, imp in sorted_importances:
        print(f"     - {feat}: {imp * 100:.1f}%")

    # -------------------------------------------------------------
    # 3. TRAIN WORKOUT VOLUME & PROGRESSION REGRESSOR
    # -------------------------------------------------------------
    print("\n[3/3] Training Volume Factor & Progressive Overload Regressor...")
    volume_model = Ridge(alpha=1.0)
    volume_model.fit(X_train_scaled, yv_train)
    
    yv_pred = volume_model.predict(X_test_scaled)
    vol_r2 = r2_score(yv_test, yv_pred, multioutput='raw_values')
    vol_mae = mean_absolute_error(yv_test, yv_pred, multioutput='raw_values')
    print(f"   Volume Factor: R² = {vol_r2[0]:.4f} | MAE = {vol_mae[0]:.3f}")
    print(f"   Progression %: R² = {vol_r2[1]:.4f} | MAE = {vol_mae[1]:.3f}%")

    # -------------------------------------------------------------
    # 4. EXPORT MODELS FOR HIGH PERFORMANCE INFERENCE
    # -------------------------------------------------------------
    # A. Python Joblib models
    joblib.dump(nutrition_model, os.path.join(MODELS_DIR, 'nutrition_model.joblib'))
    joblib.dump(split_model, os.path.join(MODELS_DIR, 'split_model.joblib'))
    joblib.dump(volume_model, os.path.join(MODELS_DIR, 'volume_model.joblib'))
    joblib.dump(scaler, os.path.join(MODELS_DIR, 'scaler.joblib'))
    
    # B. Portable Zero-Dependency JSON Definition for Node.js Backend Execution
    # Coefficients & Intercepts matrix: shape (n_targets, n_features)
    portable_nutrition_model = {
        'model_name': 'Sagar Fitness Nutrition Target Regressor',
        'algorithm': 'Ridge Regression with Standard Scaler',
        'version': '1.0.0',
        'trained_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'training_samples': len(X_train),
        'overall_r2': overall_nutrition_r2,
        'features': FEATURE_COLS,
        'targets': NUTRITION_TARGETS,
        'scaler_mean': [round(float(m), 6) for m in scaler.mean_],
        'scaler_scale': [round(float(s), 6) for s in scaler.scale_],
        'coefficients': [[round(float(c), 6) for c in target_coefs] for target_coefs in nutrition_model.coef_],
        'intercepts': [round(float(i), 6) for i in nutrition_model.intercept_],
        'metrics': nutrition_metrics
    }
    
    portable_volume_model = {
        'model_name': 'Sagar Fitness Volume & Overload Regressor',
        'features': FEATURE_COLS,
        'targets': ['volume_factor', 'progression_rate_pct'],
        'scaler_mean': [round(float(m), 6) for m in scaler.mean_],
        'scaler_scale': [round(float(s), 6) for s in scaler.scale_],
        'coefficients': [[round(float(c), 6) for c in target_coefs] for target_coefs in volume_model.coef_],
        'intercepts': [round(float(i), 6) for i in volume_model.intercept_],
        'split_accuracy': split_accuracy,
        'top_features': sorted_importances
    }
    
    with open(os.path.join(MODELS_DIR, 'nutrition_model.json'), 'w') as f:
        json.dump(portable_nutrition_model, f, indent=2)
        
    with open(os.path.join(MODELS_DIR, 'workout_model.json'), 'w') as f:
        json.dump(portable_volume_model, f, indent=2)

    # General metrics summary for UI dashboard
    overall_metrics = {
        'trained_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'total_training_samples': len(X),
        'training_split': '80/20 train/test split',
        'nutrition_r2_score': overall_nutrition_r2,
        'workout_split_accuracy': split_accuracy,
        'calorie_mae_kcal': nutrition_metrics['target_calories']['mae'],
        'protein_mae_g': nutrition_metrics['target_protein_g']['mae'],
        'top_predictive_features': sorted_importances,
        'status': 'ACTIVE_IN_PRODUCTION'
    }
    
    with open(os.path.join(MODELS_DIR, 'metrics.json'), 'w') as f:
        json.dump(overall_metrics, f, indent=2)

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "=" * 65)
    print(f"TRAINING COMPLETE in {elapsed}s!")
    print(f"Exported models and lightweight JSON runtime matrices to: {MODELS_DIR}")
    print("=" * 65)
    return overall_metrics

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Train Sagar Fitness Gym ML Models")
    parser.add_argument('--dataset', type=str, default=None, help="Path to custom CSV dataset (Kaggle or custom schema)")
    args = parser.parse_args()
    train_and_export(args.dataset)

