import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Dumbbell, Calendar, Building, Phone } from 'lucide-react';
import { Member } from '../../types';

interface MemberCardModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberCardModal: React.FC<MemberCardModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !member) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Membership Pass
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Canvas */}
        <div className="p-6">
          <div
            id="printable-member-pass"
            className="rounded-2xl border border-slate-200 p-5 bg-white shadow-xs space-y-4"
          >
            {/* Top Brand Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Sagar Fitness Gym"
                  className="h-8 w-auto max-w-[140px] object-contain"
                />
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {member.status}
              </span>
            </div>

            {/* Middle: Photo & Details */}
            <div className="flex items-center gap-4 py-2">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.fullName}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-blue-50 text-blue-700 font-bold text-2xl flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
                  {member.fullName.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0 text-xs">
                <h4 className="font-bold text-sm text-slate-900 truncate">
                  {member.fullName}
                </h4>
                <p className="font-mono text-blue-700 font-bold mt-0.5">
                  ID: {member.memberId}
                </p>
                <p className="text-slate-600 font-medium mt-0.5 truncate">
                  {member.currentMembership?.plan?.name || 'Standard Pass'}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 font-medium">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{member.branch?.name || 'Main Facility'}</span>
                </div>
              </div>
            </div>

            {/* Bottom: QR Code & Metadata */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 space-y-0.5 font-medium">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Joined: {new Date(member.joinDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{member.phone}</span>
                </div>
              </div>

              <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <QRCodeSVG
                  value={member.qrCodeToken || member.memberId}
                  size={56}
                  level="M"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs active:scale-95"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
