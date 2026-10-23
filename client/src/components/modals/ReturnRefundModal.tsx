import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { InventorySale } from '../../types';
import { api } from '../../api/client';
import { formatINR } from '../../utils/formatters';

interface ReturnRefundModalProps {
  sale: InventorySale | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReturnRefundModal: React.FC<ReturnRefundModalProps> = ({
  sale,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [actionType, setActionType] = useState<'REFUND' | 'CANCEL'>('REFUND');
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Please provide a mandatory reason for this return/cancellation audit record.');
      return;
    }

    try {
      setLoading(true);
      if (actionType === 'REFUND') {
        await api.refundInventorySale(sale._id, {
          reason: reason.trim(),
          restock,
        });
      } else {
        await api.cancelInventorySale(sale._id, reason.trim());
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sale Return & Refund</h3>
              <p className="text-[11px] font-mono text-slate-500">Receipt #{sale.receiptNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Sale Summary Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{sale.customerName || 'Walk-in'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Items:</span>
              <span className="font-medium text-slate-800">{sale.items.length} items</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="font-semibold text-slate-700">Refund Amount:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatINR(sale.grandTotal)}
              </span>
            </div>
          </div>

          {/* Action Choice */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Action Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('REFUND')}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  actionType === 'REFUND'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Customer Return & Refund
              </button>
              <button
                type="button"
                onClick={() => setActionType('CANCEL')}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  actionType === 'CANCEL'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Void / Cancel Sale
              </button>
            </div>
          </div>

          {/* Restock items checkbox (for refunds) */}
          {actionType === 'REFUND' && (
            <div
              onClick={() => setRestock(!restock)}
              className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer flex items-center gap-2.5 text-xs select-none"
            >
              {restock ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <div>
                <span className="font-bold text-slate-900 block">Restock Returned Items</span>
                <span className="text-[11px] text-slate-500">
                  Physically accept items back into available gym shelf inventory
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Reason for Return / Cancellation <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer brought sealed shaker back with receipt to exchange for t-shirt"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {loading ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
