"""
Sagar Fitness Gym — Model Inference Verification Script
Tests real-world member scenarios with the trained models.
"""

import os
import json
import warnings
warnings.filterwarnings('ignore')
import joblib
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')

def test_inference():
    nutrition_model = joblib.load(os.path.join(MODELS_DIR, 'nutrition_model.joblib'))
    split_model = joblib.load(os.path.join(MODELS_DIR, 'split_model.joblib'))
    volume_model = joblib.load(os.path.join(MODELS_DIR, 'volume_model.joblib'))
    scaler = joblib.load(os.path.join(MODELS_DIR, 'scaler.joblib'))
    
    # Test Member 1: 28-year-old male, 178cm, 80kg, muscle gain, intermediate, 5 days/wk
    # Features: [is_male, age, height_cm, weight_kg, target_weight_kg, bmi, goal_enc(1), exp_enc(1), act_enc(2), diet_enc(0), days(5), duration(60), equip(0), knee(0), back(0), shoulder(0), sleep(8.0), steps(9000)]
    member1 = [1, 28, 178.0, 80.0, 84.0, 25.25, 1, 1, 2, 0, 5, 60, 0, 0, 0, 0, 8.0, 9000]
    
    m1_scaled = scaler.transform([member1])
    pred_nutrition = nutrition_model.predict(m1_scaled)[0]
    pred_split = split_model.predict([member1])[0]
    pred_vol = volume_model.predict(m1_scaled)[0]
    
    splits = {0: 'FULL_BODY_3D', 1: 'UPPER_LOWER_4D', 2: 'PUSH_PULL_LEGS_5D', 3: 'PPL_SPLIT_6D'}
    
    print("\n--- TEST CASE: 28yo Male, 80kg, Muscle Gain (5 Days/Wk) ---")
    print(f"Target Calories: {round(pred_nutrition[0])} kcal")
    print(f"Target Protein : {round(pred_nutrition[1])} g")
    print(f"Target Carbs   : {round(pred_nutrition[2])} g")
    print(f"Target Fat     : {round(pred_nutrition[3])} g")
    print(f"Water Intake   : {pred_nutrition[4]:.1f} L")
    print(f"Recommended Routine Split : {splits.get(pred_split)}")
    print(f"Volume Multiplier         : {pred_vol[0]:.2f}x")
    print(f"Weekly Progression Rate   : +{pred_vol[1]:.2f}%")
    
    assert pred_nutrition[0] > 2200, "Calories should be above 2200 for 80kg muscle gain"
    assert pred_nutrition[1] >= 140, "Protein should be >= 140g for muscle gain"
    assert splits.get(pred_split) == 'PUSH_PULL_LEGS_5D', "5 days should map to PPL_5D"
    print("\nALL INFERENCE ASSERTIONS PASSED!")

if __name__ == '__main__':
    test_inference()
