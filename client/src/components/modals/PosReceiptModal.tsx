import React, { useRef, useState } from 'react';
import { X, Printer, Download, Dumbbell, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { InventorySale } from '../../types';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { sendWhatsAppPosReceipt } from '../../utils/whatsapp';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PosReceiptModalProps {
  sale: InventorySale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({ sale, isOpen, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      const imgWidth = 148;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`POS-Receipt-${sale.receiptNumber}.pdf`);
      setSuccessMsg('Receipt downloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to generate receipt PDF', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = sale.customerPhone || (sale.customerMember as any)?.phone;
    if (!phone) {
      alert('No customer phone number available for this sale.');
      return;
    }

    sendWhatsAppPosReceipt({
      customerName: sale.customerName || 'Customer',
      phone,
      receiptNumber: sale.receiptNumber,
      items: sale.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        lineTotal: it.lineTotal,
      })),
      grandTotal: sale.grandTotal,
      paymentMethod: sale.paymentMethod,
      date: sale.saleDate,
      gymName: 'Sagar Fitness Gym',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="w-full max-w-lg max-h-[96dvh] sm:max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto print:shadow-none print:border-none print:max-w-none">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">Sale Receipt</h3>
              <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 truncate">#{sale.receiptNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              type="button"
              className="px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDownloading ? 'Saving...' : 'PDF'}</span>
            </button>
            {(sale.customerPhone || (sale.customerMember as any)?.phone) && (
              <button
                onClick={handleWhatsApp}
                type="button"
                className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-2xs"
                title="Send via WhatsApp"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-white text-white" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mx-3 sm:mx-5 mt-2 sm:mt-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 print:hidden">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {successMsg}
          </div>
        )}

        {/* Printable Receipt Paper Container */}
        <div ref={receiptRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7 bg-white text-slate-900 select-text">
          {/* Gym Header */}
          <div className="text-center pb-4 sm:pb-5 border-b border-dashed border-slate-300">
            <div className="inline-flex items-center justify-center gap-2 mb-1">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                Sagar Fitness Gym
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">Official Gym & Sports Nutrition Counter</p>
            <p className="text-[11px] text-slate-500">Pathardi, Maharashtra, India</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tax-Free Direct Fitness Billing</p>
          </div>

          {/* Receipt Meta */}
          <div className="py-4 grid grid-cols-2 gap-3 text-xs border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Receipt Number
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                #{sale.receiptNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Date & Time
              </span>
              <span className="font-medium text-slate-700">
                {formatDateIN(sale.saleDate)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Customer
              </span>
              <span className="font-semibold text-slate-900">
                {sale.customerName || 'Walk-in Customer'}
              </span>
              {sale.customerPhone && (
                <span className="text-[11px] text-slate-500 block">{sale.customerPhone}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Cashier / Desk
              </span>
              <span className="font-medium text-slate-700">
                {sale.cashier?.fullName || 'Staff'}
              </span>
            </div>
          </div>

          {/* Purchased Items Table */}
          <div className="py-4 border-b border-slate-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[260px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider text-left">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((it, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-2 pr-2">
                      <div className="font-semibold text-slate-900">{it.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                    </td>
                    <td className="py-2 text-center font-medium">{it.quantity}</td>
                    <td className="py-2 text-right font-mono text-slate-600">{formatINR(it.unitPrice)}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                      {formatINR(it.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals */}
          <div className="pt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatINR(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount:</span>
                <span className="font-mono">- {formatINR(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total Paid:</span>
              <span className="font-mono text-base text-blue-700">{formatINR(sale.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>Payment Mode:</span>
              <span className="font-bold text-slate-700 uppercase">{sale.paymentMethod}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200 text-center">
            <p className="text-[11px] font-semibold text-slate-700">Thank you for your purchase!</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Please retain this receipt for returns or exchanges within 7 days.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
