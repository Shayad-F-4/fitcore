import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Printer,
  Eye,
  X,
  CreditCard,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
  Calendar,
  MessageCircle,
  Wallet,
  Clock,
  RefreshCw,
  FileText,
  User,
} from 'lucide-react';
import { api } from '../api/client';
import { Payment } from '../types';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import { exportToCSV } from '../utils/csvExport';
import { Avatar } from '../components/Avatar';
import { sendWhatsAppDueReminder } from '../utils/whatsapp';
import { formatINR, formatDateIN, formatTimeIN } from '../utils/formatters';

interface BillingPageProps {
  onOpenReceipt?: (payment: any) => void;
  onOpenCollectDue?: (dueItem: any) => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({
  onOpenReceipt,
  onOpenCollectDue,
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'dues' | 'settlement'>('transactions');

  // Transactions State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [stats, setStats] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  // Filters for Transactions
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Date range reporting
  const [dateRangePreset, setDateRangePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_30' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Manual payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    memberId: '',
    amount: '',
    paymentMethod: 'UPI',
    type: 'MEMBERSHIP',
    notes: '',
  });
  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  // Pending Dues State
  const [pendingDues, setPendingDues] = useState<{
    duesCount: number;
    totalDuesAmount: number;
    memberships: any[];
  }>({ duesCount: 0, totalDuesAmount: 0, memberships: [] });
  const [loadingDues, setLoadingDues] = useState(false);
  const [duesSearch, setDuesSearch] = useState('');

  // Daily Shift Settlement State
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [settlementData, setSettlementData] = useState<{
    date: string;
    transactionCount: number;
    overallTotal: number;
    cashTotal: number;
    upiTotal: number;
    cardTotal: number;
    bankTotal: number;
    payments: any[];
  } | null>(null);
  const [loadingSettlement, setLoadingSettlement] = useState(false);

  // Apply Date Range presets for transactions
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateRangePreset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (dateRangePreset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (dateRangePreset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(todayStr);
    } else if (dateRangePreset === 'LAST_30') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(past);
      setEndDate(todayStr);
    }
  }, [dateRangePreset]);

  // Fetch transactions
  const fetchPaymentsData = async (page = 1) => {
    try {
      setLoading(true);
      const [payRes, statsRes] = await Promise.all([
        api.getPayments({
          page,
          limit: 15,
          method: methodFilter !== 'ALL' ? methodFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        api.getPaymentStats(),
      ]);

      let filtered = payRes.data || [];
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (p: Payment) =>
            p.receiptNumber?.toLowerCase().includes(q) ||
            p.member?.fullName?.toLowerCase().includes(q) ||
            p.member?.memberId?.toLowerCase().includes(q)
        );
      }

      setPayments(filtered);
      setPagination(payRes.pagination);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dues
  const fetchDuesData = async () => {
    try {
      setLoadingDues(true);
      const res = await api.getPendingDues();
      setPendingDues(res);
    } catch (err) {
      console.error('Failed to load pending dues:', err);
    } finally {
      setLoadingDues(false);
    }
  };

  // Fetch daily shift settlement
  const fetchSettlementData = async (dateStr?: string) => {
    try {
      setLoadingSettlement(true);
      const res = await api.getDailySettlement(dateStr || settlementDate);
      setSettlementData(res);
    } catch (err) {
      console.error('Failed to load daily settlement:', err);
    } finally {
      setLoadingSettlement(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchPaymentsData(1);
    } else if (activeTab === 'dues') {
      fetchDuesData();
    } else if (activeTab === 'settlement') {
      fetchSettlementData(settlementDate);
    }
  }, [activeTab, methodFilter, statusFilter, startDate, endDate, search, settlementDate]);

  // Auto-refresh when any payment, due, or membership changes across the app
  useEffect(() => {
    // Initial dues fetch
    api.getPendingDues().then(setPendingDues).catch(console.error);

    const handleDataChanged = (e: any) => {
      // Immediate optimistic update if a specific due was collected
      if (e?.detail?.action === 'DUE_COLLECTED' && e.detail.membershipId) {
        setPendingDues((prev) => {
          const remaining = (prev?.memberships || []).filter(
            (m: any) => m.membershipId !== e.detail.membershipId
          );
          const duesCount = remaining.length;
          const totalDuesAmount = remaining.reduce(
            (acc: number, m: any) => acc + (m.balanceDue || 0),
            0
          );
          return { duesCount, totalDuesAmount, memberships: remaining };
        });
      }

      // Re-fetch dues data from API to ensure 100% sync
      api.getPendingDues().then(setPendingDues).catch(console.error);

      // Re-fetch transactions table
      fetchPaymentsData(1);

      // Re-fetch shift settlement
      fetchSettlementData(settlementDate);
    };

    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, [settlementDate]);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const fullRes = await api.getPayments({
        page: 1,
        limit: 1000,
        method: methodFilter !== 'ALL' ? methodFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      let list = fullRes.data || [];
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        list = list.filter(
          (p: Payment) =>
            p.receiptNumber?.toLowerCase().includes(q) ||
            p.member?.fullName?.toLowerCase().includes(q) ||
            p.member?.memberId?.toLowerCase().includes(q)
        );
      }

      const headers = [
        'Receipt Number',
        'Member Name',
        'Member ID',
        'Phone',
        'Payment Date (DD/MM/YYYY)',
        'Amount (₹)',
        'Payment Method',
        'Status',
        'Transaction Type',
        'Balance Due (₹)',
        'Reference',
      ];

      const rows = list.map((p: Payment) => [
        p.receiptNumber,
        p.member?.fullName || '',
        p.member?.memberId || '',
        p.member?.phone || '',
        formatDateIN(p.paymentDate),
        p.amount,
        p.paymentMethod,
        p.status,
        p.type,
        p.balanceRemaining || 0,
        p.transactionRef || '',
      ]);

      const today = new Date().toISOString().split('T')[0];
      exportToCSV(`sagar_fitness_payments_${today}`, headers, rows);
    } catch (err: any) {
      alert(err.message || 'Failed to export payments to CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.memberId.trim() || !payForm.amount) {
      setPayError('Member ID and Amount are required.');
      return;
    }

    try {
      setPayLoading(true);
      setPayError(null);
      const res = await api.recordPayment({
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
      fetchPaymentsData(1);
      fetchDuesData();

      window.dispatchEvent(
        new CustomEvent('fitcore:data-changed', {
          detail: { action: 'PAYMENT_RECORDED', payment: res },
        })
      );

      if (res && onOpenReceipt) {
        onOpenReceipt(res);
      } else if (res) {
        setSelectedReceipt(res);
      }
    } catch (err: any) {
      setPayError(err.message || 'Failed to record payment');
    } finally {
      setPayLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setMethodFilter('ALL');
    setStatusFilter('ALL');
    setDateRangePreset('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasFilters =
    search !== '' ||
    methodFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    startDate !== '' ||
    endDate !== '' ||
    dateRangePreset !== 'ALL';

  const currentTotalAmount = payments.reduce((sum, p) => (p.status === 'PAID' ? sum + p.amount : sum), 0);
  const averageTicket = payments.length > 0 ? Math.round(currentTotalAmount / payments.length) : 0;

  // Filter dues list
  const filteredDues = (pendingDues?.memberships || []).filter((d: any) => {
    if (!duesSearch.trim()) return true;
    const q = duesSearch.toLowerCase().trim();
    return (
      d.member?.fullName?.toLowerCase().includes(q) ||
      d.member?.memberId?.toLowerCase().includes(q) ||
      d.member?.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Financials & POS Invoicing</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage payments, official member bills, pending dues, and daily cash settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {activeTab === 'transactions' && (
            <button
              onClick={handleExportCSV}
              disabled={isExporting || payments.length === 0}
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
              title="Download CSV spreadsheet of payments"
            >
              <div className="w-5.5 h-5.5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                <Download className="w-3.5 h-3.5" />
              </div>
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setPayError(null);
              setShowPayModal(true);
            }}
            className="inline-flex items-center gap-2.5 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-white/20 flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-sm">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-3 font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Transactions & Receipts
        </button>

        <button
          onClick={() => setActiveTab('dues')}
          className={`pb-3 px-3 font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'dues'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Pending Member Dues</span>
          {pendingDues.duesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {pendingDues.duesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settlement')}
          className={`pb-3 px-3 font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'settlement'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Shift & Daily Settlement
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: TRANSACTIONS & RECEIPTS LEDGER */}
      {/* ============================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Compact Relevant Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Filtered Collections</span>
                <div className="text-xl font-extrabold text-blue-700 mt-0.5">
                  {formatINR(currentTotalAmount)}
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">In view</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Receipts in View</span>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {pagination.total}
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">Total logged</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">All-Time Revenue</span>
                <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                  {formatINR(stats?.totalRevenue || 0)}
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">Lifetime</span>
            </div>
          </div>

          {/* Date Range Reporting Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date Range:
                </span>
                {(['THIS_MONTH', 'TODAY', 'LAST_30', 'ALL', 'CUSTOM'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDateRangePreset(preset)}
                    className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                      dateRangePreset === preset
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    {preset === 'THIS_MONTH'
                      ? 'This Month'
                      : preset === 'TODAY'
                      ? 'Today'
                      : preset === 'LAST_30'
                      ? 'Last 30 Days'
                      : preset === 'ALL'
                      ? 'All Time'
                      : 'Custom Range'}
                  </button>
                ))}
              </div>

              {dateRangePreset === 'CUSTOM' && (
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>

            {/* Search, Method & Status Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by member name or receipt #..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900"
                >
                  <option value="ALL">All Methods</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="REFUNDED">Refunded</option>
                </select>

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-2xs"
                    title="Clear Filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {loading && payments.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading payment records...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                No payment records found matching your filters.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Receipt #</th>
                        <th className="px-5 py-3">Member</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Method</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => {
                        const memberObj = p.member || {};
                        return (
                          <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-600">
                              {p.receiptNumber}
                            </td>

                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-slate-900">
                                {memberObj.fullName || 'Member'}
                              </div>
                              <div className="text-xs text-slate-500">
                                ID: {memberObj.memberId || '—'}
                              </div>
                            </td>

                            <td className="px-5 py-3.5 text-sm text-slate-500 font-medium">
                              {formatDateIN(p.paymentDate)}
                            </td>

                            <td className="px-5 py-3.5 font-bold text-slate-900">
                              {formatINR(p.amount)}
                            </td>

                            <td className="px-5 py-3.5 text-xs text-slate-600">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium border border-slate-200">
                                {p.paymentMethod}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  p.status === 'PAID'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : p.status === 'PARTIAL'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    if (onOpenReceipt) onOpenReceipt(p);
                                    else setSelectedReceipt(p);
                                  }}
                                  className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                  title="View & Print Official Bill"
                                >
                                  <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                                    <Printer className="w-3 h-3" />
                                  </div>
                                  <span>View Bill</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (Zero Sideways Scrolling) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {payments.map((p) => {
                    const memberObj = p.member || {};
                    return (
                      <div key={p._id} className="p-4 space-y-3 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold text-blue-600 block">
                              {p.receiptNumber}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 mt-0.5 truncate">
                              {memberObj.fullName || 'Member'}
                            </h4>
                            <p className="text-xs text-slate-500 font-mono">
                              ID: {memberObj.memberId || '—'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black text-slate-900">
                              {formatINR(p.amount)}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                              {formatDateIN(p.paymentDate)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Method:</span>
                            <span className="px-2 py-0.5 rounded-md bg-white text-xs font-semibold text-slate-700 border border-slate-200">
                              {p.paymentMethod}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status:</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                p.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : p.status === 'PARTIAL'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenReceipt) onOpenReceipt(p);
                            else setSelectedReceipt(p);
                          }}
                          className="w-full min-h-[44px] h-11 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs"
                        >
                          <Printer className="w-4 h-4 text-blue-600" />
                          <span>View Official Bill / Receipt</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {pagination.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="text-center sm:text-left">
                  Showing <span className="font-semibold text-slate-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-semibold text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                  <span className="font-semibold text-slate-900">{pagination.total}</span> payments
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchPaymentsData(pagination.page - 1)}
                    className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs hover:shadow-xs flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-slate-700 px-1">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchPaymentsData(pagination.page + 1)}
                    className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs hover:shadow-xs flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PENDING MEMBER DUES */}
      {/* ============================================================== */}
      {activeTab === 'dues' && (
        <div className="space-y-6">
          {/* Compact Dues Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-amber-200 bg-amber-50/40 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">Total Outstanding Balance</span>
                <div className="text-xl font-extrabold text-amber-800 mt-0.5">
                  {formatINR(pendingDues.totalDuesAmount)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold border border-amber-200 shadow-2xs">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Members with Balance Due</span>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">{pendingDues.duesCount}</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-2xs">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Dues Search & Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={duesSearch}
                  onChange={(e) => setDuesSearch(e.target.value)}
                  placeholder="Search member name or ID..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900 placeholder-slate-400"
                />
              </div>

              <button
                onClick={fetchDuesData}
                disabled={loadingDues}
                className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingDues ? 'animate-spin text-blue-600' : ''}`} />
                <span>Refresh Dues</span>
              </button>
            </div>

            {loadingDues ? (
              <div className="p-12 text-center text-sm text-slate-500">Checking pending dues...</div>
            ) : filteredDues.length === 0 ? (
              <div className="p-12 text-center text-sm text-emerald-700 bg-emerald-50/40">
                🎉 No pending dues! All members have cleared their subscription fees.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Member</th>
                        <th className="px-5 py-3">Plan</th>
                        <th className="px-5 py-3">Total Fee</th>
                        <th className="px-5 py-3">Amount Paid</th>
                        <th className="px-5 py-3">Pending Due</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDues.map((d: any) => {
                        const m = d.member || {};
                        const p = d.plan || {};

                        return (
                          <tr key={d.membershipId} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  src={m.photoUrl}
                                  name={m.fullName}
                                  sizeClassName="w-9 h-9"
                                  shape="rounded-full"
                                  badgeColor="bg-amber-100 text-amber-800"
                                  className="shrink-0"
                                />
                                <div>
                                  <div className="font-semibold text-xs text-slate-900">{m.fullName}</div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    ID: {m.memberId} • {m.phone}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 text-xs text-slate-800 font-medium">
                              {p.name || 'Membership'}
                            </td>

                            <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">
                              {formatINR(d.amountDue)}
                            </td>

                            <td className="px-5 py-3.5 text-xs text-emerald-700 font-semibold font-mono">
                              {formatINR(d.amountPaid)}
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                {formatINR(d.balanceDue)} Due
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {m.phone && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      sendWhatsAppDueReminder({
                                        name: m.fullName,
                                        phone: m.phone,
                                        dueAmount: d.balanceDue,
                                        planName: p.name,
                                      })
                                    }
                                    className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                    title="Send WhatsApp Payment Reminder"
                                  >
                                    <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                                      <MessageCircle className="w-3 h-3" />
                                    </div>
                                    <span>WhatsApp</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenCollectDue) {
                                      onOpenCollectDue(d);
                                    }
                                  }}
                                  className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-amber-800 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                  title="Collect Outstanding Due"
                                >
                                  <div className="w-5.5 h-5.5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 transition-colors group-hover:bg-amber-100">
                                    <span className="text-xs font-bold">₹</span>
                                  </div>
                                  <span>Collect Due</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (Zero Sideways Scrolling) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredDues.map((d: any) => {
                    const m = d.member || {};
                    const p = d.plan || {};

                    return (
                      <div key={d.membershipId} className="p-4 space-y-3 bg-white">
                        <div className="flex items-start gap-3">
                          <Avatar
                            src={m.photoUrl}
                            name={m.fullName}
                            sizeClassName="w-11 h-11"
                            shape="rounded-full"
                            badgeColor="bg-amber-100 text-amber-800 border-amber-200"
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {m.fullName}
                            </h4>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              ID: {m.memberId} {m.phone ? `• ${m.phone}` : ''}
                            </div>
                            <span className="inline-block mt-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {p.name || 'Membership'}
                            </span>
                          </div>
                        </div>

                        {/* Financial Metrics Strip */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total</span>
                            <span className="text-xs font-semibold text-slate-700 block mt-0.5 font-mono">{formatINR(d.amountDue)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Paid</span>
                            <span className="text-xs font-bold text-emerald-700 block mt-0.5 font-mono">{formatINR(d.amountPaid)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">Pending</span>
                            <span className="text-xs font-black text-amber-800 block mt-0.5 font-mono">{formatINR(d.balanceDue)}</span>
                          </div>
                        </div>

                        {/* Touch Actions: 44px Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {m.phone && (
                            <button
                              type="button"
                              onClick={() =>
                                sendWhatsAppDueReminder({
                                  name: m.fullName,
                                  phone: m.phone,
                                  dueAmount: d.balanceDue,
                                  planName: p.name,
                                })
                              }
                              className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 transition-all shadow-2xs"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenCollectDue) {
                                onOpenCollectDue(d);
                              }
                            }}
                            className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 active:scale-95 transition-all shadow-2xs"
                          >
                            <span className="text-sm font-bold">₹</span>
                            <span>Collect Due</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: SHIFT & DAILY CASH SETTLEMENT */}
      {/* ============================================================== */}
      {activeTab === 'settlement' && (
        <div className="space-y-6">
          {/* Settlement Date Selector & Print Slip */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Shift Closing & Cash Drawer Settlement
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Reconcile cash in counter drawer vs UPI / QR and cards before shift handover.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500 font-medium">Date:</span>
                <input
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-xs font-semibold text-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="group inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
              >
                <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100">
                  <Printer className="w-3.5 h-3.5" />
                </div>
                <span>Print Shift Sheet</span>
              </button>
            </div>
          </div>

          {/* Settlement Cash vs UPI vs Card Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash in Counter</span>
                <span className="text-base">💵</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-700">
                {formatINR(settlementData?.cashTotal || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Physical cash to count</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">UPI / QR Collections</span>
                <span className="text-base">📱</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-blue-700">
                {formatINR(settlementData?.upiTotal || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Digital QR payments</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Card & Bank</span>
                <span className="text-base">💳</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-purple-700">
                {formatINR((settlementData?.cardTotal || 0) + (settlementData?.bankTotal || 0))}
              </div>
              <p className="text-xs text-slate-400 mt-1">POS machine & transfers</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs bg-blue-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Total Shift Collection</span>
                <span className="text-base">💰</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatINR(settlementData?.overallTotal || 0)}
              </div>
              <p className="text-xs text-blue-700 mt-1">
                {settlementData?.transactionCount || 0} transactions total
              </p>
            </div>
          </div>

          {/* Printable Shift Settlement Sheet & Transaction Details */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#202124]">
                Receipt Breakdown for {formatDateIN(settlementDate)}
              </h4>
              <span className="text-xs text-gray-500 font-mono">
                {settlementData?.payments?.length || 0} Receipts Logged
              </span>
            </div>

            {loadingSettlement ? (
              <div className="p-12 text-center text-sm text-gray-500">Calculating settlement...</div>
            ) : settlementData?.payments?.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                No transactions recorded on this date.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
                      <tr>
                        <th className="px-5 py-3">Receipt #</th>
                        <th className="px-5 py-3">Time</th>
                        <th className="px-5 py-3">Member</th>
                        <th className="px-5 py-3">Cashier</th>
                        <th className="px-5 py-3">Method</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {settlementData?.payments.map((p: any) => (
                        <tr key={p._id} className="hover:bg-gray-50/75 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs font-semibold text-blue-600">
                            {p.receiptNumber}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                            {formatTimeIN(p.paymentDate)}
                          </td>
                          <td className="px-5 py-3 text-xs font-semibold text-[#202124]">
                            {p.member?.fullName || 'Member'}
                            <span className="text-[11px] text-gray-400 font-normal font-mono ml-1.5">
                              ({p.member?.memberId})
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {p.recordedBy?.fullName || 'Desk Staff'}
                          </td>
                          <td className="px-5 py-3 text-xs">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                p.paymentMethod === 'CASH'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : p.paymentMethod === 'UPI'
                                  ? 'bg-blue-50 text-blue-800'
                                  : 'bg-purple-50 text-purple-800'
                              }`}
                            >
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-xs text-gray-900">
                            {formatINR(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (Zero Sideways Scrolling) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {settlementData?.payments.map((p: any) => (
                    <div key={p._id} className="p-4 space-y-2.5 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-blue-600 block">
                            {p.receiptNumber}
                          </span>
                          <h5 className="font-bold text-sm text-slate-900 mt-0.5 truncate">
                            {p.member?.fullName || 'Member'}
                          </h5>
                          <span className="text-xs text-slate-500 font-mono">
                            ID: {p.member?.memberId || '—'}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-black text-slate-900">
                            {formatINR(p.amount)}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            {formatTimeIN(p.paymentDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <span className="text-slate-500">
                          Cashier: <strong className="text-slate-700">{p.recordedBy?.fullName || 'Desk Staff'}</strong>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.paymentMethod === 'CASH'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : p.paymentMethod === 'UPI'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {p.paymentMethod}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Handover Signoff Box for Printing */}
            <div className="p-6 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-gray-600">
              <div>
                <span className="font-semibold text-gray-700">Cash Drawer Count Verified:</span>
                <p className="text-[11px] text-gray-500 mt-0.5">Physical cash matches {formatINR(settlementData?.cashTotal || 0)}</p>
              </div>

              <div className="flex items-center gap-8 text-center">
                <div className="border-t border-gray-400 pt-1 w-36">
                  <span className="text-[11px] font-medium text-gray-700">Front Desk Staff</span>
                </div>
                <div className="border-t border-gray-400 pt-1 w-36">
                  <span className="text-[11px] font-medium text-gray-700">Gym Manager / Owner</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-modal overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#202124]">Record Payment</h3>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="p-6 space-y-4">
              {payError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Member ID or Search *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FC-1001"
                  value={payForm.memberId}
                  onChange={(e) => setPayForm({ ...payForm, memberId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 1299"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Payment Method
                </label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:border-blue-600 focus:outline-none bg-white"
                >
                  <option value="UPI">UPI / QR</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Transaction reference..."
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="w-full sm:w-auto min-h-[44px] h-11 px-4 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="w-full sm:w-auto min-h-[44px] h-11 px-6 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-xs disabled:opacity-50"
                >
                  {payLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fallback internal Receipt Modal */}
      <ReceiptModal
        payment={selectedReceipt}
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};
