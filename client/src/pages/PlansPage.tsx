import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  Plus,
  Sparkles,
  Zap,
  Flame,
  Shield,
  Clock,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { MembershipPlan } from '../types';

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New plan state
  const [newPlan, setNewPlan] = useState({
    name: '',
    type: 'MONTHLY',
    durationDays: '30',
    price: '99',
    description: '',
    features: '',
    isPopular: false,
    badge: '',
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.getPlans(false);
      setPlans(res);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggle = async (planId: string) => {
    try {
      await api.togglePlanStatus(planId);
      fetchPlans();
    } catch (err) {
      console.error('Failed to toggle plan status:', err);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPlan({
        ...newPlan,
        durationDays: Number(newPlan.durationDays),
        price: Number(newPlan.price),
        features: newPlan.features.split('\n').filter((f) => f.trim().length > 0),
      });
      setShowCreateModal(false);
      setNewPlan({
        name: '',
        type: 'MONTHLY',
        durationDays: '30',
        price: '99',
        description: '',
        features: '',
        isPopular: false,
        badge: '',
      });
      fetchPlans();
    } catch (err) {
      console.error('Failed to create plan:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#273129]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-main tracking-tight">
              Membership Tiers & Pricing
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#111613] text-primary border border-[#273129] font-bold">
              {plans.length} Packages
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Configure gym subscription pricing, access perks, amenities, and billing cycles.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs tracking-wider uppercase transition-all shadow-glow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Create Plan</span>
        </button>
      </div>

      {/* Plans Pricing Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-text-dim font-mono">
          Loading Membership Plans...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPopular = plan.isPopular;
            return (
              <div
                key={plan._id}
                className={`relative rounded-3xl p-6 transition-all flex flex-col justify-between ${
                  isPopular
                    ? 'bg-gradient-to-b from-[#172317] to-[#111613] border-2 border-primary shadow-glow-primary'
                    : 'bg-[#111613] border border-[#273129] hover:border-[#364439] shadow-card'
                } ${!plan.active ? 'opacity-60' : ''}`}
              >
                {/* Popular Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-primary text-[#080B0A] text-[10px] font-mono font-extrabold tracking-widest uppercase shadow-glow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  {/* Top info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-extrabold text-xl text-text-main">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">
                        {plan.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle(plan._id)}
                      title={plan.active ? 'Active Plan' : 'Inactive Plan'}
                      className="text-text-dim hover:text-primary transition-colors"
                    >
                      {plan.active ? (
                        <ToggleRight className="w-6 h-6 text-primary" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-text-dim" />
                      )}
                    </button>
                  </div>

                  {/* Price */}
                  <div className="my-6 pb-6 border-b border-[#273129]">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-black text-4xl text-text-main">
                        ${plan.price}
                      </span>
                      <span className="text-xs font-mono text-text-dim">
                        / {plan.durationDays} days ({plan.type})
                      </span>
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-dim">
                      Plan Inclusions:
                    </p>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-text-muted">
                          <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer status */}
                <div className="pt-6 mt-6 border-t border-[#273129] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-text-dim">
                    Billing Cycle: {plan.durationDays}D
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${
                      plan.active
                        ? 'bg-status-success/10 text-status-success border-status-success/30'
                        : 'bg-[#171E19] text-text-dim border-[#273129]'
                    }`}
                  >
                    {plan.active ? 'Available' : 'Archived'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#111613] border border-[#273129] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#273129] flex items-center justify-between bg-[#171E19]/80">
              <h3 className="font-display font-bold text-base text-text-main">
                Create Membership Plan
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-text-dim hover:text-text-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Plan Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spartan Strength Tier"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-sm text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-sm text-text-main focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPlan.durationDays}
                    onChange={(e) => setNewPlan({ ...newPlan, durationDays: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-sm text-text-main focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short tagline explaining target athletes..."
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-sm text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">
                  Features (One feature per line)
                </label>
                <textarea
                  rows={4}
                  placeholder={`Access to Downtown & Uptown\nFree Towel & Locker Service\nMonthly InBody Scan`}
                  value={newPlan.features}
                  onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-sm text-text-main focus:outline-none focus:border-primary font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={newPlan.isPopular}
                  onChange={(e) => setNewPlan({ ...newPlan, isPopular: e.target.checked })}
                  className="rounded bg-[#080B0A] border-[#273129] text-primary focus:ring-primary"
                />
                <label htmlFor="isPopular" className="text-xs text-text-muted">
                  Highlight as 'Popular / Recommended' Tier
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#171E19] text-xs font-semibold text-text-main"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs uppercase"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
