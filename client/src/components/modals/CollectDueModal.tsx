import React, { useState } from 'react';
import { X, CreditCard, Receipt, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { sendWhatsAppDueReminder } from '../../utils/whatsapp';
import { formatINR } from '../../utils/formatters';

interface CollectDueModalProps {
  dueItem: {
    membershipId: string;
    member: {
      _id: string;
      fullName: string;
      memberId: string;
      phone: string;
      email?: string;
    };
    plan: {
      name: string;
      price: number;
    };
    amountDue: number;
    amountPaid: number;
    balanceDue: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: any) => void;
}

export const CollectDueModal: React.FC<CollectDueModalProps> = ({
  dueItem,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !dueItem) return null;

  const [collectAmount, setCollectAmount] = useState<string>(String(dueItem.balanceDue));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER'>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numAmount = Number(collectAmount) || 0;
  const newRemainingBalance = Math.max(0, dueItem.balanceDue - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }
    if (numAmount > dueItem.balanceDue) {
      setError(`Amount cannot exceed the total outstanding balance of ${formatINR(dueItem.balanceDue)}.`);
      return;
    }

    try {
      setLoading(true);
      const res = await api.collectDue({
        membershipId: dueItem.membershipId,
        amountPaid: numAmount,
        paymentMethod,
        transactionRef: transactionRef.trim(),
        notes: notes.trim(),
      });

      // Dispatch global data-changed event so parent tables update instantly without page reload
      window.dispatchEvent(
        new CustomEvent('fitcore:data-changed', {
          detail: {
            action: 'DUE_COLLECTED',
            membershipId: dueItem.membershipId,
            amountPaid: numAmount,
            payment: res,
          },
        })
      );

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record due payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppReminder = () => {
    sendWhatsAppDueReminder({
      name: dueItem.member.fullName,
      phone: dueItem.member.phone,
      dueAmount: dueItem.balanceDue,
      planName: dueItem.plan?.name || 'Membership',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center font-black text-base shadow-2xs">
              ₹
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Collect Pending Dues</h3>
              <p className="text-xs text-slate-500 font-medium">Record fee balance payment & print receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Member Card Banner */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-sm font-bold text-slate-900">{dueItem.member.fullName}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {dueItem.member.memberId} • {dueItem.member.phone}</div>
              <div className="text-xs text-blue-700 font-semibold mt-0.5">{dueItem.plan?.name || 'Membership Plan'}</div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Due</div>
              <div className="text-lg font-black text-amber-600 font-mono">{formatINR(dueItem.balanceDue)}</div>
            </div>
          </div>

          {/* Quick WhatsApp Reminder Button: Aesthetic Micro-Card */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSendWhatsAppReminder}
              className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
            >
              <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                <MessageCircle className="w-3 h-3 shrink-0" />
              </div>
              <span>WhatsApp Due Reminder</span>
            </button>
          </div>

          {/* Amount to Collect */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Amount to Collect (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="1"
                max={dueItem.balanceDue}
                step="any"
                required
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none font-mono transition-all shadow-2xs"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 font-medium">
              <span>Remaining Balance:</span>
              <span className={`font-bold font-mono ${newRemainingBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatINR(newRemainingBalance)}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'UPI', 'CREDIT_CARD'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    paymentMethod === method
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                  }`}
                >
                  {method === 'CASH' ? '💵 Cash' : method === 'UPI' ? '📱 UPI / QR' : '💳 Card'}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Ref */}
          {paymentMethod !== 'CASH' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Transaction / Reference ID
              </label>
              <input
                type="text"
                placeholder="e.g. UPI-9281928"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes / Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Second installment paid at counter"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] h-11 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Collect & Print Receipt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
