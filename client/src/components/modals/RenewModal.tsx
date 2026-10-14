import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { Membership } from '../../types';

interface RenewModalProps {
  membership: Membership | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RenewModal: React.FC<RenewModalProps> = ({
  membership,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !membership) return null;

  const [durationDays, setDurationDays] = useState(
    membership.plan ? membership.plan.durationDays.toString() : '30'
  );
  const [amountPaid, setAmountPaid] = useState(
    membership.plan ? membership.plan.price.toString() : '99'
  );
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.renewMembership(membership._id, {
        durationDays: Number(durationDays),
        amountPaid: Number(amountPaid),
        paymentMethod,
      });

      confetti({
        particleCount: 70,
        spread: 50,
        colors: ['#B7FF3C', '#36D399', '#ffffff'],
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Renewal failed');
    } finally {
      setLoading(false);
    }
  };

  const memberName =
    typeof membership.member === 'object' && membership.member
      ? (membership.member as any).fullName
      : 'Athlete';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#111613] border border-[#273129] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#273129] flex items-center justify-between bg-[#171E19]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-glow-sm">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-text-main">
                Renew Membership
              </h3>
              <p className="text-xs text-text-dim">Extend access for {memberName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-[#273129] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleRenew} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs">
              {error}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#273129] space-y-1">
            <span className="text-[11px] font-mono text-text-dim uppercase">Current Tier</span>
            <p className="text-sm font-semibold text-text-main">
              {membership.plan?.name || 'Pro Membership'}
            </p>
            <p className="text-xs text-text-muted">
              Current Expiry: {new Date(membership.expiryDate).toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Days to Extend</label>
              <input
                type="number"
                min="1"
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Amount Paid ($)</label>
              <input
                type="number"
                min="0"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="UPI">UPI / Digital QR</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-between">
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs uppercase tracking-wider transition-all shadow-glow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Renewing...' : 'Confirm Renewal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
