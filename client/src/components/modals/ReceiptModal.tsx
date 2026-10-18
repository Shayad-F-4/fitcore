import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { Payment } from '../../types';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { api } from '../../api/client';
import { generateBillPDF } from '../../utils/pdfGenerator';
import { sendWhatsAppReceipt } from '../../utils/whatsapp';

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
  const [gym, setGym] = useState<any>(null);
  const [memberData, setMemberData] = useState<any>(
    typeof payment?.member === 'object' ? payment?.member : null
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && payment) {
      api.getSettings().then((res) => setGym(res.data)).catch(console.error);
      setPdfSuccessMessage(null);

      const mem = typeof payment.member === 'object' ? payment.member : null;
      if (mem && mem.phone) {
        setMemberData(mem);
      } else {
        const id =
          typeof payment.member === 'string'
            ? payment.member
            : (payment as any).memberId || (payment.member as any)?._id;
        if (id) {
          api
            .getMember(id)
            .then((res) => {
              if (res?.member) setMemberData(res.member);
            })
            .catch(console.error);
        }
      }
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const handleClose = () => {
    window.dispatchEvent(
      new CustomEvent('fitcore:data-changed', {
        detail: { action: 'RECEIPT_CLOSED' },
      })
    );
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const member = memberData || (typeof payment.member === 'object' ? payment.member : null);
  const recordedBy = (payment as any).recordedBy;
  const membership = (payment as any).membership;
  const planName = membership?.plan?.name || payment.notes || 'Gym Membership';
  const planDuration = membership?.plan?.durationDays
    ? `${membership.plan.durationDays} Days`
    : 'Active Pass';
  const balanceDue = payment.balanceRemaining || 0;

  const gymName = gym?.gymName || 'Sagar Fitness Gym';
  const address = gym?.address
    ? `${gym.address}${gym.city ? `, ${gym.city}` : ''}${gym.pincode ? ` - ${gym.pincode}` : ''}`
    : '';
  const phone = gym?.phone || '';

  const totalFee = payment.amount + (balanceDue > 0 ? balanceDue : 0);
  const filename = `FitCore-Receipt-${payment.receiptNumber}`;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);
    const success = await generateBillPDF('printable-bill', filename);
    setIsGeneratingPdf(false);
    if (success) {
      setPdfSuccessMessage('PDF downloaded successfully!');
      setTimeout(() => setPdfSuccessMessage(null), 3500);
    }
  };

  const handleShareWhatsApp = () => {
    if (!member?.phone) {
      alert('This member does not have a registered contact phone number.');
      return;
    }
    sendWhatsAppReceipt({
      name: member.fullName || 'Valued Member',
      phone: member.phone,
      receiptNumber: payment.receiptNumber,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      planName,
      date: payment.paymentDate,
      balanceRemaining: balanceDue,
      gymName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden">
      {/* Print-specific style: Ensures exact A4 single-page print without UI controls */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-bill, #printable-bill * {
            visibility: visible !important;
          }
          #printable-bill {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12mm !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Payment Receipt</h3>
              <p className="text-[11px] text-slate-500 font-mono">#{payment.receiptNumber}</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {pdfSuccessMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center gap-2 text-xs text-emerald-800 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{pdfSuccessMessage}</span>
          </div>
        )}

        {/* Modal Body / Printable Receipt Canvas */}
        <div className="p-4 sm:p-5 bg-slate-50 overflow-y-auto max-h-[calc(90vh-120px)] flex justify-center">
          <div
            id="printable-bill"
            className="w-full bg-white border border-slate-200 rounded-xl p-5 sm:p-6 text-slate-800 shadow-xs space-y-4 font-sans"
          >
            {/* Header: Logo, Gym Name, Receipt Title, Receipt #, Date */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                    {gymName}
                  </h2>
                  <p className="text-[11px] font-semibold text-blue-600">Official Payment Receipt</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Payment Receipt
                </span>
                <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                  Receipt #{payment.receiptNumber}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Date: {formatDateIN(payment.paymentDate)}
                </p>
              </div>
            </div>

            {/* Member Details & Payment Details (Compact 2-Column) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3.5 border-b border-slate-200 text-xs">
              {/* Member Details */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Member Details
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {member?.fullName || 'Valued Member'}
                </p>
                <p className="text-slate-600">
                  Member ID: <span className="font-mono font-semibold text-slate-800">{member?.memberId || '—'}</span>
                </p>
                <p className="text-slate-600">
                  Contact: <span className="font-semibold text-slate-800">{member?.phone || '—'}</span>
                </p>
              </div>

              {/* Payment Details */}
              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Payment Details
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {planName}
                </p>
                <p className="text-slate-600">
                  Duration: <span className="font-semibold text-slate-800">{planDuration}</span>
                </p>
                <p className="text-slate-600">
                  Payment Method: <span className="font-semibold text-slate-800 uppercase">{payment.paymentMethod}</span>
                </p>
                <p className="text-slate-600">
                  Staff: <span className="font-semibold text-slate-800">{recordedBy?.fullName || 'Front Desk'}</span>
                </p>
              </div>
            </div>

            {/* Compact Plan Summary Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Membership Plan</th>
                    <th className="py-2 px-3 text-center">Duration</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {planName}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {planDuration}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      {formatINR(totalFee)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Summary */}
            <div className="pt-1 flex justify-end">
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900 font-mono">{formatINR(totalFee)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-b border-slate-200 pb-1.5">
                  <span>Total Amount:</span>
                  <span className="font-mono text-sm">{formatINR(totalFee)}</span>
                </div>

                <div className="flex justify-between text-slate-900 font-semibold pt-1">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{formatINR(payment.amount)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>Remaining Balance:</span>
                  <span className={`font-mono font-bold ${balanceDue > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                    {formatINR(balanceDue)}
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  {balanceDue === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      PAID IN FULL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      PARTIAL PAYMENT
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Clean Footer */}
            <div className="pt-3 border-t border-slate-100 text-center space-y-0.5">
              <p className="text-xs text-slate-600 font-medium">
                Thank you for your payment!
              </p>
              {(phone || address) && (
                <p className="text-[11px] text-slate-400">
                  {phone ? `Contact: ${phone}` : ''} {address ? `• ${address}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Compact Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="h-9 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
              title="Share Receipt to Member on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share to WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-9 inline-flex items-center gap-1.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
