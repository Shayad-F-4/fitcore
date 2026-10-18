import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import { Membership, MembershipPlan } from '../../types';
import { formatINR } from '../../utils/formatters';

interface RenewModalProps {
  membership: Membership | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment?: any) => void;
  onOpenReceipt?: (payment: any) => void;
}

export const RenewModal: React.FC<RenewModalProps> = ({
  membership,
  isOpen,
  onClose,
  onSuccess,
  onOpenReceipt,
}) => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      api
        .getPlans(true)
        .then((pList) => {
          setPlans(pList);
          const currentPlanId = membership?.plan?._id;
          const initialPlan = pList.find((p) => p._id === currentPlanId) || pList[0];
          if (initialPlan) {
            setSelectedPlanId(initialPlan._id);
            setAmountPaid(initialPlan.price.toString());
          }
        })
        .catch(console.error);
    }
  }, [isOpen, membership]);

  if (!isOpen || !membership) return null;

  const memberName =
    typeof membership.member === 'object' && membership.member
      ? (membership.member as any).fullName
      : 'Member';

  const currentPlanName = membership.plan?.name || 'Standard Pass';
  const currentExpiry = new Date(membership.expiryDate);

  // Selected plan calculation
  const chosenPlan = plans.find((p) => p._id === selectedPlanId);
  const renewalPrice = chosenPlan ? chosenPlan.price : (membership.plan?.price || 0);
  const durationDays = chosenPlan ? chosenPlan.durationDays : (membership.plan?.durationDays || 30);

  // Calculate new expiration date automatically
  const baseDate = currentExpiry > new Date() ? new Date(currentExpiry) : new Date();
  const calculatedNewExpiry = new Date(baseDate);
  calculatedNewExpiry.setDate(baseDate.getDate() + durationDays);

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.renewMembership(membership._id, {
        newPlanId: selectedPlanId,
        durationDays,
        amountPaid: Number(amountPaid),
        paymentMethod,
      });

      setSuccessMsg('Membership renewed successfully!');
      window.dispatchEvent(
        new CustomEvent('fitcore:data-changed', {
          detail: { action: 'MEMBERSHIP_RENEWED', payment: res?.payment },
        })
      );
      setTimeout(() => {
        onSuccess(res?.payment);
        if (res?.payment && onOpenReceipt) {
          onOpenReceipt(res.payment);
        }
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Renewal failed. Please check payment confirmation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Renew Membership
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Extend active pass and log fee payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleRenew} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Member & Current Membership Details */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl grid grid-cols-2 gap-3 text-xs shadow-2xs">
            <div>
              <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Member Name</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5 truncate">{memberName}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Current Membership</span>
              <p className="font-bold text-blue-700 text-sm mt-0.5 truncate">{currentPlanName}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Current Expiry:</span>
              <span className="font-mono font-bold text-slate-800">
                {currentExpiry.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* New Plan Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Renewal Plan *
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => {
                const pId = e.target.value;
                setSelectedPlanId(pId);
                const pl = plans.find((p) => p._id === pId);
                if (pl) setAmountPaid(pl.price.toString());
              }}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
            >
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({formatINR(p.price)} — {p.durationDays} days)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Plan Fee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Plan Price (₹)
              </label>
              <input
                type="text"
                readOnly
                value={formatINR(renewalPrice)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold font-mono"
              />
            </div>

            {/* Amount Paid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Amount Paid (₹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold font-mono border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            {/* New Expiration Date (Calculated) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                New Expiration Date
              </label>
              <div className="w-full px-3.5 py-2.5 text-xs bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 font-bold font-mono flex items-center justify-between">
                <span>
                  {calculatedNewExpiry.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-[10px] bg-blue-200/80 text-blue-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                  +{durationDays}d
                </span>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Confirm Renewal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
