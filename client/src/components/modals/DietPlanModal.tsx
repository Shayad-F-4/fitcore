import React, { useState, useEffect } from 'react';
import {
  X,
  Utensils,
  Check,
  AlertCircle,
  Flame,
  Scale,
} from 'lucide-react';
import { api } from '../../api/client';
import { DietPlan, Member, FitnessGoal } from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { sendWhatsAppDietPlan } from '../../utils/whatsapp';

interface DietPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plan?: any) => void;
  planToEdit?: DietPlan | null;
  defaultMember?: Member | null;
  initialTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
    goal: FitnessGoal;
  } | null;
}

const SAMPLE_TEMPLATES = {
  WEIGHT_LOSS: `Subah (08:30 AM - Breakfast): 3 boiled eggs (or 1 bowl oats with skimmed milk + 5 almonds).
Dopahar (01:30 PM - Lunch): 2 multigrain roti, 1 bowl dal/pulses, green seasonal sabzi, big bowl fresh salad with cucumber & tomato.
Sham (05:30 PM - Snack): Green tea with roasted chana / 1 fruit (apple or papaya).
Raat (08:30 PM - Dinner): 150g grilled paneer / chicken with mixed vegetable soup. Light dinner before 8:30 PM.

Rules & Guidelines: Drink 3-4 liters water daily. Strictly avoid processed sugar, soft drinks, oily fried snacks, and junk food after 8 PM.`,

  MUSCLE_GAIN: `Subah (08:00 AM - Breakfast): 4 eggs (2 whole + 2 whites) with brown bread / peanut butter & banana oats smoothie.
Dopahar (01:30 PM - Lunch): 1 bowl brown/white rice, 2 roti, 150g paneer/chicken/tofu, thick dal, fresh curd & salad.
Sham (05:00 PM - Pre-Workout Snack): 1 banana + black coffee or 1 sweet potato.
Post-Workout (07:00 PM): 1 scoop whey protein or sattu drink with water.
Raat (08:30 PM - Dinner): 3 roti, dal/soya chunks, steamed vegetables & warm turmeric milk before sleeping.

Rules & Guidelines: Stay hydrated with 4 liters water daily. Aim for 7-8 hours deep sleep every night for muscular recovery.`,

  PURE_VEG: `Subah (08:30 AM - Breakfast): Moong dal chilla / paneer bhurji with 1 glass milk & 5 soaked almonds.
Dopahar (01:30 PM - Lunch): 2 roti, 1 cup cooked dal, fresh buttermilk, seasonal green sabzi & raw salad.
Sham (05:30 PM - Snack): Sprouted moong salad / roasted makhana with coconut water.
Raat (08:30 PM - Dinner): Soya chunks / paneer curry with 1-2 roti or vegetable daliya/khichdi.

Rules & Guidelines: Drink 3-4 liters water throughout the day. Avoid refined sugar and deep-fried snacks.`,
};

export const DietPlanModal: React.FC<DietPlanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  planToEdit,
  defaultMember,
  initialTargets,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [name, setName] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('WEIGHT_LOSS');
  const [currentWeightKg, setCurrentWeightKg] = useState<number | string>(75);
  const [targetWeightKg, setTargetWeightKg] = useState<number | string>(70);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [targetCalories, setTargetCalories] = useState<number | string>(2000);
  const [targetProtein, setTargetProtein] = useState<number | string>(140);
  const [targetCarbs, setTargetCarbs] = useState<number | string>(180);
  const [targetFat, setTargetFat] = useState<number | string>(55);
  const [waterIntakeLiters, setWaterIntakeLiters] = useState<number | string>(3.5);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'COMPLETED'>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to prevent leading zeroes when user clears or edits number fields
  const handleNumericInput = (setter: React.Dispatch<React.SetStateAction<number | string>>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value;
    if (val === '') {
      setter('');
      return;
    }
    const sanitized = val.replace(/^0+(?=\d)/, '');
    setter(sanitized);
  };

  useEffect(() => {
    api.getMembers({ limit: 100 }).then((res: any) => setMembers(res.data || []));
  }, []);

  useEffect(() => {
    if (planToEdit) {
      setSelectedMemberId((planToEdit.member as any)?._id || (planToEdit.member as any));
      setName(planToEdit.name);
      setFitnessGoal(planToEdit.fitnessGoal);
      setStartDate(planToEdit.startDate ? new Date(planToEdit.startDate).toISOString().split('T')[0] : '');
      setEndDate(planToEdit.endDate ? new Date(planToEdit.endDate).toISOString().split('T')[0] : '');
      setTargetCalories(planToEdit.targetCalories);
      setTargetProtein(planToEdit.targetProtein);
      setTargetCarbs(planToEdit.targetCarbs);
      setTargetFat(planToEdit.targetFat);
      setWaterIntakeLiters(planToEdit.waterIntakeLiters || 3.5);
      setStatus(planToEdit.status as any || 'ACTIVE');
      setNotes(planToEdit.notes || '');
    } else {
      if (defaultMember) {
        setSelectedMemberId(defaultMember._id);
        setName(`${defaultMember.fullName} — Nutrition Protocol`);
      } else {
        setSelectedMemberId('');
        setName('');
      }

      if (initialTargets) {
        setTargetCalories(initialTargets.calories);
        setTargetProtein(initialTargets.protein);
        setTargetCarbs(initialTargets.carbs);
        setTargetFat(initialTargets.fat);
        setWaterIntakeLiters(initialTargets.water);
        setFitnessGoal(initialTargets.goal);
      } else {
        setFitnessGoal('WEIGHT_LOSS');
        setTargetCalories(2000);
        setTargetProtein(140);
        setTargetCarbs(180);
        setTargetFat(55);
        setWaterIntakeLiters(3.5);
      }

      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setStatus('ACTIVE');
      setNotes(SAMPLE_TEMPLATES.WEIGHT_LOSS);
    }
    setError(null);
  }, [planToEdit, defaultMember, initialTargets, isOpen]);

  const handleMemberChange = (mId: string) => {
    setSelectedMemberId(mId);
    const m = members.find((x) => x._id === mId);
    if (m) {
      setName(`${m.fullName} — Nutrition Protocol`);
    }
  };

  const handleApplyTemplate = (type: 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'PURE_VEG') => {
    setNotes(SAMPLE_TEMPLATES[type]);
    if (type === 'WEIGHT_LOSS') {
      setFitnessGoal('WEIGHT_LOSS');
      setTargetCalories(1800);
      setTargetProtein(130);
      setTargetCarbs(150);
      setTargetFat(45);
    } else if (type === 'MUSCLE_GAIN') {
      setFitnessGoal('MUSCLE_GAIN');
      setTargetCalories(2600);
      setTargetProtein(160);
      setTargetCarbs(260);
      setTargetFat(65);
    } else if (type === 'PURE_VEG') {
      setFitnessGoal('MAINTENANCE');
      setTargetCalories(2100);
      setTargetProtein(120);
      setTargetCarbs(220);
      setTargetFat(55);
    }
  };

  if (!isOpen) return null;

  const handleSendToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError('Please select a member first');
      return;
    }

    const memberObj = members.find((m) => m._id === selectedMemberId);
    if (!memberObj) {
      setError('Selected member not found');
      return;
    }

    if (!memberObj.phone) {
      setError(`Member ${memberObj.fullName} does not have a mobile number recorded.`);
      return;
    }

    const planTitle = name.trim() || `${memberObj.fullName} — Daily Diet Protocol`;

    sendWhatsAppDietPlan({
      memberName: memberObj.fullName,
      phone: memberObj.phone,
      planName: planTitle,
      fitnessGoal,
      dailyCalories: Number(targetCalories) || 2000,
      dailyProtein: Number(targetProtein) || 120,
      dailyCarbs: Number(targetCarbs) || 180,
      dailyFat: Number(targetFat) || 50,
      waterIntakeLiters: Number(waterIntakeLiters) || 3.5,
      notes: notes.trim(),
      meals: [],
    });

    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const selectedMemberObj = members.find((m) => m._id === selectedMemberId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-lime-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Send Member Diet & Nutrition Protocol
              </h3>
              <p className="text-xs text-slate-500">
                Sagar Fitness Gym, Pathardi — Direct WhatsApp Guidelines & Targets (No Database Saving)
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

        {/* Modal Form */}
        <form onSubmit={handleSendToWhatsApp} className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Member & Bodyweight Info */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                1. Member Particulars & Bodyweight Goals
              </span>
              {selectedMemberObj && (
                <span className="text-[11px] text-emerald-700 font-semibold">
                  ID: {selectedMemberObj.memberId} • Phone: {selectedMemberObj.phone}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Gym Member <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Member from Sagar Fitness Records --</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.fullName} ({m.memberId}) — {m.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Plan Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Swapnil Shinde — Nutrition Protocol"
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fitness Goal
                </label>
                <select
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value as FitnessGoal)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md"
                >
                  <option value="WEIGHT_LOSS">Fat Loss / Weight Reduction</option>
                  <option value="MUSCLE_GAIN">Muscle Gain / Hypertrophy</option>
                  <option value="MAINTENANCE">Healthy Maintenance</option>
                  <option value="ENDURANCE">Athletic Stamina</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Current Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="30"
                  max="250"
                  value={currentWeightKg}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumericInput(setCurrentWeightKg)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-md text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="30"
                  max="250"
                  value={targetWeightKg}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumericInput(setTargetWeightKg)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-slate-300 rounded-md text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md"
                >
                  <option value="ACTIVE">Active (Assigned to Member)</option>
                  <option value="INACTIVE">Draft / Inactive</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Daily Calorie & Hydration Targets */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                2. Daily Calorie & Nutrition Targets
              </span>
              <span className="text-[11px] text-slate-500">
                Core daily numbers prescribed by trainer
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-amber-800 mb-1">
                  Target Calories (kcal) *
                </label>
                <input
                  type="number"
                  min="500"
                  required
                  value={targetCalories}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumericInput(setTargetCalories)}
                  className="w-full px-2.5 py-1.5 text-xs font-black text-amber-700 bg-white border-2 border-amber-300 rounded-md focus:border-amber-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-cyan-800 mb-1">
                  Water (Liters/day)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={waterIntakeLiters}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumericInput(setWaterIntakeLiters)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-cyan-700 bg-white border border-slate-300 rounded-md text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-blue-700 mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetProtein}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumericInput(setTargetProtein)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-white border border-slate-300 rounded-md text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetCarbs}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumericInput(setTargetCarbs)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-slate-300 rounded-md text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                  Fat (g)
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetFat}
                  onFocus={(e) => e.target.select()}
                  onChange={handleNumericInput(setTargetFat)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-white border border-slate-300 rounded-md text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Diet Schedule & What to Eat in One Clean Paragraph */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Daily Diet Schedule & Meal Guidelines (Kya Khana Hai)
                </label>
                <p className="text-[11px] text-slate-500">
                  Write what to eat and meal routine in one paragraph. This will be sent directly to member's WhatsApp.
                </p>
              </div>

              {/* Quick Template Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Samples:</span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('WEIGHT_LOSS')}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                >
                  ⚡ Fat Loss Sample
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('MUSCLE_GAIN')}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors"
                >
                  💪 Muscle Bulk Sample
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('PURE_VEG')}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                >
                  🥗 Pure Veg Sample
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Subah: 3 boiled eggs ya oats with milk. Dopahar: 2 roti, dal, sabzi, salad. Sham: 1 fruit aur green tea. Raat: 150g paneer ya chicken soup. Drink 3-4 liters water daily..."
              className="w-full px-3.5 py-3 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed font-sans shadow-2xs"
            />
          </div>

          {/* Modal Actions: Only Close and Send to WhatsApp */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Send to WhatsApp</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
