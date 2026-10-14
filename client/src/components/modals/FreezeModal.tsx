import React, { useState } from 'react';
import { X, Snowflake, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { Membership } from '../../types';

interface FreezeModalProps {
  membership: Membership | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FreezeModal: React.FC<FreezeModalProps> = ({
  membership,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !membership) return null;

  const today = new Date().toISOString().split('T')[0];
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(inTwoWeeks);
  const [reason, setReason] = useState('Medical recovery / travel');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.freezeMembership(membership._id, {
        fromDate,
        toDate,
        reason,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to freeze membership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#111613] border border-[#273129] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#273129] flex items-center justify-between bg-[#171E19]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-status-info/10 border border-status-info/30 flex items-center justify-center text-status-info">
              <Snowflake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-text-main">
                Freeze / Pause Subscription
              </h3>
              <p className="text-xs text-text-dim">Temporarily pause access and extend end date</p>
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
        <form onSubmit={handleFreeze} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-status-info/5 border border-status-info/20 text-xs text-text-muted flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-status-info shrink-0 mt-0.5" />
            <span>
              During freeze, gym entry will be paused. When thawed, the duration frozen will automatically extend the expiry date.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Pause Start Date</label>
              <input
                type="date"
                required
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-status-info text-text-main text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Pause End Date</label>
              <input
                type="date"
                required
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-status-info text-text-main text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Reason for Hold</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Injury, business relocation, medical"
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-status-info text-text-main text-sm focus:outline-none"
            />
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-status-info hover:bg-status-info/80 text-[#080B0A] font-bold text-xs uppercase tracking-wider transition-all"
            >
              <Snowflake className="w-4 h-4" />
              <span>{loading ? 'Freezing...' : 'Confirm Hold'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
