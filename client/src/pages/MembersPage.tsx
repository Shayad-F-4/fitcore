import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Search,
  Plus,
  MoreVertical,
  X,
  Printer,
  Snowflake,
  Sun,
  Archive,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Download,
  RotateCcw,
  RotateCw,
  Trash2,
  Check,
  Filter,
  Sparkles,
  Phone,
  ArrowUpDown,
  DollarSign,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Member, Membership, MembershipPlan } from '../types';
import { RenewModal } from '../components/modals/RenewModal';
import { FreezeModal } from '../components/modals/FreezeModal';
import { MemberCardModal } from '../components/modals/MemberCardModal';
import { MemberProfileModal } from '../components/modals/MemberProfileModal';
import { DeleteMemberModal } from '../components/modals/DeleteMemberModal';
import { ArchiveMemberModal } from '../components/modals/ArchiveMemberModal';
import { Avatar } from '../components/Avatar';
import { exportToCSV } from '../utils/csvExport';
import { sendWhatsAppReminder, openWhatsApp, getWelcomeMessage, sendWhatsAppDueReminder } from '../utils/whatsapp';
import { formatINR, formatDateIN, formatDisplayPhoneIN } from '../utils/formatters';
import { WhatsAppIcon } from '../components/WhatsAppIcon';

interface MembersPageProps {
  onOpenRegister: () => void;
  onOpenCheckIn?: () => void;
  onOpenCollectDue?: (item: any) => void;
  onOpenReceipt?: (payment: any) => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({ onOpenRegister, onOpenCollectDue, onOpenReceipt }) => {
  const { user, activeBranch } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN';

  // Core members and plans state
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Top Category Tabs: All, New, Expiring Soon, Expired, Female
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'EXPIRING_SOON' | 'EXPIRED' | 'FEMALE'>('ALL');

  // Unified Search & Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (280ms) for responsive typing and deduplicated API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const [genderFilter, setGenderFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [joiningDateFilter, setJoiningDateFilter] = useState('ALL');
  const [expiryPeriodFilter, setExpiryPeriodFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT');

  // Active / Archived directory toggle
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Real Database Statistics for Top Compact Summary Cards
  const [stats, setStats] = useState<{
    total: number;
    newMembers: number;
    active: number;
    expiringSoon: number;
    expired: number;
    pendingDues: number;
    femaleMembers: number;
    archived: number;
  }>({
    total: 0,
    newMembers: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    pendingDues: 0,
    femaleMembers: 0,
    archived: 0,
  });

  // Active 3-dot dropdown menu ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Deletion & Archival state
  const [deleteTargetMember, setDeleteTargetMember] = useState<{
    _id: string;
    memberId: string;
    fullName: string;
  } | null>(null);
  const [archiveTargetMember, setArchiveTargetMember] = useState<{
    _id: string;
    memberId: string;
    fullName: string;
    phone?: string;
    photoUrl?: string;
  } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [selectedCardMember, setSelectedCardMember] = useState<Member | null>(null);
  const [selectedRenewSub, setSelectedRenewSub] = useState<Membership | null>(null);
  const [selectedFreezeSub, setSelectedFreezeSub] = useState<Membership | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load available plans once
  useEffect(() => {
    api.getPlans(false).then(setPlans).catch(console.error);
  }, []);

  // Fetch real statistics from database
  const fetchStats = async () => {
    try {
      const res = await api.getMemberStats(activeBranch?._id);
      setStats({
        total: res.total || 0,
        newMembers: res.newMembers || 0,
        active: res.active || 0,
        expiringSoon: res.expiringSoon || 0,
        expired: res.expired || 0,
        pendingDues: res.pendingDues || 0,
        femaleMembers: res.femaleMembers || 0,
        archived: res.archived || 0,
      });
    } catch (e) {
      console.error('Failed to load member stats', e);
    }
  };

  // Fetch filtered members from database
  const fetchMembers = async (page = 1, searchQuery = debouncedSearch) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMembers({
        page,
        limit: 12,
        search: searchQuery.trim(),
        tab: activeTab,
        gender: genderFilter !== 'ALL' ? genderFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
        plan: planFilter !== 'ALL' ? planFilter : undefined,
        joiningDate: joiningDateFilter !== 'ALL' ? joiningDateFilter : undefined,
        expiryPeriod: expiryPeriodFilter !== 'ALL' ? expiryPeriodFilter : undefined,
        sortBy: sortBy !== 'DEFAULT' ? sortBy : undefined,
        branch: viewMode === 'ARCHIVED' ? undefined : activeBranch?._id,
        isArchived: viewMode === 'ARCHIVED',
      });
      setMembers(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Failed to load members:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch members whenever active tab or debounced filter criteria changes
  useEffect(() => {
    fetchMembers(1, debouncedSearch);
  }, [
    activeTab,
    debouncedSearch,
    genderFilter,
    statusFilter,
    paymentStatusFilter,
    planFilter,
    joiningDateFilter,
    expiryPeriodFilter,
    sortBy,
    activeBranch,
    viewMode,
  ]);

  // Load gym summary stats when active branch or directory mode changes
  useEffect(() => {
    fetchStats();
  }, [activeBranch, viewMode]);

  // Real-time auto refresh without manual page reload
  useEffect(() => {
    const handleDataChanged = () => {
      fetchMembers(pagination.page);
      fetchStats();
    };
    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, [pagination.page, viewMode, activeBranch]);

  // Unfreeze membership
  const handleThaw = async (subId: string) => {
    try {
      await api.thawMembership(subId);
      setActiveMenuId(null);
      fetchMembers(pagination.page);
      fetchStats();
    } catch (err) {
      console.error('Failed to unfreeze:', err);
    }
  };

  // Restore archived member
  const handleRestore = async (member: Member) => {
    try {
      setActionError(null);
      setActionSuccess(null);
      await api.restoreMember(member._id);
      setActionSuccess(`Member "${member.fullName}" (${member.memberId}) was successfully restored to the active directory.`);
      fetchMembers(pagination.page);
      fetchStats();
    } catch (err: any) {
      setActionError(err.message || 'Failed to restore member');
    }
  };

  // Reset all filters back to default
  const resetAllFilters = () => {
    setSearch('');
    setActiveTab('ALL');
    setGenderFilter('ALL');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setPlanFilter('ALL');
    setJoiningDateFilter('ALL');
    setExpiryPeriodFilter('ALL');
    setSortBy('DEFAULT');
  };

  const hasActiveFilters =
    search !== '' ||
    genderFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    paymentStatusFilter !== 'ALL' ||
    planFilter !== 'ALL' ||
    joiningDateFilter !== 'ALL' ||
    expiryPeriodFilter !== 'ALL' ||
    sortBy !== 'DEFAULT' ||
    activeTab !== 'ALL';

  // Export filtered members to CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await api.getMembers({
        page: 1,
        limit: 1000,
        search: search.trim(),
        tab: activeTab,
        gender: genderFilter !== 'ALL' ? genderFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
        plan: planFilter !== 'ALL' ? planFilter : undefined,
        joiningDate: joiningDateFilter !== 'ALL' ? joiningDateFilter : undefined,
        expiryPeriod: expiryPeriodFilter !== 'ALL' ? expiryPeriodFilter : undefined,
        sortBy: sortBy !== 'DEFAULT' ? sortBy : undefined,
        branch: activeBranch?._id,
        isArchived: viewMode === 'ARCHIVED',
      });

      const exportList = res.data || [];
      const headers = [
        'Member ID',
        'Full Name',
        'Gender',
        'Phone',
        'Email',
        'Membership Status',
        'Payment Status',
        'Balance Due (₹)',
        'Current Plan',
        'Start Date',
        'Expiration Date',
        'Expiry Details',
        'Branch',
        'Join Date',
      ];

      const rows = exportList.map((m: Member) => {
        const sub = m.currentMembership;
        return [
          m.memberId,
          m.fullName,
          m.gender || 'Unspecified',
          m.phone,
          m.email || '',
          m.status,
          m.paymentStatus || (m.balanceDue && m.balanceDue > 0 ? 'PENDING_PAYMENT' : 'PAID'),
          m.balanceDue ?? 0,
          sub?.plan ? (sub.plan as any).name : 'No Plan',
          sub?.startDate ? formatDateIN(sub.startDate) : '',
          sub?.expiryDate ? formatDateIN(sub.expiryDate) : '',
          m.expiryLabel || '',
          m.branch ? (m.branch as any).name : '',
          formatDateIN(m.joinDate || m.createdAt),
        ];
      });

      const todayStr = new Date().toISOString().split('T')[0];
      exportToCSV(`sagar_fitness_members_${activeTab.toLowerCase()}_${todayStr}`, headers, rows);
    } catch (err: any) {
      alert(err.message || 'Failed to export members to CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Membership status badge (Active, Expiring Soon, Expired, Frozen, Pending)
  const getMembershipStatusBadge = (member: Member) => {
    if (member.isExpiringSoon || (member.daysRemaining !== null && member.daysRemaining !== undefined && member.daysRemaining >= 0 && member.daysRemaining <= 7 && member.status === 'ACTIVE')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
          Expiring Soon
        </span>
      );
    }

    switch (member.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Expired
          </span>
        );
      case 'FROZEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Frozen
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
            {member.status}
          </span>
        );
    }
  };

  // Independent Payment status badge (Paid vs Pending Payment)
  const getPaymentStatusBadge = (member: Member) => {
    const hasDues = (member.balanceDue && member.balanceDue > 0) || member.paymentStatus === 'PENDING_PAYMENT';

    if (hasDues) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenCollectDue && member.currentMembership) {
              onOpenCollectDue({
                membershipId: member.currentMembership._id,
                member: {
                  _id: member._id,
                  fullName: member.fullName,
                  memberId: member.memberId,
                  phone: member.phone,
                  email: member.email,
                },
                plan: {
                  name: (member.currentMembership.plan as any)?.name || 'Membership Plan',
                  price: (member.currentMembership.plan as any)?.price || member.balanceDue || 0,
                },
                amountDue: member.totalDue || member.balanceDue || 0,
                amountPaid: member.totalPaid || 0,
                balanceDue: member.balanceDue || 0,
              });
            }
          }}
          className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 active:scale-95 transition-all"
          title="Click to collect pending due"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Due: {formatINR(member.balanceDue || 0)}</span>
        </button>
      );
    }

    if (member.paymentStatus === 'PAID' || member.currentMembership) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Paid</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
        No Dues
      </span>
    );
  };

  // Gender badge
  const getGenderBadge = (gender?: string) => {
    if (!gender) return null;
    const g = gender.toUpperCase();
    if (g === 'FEMALE') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
          Female
        </span>
      );
    }
    if (g === 'MALE') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Male
        </span>
      );
    }
    if (g === 'OTHER') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
          Other
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
        Unspecified
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Members Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organized, fast, and reliable management for Sagar Fitness Gym.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
            title="Export filtered member list to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            id="add-member-btn"
            onClick={onOpenRegister}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* 1. TOP COMPACT SUMMARY CARDS (Clickable Filter Triggers with Real Database Counts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Card 1: Total Members */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('ALL');
            setStatusFilter('ALL');
            setPaymentStatusFilter('ALL');
          }}
          className={`p-3.5 rounded-2xl text-left border transition-all active:scale-98 shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            activeTab === 'ALL' && statusFilter === 'ALL' && paymentStatusFilter === 'ALL'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Total Members</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900 font-mono">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">All active directory</div>
          </div>
        </button>

        {/* Card 2: New Members (Previous 30 calendar days in Asia/Kolkata) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('NEW');
            setJoiningDateFilter('LAST_30_DAYS');
          }}
          className={`p-3.5 rounded-2xl text-left border transition-all active:scale-98 shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            activeTab === 'NEW'
              ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">New Members</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-indigo-700 font-mono">{stats.newMembers}</div>
            <div className="text-[10px] text-indigo-500 mt-0.5">Joined in last 30d</div>
          </div>
        </button>

        {/* Card 3: Active Members */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('ALL');
            setStatusFilter('ACTIVE');
          }}
          className={`p-3.5 rounded-2xl text-left border transition-all active:scale-98 shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            activeTab === 'ALL' && statusFilter === 'ACTIVE'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Active Members</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-emerald-700 font-mono">{stats.active}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Active pass holders</div>
          </div>
        </button>

        {/* Card 4: Expiring Soon (Next 7 calendar days inclusive) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('EXPIRING_SOON');
          }}
          className={`p-3.5 rounded-2xl text-left border transition-all active:scale-98 shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            activeTab === 'EXPIRING_SOON'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Expiring Soon</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-amber-700 font-mono">{stats.expiringSoon}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Within 7 days</div>
          </div>
        </button>

        {/* Card 5: Expired Members */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('EXPIRED');
          }}
          className={`p-3.5 rounded-2xl text-left border transition-all active:scale-98 shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            activeTab === 'EXPIRED'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Expired Members</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-rose-700 font-mono">{stats.expired}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Needs renewal</div>
          </div>
        </button>

        {/* Card 6: Pending Dues */}
        <button
          type="button"
          onClick={() => {
            setPaymentStatusFilter('PENDING_PAYMENT');
          }}
          className={`p-3.5 rounded-2xl text-left border transition-all active:scale-98 shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            paymentStatusFilter === 'PENDING_PAYMENT'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Pending Dues</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-purple-700 font-mono">{stats.pendingDues}</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Has fee balance</div>
          </div>
        </button>
      </div>

      {/* 2. MEMBER CATEGORY TABS (Reusable Single Table Interface) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pt-1">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Tab 1: All Members */}
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
            }`}
          >
            <span>All Members</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'ALL' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              {stats.total}
            </span>
          </button>

          {/* Tab 2: New Members */}
          <button
            type="button"
            onClick={() => setActiveTab('NEW')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'NEW'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Members</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'NEW' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              {stats.newMembers}
            </span>
          </button>

          {/* Tab 3: Expiring Soon */}
          <button
            type="button"
            onClick={() => setActiveTab('EXPIRING_SOON')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EXPIRING_SOON'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring Soon</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'EXPIRING_SOON' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
              {stats.expiringSoon}
            </span>
          </button>

          {/* Tab 4: Expired Members */}
          <button
            type="button"
            onClick={() => setActiveTab('EXPIRED')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EXPIRED'
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Expired Members</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'EXPIRED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
              {stats.expired}
            </span>
          </button>

          {/* Tab 5: Female Members (Filters existing records safely by gender) */}
          <button
            type="button"
            onClick={() => setActiveTab('FEMALE')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all relative flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'FEMALE'
                ? 'text-pink-600 border-b-2 border-pink-600'
                : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
            }`}
          >
            <span>Female Members</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'FEMALE' ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>
              {stats.femaleMembers}
            </span>
          </button>
        </div>

        {/* Archived Switch (For Administrative Records) */}
        <div className="flex items-center gap-2 self-end sm:self-center pb-2">
          <button
            type="button"
            onClick={() => {
              setViewMode(viewMode === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE');
              resetAllFilters();
            }}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold transition-all border ${
              viewMode === 'ARCHIVED'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle between active directory and archived members"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived ({stats.archived})</span>
          </button>
        </div>
      </div>

      {/* Notification Banners */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl shadow-2xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. UNIFIED SEARCH, COMPACT FILTERS & SORTING BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Unified Search Field: Name, Phone, Member ID */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-900 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Gender Filter (Disabled if on Female Members tab, but selectable on other tabs) */}
          <div>
            <select
              value={activeTab === 'FEMALE' ? 'FEMALE' : genderFilter}
              disabled={activeTab === 'FEMALE'}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-800 font-medium disabled:opacity-60"
            >
              <option value="ALL">All Genders</option>
              <option value="FEMALE">Female Members</option>
              <option value="MALE">Male Members</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>

          {/* Membership Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-800 font-medium"
            >
              <option value="ALL">All Membership Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="FROZEN">Frozen</option>
              <option value="EXPIRED">Expired</option>
              <option value="PENDING">Pending Pass</option>
            </select>
          </div>

          {/* Payment Status Filter (Separated from membership status) */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-800 font-medium"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid (No Dues)</option>
              <option value="PENDING_PAYMENT">Pending Due (Has Balance)</option>
            </select>
          </div>
        </div>

        {/* Secondary Row: Plan, Join Date, Expiry Period, Sort, & Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1 border-t border-slate-100 text-xs">
          {/* Membership Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-800 font-medium"
            >
              <option value="ALL">All Membership Plans</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({formatINR(p.price)})
                </option>
              ))}
            </select>
          </div>

          {/* Joining Date Filter */}
          <div>
            <select
              value={activeTab === 'NEW' ? 'LAST_30_DAYS' : joiningDateFilter}
              disabled={activeTab === 'NEW'}
              onChange={(e) => setJoiningDateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-800 font-medium disabled:opacity-60"
            >
              <option value="ALL">All Joining Dates</option>
              <option value="LAST_30_DAYS">New: Last 30 Days (IST)</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_90_DAYS">Last 90 Days</option>
              <option value="THIS_YEAR">This Year</option>
            </select>
          </div>

          {/* Expiry Period Filter */}
          <div>
            <select
              value={
                activeTab === 'EXPIRING_SOON'
                  ? 'EXPIRING_SOON_7_DAYS'
                  : activeTab === 'EXPIRED'
                  ? 'EXPIRED'
                  : expiryPeriodFilter
              }
              disabled={activeTab === 'EXPIRING_SOON' || activeTab === 'EXPIRED'}
              onChange={(e) => setExpiryPeriodFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-800 font-medium disabled:opacity-60"
            >
              <option value="ALL">All Expiry Periods</option>
              <option value="EXPIRING_SOON_7_DAYS">Expiring in 0–7 Days</option>
              <option value="EXPIRING_TODAY">Expiring Today</option>
              <option value="EXPIRED">Already Expired</option>
              <option value="NEXT_30_DAYS">Next 30 Days</option>
            </select>
          </div>

          {/* Sorting Options */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-800 font-medium"
            >
              <option value="DEFAULT">Default Sort</option>
              <option value="name_asc">Name (A–Z)</option>
              <option value="join_desc">Newest Members First</option>
              <option value="join_asc">Oldest Members First</option>
              <option value="expiry_asc">Nearest Expiry First</option>
              <option value="expiry_desc">Recently Expired First</option>
            </select>
          </div>

          {/* Reset Filters Action */}
          <div className="flex items-center">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetAllFilters}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all active:scale-95 shadow-2xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400 font-medium text-center w-full py-1.5">
                Active Directory Clean
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. REUSABLE MEMBER TABLE (Desktop + Responsive Mobile) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-rose-600 font-medium">{error}</div>
        ) : !loading && members.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No members match your criteria</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'Try broadening your search term or reset active category filters.'
                  : 'Get started by adding your first gym member.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Member ID</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Membership Plan</th>
                    <th className="px-4 py-3 font-semibold">Join Date</th>
                    <th className="px-4 py-3 font-semibold">Expiry Date</th>
                    <th className="px-4 py-3 font-semibold">Membership Status</th>
                    <th className="px-4 py-3 font-semibold">Payment Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    [...Array(6)].map((_, i) => (
                      <tr key={`skel-${i}`} className="animate-pulse">
                        <td className="px-4 py-3.5"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                            <div className="space-y-1">
                              <div className="h-3.5 w-28 bg-slate-200 rounded" />
                              <div className="h-2.5 w-20 bg-slate-100 rounded" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><div className="h-3.5 w-24 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 w-24 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 w-20 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 w-20 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-5 w-16 bg-slate-200 rounded-full" /></td>
                        <td className="px-4 py-3.5"><div className="h-5 w-16 bg-slate-200 rounded-full" /></td>
                        <td className="px-4 py-3.5 text-right"><div className="h-7 w-20 bg-slate-200 rounded-lg ml-auto" /></td>
                      </tr>
                    ))
                  )}
                  {!loading && members.map((member) => {
                    const sub = member.currentMembership;
                    const plan = sub?.plan as MembershipPlan | undefined;

                    return (
                      <tr key={member._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Member ID */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {member.memberId}
                        </td>

                        {/* Name + Avatar + Gender */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={member.photoUrl}
                              name={member.fullName}
                              className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setSelectedProfileId(member._id)}
                                className="font-bold text-slate-900 hover:text-blue-600 text-left truncate block transition-colors"
                              >
                                {member.fullName}
                              </button>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {getGenderBadge(member.gender)}
                                {member.email && (
                                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                    {member.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {formatDisplayPhoneIN(member.phone)}
                        </td>

                        {/* Membership Plan */}
                        <td className="px-4 py-3">
                          {plan ? (
                            <div>
                              <div className="font-bold text-slate-800">{plan.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {formatINR(plan.price)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">No Plan</span>
                          )}
                        </td>

                        {/* Join Date (Preserved original joining date in Asia/Kolkata) */}
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {formatDateIN(member.joinDate || member.createdAt)}
                        </td>

                        {/* Expiry Date (With Clear Labels: Expires Today, Tomorrow, in N Days, or Expired) */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {sub?.expiryDate ? (
                            <div className="space-y-0.5">
                              {member.expiryLabel ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                    member.isExpired
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : member.isExpiringSoon
                                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {member.expiryLabel}
                                </span>
                              ) : (
                                <span className="font-mono text-slate-700">
                                  {formatDateIN(sub.expiryDate)}
                                </span>
                              )}
                              <div className="text-[10px] text-slate-400 font-mono">
                                {formatDateIN(sub.expiryDate)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Membership Status Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getMembershipStatusBadge(member)}
                        </td>

                        {/* Payment Status Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getPaymentStatusBadge(member)}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Button */}
                            {member.phone && (
                              <button
                                type="button"
                                onClick={() => {
                                  const msg = getWelcomeMessage(member.fullName, member.memberId);
                                  openWhatsApp(member.phone, msg);
                                }}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-emerald-600 hover:bg-emerald-50/50 flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                title="Open WhatsApp Chat"
                              >
                                <WhatsAppIcon className="w-4 h-4" />
                              </button>
                            )}

                            {/* View Profile */}
                            <button
                              type="button"
                              onClick={() => setSelectedProfileId(member._id)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                              title="View Full Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Direct Renew Action (When membership exists) */}
                            {sub && (
                              <button
                                type="button"
                                onClick={() => setSelectedRenewSub(sub)}
                                className="group inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 active:scale-95 transition-all"
                                title="Renew Membership Plan"
                              >
                                <RotateCw className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                                <span>Renew</span>
                              </button>
                            )}

                            {/* 3-Dot More Actions Menu */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(activeMenuId === member._id ? null : member._id)}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-all active:scale-95"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuId === member._id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95">
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setSelectedProfileId(member._id);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Full Profile & History</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setEditMember(member);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Edit Member Details</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setSelectedCardMember(member);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Digital ID Pass</span>
                                    </button>
                                  </div>

                                  <div className="py-1">
                                    {sub && sub.status === 'ACTIVE' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setSelectedFreezeSub(sub);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                      >
                                        <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                                        <span>Freeze Membership</span>
                                      </button>
                                    )}

                                    {sub && sub.status === 'FROZEN' && (
                                      <button
                                        type="button"
                                        onClick={() => handleThaw(sub._id)}
                                        className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                      >
                                        <Sun className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Unfreeze (Thaw)</span>
                                      </button>
                                    )}

                                    {member.balanceDue && member.balanceDue > 0 && onOpenCollectDue && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          onOpenCollectDue({
                                            membershipId: sub?._id,
                                            member: {
                                              _id: member._id,
                                              fullName: member.fullName,
                                              memberId: member.memberId,
                                              phone: member.phone,
                                              email: member.email,
                                            },
                                            plan: {
                                              name: plan?.name || 'Membership Plan',
                                              price: plan?.price || member.balanceDue || 0,
                                            },
                                            amountDue: member.totalDue || member.balanceDue || 0,
                                            amountPaid: member.totalPaid || 0,
                                            balanceDue: member.balanceDue || 0,
                                          });
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-semibold"
                                      >
                                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Collect Due ({formatINR(member.balanceDue)})</span>
                                      </button>
                                    )}
                                  </div>

                                  {isAdmin && (
                                    <div className="py-1">
                                      {viewMode === 'ARCHIVED' ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            handleRestore(member);
                                          }}
                                          className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-medium"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Restore to Active</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            setArchiveTargetMember({
                                              _id: member._id,
                                              memberId: member.memberId,
                                              fullName: member.fullName,
                                              phone: member.phone,
                                              photoUrl: member.photoUrl,
                                            });
                                          }}
                                          className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                          <Archive className="w-3.5 h-3.5 text-slate-400" />
                                          <span>Archive Member</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setDeleteTargetMember({
                                            _id: member._id,
                                            memberId: member.memberId,
                                            fullName: member.fullName,
                                          });
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Delete from DB</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px: Zero Sideways Scroll, Touch-Friendly 44px Buttons) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={`m-skel-${i}`} className="p-4 space-y-3 bg-white animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 w-32 bg-slate-200 rounded" />
                          <div className="h-3 w-24 bg-slate-100 rounded" />
                        </div>
                      </div>
                      <div className="h-5 w-16 bg-slate-200 rounded-full" />
                    </div>
                    <div className="h-11 bg-slate-100 rounded-xl" />
                  </div>
                ))
              ) : (
                members.map((member) => {
                const sub = member.currentMembership;
                const plan = sub?.plan as MembershipPlan | undefined;

                return (
                  <div key={member._id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar
                          src={member.photoUrl}
                          name={member.fullName}
                          className="w-9 h-9 rounded-full border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProfileId(member._id)}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 text-left block truncate"
                          >
                            {member.fullName}
                          </button>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                            <span>ID: {member.memberId}</span>
                            <span>•</span>
                            <span>{formatDisplayPhoneIN(member.phone)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {getMembershipStatusBadge(member)}
                        {getGenderBadge(member.gender)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Plan</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {plan ? plan.name : 'No Plan'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Expiry</span>
                        <span className="font-mono text-slate-700 block truncate">
                          {sub?.expiryDate ? member.expiryLabel || formatDateIN(sub.expiryDate) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Joined</span>
                        <span className="font-mono text-slate-600 block">
                          {formatDateIN(member.joinDate || member.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment</span>
                        <div>{getPaymentStatusBadge(member)}</div>
                      </div>
                    </div>

                    {/* Touch Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {member.phone && (
                        <button
                          type="button"
                          onClick={() => {
                            const msg = getWelcomeMessage(member.fullName, member.memberId);
                            openWhatsApp(member.phone, msg);
                          }}
                          className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 transition-all shadow-2xs"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedProfileId(member._id)}
                        className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 active:scale-95 transition-all shadow-2xs"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                        <span>Profile</span>
                      </button>

                      {sub && (
                        <button
                          type="button"
                          onClick={() => setSelectedRenewSub(sub)}
                          className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-2xs"
                        >
                          <RotateCw className="w-4 h-4" />
                          <span>Renew</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} members
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fetchMembers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-mono font-semibold text-slate-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => fetchMembers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODALS INTEGRATION */}
      {/* 1. Member Profile & History Modal */}
      {selectedProfileId && (
        <MemberProfileModal
          memberId={selectedProfileId}
          isOpen={Boolean(selectedProfileId)}
          onClose={() => setSelectedProfileId(null)}
          onMemberDeleted={() => {
            fetchMembers(pagination.page);
            fetchStats();
          }}
          onOpenReceipt={onOpenReceipt}
          onOpenRenewModal={(membership: Membership) => setSelectedRenewSub(membership)}
          onOpenCollectDue={onOpenCollectDue}
        />
      )}

      {/* 2. Permanent Delete Confirmation Modal */}
      {deleteTargetMember && (
        <DeleteMemberModal
          member={deleteTargetMember}
          isOpen={Boolean(deleteTargetMember)}
          onClose={() => setDeleteTargetMember(null)}
          onSuccess={() => {
            setDeleteTargetMember(null);
            fetchMembers(pagination.page);
            fetchStats();
          }}
        />
      )}

      {/* 3. Archival Modal */}
      {archiveTargetMember && (
        <ArchiveMemberModal
          isOpen={Boolean(archiveTargetMember)}
          onClose={() => setArchiveTargetMember(null)}
          member={archiveTargetMember}
          onSuccess={() => {
            setArchiveTargetMember(null);
            fetchMembers(pagination.page);
            fetchStats();
          }}
        />
      )}

      {/* 4. Edit Member Details Modal */}
      {editMember && (
        <EditMemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSuccess={() => {
            setEditMember(null);
            fetchMembers(pagination.page);
            fetchStats();
          }}
        />
      )}

      {/* 5. Renew Membership Modal */}
      <RenewModal
        membership={selectedRenewSub}
        isOpen={Boolean(selectedRenewSub)}
        onClose={() => setSelectedRenewSub(null)}
        onSuccess={() => {
          fetchMembers(pagination.page);
          fetchStats();
        }}
        onOpenReceipt={onOpenReceipt}
      />

      {/* 6. Freeze Membership Modal */}
      <FreezeModal
        membership={selectedFreezeSub}
        isOpen={Boolean(selectedFreezeSub)}
        onClose={() => setSelectedFreezeSub(null)}
        onSuccess={() => {
          fetchMembers(pagination.page);
          fetchStats();
        }}
      />

      {/* 7. Digital Member Card Pass Modal */}
      <MemberCardModal
        member={selectedCardMember}
        isOpen={Boolean(selectedCardMember)}
        onClose={() => setSelectedCardMember(null)}
      />
    </div>
  );
};

// Clean Edit Member Modal
interface EditMemberModalProps {
  member: Member;
  onClose: () => void;
  onSuccess: () => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, onClose, onSuccess }) => {
  const [fullName, setFullName] = useState(member.fullName);
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email || '');
  const [gender, setGender] = useState(member.gender || 'PREFER_NOT_TO_SAY');
  const [address, setAddress] = useState(member.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Full Name and Phone are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.updateMember(member._id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gender: gender || undefined,
        address: address.trim(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-modal overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Edit Member Details</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none bg-white font-medium"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Address <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
