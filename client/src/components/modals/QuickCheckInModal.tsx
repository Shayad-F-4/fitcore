import React, { useState } from 'react';
import { QrCode, X, CheckCircle2, AlertTriangle, Clock, ArrowRightLeft, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#111613] border border-[#273129] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#273129] flex items-center justify-between bg-[#171E19]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-glow-sm">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-text-main">
                Reception Check-In Terminal
              </h3>
              <p className="text-xs text-text-dim">
                Scan barcode/QR token or type Member ID (e.g. FC-1001)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-[#273129] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Member ID / QR Pass Token
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Scan or enter FC-1001, FIT_QR_..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main font-mono text-base placeholder:text-text-dim/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 text-[#080B0A] font-semibold text-xs tracking-wider uppercase transition-colors"
              >
                {loading ? 'Verifying...' : 'Process'}
              </button>
            </div>
          </form>

          {/* Quick Click Demo Tags */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] text-text-dim font-mono">Quick test:</span>
            {sampleShortcuts.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setIdentifier(s.id);
                  handleSubmit(undefined, s.id);
                }}
                className="text-xs px-2.5 py-1 rounded-md bg-[#171E19] hover:bg-primary/20 text-text-muted hover:text-primary border border-[#273129] font-mono transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Result Alert: Check-In */}
          {result && result.type === 'CHECK_IN' && (
            <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 text-status-success">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm">Access Granted — Athlete Checked In!</span>
              </div>
              <div className="flex items-center gap-3.5 bg-[#080B0A]/80 p-3 rounded-xl border border-[#273129]">
                <img
                  src={result.member.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={result.member.fullName}
                  className="w-12 h-12 rounded-full object-cover border border-primary/40 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-bold text-text-main truncate text-base">
                      {result.member.fullName}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                      {result.member.memberId}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted truncate">
                    Plan: <span className="text-text-main font-medium">{result.membershipDetails?.plan?.name || 'Active Membership'}</span>
                  </p>
                  <p className="text-[11px] text-text-dim flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-primary" />
                    Entry logged at {new Date(result.attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Result Alert: Check-Out */}
          {result && result.type === 'CHECK_OUT' && (
            <div className="p-4 rounded-xl bg-status-info/10 border border-status-info/30 space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 text-status-info">
                <ArrowRightLeft className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm">Workout Completed — Athlete Checked Out!</span>
              </div>
              <div className="flex items-center gap-3.5 bg-[#080B0A]/80 p-3 rounded-xl border border-[#273129]">
                <img
                  src={result.member.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={result.member.fullName}
                  className="w-12 h-12 rounded-full object-cover border border-[#364439] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-text-main text-base">
                    {result.member.fullName} ({result.member.memberId})
                  </h4>
                  <p className="text-xs text-status-info font-medium mt-0.5">
                    Session Duration: <strong>{result.durationMinutes || 45} minutes</strong>
                  </p>
                  <p className="text-[11px] text-text-dim">
                    Departure recorded at {new Date(result.attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-status-error/10 border border-status-error/30 flex items-center gap-3 text-status-error text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#080B0A] border-t border-[#273129] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#171E19] hover:bg-[#273129] text-xs font-semibold text-text-main transition-colors"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
};
