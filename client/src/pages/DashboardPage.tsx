import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  MessageCircle,
  Clock,
  UserCheck,
  Search,
  RotateCw,
  Eye,
  X,
  Archive,
  Check,
  CreditCard,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DashboardData, Membership } from '../types';
import { formatINR, formatDateIN, formatDisplayPhoneIN } from '../utils/formatters';
import { sendWhatsAppReminder, sendWhatsAppExpiredNotice } from '../utils/whatsapp';
import { ArchiveMemberModal } from '../components/modals/ArchiveMemberModal';




interface DashboardPageProps {
  onOpenCheckIn?: () => void;
  onOpenRegister?: () => void;
  onSelectMember?: (memberId: string) => void;
  onRenewMember?: (membership: any) => void;
  onOpenCollectDue?: (dueItem: any) => void;
  onOpenReceipt?: (payment: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCheckIn,
  onOpenRegister,
  onSelectMember,
  onRenewMember,
}) => {
  const { user, activeBranch } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN';
  const navigate = useNavigate();

  // Dashboard summary stats
  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingDues, setPendingDues] = useState<{
    duesCount: number;
    totalDuesAmount: number;
  }>({ duesCount: 0, totalDuesAmount: 0 });
  const [loading, setLoading] = useState(true);


  // Archive Member state & success notice
  const [archiveTargetMember, setArchiveTargetMember] = useState<{
    _id: string;
    memberId: string;
    fullName: string;
    phone?: string;
    photoUrl?: string;
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);


  // Live Active Members state
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [activeMembersTotal, setActiveMembersTotal] = useState(0);
  const [activeSearch, setActiveSearch] = useState('');
  const [activeLoading, setActiveLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Dashboard summary statistics
  const fetchDashboardStats = useCallback(async () => {
    try {
      const [statsRes, duesRes] = await Promise.all([
        api.getDashboardStats(activeBranch?._id),
        api.getPendingDues().catch(() => ({ duesCount: 0, totalDuesAmount: 0, memberships: [] })),
      ]);
      setData(statsRes);
      setPendingDues({
        duesCount: duesRes.duesCount || 0,
        totalDuesAmount: duesRes.totalDuesAmount || 0,
      });
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    }
  }, [activeBranch]);

  // Fetch Live Active Members list
  const fetchActiveMembers = useCallback(
    async (searchTerm = activeSearch) => {
      try {
        setActiveLoading(true);
        const res = await api.getMembers({
          status: 'ACTIVE',
          branch: activeBranch?._id,
          search: searchTerm.trim() || undefined,
          limit: 50,
        });

        // Filter to ensure memberships are currently valid and active
        const list = (res.data || []).filter((m: any) => {
          if (m.status !== 'ACTIVE' || m.isArchived) return false;
          if (m.currentMembership) {
            return m.currentMembership.status === 'ACTIVE';
          }
          return true;
        });

        setActiveMembers(list);
        setActiveMembersTotal(res.pagination?.total ?? list.length);
      } catch (err) {
        console.error('Failed to fetch active members:', err);
      } finally {
        setActiveLoading(false);
      }
    },
    [activeBranch, activeSearch]
  );

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboardStats(), fetchActiveMembers()]).finally(() => {
      setLoading(false);
    });
  }, [fetchDashboardStats, fetchActiveMembers]);

  // Real-time auto refresh without manual page reload
  useEffect(() => {
    const handleDataChanged = () => {
      fetchDashboardStats();
      fetchActiveMembers(activeSearch);
    };
    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, [activeSearch, fetchDashboardStats, fetchActiveMembers]);

  // Trigger search on submit or input change
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchActiveMembers(activeSearch);
  };

  const handleClearSearch = () => {
    setActiveSearch('');
    fetchActiveMembers('');
  };

  // Manual refresh action
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchActiveMembers(activeSearch)]);
    setIsRefreshing(false);
  };

  // Helper: calculate days remaining and badge (supports expired members)
  const getDaysRemainingBadge = (expiryDate: string, isExpired?: boolean) => {
    const now = new Date();
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isExpired || diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          {daysAgo === 0 ? 'Expired Today' : `Expired ${daysAgo}d ago`}
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          Expires Today
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          In 1 day
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        In {diffDays} days
      </span>
    );
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-28 text-gray-500 text-sm">
        <RotateCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        Loading FitCore Dashboard...
      </div>
    );
  }

  const metrics: any = data?.metrics || {
    totalMembers: 0,
    activeMembers: 0,
    expiringMemberships: 0,
    alreadyExpiredCount: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    todayTotalCheckins: 0,
    liveOccupancy: 0,
  };

  const expiringList = (data?.expiringMemberships || []).slice(0, 15);
  const expiredList = (data?.expiredMemberships || []).slice(0, 15);

  // Expired members listed at the top ("upaar"), followed by expiring soon
  const combinedAlerts = [
    ...expiredList.map((sub: any) => ({ ...sub, isExpired: true })),
    ...expiringList.map((sub: any) => ({ ...sub, isExpired: false })),
  ];

  const displayedAlerts = combinedAlerts;

  const totalExpiryAlerts = (metrics.expiringMemberships || 0) + (metrics.alreadyExpiredCount || 0);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          GYM DASHBOARD BANNER (Clean, Minimal, Professional)
          ========================================================================= */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 text-white h-44 sm:h-52 flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-6 sm:p-8 bg-slate-950">
        {/* Background Image: Clean Photographic Gym Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/gym-hero.png')` }}
        />
        {/* Subtle Dark Blue-Black Overlay for natural contrast & readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/45 to-slate-950/20" />

        {/* Gym Name & Tagline */}
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Sagar Fitness Gym
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1 drop-shadow-md">
            Strength • Transformation • Health Center • Baner, Pune
          </p>
        </div>

        {/* Action Button: Add Member */}
        {onOpenRegister && (
          <div className="relative z-10 self-start sm:self-end shrink-0">
            <button
              id="hero-add-member-btn"
              onClick={onOpenRegister}
              className="inline-flex items-center gap-2.5 h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-600/35 transition-all transform hover:-translate-y-0.5 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <UserPlus className="w-3.5 h-3.5 text-white shrink-0" />
              </div>
              <span>Add Member</span>
            </button>
          </div>
        )}
      </div>

      {/* Front Desk Tasks Toolbar (Prominently displayed for Desk Staff) */}
      {!isAdmin && (
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                🏢 Front Desk Counter Tasks
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Quick actions for front desk operations
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              Logged in: <strong className="text-slate-900">{user?.fullName || 'Front Desk Staff'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => navigate('/attendance')}
              className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-left transition-all active:scale-[0.98] group cursor-pointer"
            >
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs group-hover:text-emerald-800">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <span>Attendance Punch</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Check-in / out athletes</p>
            </button>

            {onOpenRegister && (
              <button
                onClick={onOpenRegister}
                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-left transition-all active:scale-[0.98] group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs group-hover:text-blue-800">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <UserPlus className="w-3.5 h-3.5" />
                  </div>
                  <span>New Member</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Register new admission</p>
              </button>
            )}

            <button
              onClick={() => navigate('/billing')}
              className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50/70 border border-slate-200 hover:border-rose-300 text-left transition-all active:scale-[0.98] group cursor-pointer"
            >
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs group-hover:text-rose-800">
                <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span>Collect Due & Bill</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Receipts & fees payment</p>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('expiry-warning-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 text-left transition-all active:scale-[0.98] group cursor-pointer"
            >
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs group-hover:text-amber-800">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
                <span>WhatsApp Alerts</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Send expiry reminders</p>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION B: Exactly 5 Summary Cards
          1. Today's Revenue | 2. Active Athletes | 3. Expiry Alerts | 4. Pending Dues | 5. Total Revenue
          ========================================================================= */}
      {/* =========================================================================
          SECTION B: Exactly 5 Summary Cards (Side Nav Bar Color Themed Inside Cards)
          1. Today's Revenue (Emerald) | 2. Active Athletes (Blue) | 3. Expiry Alerts (Amber) | 4. Pending Dues (Rose) | 5. Total Revenue (Purple)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Today's Revenue (Emerald - Matching Members/Revenue) */}
        <div className="bg-emerald-50/40 border border-emerald-200/80 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800/80 uppercase tracking-wider">
              Today's Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/90 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-sm shadow-2xs">
              ₹
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {formatINR(metrics.todayRevenue || 0)}
          </div>
          <p className="text-[11px] text-emerald-800/70 mt-1 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Counter & digital receipts today
          </p>
        </div>

        {/* Card 2: Active Athletes (Blue - Matching Dashboard) */}
        <div className="bg-blue-50/40 border border-blue-200/80 border-l-4 border-l-blue-500 rounded-xl p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800/80 uppercase tracking-wider">
              Active Athletes
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100/90 text-blue-700 border border-blue-200 flex items-center justify-center shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {(metrics.activeMembers || activeMembersTotal).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-blue-800/70 mt-1 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Valid active gym memberships
          </p>
        </div>

        {/* Card 3: Expiry Alerts (Amber - Matching Attendance/Expiry) */}
        <div
          onClick={() => {
            const el = document.getElementById('expiry-warning-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-amber-50/40 border border-amber-200/80 border-l-4 border-l-amber-500 rounded-xl p-4 shadow-2xs hover:border-amber-300 hover:shadow-xs cursor-pointer active:scale-[0.98] transition-all"
          title="Click to view all membership expiry warnings"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800/80 uppercase tracking-wider">
              Expiry Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100/90 text-amber-700 border border-amber-200 flex items-center justify-center shadow-2xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {totalExpiryAlerts.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-amber-800/70 font-medium">pending renewal</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {(metrics.alreadyExpiredCount || 0) > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                🔴 {metrics.alreadyExpiredCount} Expired
              </span>
            )}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
              ⚠️ {metrics.expiringMemberships || 0} Soon
            </span>
          </div>
        </div>

        {/* Card 4: Pending Dues (Rose - Matching Billing/Dues) */}
        <div
          onClick={() => navigate('/billing')}
          className="bg-rose-50/40 border border-rose-200/80 border-l-4 border-l-rose-500 rounded-xl p-4 shadow-2xs hover:border-rose-300 hover:shadow-xs cursor-pointer active:scale-[0.98] transition-all"
          title="Click to view pending dues ledger"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800/80 uppercase tracking-wider">
              Pending Dues
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100/90 text-rose-700 border border-rose-200 flex items-center justify-center shadow-2xs">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {formatINR(pendingDues.totalDuesAmount)}
          </div>
          <p className="text-[11px] text-rose-800/70 mt-1 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            {pendingDues.duesCount} members with balance
          </p>
        </div>

        {/* Card 5: Total Revenue (Purple - Matching Plans/Revenue) */}
        <div
          onClick={() => navigate('/billing')}
          className="bg-purple-50/40 border border-purple-200/80 border-l-4 border-l-purple-500 rounded-xl p-4 shadow-2xs hover:border-purple-300 hover:shadow-xs cursor-pointer active:scale-[0.98] transition-all"
          title="Click to view monthly billing"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800/80 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100/90 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-sm shadow-2xs">
              ₹
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {formatINR(metrics.monthlyRevenue || 0)}
          </div>
          <p className="text-[11px] text-purple-800/70 mt-1 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Total collections this calendar month
          </p>
        </div>
      </div>




      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION A: MEMBERSHIP EXPIRY & OVERDUE WARNINGS
          (Expired Members displayed at the top with clear warning badges + Expiring Soon)
          ========================================================================= */}
      <div id="expiry-warning-section" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Membership Expiry & Overdue Warnings ({combinedAlerts.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Expired members requiring renewal and passes expiring within 7 days.
            </p>
          </div>

        </div>

        {displayedAlerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            All member passes are currently valid and active. No expired or expiring memberships.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Member Name</th>
                  <th className="px-6 py-3">Phone Number</th>
                  <th className="px-6 py-3">Membership Plan</th>
                  <th className="px-6 py-3">Expiry Date</th>
                  <th className="px-6 py-3">Status / Alert</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedAlerts.map((sub: any) => {
                  const memberObj: any = sub.member || {};
                  const planObj: any = sub.plan || {};
                  const isExp = sub.isExpired;

                  return (
                    <tr
                      key={sub._id}
                      className={`transition-colors ${
                        isExp
                          ? 'bg-rose-50/40 hover:bg-rose-50/70'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Member Photo and Name */}
                      <td className="px-6 py-3.5">
                        <button
                          onClick={() => {
                            if (memberObj._id && onSelectMember) {
                              onSelectMember(memberObj._id);
                            }
                          }}
                          className="flex items-center gap-3 text-left group"
                        >
                          {memberObj.photoUrl ? (
                            <img
                              src={memberObj.photoUrl}
                              alt={memberObj.fullName}
                              className={`w-9 h-9 rounded-xl object-cover shrink-0 border ${
                                isExp ? 'border-rose-300' : 'border-slate-200'
                              } shadow-xs`}
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${
                                isExp
                                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-100'
                              } shadow-xs`}
                            >
                              {memberObj.fullName ? memberObj.fullName.charAt(0) : 'M'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{memberObj.fullName || 'Member'}</span>
                              {isExp && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                                  EXPIRED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              ID: {memberObj.memberId || '—'}
                            </div>
                          </div>
                        </button>
                      </td>

                      {/* Phone Number */}
                      <td className="px-6 py-3.5 font-mono font-medium text-slate-700">
                        {formatDisplayPhoneIN(memberObj.phone)}
                      </td>

                      {/* Membership Plan */}
                      <td className="px-6 py-3.5 text-slate-800 font-semibold">
                        {planObj.name || 'Standard Pass'}
                      </td>

                      {/* Expiry Date (DD/MM/YYYY) */}
                      <td
                        className={`px-6 py-3.5 font-semibold font-mono ${
                          isExp ? 'text-rose-700 font-bold' : 'text-slate-800'
                        }`}
                      >
                        {formatDateIN(sub.expiryDate)}
                      </td>

                      {/* Days Remaining / Status Badge */}
                      <td className="px-6 py-3.5">
                        {getDaysRemainingBadge(sub.expiryDate, isExp)}
                      </td>

                      {/* Actions: Aesthetic Buttons */}
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {memberObj.phone && (
                            <button
                              onClick={() => {
                                if (isExp) {
                                  sendWhatsAppExpiredNotice({
                                    name: memberObj.fullName || 'Member',
                                    phone: memberObj.phone,
                                    planName: planObj.name,
                                    expiryDate: sub.expiryDate,
                                  });
                                } else {
                                  sendWhatsAppReminder({
                                    name: memberObj.fullName || 'Member',
                                    phone: memberObj.phone,
                                    planName: planObj.name,
                                    expiryDate: sub.expiryDate,
                                  });
                                }
                              }}
                              className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-800 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                              title={
                                isExp
                                  ? 'Send WhatsApp Expired Renewal Notice'
                                  : 'Send WhatsApp Expiry Reminder'
                              }
                            >
                              <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                                <MessageCircle className="w-3 h-3 shrink-0" />
                              </div>
                              <span>WhatsApp</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (onRenewMember) onRenewMember(sub);
                            }}
                            className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
                          >
                            <div className="w-5.5 h-5.5 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                              <RotateCw className="w-3 h-3 text-white shrink-0" />
                            </div>
                            <span>Renew</span>
                          </button>

                          {/* Archive Option (for expired members who left the gym) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setArchiveTargetMember({
                                  _id: memberObj._id,
                                  memberId: memberObj.memberId,
                                  fullName: memberObj.fullName || 'Member',
                                  phone: memberObj.phone,
                                  photoUrl: memberObj.photoUrl,
                                });
                              }}
                              className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                              title="Member left the gym? Safely archive to remove from active alerts while preserving all records"
                            >
                              <div className="w-5.5 h-5.5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 transition-colors group-hover:bg-rose-100">
                                <Archive className="w-3 h-3 shrink-0" />
                              </div>
                              <span>Archive</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION B: LIVE ACTIVE MEMBERS
          (Member Photo, Member ID, Name, Phone Number, Membership Plan, Expiry Date, View Profile)
          ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Section Header with Search and Refresh */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                LIVE ACTIVE MEMBERS ({activeMembersTotal})
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Members with currently active memberships.
            </p>
          </div>

          {/* Search Box and Refresh Action */}
          <div className="flex items-center gap-2.5 self-start md:self-auto w-full md:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
              <div className="w-full h-9 pl-2.5 pr-2 flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={activeSearch}
                  onChange={(e) => {
                    setActiveSearch(e.target.value);
                    if (e.target.value === '') {
                      fetchActiveMembers('');
                    }
                  }}
                  placeholder="Search by name, ID, or phone..."
                  className="w-full h-full pl-2 text-xs bg-transparent border-none focus:outline-none text-slate-900 placeholder-slate-400"
                />
                {activeSearch && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>

            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing || activeLoading}
              title="Refresh live active members"
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 flex items-center justify-center transition-all shrink-0 disabled:opacity-50 shadow-2xs hover:shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing || activeLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Active Members Table */}
        {activeLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading active members...</span>
          </div>
        ) : activeMembers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {activeSearch ? (
              <div>
                <p className="font-semibold text-slate-700">No active members found</p>
                <p className="text-xs text-slate-400 mt-1">
                  No members matching &ldquo;{activeSearch}&rdquo; have an active membership.
                </p>
                <button
                  onClick={handleClearSearch}
                  className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
                >
                  Clear search
                </button>
              </div>
            ) : (
              'No active members found for this branch.'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Member ID</th>
                  <th className="px-6 py-3.5">Phone Number</th>
                  <th className="px-6 py-3.5">Membership Plan</th>
                  <th className="px-6 py-3.5">Expiry Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeMembers.map((member: any) => {
                  const currentSub = member.currentMembership;
                  const planName = currentSub?.plan?.name || 'Active Membership Pass';
                  const expiryDate = currentSub?.expiryDate;

                  return (
                    <tr key={member._id} className="hover:bg-slate-50/75 transition-colors">
                      {/* 1. Member Photo & Name */}
                      <td className="px-6 py-3.5">
                        <button
                          onClick={() => {
                            if (member._id && onSelectMember) {
                              onSelectMember(member._id);
                            }
                          }}
                          className="flex items-center gap-3 text-left group"
                        >
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.fullName}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
                              {member.fullName ? member.fullName.charAt(0) : 'M'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {member.fullName || 'Member'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {member.email || 'No email registered'}
                            </div>
                          </div>
                        </button>
                      </td>

                      {/* 2. Member ID */}
                      <td className="px-6 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 font-mono font-bold text-slate-800 text-xs shadow-2xs">
                          {member.memberId || '—'}
                        </span>
                      </td>

                      {/* 3. Phone Number */}
                      <td className="px-6 py-3.5 font-mono text-slate-700 font-medium">
                        {formatDisplayPhoneIN(member.phone)}
                      </td>

                      {/* 4. Membership Plan */}
                      <td className="px-6 py-3.5 text-slate-800 font-semibold">
                        {planName}
                      </td>

                      {/* 5. Expiry Date (DD/MM/YYYY) */}
                      <td className="px-6 py-3.5 font-mono text-slate-800 font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50/70 border border-emerald-100 font-mono text-xs font-semibold text-emerald-800">
                          {expiryDate ? formatDateIN(expiryDate) : 'Ongoing'}
                        </span>
                      </td>

                      {/* 6. Quick Action to View Profile: Aesthetic Micro-Card Button */}
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (member._id && onSelectMember) {
                              onSelectMember(member._id);
                            }
                          }}
                          className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                          title="View Member Profile"
                        >
                          <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                            <Eye className="w-3 h-3 shrink-0" />
                          </div>
                          <span>View Profile</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive Member Confirmation Modal */}
      {archiveTargetMember && (
        <ArchiveMemberModal
          isOpen={Boolean(archiveTargetMember)}
          member={archiveTargetMember}
          onClose={() => setArchiveTargetMember(null)}
          onSuccess={(msg) => {
            setActionNotice(msg);
            fetchDashboardStats();
            setTimeout(() => setActionNotice(null), 6000);
          }}
        />
      )}
    </div>
  );
};
