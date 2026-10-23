import React, { useState, useEffect } from 'react';
import {
  X,
  Dumbbell,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Clock,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../api/client';
import { Member, WorkoutPlan, WorkoutDaySchedule, WorkoutExercise } from '../../types';

interface WorkoutPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (plan: WorkoutPlan) => void;
  initialPlan?: WorkoutPlan | null;
  members: Member[];
  preselectedMemberId?: string;
}

export const WorkoutPlanModal: React.FC<WorkoutPlanModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialPlan,
  members,
  preselectedMemberId,
}) => {
  const [name, setName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('GENERAL_FITNESS');
  const [experienceLevel, setExperienceLevel] = useState('BEGINNER');
  const [availableEquipment, setAvailableEquipment] = useState('FULL_GYM');
  const [daysPerWeek, setDaysPerWeek] = useState<number | string>(4);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [schedule, setSchedule] = useState<WorkoutDaySchedule[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (initialPlan) {
      setName(initialPlan.name);
      setMemberId(typeof initialPlan.member === 'object' ? initialPlan.member._id : initialPlan.member);
      setFitnessGoal(initialPlan.fitnessGoal || 'GENERAL_FITNESS');
      setExperienceLevel(initialPlan.experienceLevel || 'BEGINNER');
      setAvailableEquipment(initialPlan.availableEquipment || 'FULL_GYM');
      setDaysPerWeek(initialPlan.daysPerWeek || 4);
      setSchedule(initialPlan.schedule || []);
      setNotes(initialPlan.notes || '');
    } else {
      setName('Custom 7-Day Workout Routine');
      setMemberId(preselectedMemberId || (members[0]?._id ?? ''));
      setFitnessGoal('GENERAL_FITNESS');
      setExperienceLevel('BEGINNER');
      setAvailableEquipment('FULL_GYM');
      setDaysPerWeek(4);
      setSchedule(
        defaultDays.map((day, idx) => ({
          dayName: day,
          workoutTitle: idx % 2 === 0 ? 'Compound Training Session' : 'Active Rest & Recovery',
          isRestDay: idx % 2 !== 0,
          targetMuscleGroups: idx % 2 === 0 ? ['Full Body'] : ['Recovery'],
          warmUp: '5 mins light treadmill + arm & leg dynamic circles',
          coolDown: '5 mins full body static stretches',
          estimatedDurationMins: idx % 2 === 0 ? 50 : 0,
          exercises: idx % 2 === 0 ? [
            {
              exerciseName: 'Dumbbell / Barbell Press',
              targetMuscle: 'Chest',
              sets: 3,
              reps: '10-12',
              restSeconds: 60,
              techniqueNotes: 'Maintain controlled tempo.',
              alternatives: ['Push-ups'],
              estimatedCaloriesBurned: 70,
            },
          ] : [],
        }))
      );
      setNotes('');
    }
    setActiveDayIndex(0);
    setError(null);
  }, [initialPlan, preselectedMemberId, isOpen]);

  if (!isOpen) return null;

  const currentDay = schedule[activeDayIndex] || schedule[0];

  const updateCurrentDay = (updates: Partial<WorkoutDaySchedule>) => {
    setSchedule((prev) =>
      prev.map((d, idx) => (idx === activeDayIndex ? { ...d, ...updates } : d))
    );
  };

  const handleAddExercise = () => {
    const newEx: WorkoutExercise = {
      exerciseName: 'New Exercise',
      targetMuscle: 'Muscle Group',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      techniqueNotes: '',
      alternatives: [],
      estimatedCaloriesBurned: 50,
    };
    updateCurrentDay({
      exercises: [...(currentDay.exercises || []), newEx],
    });
  };

  const handleUpdateExercise = (exIdx: number, updates: Partial<WorkoutExercise>) => {
    const updated = (currentDay.exercises || []).map((ex, i) =>
      i === exIdx ? { ...ex, ...updates } : ex
    );
    updateCurrentDay({ exercises: updated });
  };

  const handleRemoveExercise = (exIdx: number) => {
    const updated = (currentDay.exercises || []).filter((_, i) => i !== exIdx);
    updateCurrentDay({ exercises: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!name.trim()) throw new Error('Routine name is required');
      if (!memberId) throw new Error('Please select a member');

      const payload = {
        name,
        member: memberId,
        fitnessGoal,
        experienceLevel,
        availableEquipment,
        daysPerWeek: Number(daysPerWeek),
        schedule,
        notes,
      };

      let res: any;
      if (initialPlan?._id) {
        res = await api.updateWorkoutPlan(initialPlan._id, payload);
      } else {
        res = await api.createWorkoutPlan(payload);
      }
      onSaved(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save workout routine');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {initialPlan ? 'Edit Workout Plan Routine' : 'Create 7-Day Workout Routine'}
              </h3>
              <p className="text-xs text-slate-500">
                Sagar Fitness Gym — Structured Strength & Conditioning Regimen
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Plan Routine Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gym Member <span className="text-rose-500">*</span>
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              >
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullName} ({m.memberId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Goal</label>
              <select
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="GENERAL_FITNESS">General Fitness</option>
                <option value="WEIGHT_LOSS">Fat Loss</option>
                <option value="MUSCLE_GAIN">Hypertrophy</option>
                <option value="STRENGTH">Max Strength</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Experience</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Equipment</label>
              <select
                value={availableEquipment}
                onChange={(e) => setAvailableEquipment(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="FULL_GYM">Sagar Full Gym</option>
                <option value="DUMBBELLS_ONLY">Dumbbells Only</option>
                <option value="BODYWEIGHT_HOME">Bodyweight</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Training Days/Week</label>
              <input
                type="number"
                min={2}
                max={7}
                value={daysPerWeek}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value.replace(/^0+(?=\d)/, '');
                  setDaysPerWeek(val === '' ? '' : parseInt(val));
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
          </div>

          {/* 7-Day Day Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
            {schedule.map((d, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeDayIndex === idx
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : d.isRestDay
                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                {d.dayName} {d.isRestDay ? '(Rest)' : ''}
              </button>
            ))}
          </div>

          {/* Active Day Details */}
          {currentDay && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Day Title ({currentDay.dayName})
                  </label>
                  <input
                    type="text"
                    value={currentDay.workoutTitle}
                    onChange={(e) => updateCurrentDay({ workoutTitle: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentDay.isRestDay}
                      onChange={(e) => updateCurrentDay({ isRestDay: e.target.checked })}
                      className="rounded text-purple-600"
                    />
                    <span>Mark as Rest Day</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={currentDay.estimatedDurationMins}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, '');
                        updateCurrentDay({ estimatedDurationMins: val === '' ? 0 : parseInt(val) || 0 });
                      }}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center text-xs"
                    />
                    <span className="text-slate-500">mins</span>
                  </div>
                </div>
              </div>

              {!currentDay.isRestDay ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Warm-up (5-10m)</label>
                      <input
                        type="text"
                        value={currentDay.warmUp || ''}
                        onChange={(e) => updateCurrentDay({ warmUp: e.target.value })}
                        placeholder="e.g. 5 mins incline walk + arm circles, band pull-aparts"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Cool-down (5m)</label>
                      <input
                        type="text"
                        value={currentDay.coolDown || ''}
                        onChange={(e) => updateCurrentDay({ coolDown: e.target.value })}
                        placeholder="e.g. 5 mins static stretching for chest, shoulders, lats"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Exercises Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Exercises ({currentDay.exercises?.length || 0})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddExercise}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Exercise
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(currentDay.exercises || []).map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                        >
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-slate-400 font-bold uppercase">Exercise Name</label>
                            <input
                              type="text"
                              value={ex.exerciseName}
                              onChange={(e) => handleUpdateExercise(exIdx, { exerciseName: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-slate-800 font-bold"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 font-bold uppercase">Muscle</label>
                            <input
                              type="text"
                              value={ex.targetMuscle}
                              onChange={(e) => handleUpdateExercise(exIdx, { targetMuscle: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-slate-700"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="block text-[10px] text-slate-400 font-bold uppercase">Sets</label>
                            <input
                              type="number"
                              min={1}
                              value={ex.sets}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+(?=\d)/, '');
                                handleUpdateExercise(exIdx, { sets: val === '' ? 1 : parseInt(val) || 1 });
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-center font-bold"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 font-bold uppercase">Reps</label>
                            <input
                              type="text"
                              value={ex.reps}
                              onChange={(e) => handleUpdateExercise(exIdx, { reps: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 font-bold uppercase">Rest (sec)</label>
                            <input
                              type="number"
                              value={ex.restSeconds}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+(?=\d)/, '');
                                handleUpdateExercise(exIdx, { restSeconds: val === '' ? 0 : parseInt(val) || 0 });
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(exIdx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="sm:col-span-12">
                            <input
                              type="text"
                              value={ex.techniqueNotes || ''}
                              onChange={(e) => handleUpdateExercise(exIdx, { techniqueNotes: e.target.value })}
                              placeholder="Technique notes / cues (e.g. pause 1s at bottom, avoid swinging)"
                              className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded text-slate-600"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Rest & Muscle Regeneration day. No intense lifting scheduled. Focus on hydration, mobility, and recovery.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Workout Plan
          </button>
        </div>
      </div>
    </div>
  );
};
