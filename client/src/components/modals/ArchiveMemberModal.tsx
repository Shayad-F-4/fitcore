import React, { useState } from 'react';
import { Archive, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

interface ArchiveMemberModalProps {
  isOpen: boolean;
  member: {
    _id: string;
    memberId: string;
    fullName: string;
    phone?: string;
    photoUrl?: string;
  } | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ArchiveMemberModal: React.FC<ArchiveMemberModalProps> = ({
  isOpen,
  member,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const handleArchive = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.archiveMember(member._id);
      window.dispatchEvent(new CustomEvent('fitcore:data-changed'));
      onSuccess(`Member ${member.fullName} (${member.memberId}) has been safely archived. All historical records are preserved.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to archive member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-xl shadow-modal overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#202124]">Archive Member (Left Gym)</h3>
              <p className="text-[11px] text-[#6B7280]">Discontinue active reminders & move to archive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#4B5563] leading-relaxed">
            Has this member left the gym or decided not to renew their membership? You can safely archive them to keep your active dashboard clean.
          </p>

          {/* Member Card Summary */}
          <div className="p-3.5 bg-gray-50 border border-[#E5E7EB] rounded-lg flex items-center gap-3">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.fullName}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0">
                {member.fullName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">{member.fullName}</div>
              <div className="text-xs text-gray-500 font-mono flex items-center gap-2 mt-0.5">
                <span>ID: {member.memberId}</span>
                {member.phone && (
                  <>
                    <span>•</span>
                    <span>{member.phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Safety Notice Box */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Complete Data Safety:</span> All past payments, tax invoices, thermal receipts, and attendance records will remain{' '}
              <span className="font-semibold underline">100% preserved</span> in your records.
              You can view or <span className="font-semibold">Restore</span> this member anytime from the <span className="font-semibold">Members &rarr; Archived</span> tab.
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-100 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors shadow-subtle disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
            <span>{loading ? 'Archiving...' : 'Archive Member (Left Gym)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
