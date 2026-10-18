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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg shadow-modal overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-[#202124]">
              Freeze Membership
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFreeze} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              During the freeze period, gym check-in is paused. When thawed, the duration frozen will automatically extend the expiration date.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                Pause Start Date
              </label>
              <input
                type="date"
                required
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                Expected Return Date
              </label>
              <input
                type="date"
                required
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none text-[#202124]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Reason for Freeze
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none text-[#202124]"
            />
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-subtle disabled:opacity-50"
            >
              {loading ? 'Freezing...' : 'Confirm Freeze'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
