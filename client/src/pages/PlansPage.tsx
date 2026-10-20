import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api } from '../api/client';
import { MembershipPlan } from '../types';
import { formatINR } from '../utils/formatters';

const DEFAULT_PLANS: MembershipPlan[] = [
  {
    _id: 'plan-1',
    name: 'Monthly General Fitness',
    type: 'MONTHLY',
    durationDays: 30,
    price: 1500,
    description: 'Unlimited access to gym floor, cardio equipment, and locker rooms.',
    features: ['Gym Access', 'Cardio Deck', 'Locker Room'],
    active: true,
  },
  {
    _id: 'plan-2',
    name: 'Quarterly Strength & Cardio',
    type: 'QUARTERLY',
    durationDays: 90,
    price: 4000,
    description: 'Standard 3-month package with gym access and free orientation session.',
    features: ['Gym Access', 'Orientation Session', 'Cardio & Strength'],
    active: true,
  },
  {
    _id: 'plan-3',
    name: 'Half-Yearly Transform Pro',
    type: 'HALF_YEARLY',
    durationDays: 180,
    price: 7500,
    description: '6-month comprehensive fitness pass with bi-weekly trainer consultations.',
    features: ['Gym Access', 'Trainer Consultations', 'Diet Support'],
    active: true,
  },
  {
    _id: 'plan-4',
    name: 'Annual Elite All-Access',
    type: 'ANNUAL',
    durationDays: 365,
    price: 13500,
    description: 'Complete 1-year unlimited access across all training zones.',
    features: ['VIP Locker', 'Unlimited Zones', 'Diet & Body Composition'],
    active: true,
  },
  {
    _id: 'plan-5',
    name: 'Personal Training & Cross-Training',
    type: 'PT_PACKAGE',
    durationDays: 30,
    price: 6000,
    description: '1-on-1 personal training sessions with certified fitness coach.',
    features: ['1-on-1 Coach', 'Custom Workouts', 'Nutrition Tracking'],
    active: false,
  },
];

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPlan, setEditPlan] = useState<MembershipPlan | null>(null);

  const fetchPlans = async (bypassCache = false) => {
    try {
      setLoading(true);
      const res = await api.getPlans(false, bypassCache);
      if (Array.isArray(res) && res.length > 0) {
        setPlans(res);
      } else {
        setPlans(DEFAULT_PLANS);
      }
    } catch {
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();

    const handleDataChanged = () => {
      fetchPlans(true);
    };

    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, []);

  const handleToggleStatus = async (plan: MembershipPlan) => {
    setActionError(null);
    setActionSuccess(null);
    const previousActiveState = plan.active;
    const newActiveState = !previousActiveState;

    // 1. Instant optimistic update so badge and button update immediately ("turant")
    setPlans((prev) =>
      prev.map((p) => (p._id === plan._id ? { ...p, active: newActiveState } : p))
    );

    try {
      const res = await api.togglePlanStatus(plan._id);
      if (res && res._id) {
        setPlans((prev) =>
          prev.map((p) => (p._id === res._id ? { ...p, active: res.active } : p))
        );
      }
      setActionSuccess(`Plan "${plan.name}" ${newActiveState ? 'activated' : 'deactivated'} successfully.`);
    } catch (err: any) {
      // Revert if API fails
      setPlans((prev) =>
        prev.map((p) => (p._id === plan._id ? { ...p, active: previousActiveState } : p))
      );
      setActionError(err.message || `Failed to update status for "${plan.name}".`);
    }
  };

  const handleDeletePlan = async (plan: MembershipPlan) => {
    setActionError(null);
    setActionSuccess(null);
    const confirmed = window.confirm(
      `Are you sure you want to delete the plan "${plan.name}"?\n\nThis will permanently remove this plan. If members are currently subscribed to it, deletion will be blocked.`
    );
    if (!confirmed) return;

    // Optimistic removal
    setPlans((prev) => prev.filter((p) => p._id !== plan._id));

    try {
      await api.deletePlan(plan._id);
      setActionSuccess(`Plan "${plan.name}" deleted successfully.`);
    } catch (err: any) {
      fetchPlans(true);
      setActionError(err.message || `Failed to delete plan "${plan.name}".`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#202124] tracking-tight">
            Membership Plans
          </h2>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Configure subscription plans, durations, and pricing.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2.5 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20 shrink-0 self-start sm:self-auto"
        >
          <div className="w-5.5 h-5.5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Plus className="w-3.5 h-3.5 text-white" />
          </div>
          <span>Add Membership Plan</span>
        </button>
      </div>

      {/* Action Success / Error Notifications */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-3.5 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#6B7280]">
            Loading membership plans...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#6B7280]">
            No membership plans found. Click &quot;+ Add Plan&quot; to create your first plan.
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Plan</th>
                    <th className="px-5 py-3.5">Duration</th>
                    <th className="px-5 py-3.5">Price</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map((plan) => (
                    <tr key={plan._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Plan Name & Description */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{plan.name}</div>
                        {plan.description && (
                          <div className="text-xs text-slate-500 mt-0.5 max-w-sm truncate">
                            {plan.description}
                          </div>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-700">
                        {plan.durationDays} days
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {formatINR(plan.price)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5">
                        {plan.active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => setEditPlan(plan)}
                            className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                            title="Edit Plan"
                          >
                            <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                              <Edit2 className="w-3 h-3 shrink-0" />
                            </div>
                            <span>Edit</span>
                          </button>

                          {/* Status Toggle Button */}
                          <button
                            onClick={() => handleToggleStatus(plan)}
                            className={`group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-2xs hover:shadow-xs ${
                              plan.active
                                ? 'text-slate-700 hover:text-amber-800 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300'
                                : 'text-slate-700 hover:text-emerald-800 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300'
                            }`}
                            title={plan.active ? 'Deactivate Plan' : 'Activate Plan'}
                          >
                            {plan.active ? (
                              <>
                                <div className="w-5.5 h-5.5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 transition-colors group-hover:bg-amber-100 group-hover:text-amber-700">
                                  <ToggleRight className="w-3.5 h-3.5 shrink-0" />
                                </div>
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                                  <ToggleLeft className="w-3.5 h-3.5 shrink-0" />
                                </div>
                                <span>Activate</span>
                              </>
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeletePlan(plan)}
                            className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                            title="Delete Plan"
                          >
                            <div className="w-5.5 h-5.5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 transition-colors group-hover:bg-rose-100 group-hover:text-rose-700">
                              <Trash2 className="w-3 h-3 shrink-0" />
                            </div>
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Full Touch Experience, Zero Sideways Scroll) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {plans.map((plan) => (
                <div key={plan._id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-base text-slate-900">{plan.name}</h4>
                      {plan.description && (
                        <p className="text-xs text-slate-500 mt-1 leading-snug">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    {plan.active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duration</span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">{plan.durationDays} days</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Fee</span>
                      <span className="font-black text-lg text-slate-900 mt-0.5 block">{formatINR(plan.price)}</span>
                    </div>
                  </div>

                  {/* Actions Row with 44px min-height buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditPlan(plan)}
                      className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 active:scale-95 transition-all shadow-2xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(plan)}
                      className={`flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs ${
                        plan.active
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {plan.active ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-amber-600" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-emerald-600" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan)}
                      className="min-h-[44px] h-11 w-11 inline-flex items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200 active:scale-95 transition-all shadow-2xs shrink-0"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Plan Modal */}
      {showAddModal && (
        <PlanFormModal
          title="Add Membership Plan"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchPlans();
          }}
        />
      )}

      {/* Edit Plan Modal */}
      {editPlan && (
        <PlanFormModal
          title="Edit Membership Plan"
          initialData={editPlan}
          onClose={() => setEditPlan(null)}
          onSuccess={() => {
            setEditPlan(null);
            fetchPlans();
          }}
        />
      )}
    </div>
  );
};

interface PlanFormModalProps {
  title: string;
  initialData?: MembershipPlan;
  onClose: () => void;
  onSuccess: () => void;
}

const PlanFormModal: React.FC<PlanFormModalProps> = ({
  title,
  initialData,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [durationDays, setDurationDays] = useState(
    initialData ? initialData.durationDays.toString() : '30'
  );
  const [price, setPrice] = useState(initialData ? initialData.price.toString() : '1299');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Plan name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        durationDays: Number(durationDays),
        price: Number(price),
        description: description.trim(),
      };

      if (initialData) {
        await api.updatePlan(initialData._id, payload);
      } else {
        await api.createPlan(payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-modal overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h3 className="text-base font-bold text-[#202124]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Plan Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Monthly Standard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                Duration (Days) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="General access to gym equipment and cardio area."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] h-11 px-4 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] h-11 px-6 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
