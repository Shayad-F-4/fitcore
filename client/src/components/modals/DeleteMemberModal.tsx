import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client';

interface DeleteMemberModalProps {
  isOpen: boolean;
  member: {
    _id: string;
    memberId: string;
    fullName: string;
  } | null;
  onClose: () => void;
  onSuccess: (result: { archived?: boolean; deleted?: boolean; message: string }) => void;
}

export const DeleteMemberModal: React.FC<DeleteMemberModalProps> = ({
  isOpen,
  member,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.deleteMember(member._id);
      onSuccess({
        archived: res.archived,
        deleted: res.deleted,
        message: res.message || `Member ${member.fullName} processed successfully.`,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Member</h3>
              <p className="text-xs text-rose-600/80 font-medium">Safe archival or permanent deletion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Are you sure you want to delete this gym member?
          </p>

          {/* Member Card Summary */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Member Details
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{member.fullName}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Member ID
              </div>
              <div className="text-xs font-mono font-bold text-blue-700 mt-0.5">
                {member.memberId}
              </div>
            </div>
          </div>

          {/* Safety Notice Box */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed shadow-2xs">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Financial & Record Protection:</span> If this member
              has payment history, receipts, attendance logs, or subscriptions, they will be{' '}
              <span className="font-bold underline">safely archived</span> to protect audit
              records and dues.
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="inline-flex items-center gap-2 h-9 px-4.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-rose-500/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{loading ? 'Processing...' : 'Confirm Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
