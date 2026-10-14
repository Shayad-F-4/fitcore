import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Shield, Dumbbell, Calendar, Building, Phone } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#111613] border border-[#273129] shadow-2xl overflow-hidden no-print">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#273129] flex items-center justify-between bg-[#171E19]/80">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-base text-text-main">
              Official Digital Athlete Pass
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-[#273129] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Card Container */}
        <div className="p-6">
          <div
            id="printable-member-pass"
            className="relative rounded-2xl overflow-hidden border border-primary/30 p-5 bg-gradient-to-br from-[#171E19] via-[#0E1310] to-[#080B0A] shadow-glow-primary print-card"
          >
            {/* Top Pass Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#273129]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <span className="font-display font-extrabold text-sm tracking-wider text-text-main">
                  FIT<span className="text-primary">CORE</span>
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold border border-primary/30 uppercase">
                {member.status} ATHLETE
              </span>
            </div>

            {/* Middle: Photo & Details */}
            <div className="flex items-center gap-4 py-4">
              <img
                src={member.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={member.fullName}
                className="w-20 h-20 rounded-xl object-cover border-2 border-primary/40 shadow-md shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-bold text-lg text-text-main leading-tight truncate">
                  {member.fullName}
                </h4>
                <p className="text-xs font-mono text-primary font-semibold mt-0.5">
                  ID: {member.memberId}
                </p>
                <p className="text-[11px] text-text-muted mt-1 truncate">
                  {member.currentMembership?.plan?.name || 'Pro Athlete'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-text-dim mt-1">
                  <Building className="w-3 h-3 text-primary" />
                  <span className="truncate">{member.branch?.name || 'Flagship Downtown'}</span>
                </div>
              </div>
            </div>

            {/* Bottom: QR Code & Barcode details */}
            <div className="pt-3 border-t border-[#273129] flex items-center justify-between bg-[#080B0A]/60 -mx-5 -mb-5 p-5">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-text-dim font-mono">
                  <Calendar className="w-3 h-3 text-text-muted" />
                  <span>Joined: {new Date(member.joinDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-text-dim font-mono">
                  <Phone className="w-3 h-3 text-text-muted" />
                  <span>{member.phone}</span>
                </div>
                <p className="text-[9px] font-mono text-text-dim/80 pt-1">
                  TOKEN: {member.qrCodeToken.slice(0, 16)}...
                </p>
              </div>

              {/* QR Code */}
              <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                <QRCodeSVG
                  value={member.qrCodeToken}
                  size={76}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="px-6 py-4 bg-[#080B0A] border-t border-[#273129] flex items-center justify-between">
          <span className="text-xs text-text-dim">Printable for physical keyfobs/cards</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-semibold text-xs tracking-wider transition-colors shadow-glow-sm"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
