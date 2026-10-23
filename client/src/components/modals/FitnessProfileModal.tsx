import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Activity,
  Utensils,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Flame,
  Scale,
  Droplet,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../api/client';
import { Member, FitnessProfile, DietaryPreference, FitnessExperience, AvailableEquipment } from '../../types';

interface FitnessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (profile: FitnessProfile) => void;
  initialProfile?: FitnessProfile | null;
  members: Member[];
  preselectedMemberId?: string;
}

export const FitnessProfileModal: React.FC<FitnessProfileModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialProfile,
  members,
  preselectedMemberId,
}) => {
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields - Step 1: Demographics
  const [memberId, setMemberId] = useState<string>('');
  const [age, setAge] = useState<number | string>(25);
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [heightCm, setHeightCm] = useState<number | string>(175);
  const [currentWeightKg, setCurrentWeightKg] = useState<number | string>(75);
  const [targetWeightKg, setTargetWeightKg] = useState<number | string>(70);

  // Form Fields - Step 2: Training & Schedule
  const [fitnessExperience, setFitnessExperience] = useState<FitnessExperience>('BEGINNER');
  const [fitnessGoal, setFitnessGoal] = useState<any>('WEIGHT_LOSS');
  const [activityLevel, setActivityLevel] = useState<string>('MODERATELY_ACTIVE');
  const [preferredWorkoutTime, setPreferredWorkoutTime] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING');
  const [workoutDaysPerWeek, setWorkoutDaysPerWeek] = useState<number>(4);
  const [workoutDurationMins, setWorkoutDurationMins] = useState<number>(45);
  const [availableEquipment, setAvailableEquipment] = useState<AvailableEquipment>('FULL_GYM');
  const [exerciseLimitations, setExerciseLimitations] = useState<string>('');

  // Form Fields - Step 3: Dietary & Lifestyle Preferences
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>('VEGETARIAN');
  const [allergies, setAllergies] = useState<string>('');
  const [likedFoods, setLikedFoods] = useState<string>('');
  const [dislikedFoods, setDislikedFoods] = useState<string>('');
  const [mealsPerDay, setMealsPerDay] = useState<number>(4);
  const [foodBudget, setFoodBudget] = useState<'BUDGET' | 'MODERATE' | 'PREMIUM'>('MODERATE');
  const [foodPreparationPreference, setFoodPreparationPreference] = useState<'HOME_COOKED' | 'MEAL_PREP' | 'QUICK_EASY'>('HOME_COOKED');
  const [sleepDurationHours, setSleepDurationHours] = useState<number | string>(7.5);
  const [dailyStepsTarget, setDailyStepsTarget] = useState<number>(8000);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialProfile) {
      const mId = typeof initialProfile.member === 'object' ? initialProfile.member._id : initialProfile.member;
      setMemberId(mId || '');
      setAge(initialProfile.age || 25);
      setGender(initialProfile.gender || 'MALE');
      setHeightCm(initialProfile.heightCm || 175);
      setCurrentWeightKg(initialProfile.currentWeightKg || 75);
      setTargetWeightKg(initialProfile.targetWeightKg || 70);
      setFitnessExperience(initialProfile.fitnessExperience || 'BEGINNER');
      setFitnessGoal(initialProfile.fitnessGoal || 'WEIGHT_LOSS');
      setActivityLevel(initialProfile.activityLevel || 'MODERATELY_ACTIVE');
      setPreferredWorkoutTime(initialProfile.preferredWorkoutTime || 'MORNING');
      setWorkoutDaysPerWeek(initialProfile.workoutDaysPerWeek || 4);
      setWorkoutDurationMins(initialProfile.workoutDurationMins || 45);
      setAvailableEquipment(initialProfile.availableEquipment || 'FULL_GYM');
      setExerciseLimitations((initialProfile.exerciseLimitations || []).join(', '));
      setDietaryPreference(initialProfile.dietaryPreference || 'VEGETARIAN');
      setAllergies((initialProfile.allergies || []).join(', '));
      setLikedFoods((initialProfile.likedFoods || []).join(', '));
      setDislikedFoods((initialProfile.dislikedFoods || []).join(', '));
      setMealsPerDay(initialProfile.mealsPerDay || 4);
      setFoodBudget(initialProfile.foodBudget || 'MODERATE');
      setFoodPreparationPreference(initialProfile.foodPreparationPreference || 'HOME_COOKED');
      setSleepDurationHours(initialProfile.sleepDurationHours || 7.5);
      setDailyStepsTarget(initialProfile.dailyStepsTarget || 8000);
      setNotes(initialProfile.notes || '');
    } else if (preselectedMemberId) {
      setMemberId(preselectedMemberId);
    }
    setStep(1);
    setError(null);
  }, [initialProfile, preselectedMemberId, isOpen]);

  if (!isOpen) return null;

  // Realtime Deterministic Calculation preview
  const numHeight = Number(heightCm) || 175;
  const numWeight = Number(currentWeightKg) || 75;
  const numAge = Number(age) || 25;
  const heightM = numHeight / 100;
  const previewBmi = Math.round((numWeight / (heightM * heightM)) * 10) / 10;
  const previewBmr =
    gender === 'MALE'
      ? Math.round(10 * numWeight + 6.25 * numHeight - 5 * numAge + 5)
      : Math.round(10 * numWeight + 6.25 * numHeight - 5 * numAge - 161);

  const multipliers: Record<string, number> = {
    SEDENTARY: 1.2,
    LIGHTLY_ACTIVE: 1.375,
    MODERATELY_ACTIVE: 1.55,
    VERY_ACTIVE: 1.725,
    EXTRA_ACTIVE: 1.9,
  };
  const previewTdee = Math.round(previewBmr * (multipliers[activityLevel] || 1.55));
  let previewTargetCalories = previewTdee;
  if (fitnessGoal === 'WEIGHT_LOSS') {
    previewTargetCalories = Math.max(gender === 'MALE' ? 1500 : 1200, previewTdee - 500);
  } else if (fitnessGoal === 'MUSCLE_GAIN') {
    previewTargetCalories = previewTdee + 350;
  }
  const previewProtein = Math.round(numWeight * (fitnessGoal === 'MUSCLE_GAIN' ? 2.0 : 1.8));
  const previewFat = Math.round((previewTargetCalories * 0.25) / 9);
  const previewCarbs = Math.max(50, Math.round((previewTargetCalories - (previewProtein * 4 + previewFat * 9)) / 4));

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!memberId) {
        setError('Please select a gym member');
        return;
      }
      const numA = Number(age);
      if (!numA || numA < 12 || numA > 95) {
        setError('Age must be between 12 and 95');
        return;
      }
      const numH = Number(heightCm);
      if (!numH || numH < 100 || numH > 240) {
        setError('Height must be between 100cm and 240cm');
        return;
      }
      const numW = Number(currentWeightKg);
      if (!numW || numW < 30 || numW > 250) {
        setError('Weight must be between 30kg and 250kg');
        return;
      }
    }
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        memberId,
        age: Number(age),
        gender,
        heightCm: Number(heightCm),
        currentWeightKg: Number(currentWeightKg),
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        fitnessExperience,
        fitnessGoal,
        activityLevel,
        preferredWorkoutTime,
        workoutDaysPerWeek: Number(workoutDaysPerWeek),
        workoutDurationMins: Number(workoutDurationMins),
        availableEquipment,
        exerciseLimitations: exerciseLimitations
          ? exerciseLimitations.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        dietaryPreference,
        allergies: allergies
          ? allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        likedFoods: likedFoods
          ? likedFoods.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        dislikedFoods: dislikedFoods
          ? dislikedFoods.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        mealsPerDay: Number(mealsPerDay),
        foodBudget,
        foodPreparationPreference,
        sleepDurationHours: Number(sleepDurationHours),
        dailyStepsTarget: Number(dailyStepsTarget),
        notes,
      };

      const res = await api.saveFitnessProfile(payload);
      onSaved(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save fitness profile');
    } finally {
      setSaving(false);
    }
  };

  const selectedMemberObj = members.find((m) => m._id === memberId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {initialProfile ? 'Edit Member Fitness Profile' : 'New Member Fitness Profile Wizard'}
              </h3>
              <p className="text-xs text-slate-500">
                Sagar Fitness Gym — Deterministic Nutrition & Training Profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Step Progress Tracker */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold">
          {[
            { num: 1, title: 'Demographics' },
            { num: 2, title: 'Workout Schedule' },
            { num: 3, title: 'Dietary & Lifestyle' },
            { num: 4, title: 'Review & Calculations' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s.num
                    ? 'bg-blue-600 text-white shadow-xs'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`hidden sm:inline ${step === s.num ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: DEMOGRAPHICS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gym Member <span className="text-rose-500">*</span>
                </label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  disabled={Boolean(initialProfile)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Choose Member from Sagar Fitness Records --</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.fullName} ({m.memberId}) — {m.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Biological Gender <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('MALE')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        gender === 'MALE'
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Male (MSJ +5)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('FEMALE')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        gender === 'FEMALE'
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Female (MSJ -161)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Age (Years) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={12}
                    max={95}
                    value={age}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setAge(val === '' ? '' : parseInt(val) || 0);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Height (cm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={240}
                    value={heightCm}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setHeightCm(val === '' ? '' : parseFloat(val) || 0);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Current Weight (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={30}
                    max={250}
                    value={currentWeightKg}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setCurrentWeightKg(val === '' ? '' : parseFloat(val) || 0);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={30}
                    max={250}
                    value={targetWeightKg}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setTargetWeightKg(val === '' ? '' : parseFloat(val) || 0);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: WORKOUT & SCHEDULE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fitness Goal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="WEIGHT_LOSS">Fat Loss / Weight Reduction (-500 kcal)</option>
                    <option value="MUSCLE_GAIN">Hypertrophy / Muscle Building (+350 kcal)</option>
                    <option value="MAINTENANCE">Maintenance / Healthy Balance</option>
                    <option value="STRENGTH">Strength & Powerlifting Focus</option>
                    <option value="ENDURANCE">Endurance & Cardiovascular Stamina</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Experience Level <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={fitnessExperience}
                    onChange={(e) => setFitnessExperience(e.target.value as FitnessExperience)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="BEGINNER">Beginner (0 – 6 months gym experience)</option>
                    <option value="INTERMEDIATE">Intermediate (6 – 24 months consistency)</option>
                    <option value="ADVANCED">Advanced (2+ years dedicated training)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Activity Level (PAL)
                  </label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="SEDENTARY">Sedentary (Desk Job, little exercise)</option>
                    <option value="LIGHTLY_ACTIVE">Lightly Active (1-3 days gym)</option>
                    <option value="MODERATELY_ACTIVE">Moderately Active (3-5 days gym)</option>
                    <option value="VERY_ACTIVE">Very Active (6-7 days intense)</option>
                    <option value="EXTRA_ACTIVE">Extra Active (Labor + Athletics)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Days / Week
                  </label>
                  <select
                    value={workoutDaysPerWeek}
                    onChange={(e) => setWorkoutDaysPerWeek(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value={3}>3 Days (Full Body Split)</option>
                    <option value={4}>4 Days (Upper / Lower Split)</option>
                    <option value={5}>5 Days (Push / Pull / Legs / Upper)</option>
                    <option value={6}>6 Days (PPL x 2 Split)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Equipment Access
                  </label>
                  <select
                    value={availableEquipment}
                    onChange={(e) => setAvailableEquipment(e.target.value as AvailableEquipment)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="FULL_GYM">Sagar Fitness Full Gym (Commercial Equipment)</option>
                    <option value="DUMBBELLS_ONLY">Dumbbells & Bench Only</option>
                    <option value="BODYWEIGHT_HOME">Home Bodyweight / Calisthenics</option>
                    <option value="RESISTANCE_BANDS">Resistance Bands Setup</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Physical / Exercise Limitations (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Knee pain with heavy squats, Lower back sensitivity"
                  value={exerciseLimitations}
                  onChange={(e) => setExerciseLimitations(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Our algorithm will automatically substitute exercises that strain declared sensitive joints.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: DIETARY PREFERENCES & LIFESTYLE */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Dietary Preference <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={dietaryPreference}
                    onChange={(e) => setDietaryPreference(e.target.value as DietaryPreference)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="VEGETARIAN">Vegetarian (Dairy, pulses, grains)</option>
                    <option value="NON_VEGETARIAN">Non-Vegetarian (Chicken, fish, eggs, dairy)</option>
                    <option value="EGGETARIAN">Eggetarian (Vegetarian + Eggs)</option>
                    <option value="VEGAN">Vegan (Plant-based, 100% dairy-free)</option>
                    <option value="JAIN">Jain (Vegetarian, no root vegetables, strict satvic)</option>
                    <option value="OTHER">Other Custom Guidelines</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Meals Per Day
                  </label>
                  <select
                    value={mealsPerDay}
                    onChange={(e) => setMealsPerDay(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value={3}>3 Meals (Breakfast, Lunch, Dinner)</option>
                    <option value={4}>4 Meals (Breakfast, Lunch, Snack, Dinner)</option>
                    <option value={5}>5 Meals (Frequent small feedings)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Food Allergies & Intolerances (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Lactose / Dairy, Gluten, Soy"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  Safety guarantee: Declared allergens are permanently excluded from meal proposals.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Disliked Foods (Excluded)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karela, Baingan, Seafood"
                    value={dislikedFoods}
                    onChange={(e) => setDislikedFoods(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Liked Foods (Preferred)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paneer, Poha, Curd, Dal"
                    value={likedFoods}
                    onChange={(e) => setLikedFoods(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Food Budget Preference
                  </label>
                  <select
                    value={foodBudget}
                    onChange={(e) => setFoodBudget(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="BUDGET">Budget-Friendly (Local grocery, seasonal Indian produce)</option>
                    <option value="MODERATE">Moderate / Standard</option>
                    <option value="PREMIUM">Premium / Imported groceries</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sleep Duration (Hours / Night)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={4}
                    max={12}
                    value={sleepDurationHours}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setSleepDurationHours(val === '' ? '' : parseFloat(val) || 0);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & DETERMINISTIC CALCULATION SNAPSHOT */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Mifflin-St Jeor Deterministic Baseline
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-600 text-white rounded-full">
                    Validated Scientific Estimate
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">BMR</span>
                    <span className="text-base font-extrabold text-slate-800">{previewBmr}</span>
                    <span className="text-[10px] text-slate-400 block">kcal/day</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">TDEE</span>
                    <span className="text-base font-extrabold text-blue-600">{previewTdee}</span>
                    <span className="text-[10px] text-slate-400 block">kcal/day</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Target Calories</span>
                    <span className="text-base font-extrabold text-emerald-600">{previewTargetCalories}</span>
                    <span className="text-[10px] text-slate-400 block">kcal/day</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Est. BMI</span>
                    <span className="text-base font-extrabold text-purple-600">{previewBmi}</span>
                    <span className="text-[10px] text-slate-400 block">kg/m²</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-blue-200/60 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg font-bold">
                    Protein: {previewProtein}g ({previewProtein * 4} kcal)
                  </div>
                  <div className="bg-amber-50 text-amber-800 p-2 rounded-lg font-bold">
                    Carbs: {previewCarbs}g ({previewCarbs * 4} kcal)
                  </div>
                  <div className="bg-rose-50 text-rose-800 p-2 rounded-lg font-bold">
                    Fats: {previewFat}g ({previewFat * 9} kcal)
                  </div>
                </div>
              </div>

              {/* Profile Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Selected Member:</span>
                  <span className="font-bold text-slate-800">
                    {selectedMemberObj?.fullName || 'N/A'} ({selectedMemberObj?.memberId})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Dietary Preference:</span>
                  <span className="font-bold text-slate-800">{dietaryPreference}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Screened Allergens:</span>
                  <span className="font-bold text-rose-600">
                    {allergies ? allergies : 'None declared'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Training Regimen:</span>
                  <span className="font-bold text-slate-800">
                    {workoutDaysPerWeek} Days/week • {workoutDurationMins} mins • {fitnessExperience}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Physical Limitations:</span>
                  <span className="font-bold text-amber-700">
                    {exerciseLimitations ? exerciseLimitations : 'None reported'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              Continue to Step {step + 1}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Fitness Profile to Database
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
