import React, { useState, useEffect } from 'react';
import {
  Receipt,
  DollarSign,
  CreditCard,
  Plus,
  Printer,
  Search,
  Filter,
  CheckCircle,
  TrendingUp,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { Payment } from '../types';
import { ReceiptModal } from '../components/modals/ReceiptModal';

export const BillingPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [stats, setStats] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Manual payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    memberId: '',
    amount: '',
    paymentMethod: 'UPI',
    type: 'MEMBERSHIP',
    notes: '',
  });

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      const [payRes, statsRes] = await Promise.all([
        api.getPayments({ page, limit: 15, method: methodFilter }),
        api.getPaymentStats(),
      ]);
      setPayments(payRes.data);
      setPagination(payRes.pagination);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load billing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [methodFilter]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.recordPayment({
        ...payForm,
        amount: Number(payForm.amount),
      });
      setShowPayModal(false);
      setPayForm({
        memberId: '',
        amount: '',
        paymentMethod: 'UPI',
        type: 'MEMBERSHIP',
        notes: '',
      });
      fetchData(1);
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#273129]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-main tracking-tight">
              Billing & Transaction Ledger
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#111613] text-primary border border-[#273129] font-bold">
              {pagination.total} Invoices
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Real-time revenue accounting, digital receipts, and payment method audit trails.
          </p>
        </div>

        <button
          onClick={() => setShowPayModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs tracking-wider uppercase transition-all shadow-glow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Record Payment</span>
        </button>
      </div>

      {/* Revenue Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] shadow-card">
          <span className="text-xs font-mono uppercase tracking-wider text-text-dim">
            Total Gross Revenue
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display font-black text-3xl text-text-main">
              ${stats?.totalRevenue?.toLocaleString() || '0'}
            </span>
            <span className="text-xs font-mono text-primary font-bold">USD</span>
          </div>
          <p className="text-xs text-text-dim mt-2">Lifetime fitness dues received</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] shadow-card">
          <span className="text-xs font-mono uppercase tracking-wider text-text-dim">
            Current Month Intake
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display font-black text-3xl text-status-success">
              ${stats?.monthRevenue?.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-xs text-status-success flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active monthly collections on target</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] shadow-card">
          <span className="text-xs font-mono uppercase tracking-wider text-text-dim">
            Payment Method Split
          </span>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {(stats?.methodBreakdown || []).map((mb: any) => (
              <span
                key={mb._id}
                className="text-[11px] font-mono px-2 py-1 rounded-lg bg-[#080B0A] border border-[#273129] text-text-muted"
              >
                {mb._id}: <strong>${mb.total}</strong> ({mb.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#111613] border border-[#273129] flex items-center justify-between shadow-card">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-text-dim" />
          <span className="text-xs font-semibold text-text-muted">Filter Method:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'UPI', 'CREDIT_CARD', 'CASH', 'DEBIT_CARD'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`text-xs px-2.5 py-1 rounded-lg font-mono transition-colors ${
                  methodFilter === m
                    ? 'bg-primary text-[#080B0A] font-bold'
                    : 'bg-[#080B0A] text-text-dim hover:text-text-main border border-[#273129]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="p-4 rounded-2xl bg-[#111613] border border-[#273129] shadow-card overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-text-dim font-mono">
            Loading Invoices...
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-dim">
            No transactions found for selected filter.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#273129] text-text-dim text-[11px] font-mono uppercase">
                <th className="text-left pb-3 font-medium">Receipt No.</th>
                <th className="text-left pb-3 font-medium">Athlete</th>
                <th className="text-left pb-3 font-medium">Purpose</th>
                <th className="text-left pb-3 font-medium">Method</th>
                <th className="text-left pb-3 font-medium">Timestamp</th>
                <th className="text-right pb-3 font-medium">Amount</th>
                <th className="text-right pb-3 font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#273129]/60">
              {payments.map((p) => {
                const member = p.member;
                return (
                  <tr key={p._id} className="hover:bg-[#171E19]/40 transition-colors">
                    <td className="py-3 font-mono font-bold text-primary">{p.receiptNumber}</td>
                    <td className="py-3">
                      <div>
                        <p className="font-semibold text-text-main">{member?.fullName || 'Walk-in Athlete'}</p>
                        <p className="text-[10px] text-text-dim font-mono">{member?.memberId}</p>
                      </div>
                    </td>
                    <td className="py-3 text-text-muted">{p.notes || p.type}</td>
                    <td className="py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171E19] text-text-muted border border-[#273129]">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-text-dim">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-text-main text-sm">
                      ${p.amount.toFixed(2)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="px-2.5 py-1 rounded-lg bg-[#171E19] hover:bg-primary hover:text-[#080B0A] text-text-muted text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <ReceiptModal
        payment={selectedReceipt}
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
      />

      {/* Manual Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#111613] border border-[#273129] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#273129] flex items-center justify-between bg-[#171E19]/80">
              <h3 className="font-display font-bold text-base text-text-main">
                Record New Payment
              </h3>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-1 rounded-lg text-text-dim hover:text-text-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  Athlete Member ID or Mongo ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FC-1001"
                  value={payForm.memberId}
                  onChange={(e) => setPayForm({ ...payForm, memberId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-sm text-text-main font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="129"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-sm text-text-main font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Payment Method</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-text-muted mb-1">Payment Type</label>
                  <select
                    value={payForm.type}
                    onChange={(e) => setPayForm({ ...payForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="MEMBERSHIP">Membership</option>
                    <option value="RENEWAL">Renewal</option>
                    <option value="PERSONAL_TRAINING">PT Session</option>
                    <option value="DAY_PASS">Day Pass</option>
                    <option value="MERCHANDISE">Merchandise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Invoice Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 1-Month personal coaching bundle"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#273129] text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#171E19] text-xs font-semibold text-text-main"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs uppercase"
                >
                  Record & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
