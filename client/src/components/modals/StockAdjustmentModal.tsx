import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { api } from '../../api/client';

interface StockAdjustmentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [movementType, setMovementType] = useState<'ADJUSTMENT_ADD' | 'ADJUSTMENT_SUBTRACT' | 'DAMAGE' | 'EXPIRY'>('ADJUSTMENT_ADD');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const currentStock = product.currentStock || 0;
  const numQty = parseInt(quantity, 10) || 0;
  const isSubtract = movementType !== 'ADJUSTMENT_ADD';
  const projectedStock = isSubtract ? Math.max(0, currentStock - numQty) : currentStock + numQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numQty <= 0) {
      setError('Adjustment quantity must be at least 1');
      return;
    }

    if (isSubtract && numQty > currentStock) {
      setError(`Cannot deduct ${numQty} units. Only ${currentStock} units in stock.`);
      return;
    }

    if (!reason.trim()) {
      setError('Please provide an explanatory reason for this adjustment audit record.');
      return;
    }

    try {
      setLoading(true);
      await api.adjustStock({
        productId: product._id,
        movementType,
        quantity: numQty,
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
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
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Adjust Stock Quantity</h3>
              <p className="text-[11px] font-mono text-slate-500">{product.name} ({product.sku})</p>
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
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stock</span>
              <span className="text-base font-black text-slate-900 font-mono">
                {currentStock} {product.unit}s
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">After Adjustment</span>
              <span className={`text-base font-black font-mono ${isSubtract ? 'text-rose-600' : 'text-emerald-600'}`}>
                {projectedStock} {product.unit}s
              </span>
            </div>
          </div>

          {/* Movement Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Type</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
            >
              <option value="ADJUSTMENT_ADD">➕ Manual Addition (Found Stock / Recount)</option>
              <option value="ADJUSTMENT_SUBTRACT">➖ Manual Deduction (Correction / Missing)</option>
              <option value="DAMAGE">⚠️ Damaged Goods (Physical Breakage / Defect)</option>
              <option value="EXPIRY">⏳ Expired Stock Disposal</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Quantity to Adjust ({product.unit}s) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Reason / Audit Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory count verified 2 extra units on display rack"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {loading ? 'Updating...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
