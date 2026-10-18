import React, { useState } from 'react';
import { QrCode, X, CheckCircle2, AlertTriangle, Clock, ArrowRightLeft, Sparkles, Check } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface QuickCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckInSuccess: () => void;
}

export const QuickCheckInModal: React.FC<QuickCheckInModalProps> = ({
  isOpen,
  onClose,
  onCheckInSuccess,
}) => {
  const { activeBranch } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent, directId?: string) => {
    if (e) e.preventDefault();
    const query = directId || identifier;
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.checkIn({
        identifier: query.trim(),
        branchId: activeBranch?._id,
      });
      setResult(res);
      setIdentifier('');
      onCheckInSuccess();
    } catch (err: any) {
      setError(err.message || 'Check-in failed. Please verify member ID or pass.');
    } finally {
      setLoading(false);
    }
  };

  const sampleShortcuts = [
    { label: 'FC-1001 (David)', id: 'FC-1001' },
    { label: 'FC-1002 (Sophia)', id: 'FC-1002' },
    { label: 'FC-1004 (Maya)', id: 'FC-1004' },
    { label: 'FC-1006 (Carlos)', id: 'FC-1006' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <QrCode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Reception Check-In Terminal
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Scan barcode/QR token or type Member ID (e.g. FC-1001)
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
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Member ID / Phone / QR Token
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Scan or enter FC-1001, phone number..."
                autoFocus
                className="w-full pl-4 pr-28 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-2xs transition-all"
              />
              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                {loading ? (
                  <span>Checking...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Process</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Click Demo Tags */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] text-slate-400 font-semibold">Quick test:</span>
            {sampleShortcuts.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setIdentifier(s.id);
                  handleSubmit(undefined, s.id);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 font-mono transition-all shadow-2xs hover:shadow-xs active:scale-95"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Result Alert: Check-In */}
          {result && result.type === 'CHECK_IN' && (
            <div
              className={`p-4 rounded-xl border space-y-3 animate-in zoom-in-95 duration-150 ${
                result.membershipValid
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex items-center gap-2 font-bold text-sm ${
                    result.membershipValid ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  {result.membershipValid ? (
                    <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-600" />
                  )}
                  <span>
                    {result.membershipValid
                      ? 'Access Granted — Athlete Checked In!'
                      : `Athlete Checked In (Status: ${result.member.status})`}
                  </span>
                </div>
                {!result.membershipValid && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase border border-amber-200">
                    Staff Override
                  </span>
                )}
              </div>

              {!result.membershipValid && (
                <p className="text-xs text-amber-800 bg-amber-100/70 p-2.5 rounded-lg border border-amber-200 leading-relaxed">
                  ⚠️ Alert: This athlete&apos;s membership is expired or frozen. Admitted under front-desk supervision. Recommend renewal.
                </p>
              )}

              <div className="flex items-center gap-3.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <img
                  src={result.member.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={result.member.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 truncate text-sm">
                      {result.member.fullName}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      {result.member.memberId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Plan: <span className="text-slate-800 font-semibold">{result.membershipDetails?.plan?.name || 'Active Membership'}</span>
                  </p>
                  {result.membershipDetails?.expiryDate && (
                    <p className="text-[11px] text-emerald-700 font-mono font-medium mt-0.5">
                      Valid through: {new Date(result.membershipDetails.expiryDate).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Entry logged at {new Date(result.attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Result Alert: Check-Out */}
          {result && result.type === 'CHECK_OUT' && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <ArrowRightLeft className="w-4.5 h-4.5 shrink-0 text-blue-600" />
                <span>Workout Completed — Athlete Checked Out!</span>
              </div>
              <div className="flex items-center gap-3.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <img
                  src={result.member.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={result.member.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {result.member.fullName} ({result.member.memberId})
                  </h4>
                  <p className="text-xs text-blue-700 font-semibold mt-0.5">
                    Session Duration: <strong>{result.durationMinutes || 45} minutes</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Departure recorded at {new Date(result.attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8.5 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 transition-all shadow-2xs active:scale-95"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
};
