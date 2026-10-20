import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  X,
  CreditCard,
  Printer,
  Snowflake,
  Sun,
  Archive,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Download,
  MessageCircle,
  RotateCcw,
  RotateCw,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Member, Membership, MembershipPlan } from '../types';
import { RenewModal } from '../components/modals/RenewModal';
import { FreezeModal } from '../components/modals/FreezeModal';
import { MemberCardModal } from '../components/modals/MemberCardModal';
import { MemberProfileModal } from '../components/modals/MemberProfileModal';
import { DeleteMemberModal } from '../components/modals/DeleteMemberModal';
import { exportToCSV } from '../utils/csvExport';
import { sendWhatsAppReminder, openWhatsApp, getWelcomeMessage, sendWhatsAppDueReminder } from '../utils/whatsapp';
import { formatINR, formatDateIN, formatDisplayPhoneIN } from '../utils/formatters';

interface MembersPageProps {
  onOpenRegister: () => void;
  onOpenCheckIn?: () => void;
  onOpenCollectDue?: (item: any) => void;
  onOpenReceipt?: (payment: any) => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({ onOpenRegister, onOpenCollectDue, onOpenReceipt }) => {
  const { user, activeBranch } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN';
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active / Archived directory view tabs
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [archivedCount, setArchivedCount] = useState<number>(0);

  // Active 3-dot menu dropdown
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Deletion state
  const [deleteTargetMember, setDeleteTargetMember] = useState<{
    _id: string;
    memberId: string;
    fullName: string;
  } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [selectedCardMember, setSelectedCardMember] = useState<Member | null>(null);
  const [selectedRenewSub, setSelectedRenewSub] = useState<Membership | null>(null);
  const [selectedFreezeSub, setSelectedFreezeSub] = useState<Membership | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);

  // Load available plans
  useEffect(() => {
    api.getPlans(false).then(setPlans).catch(console.error);
  }, []);

  const fetchStats = async () => {
    try {
      const stats = await api.getMemberStats();
      setArchivedCount(stats.archived || 0);
    } catch (e) {
      console.error('Failed to load member stats', e);
    }
  };

  const fetchMembers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMembers({
        page,
        limit: 12,
        search: search.trim(),
        status: statusFilter,
        plan: planFilter,
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

  useEffect(() => {
    fetchMembers(1);
    fetchStats();
  }, [search, statusFilter, planFilter, activeBranch, viewMode]);

  // Real-time auto refresh without manual page reload
  useEffect(() => {
    const handleDataChanged = () => {
      fetchMembers(pagination.page);
      fetchStats();
    };
    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, [pagination.page, viewMode, activeBranch]);

  const handleThaw = async (subId: string) => {
    try {
      await api.thawMembership(subId);
      setActiveMenuId(null);
      fetchMembers(pagination.page);
    } catch (err) {
      console.error('Failed to unfreeze:', err);
    }
  };

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

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPlanFilter('ALL');
  };

  const hasActiveFilters = search !== '' || statusFilter !== 'ALL' || planFilter !== 'ALL';

  const getStatusBadge = (status: string, currentSub?: Membership) => {
    // Check if sub is expiring soon (within 7 days)
    let isExpiringSoon = false;
    if (currentSub?.expiryDate && status === 'ACTIVE') {
      const now = new Date();
      const exp = new Date(currentSub.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) {
        isExpiringSoon = true;
      }
    }

    if (isExpiringSoon) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-[#B45309] border border-amber-200">
          Expiring Soon
        </span>
      );
    }

    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-[#15803D] border border-green-200">
            Active
          </span>
        );
      case 'FROZEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-[#4B5563] border border-gray-200">
            Frozen
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-[#B91C1C] border border-red-200">
            Expired
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await api.getMembers({
        page: 1,
        limit: 1000,
        search: search.trim(),
        status: statusFilter,
        plan: planFilter,
        branch: activeBranch?._id,
      });

      const exportList = res.data || [];
      const headers = [
        'Member ID',
        'Full Name',
        'Phone',
        'Email',
        'Status',
        'Current Plan',
        'Start Date',
        'Expiration Date',
        'Amount Paid (₹)',
        'Balance Due (₹)',
        'Branch',
        'Join Date',
      ];

      const rows = exportList.map((m: Member) => {
        const sub = m.currentMembership;
        return [
          m.memberId,
          m.fullName,
          m.phone,
          m.email || '',
          m.status,
          sub?.plan ? (sub.plan as any).name : 'No Plan',
          sub?.startDate ? formatDateIN(sub.startDate) : '',
          sub?.expiryDate ? formatDateIN(sub.expiryDate) : '',
          sub?.amountPaid ?? '',
          sub?.amountDue ?? 0,
          m.branch ? (m.branch as any).name : '',
          formatDateIN(m.joinDate || m.createdAt),
        ];
      });

      const todayStr = new Date().toISOString().split('T')[0];
      exportToCSV(`sagar_fitness_members_${todayStr}`, headers, rows);
    } catch (err: any) {
      alert(err.message || 'Failed to export members to CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#202124] tracking-tight">Members</h2>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Manage gym members and their memberships.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold transition-all shadow-xs hover:shadow-sm disabled:opacity-50"
            title="Export filtered members to CSV spreadsheet"
          >
            <div className="w-5.5 h-5.5 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
              <Download className="w-3.5 h-3.5" />
            </div>
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            id="add-member-btn"
            onClick={onOpenRegister}
            className="inline-flex items-center gap-2.5 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20"
          >
            <div className="w-5.5 h-5.5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Directory Tabs */}
      <div className="flex items-center gap-4 border-b border-[#E5E7EB]">
        <button
          onClick={() => {
            setViewMode('ACTIVE');
            clearFilters();
          }}
          className={`pb-3 px-1 text-sm font-semibold transition-all relative ${
            viewMode === 'ACTIVE'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-[#6B7280] hover:text-[#202124]'
          }`}
        >
          Active Members Directory
        </button>

        <button
          onClick={() => {
            setViewMode('ARCHIVED');
            clearFilters();
          }}
          className={`pb-3 px-1 text-sm font-semibold transition-all flex items-center gap-2 relative ${
            viewMode === 'ARCHIVED'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-[#6B7280] hover:text-[#202124]'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Archived Members</span>
          {archivedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
              {archivedCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Banners */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-3.5 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Membership Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="FROZEN">Frozen</option>
              <option value="EXPIRED">Expired</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Membership Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-900"
            >
              <option value="ALL">All Plans</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex items-center">
              <button
                onClick={clearFilters}
                className="group inline-flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
              >
                <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <X className="w-3.5 h-3.5" />
                </div>
                <span>Clear Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#6B7280]">Loading members...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-[#202124]">No members found</p>
            <p className="text-xs text-[#6B7280] mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search query or filter options.'
                : 'Click "+ Add Member" above to register your first gym member.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Member ID</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Expiration</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {members.map((member) => {
                  const currentSub = member.currentMembership;
                  const planName = currentSub?.plan ? (currentSub.plan as any).name : '—';
                  const expiryStr = currentSub?.expiryDate
                    ? formatDateIN(currentSub.expiryDate)
                    : '—';
                  const pendingBalance = currentSub
                    ? Math.max(0, (currentSub.amountDue || 0) - (currentSub.amountPaid || 0))
                    : 0;

                  return (
                    <tr key={member._id} className="hover:bg-gray-50/75 transition-colors">
                      {/* Member Column */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSelectedProfileId(member._id)}
                          className="flex items-center gap-3 text-left group"
                        >
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
                              {member.fullName ? member.fullName.charAt(0) : 'M'}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-[#202124] group-hover:text-blue-600 transition-colors">
                              {member.fullName}
                            </div>
                            <div className="text-xs text-[#6B7280]">{member.email || '—'}</div>
                          </div>
                        </button>
                      </td>

                      {/* Member ID */}
                      <td className="px-5 py-3.5 font-mono text-xs text-[#6B7280]">
                        {member.memberId}
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3.5 text-sm text-[#202124] font-mono">
                        {member.phone ? formatDisplayPhoneIN(member.phone) : '—'}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-3.5 text-sm text-[#202124] font-medium">
                        {planName}
                      </td>

                      {/* Expiration */}
                      <td className="px-5 py-3.5 text-sm text-[#6B7280] font-mono">
                        {expiryStr}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(member.status, currentSub)}
                          {pendingBalance > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Due: {formatINR(pendingBalance)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right relative">
                        {viewMode === 'ARCHIVED' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedProfileId(member._id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-colors"
                              title="View Historical Profile"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-500" />
                              View
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => handleRestore(member)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors"
                                title="Restore Member to Active Directory"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-green-600" />
                                Restore
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile */}
                            <button
                              onClick={() => setSelectedProfileId(member._id)}
                              className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                              title="View Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => setEditMember(member)}
                              className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                              title="Edit Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* WhatsApp Direct Action */}
                            {member.phone && (
                              <button
                                onClick={() => {
                                  if (currentSub) {
                                    const diffDays = Math.ceil(
                                      (new Date(currentSub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                    );
                                    sendWhatsAppReminder({
                                      name: member.fullName,
                                      phone: member.phone,
                                      planName: planName !== 'No Plan' ? planName : undefined,
                                      expiryDate: currentSub.expiryDate,
                                      daysRemaining: diffDays,
                                    });
                                  } else {
                                    openWhatsApp(
                                      member.phone,
                                      getWelcomeMessage(member.fullName, member.memberId)
                                    );
                                  }
                                }}
                                className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-emerald-600 hover:bg-emerald-50/50 flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                title="Send WhatsApp Message / Reminder"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Collect Due Button if pending balance */}
                            {pendingBalance > 0 && onOpenCollectDue && (
                              <button
                                onClick={() => {
                                  onOpenCollectDue({
                                    membershipId: currentSub!._id,
                                    member: member,
                                    planName: planName !== '—' ? planName : 'Membership Plan',
                                    amountDue: currentSub!.amountDue,
                                    amountPaid: currentSub!.amountPaid,
                                    amountPending: pendingBalance,
                                  });
                                }}
                                className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-amber-800 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                title="Collect Outstanding Due"
                              >
                                <div className="w-5.5 h-5.5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 transition-colors group-hover:bg-amber-100">
                                  <span className="text-xs font-bold">₹</span>
                                </div>
                                <span>Collect Due</span>
                              </button>
                            )}

                            {/* Renew */}
                            <button
                              onClick={() => {
                                if (currentSub) {
                                  setSelectedRenewSub(currentSub);
                                } else {
                                  setSelectedProfileId(member._id);
                                }
                              }}
                              className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                              title="Renew Membership"
                            >
                              <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                                <RotateCw className="w-3 h-3 shrink-0" />
                              </div>
                              <span>Renew</span>
                            </button>

                            {/* 3-Dot Secondary Menu */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveMenuId(activeMenuId === member._id ? null : member._id)
                                }
                                className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                title="More Options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuId === member._id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-dropdown py-1 z-50 text-left">
                                  {member.phone &&
                                    (pendingBalance > 0 ? (
                                      <button
                                        onClick={() => {
                                          sendWhatsAppDueReminder({
                                            name: member.fullName,
                                            phone: member.phone,
                                            planName: planName !== '—' ? planName : undefined,
                                            amountDue: currentSub!.amountDue,
                                            amountPaid: currentSub!.amountPaid,
                                            amountPending: pendingBalance,
                                          });
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-medium"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                                        WhatsApp Due Reminder ({formatINR(pendingBalance)})
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          if (currentSub) {
                                            const diffDays = Math.ceil(
                                              (new Date(currentSub.expiryDate).getTime() - Date.now()) /
                                                (1000 * 60 * 60 * 24)
                                            );
                                            sendWhatsAppReminder({
                                              name: member.fullName,
                                              phone: member.phone,
                                              planName: planName !== 'No Plan' ? planName : undefined,
                                              expiryDate: currentSub.expiryDate,
                                              daysRemaining: diffDays,
                                            });
                                          } else {
                                            openWhatsApp(
                                              member.phone,
                                              getWelcomeMessage(member.fullName, member.memberId)
                                            );
                                          }
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                        WhatsApp Reminder
                                      </button>
                                    ))}

                                  <button
                                    onClick={() => {
                                      setSelectedCardMember(member);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-gray-500" />
                                    Print Membership Card
                                  </button>

                                  {currentSub && currentSub.status === 'ACTIVE' && (
                                    <button
                                      onClick={() => {
                                        setSelectedFreezeSub(currentSub);
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                                      Freeze Membership
                                    </button>
                                  )}

                                  {currentSub && currentSub.status === 'FROZEN' && (
                                    <button
                                      onClick={() => handleThaw(currentSub._id)}
                                      className="w-full px-3 py-2 text-xs text-green-700 hover:bg-green-50 flex items-center gap-2"
                                    >
                                      <Sun className="w-3.5 h-3.5 text-green-600" />
                                      Unfreeze Membership
                                    </button>
                                  )}

                                  {isAdmin && (
                                    <button
                                      onClick={() => {
                                        setDeleteTargetMember({
                                          _id: member._id,
                                          memberId: member.memberId,
                                          fullName: member.fullName,
                                        });
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                      Delete Member
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (Full Touch Experience, Zero Sideways Scroll) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {members.map((member) => {
              const currentSub = member.currentMembership;
              const planName = currentSub?.plan ? (currentSub.plan as any).name : '—';
              const expiryStr = currentSub?.expiryDate
                ? formatDateIN(currentSub.expiryDate)
                : '—';
              const pendingBalance = currentSub
                ? Math.max(0, (currentSub.amountDue || 0) - (currentSub.amountPaid || 0))
                : 0;

              return (
                <div key={member._id} className="p-3.5 space-y-2.5 bg-white">
                  {/* Header: Photo, Name, Member ID, Status */}
                  <div className="flex items-start justify-between gap-2.5">
                    <button
                      onClick={() => setSelectedProfileId(member._id)}
                      className="flex items-center gap-2.5 text-left group min-w-0 flex-1"
                    >
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.fullName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
                          {member.fullName ? member.fullName.charAt(0) : 'M'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600 truncate">
                          {member.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          ID: <span className="text-slate-800 font-semibold">{member.memberId}</span>
                          {member.phone && <span> • {formatDisplayPhoneIN(member.phone)}</span>}
                        </div>
                      </div>
                    </button>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {getStatusBadge(member.status, currentSub)}
                      {pendingBalance > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Due: {formatINR(pendingBalance)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details: Plan & Expiry */}
                  <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-700 font-semibold truncate mr-2">
                      {planName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 shrink-0">
                      Exp: {expiryStr}
                    </span>
                  </div>

                  {/* Mobile Action Buttons with Min 44px Touch Targets */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedProfileId(member._id)}
                      className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 hover:text-blue-700 active:scale-95 transition-all shadow-2xs"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>Profile</span>
                    </button>

                    {currentSub && viewMode !== 'ARCHIVED' && (
                      <button
                        type="button"
                        onClick={() => setSelectedRenewSub(currentSub)}
                        className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-xs"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Renew</span>
                      </button>
                    )}

                    {member.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentSub && currentSub.expiryDate) {
                            const diffDays = Math.ceil(
                              (new Date(currentSub.expiryDate).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24)
                            );
                            sendWhatsAppReminder({
                              name: member.fullName,
                              phone: member.phone,
                              planName,
                              expiryDate: currentSub.expiryDate,
                              daysRemaining: diffDays,
                            });
                          } else {
                            openWhatsApp(
                              member.phone,
                              getWelcomeMessage(member.fullName, member.memberId)
                            );
                          }
                        }}
                        className="min-h-[44px] h-11 w-11 inline-flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 active:scale-95 transition-all shadow-2xs shrink-0"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}

                    {viewMode === 'ARCHIVED' && isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRestore(member)}
                        className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-4 h-4 text-emerald-600" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="px-4 py-3 sm:px-5 border-t border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-900">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{pagination.total}</span> members
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchMembers(pagination.page - 1)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs hover:shadow-xs flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700 px-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchMembers(pagination.page + 1)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs hover:shadow-xs flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Member Simple Modal */}
      {editMember && (
        <EditMemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSuccess={() => {
            setEditMember(null);
            fetchMembers(pagination.page);
          }}
        />
      )}

      {/* Secondary Modals */}
      <MemberProfileModal
        memberId={selectedProfileId}
        isOpen={Boolean(selectedProfileId)}
        onClose={() => setSelectedProfileId(null)}
        onOpenCardModal={(m) => setSelectedCardMember(m)}
        onOpenRenewModal={(sub) => setSelectedRenewSub(sub)}
        onOpenFreezeModal={(sub) => setSelectedFreezeSub(sub)}
        onOpenCollectDue={onOpenCollectDue}
        onOpenReceipt={onOpenReceipt}
        onMemberDeleted={() => {
          fetchMembers(pagination.page);
          fetchStats();
        }}
      />

      {/* Delete Member Confirmation Modal */}
      {deleteTargetMember && (
        <DeleteMemberModal
          isOpen={Boolean(deleteTargetMember)}
          member={deleteTargetMember}
          onClose={() => setDeleteTargetMember(null)}
          onSuccess={(res) => {
            setActionSuccess(res.message);
            fetchMembers(pagination.page);
            fetchStats();
          }}
        />
      )}

      <RenewModal
        membership={selectedRenewSub}
        isOpen={Boolean(selectedRenewSub)}
        onClose={() => setSelectedRenewSub(null)}
        onSuccess={() => fetchMembers(pagination.page)}
        onOpenReceipt={onOpenReceipt}
      />

      <FreezeModal
        membership={selectedFreezeSub}
        isOpen={Boolean(selectedFreezeSub)}
        onClose={() => setSelectedFreezeSub(null)}
        onSuccess={() => fetchMembers(pagination.page)}
      />

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
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg shadow-modal overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#202124]">Edit Member</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Address (Optional)
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
