import React, { useState, useEffect } from 'react';
import { X, Scale, Check, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { Member } from '../../types';

interface WeightProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMember?: Member | null;
}

export const WeightProgressModal: React.FC<WeightProgressModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultMember,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [waist, setWaist] = useState<number | ''>('');
  const [chest, setChest] = useState<number | ''>('');
  const [arms, setArms] = useState<number | ''>('');
  const [hips, setHips] = useState<number | ''>('');
  const [bodyFat, setBodyFat] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch members for selection if not preselected
  useEffect(() => {
    if (defaultMember) {
      setSelectedMemberId(defaultMember._id);
    } else {
      api.getMembers({ limit: 100 }).then((res: any) => {
        setMembers(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedMemberId(res.data[0]._id);
        }
      });
    }
  }, [defaultMember, isOpen]);

  if (!isOpen) return null;

  // Live BMI calculation
  let calculatedBmi: number | null = null;
  let bmiCategory = '';
  if (weight && height && Number(height) > 0 && Number(weight) > 0) {
    const heightM = Number(height) / 100;
    calculatedBmi = Number((Number(weight) / (heightM * heightM)).toFixed(1));
    if (calculatedBmi < 18.5) bmiCategory = 'Underweight';
    else if (calculatedBmi < 25) bmiCategory = 'Normal Healthy Weight';
    else if (calculatedBmi < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese Range';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError('Please select a member');
      return;
    }
    if (!weight || Number(weight) < 20 || Number(weight) > 350) {
      setError('Please provide a valid body weight between 20 kg and 350 kg');
      return;
    }

    try {
      setSubmitting(true);
      await api.recordMemberProgress(selectedMemberId, {
        date,
        weight: Number(weight),
        height: height ? Number(height) : undefined,
        waist: waist ? Number(waist) : undefined,
        chest: chest ? Number(chest) : undefined,
        arms: arms ? Number(arms) : undefined,
        hips: hips ? Number(hips) : undefined,
        bodyFat: bodyFat ? Number(bodyFat) : undefined,
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record progress entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Record Weight & Measurements</h2>
              <p className="text-xs text-slate-500">Track physique & body composition progression</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Gym Member <span className="text-red-500">*</span>
            </label>
            {defaultMember ? (
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{defaultMember.fullName} ({defaultMember.memberId})</span>
                <span className="text-slate-500 font-normal">{defaultMember.phone}</span>
              </div>
            ) : (
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Member --</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullName} ({m.memberId}) — {m.phone}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Measurement Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Body Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="350"
                required
                value={weight}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 74.5"
                className="w-full px-3 py-2 text-xs font-bold text-blue-700 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Height (cm) (Optional, for BMI)
              </label>
              <input
                type="number"
                step="0.5"
                min="50"
                max="280"
                value={height}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 175"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Live BMI Display */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  Body Mass Index (BMI)
                </span>
                <span className="text-xs text-blue-700 font-semibold">
                  {calculatedBmi ? `${calculatedBmi} — ${bmiCategory}` : 'Enter height to compute'}
                </span>
              </div>
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
          </div>

          {/* Body Circumferences */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Circumference & Composition (Optional)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Waist (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 82"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chest (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={chest}
                  onChange={(e) => setChest(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 98"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Arms (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={arms}
                  onChange={(e) => setArms(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 38"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Body Fat (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="3"
                  max="60"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 15.5"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Progress Notes / Check-In Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Strength increased on bench press, energy high, strict adherence to diet..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving Progress...' : 'Record Progress'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
