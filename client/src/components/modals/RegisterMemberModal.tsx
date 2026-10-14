import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, UserPlus, Sparkles, CreditCard } from 'lucide-react';
import { api } from '../../api/client';
import { Branch, MembershipPlan } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface RegisterMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterMemberModal: React.FC<RegisterMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { branches, activeBranch } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'MALE',
    dob: '',
    address: '',
    branch: activeBranch?._id || '',
    emergencyName: '',
    emergencyPhone: '',
    planId: '',
    paymentMethod: 'UPI',
    discount: '0',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      api.getPlans(true).then(setPlans).catch(console.error);
      if (activeBranch && !formData.branch) {
        setFormData((prev) => ({ ...prev, branch: activeBranch._id }));
      }
    }
  }, [isOpen, activeBranch]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone || !formData.branch) {
      setError('Full name, email, phone, and home branch are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.registerMember({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        dob: formData.dob || undefined,
        address: formData.address,
        branch: formData.branch,
        emergencyContact: {
          name: formData.emergencyName,
          phone: formData.emergencyPhone,
          relation: 'Emergency',
        },
        planId: formData.planId || undefined,
        paymentMethod: formData.paymentMethod,
        discount: Number(formData.discount) || 0,
        notes: formData.notes,
      });

      // Celebration confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#B7FF3C', '#ffffff', '#36D399'],
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register member.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p._id === formData.planId);
  const planPrice = selectedPlan ? selectedPlan.price : 0;
  const discountVal = Number(formData.discount) || 0;
  const netDue = Math.max(0, planPrice - discountVal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl my-8 rounded-2xl bg-[#111613] border border-[#273129] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#273129] flex items-center justify-between bg-[#171E19]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-glow-sm">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-text-main">
                New Athlete Registration
              </h3>
              <p className="text-xs text-text-dim">
                Create athlete profile, assign membership tier & issue instant QR pass
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-[#273129] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs">
              {error}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-3">
              1. Athlete Personal Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs text-text-muted mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Hunter"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="athlete@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other / Non-Binary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Home Facility Branch *</label>
                <select
                  required
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Branch...</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  placeholder="+1 (555) 999-9999"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Membership Tier */}
          <div className="pt-3 border-t border-[#273129]">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-3">
              2. Initial Membership Subscription
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs text-text-muted mb-1">Select Membership Plan</label>
                <select
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">No Plan (Pending Activation)</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ${p.price} ({p.durationDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Wire</option>
                </select>
              </div>

              {selectedPlan && (
                <>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Discount Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#080B0A] border border-primary/30">
                    <div>
                      <span className="text-[11px] text-text-dim uppercase font-mono">Total Due Today</span>
                      <p className="text-xs text-text-muted">Auto-generates official receipt</p>
                    </div>
                    <span className="text-xl font-display font-extrabold text-primary">
                      ${netDue}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-[#273129] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#171E19] hover:bg-[#273129] text-xs font-semibold text-text-main transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs tracking-wider uppercase transition-all shadow-glow-sm transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Creating Athlete...' : 'Confirm & Register'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
