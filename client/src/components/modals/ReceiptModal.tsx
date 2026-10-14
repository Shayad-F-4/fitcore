import React from 'react';
import { X, Printer, Receipt, CheckCircle, Dumbbell } from 'lucide-react';
import { Payment } from '../../types';

interface ReceiptModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const member = payment.member;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#111613] border border-[#273129] shadow-2xl overflow-hidden no-print">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#273129] flex items-center justify-between bg-[#171E19]/80">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-base text-text-main">
              Official Tax Receipt
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-[#273129] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Sheet */}
        <div className="p-6">
          <div
            id="printable-receipt"
            className="rounded-2xl p-6 bg-white text-black shadow-lg space-y-4 print-card font-sans"
          >
            {/* Top Brand & Receipt # */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-black text-[#B7FF3C] flex items-center justify-center">
                    <Dumbbell className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-black text-lg tracking-wider text-black">
                    FITCORE
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Elite Gym Ecosystem • Metropolis Flagship
                </p>
                <p className="text-[10px] text-gray-400">GSTIN / TAX ID: 27AABCF1234F1Z8</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                  {payment.status}
                </span>
                <p className="text-xs font-mono font-bold text-black mt-1">
                  {payment.receiptNumber}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Billed To */}
            <div className="grid grid-cols-2 gap-4 text-xs py-2 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Billed To
                </span>
                <p className="font-bold text-gray-900 text-sm">{member?.fullName || 'Valued Athlete'}</p>
                <p className="text-gray-600 font-mono text-[11px]">ID: {member?.memberId}</p>
                <p className="text-gray-500 text-[11px]">{member?.phone}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Payment Mode
                </span>
                <p className="font-bold text-gray-900">{payment.paymentMethod}</p>
                <p className="text-[10px] text-gray-500">Type: {payment.type}</p>
                {payment.transactionRef && (
                  <p className="text-[10px] font-mono text-gray-400 truncate">
                    Ref: {payment.transactionRef}
                  </p>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div className="py-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 text-[10px] uppercase">
                    <th className="text-left py-1 font-semibold">Description</th>
                    <th className="text-right py-1 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2">
                      <p className="font-semibold text-gray-900">
                        {payment.notes || 'Gym Membership Subscription'}
                      </p>
                      <p className="text-[10px] text-gray-500">FitCore Training Facility Access</p>
                    </td>
                    <td className="text-right font-mono font-bold text-gray-900 py-2">
                      ${payment.amount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="pt-2 border-t-2 border-black flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-500">
                  Recorded by: {payment.recordedBy?.fullName || 'Reception Desk'}
                </p>
                <p className="text-[9px] text-gray-400">Thank you for training with FitCore!</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 uppercase block">Total Paid</span>
                <span className="text-2xl font-black text-black font-mono">
                  ${payment.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-[#080B0A] border-t border-[#273129] flex items-center justify-between">
          <span className="text-xs text-text-dim">Official PDF / Print Ready</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs tracking-wider transition-colors shadow-glow-sm"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
