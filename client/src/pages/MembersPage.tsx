import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  QrCode,
  RefreshCw,
  Snowflake,
  Sun,
  Archive,
  MoreVertical,
  CheckCircle,
  Clock,
  Building,
  Phone,
  Mail,
  Calendar,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Member, Membership } from '../types';
import { MemberCardModal } from '../components/modals/MemberCardModal';
import { RenewModal } from '../components/modals/RenewModal';
import { FreezeModal } from '../components/modals/FreezeModal';

interface MembersPageProps {
  onOpenRegister: () => void;
  onOpenCheckIn: () => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({
  onOpenRegister,
  onOpenCheckIn,
}) => {
  const { branches, activeBranch } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState(activeBranch?._id || 'ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedCardMember, setSelectedCardMember] = useState<Member | null>(null);
  const [selectedRenewSub, setSelectedRenewSub] = useState<Membership | null>(null);
  const [selectedFreezeSub, setSelectedFreezeSub] = useState<Membership | null>(null);

  const fetchMembers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.getMembers({
        page,
        limit: 12,
        search,
        status: statusFilter,
        branch: branchFilter,
      });
      setMembers(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1);
  }, [search, statusFilter, branchFilter]);

  const handleThaw = async (subId: string) => {
    try {
      await api.thawMembership(subId);
      fetchMembers(pagination.page);
    } catch (err) {
      console.error('Failed to unfreeze:', err);
    }
  };

  const handleArchive = async (memberId: string) => {
    try {
      await api.archiveMember(memberId);
      fetchMembers(pagination.page);
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-status-success/10 text-status-success border-status-success/30';
      case 'FROZEN':
        return 'bg-status-info/10 text-status-info border-status-info/30';
      case 'EXPIRED':
        return 'bg-status-error/10 text-status-error border-status-error/30';
      default:
        return 'bg-amber-400/10 text-amber-400 border-amber-400/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#273129]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-main tracking-tight">
              Athlete Directory
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#111613] text-primary border border-[#273129] font-bold">
              {pagination.total} Athletes
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Manage profiles, digital QR passes, active subscriptions, and holds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenRegister}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs tracking-wider uppercase transition-all shadow-glow-sm"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Register Athlete</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#111613] border border-[#273129] flex flex-col md:flex-row items-center justify-between gap-3 shadow-card">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-text-dim absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-xs focus:outline-none placeholder:text-text-dim"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#080B0A] border border-[#273129] text-text-muted text-xs focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="FROZEN">Frozen / Paused</option>
            <option value="EXPIRED">Expired</option>
            <option value="PENDING">Pending Plan</option>
          </select>

          {/* Branch Select */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#080B0A] border border-[#273129] text-text-muted text-xs focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-[#080B0A] p-0.5 rounded-xl border border-[#273129]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-[#171E19] text-primary' : 'text-text-dim hover:text-text-main'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table' ? 'bg-[#171E19] text-primary' : 'text-text-dim hover:text-text-main'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Member Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-text-dim font-mono">
          Loading Athletes...
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#111613] border border-[#273129]">
          <p className="text-text-muted text-sm font-semibold">No athletes found matching criteria.</p>
          <p className="text-xs text-text-dim mt-1">Try resetting filters or register a new athlete above.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const sub = member.currentMembership;
            const isFrozen = sub?.status === 'FROZEN';
            const isExpired = member.status === 'EXPIRED';

            return (
              <div
                key={member._id}
                className="rounded-2xl bg-[#111613] border border-[#273129] hover:border-[#364439] p-5 shadow-card transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Status & ID */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#273129]">
                    <span className="text-xs font-mono font-bold text-primary">
                      {member.memberId}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${getStatusBadge(
                        member.status
                      )}`}
                    >
                      {member.status}
                    </span>
                  </div>

                  {/* Profile Info */}
                  <div className="flex items-center gap-3.5 py-4">
                    <img
                      src={member.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={member.fullName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/30 group-hover:border-primary transition-colors shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-base text-text-main truncate">
                        {member.fullName}
                      </h3>
                      <p className="text-xs text-text-muted truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-text-dim" />
                        {member.email}
                      </p>
                      <p className="text-xs text-text-dim font-mono mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-text-dim" />
                        {member.phone}
                      </p>
                    </div>
                  </div>

                  {/* Plan / Subscription Details */}
                  <div className="p-3 rounded-xl bg-[#080B0A] border border-[#273129] space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-text-dim">Plan:</span>
                      <strong className="text-text-main truncate font-medium">
                        {sub?.plan?.name || 'No Active Plan'}
                      </strong>
                    </div>
                    {sub && (
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-text-dim">Expires:</span>
                        <span className={isExpired ? 'text-status-error' : 'text-primary'}>
                          {new Date(sub.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-text-dim pt-1 border-t border-[#273129]/60">
                      <span>Facility:</span>
                      <span className="truncate">{member.branch?.name || 'Downtown'}</span>
                    </div>
                  </div>

                  {/* Fitness Goals */}
                  {member.fitnessGoals?.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-3">
                      {member.fitnessGoals.slice(0, 3).map((goal, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#171E19] text-text-muted border border-[#273129]"
                        >
                          {goal}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-4 border-t border-[#273129] flex items-center justify-between gap-1">
                  <button
                    onClick={() => setSelectedCardMember(member)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#171E19] hover:bg-[#273129] text-text-muted hover:text-text-main text-xs transition-colors"
                    title="View & Print Digital QR Pass"
                  >
                    <QrCode className="w-3.5 h-3.5 text-primary" />
                    <span>ID Pass</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {sub && (
                      <>
                        <button
                          onClick={() => setSelectedRenewSub(sub)}
                          className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-[#080B0A] text-xs font-semibold transition-colors"
                          title="Renew Membership"
                        >
                          Renew
                        </button>

                        {isFrozen ? (
                          <button
                            onClick={() => handleThaw(sub._id)}
                            className="p-1.5 rounded-lg text-status-info hover:bg-status-info/20 transition-colors"
                            title="Unfreeze / Resume Subscription"
                          >
                            <Sun className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedFreezeSub(sub)}
                            className="p-1.5 rounded-lg text-text-dim hover:text-status-info hover:bg-[#171E19] transition-colors"
                            title="Freeze Subscription"
                          >
                            <Snowflake className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => handleArchive(member._id)}
                      className="p-1.5 rounded-lg text-text-dim hover:text-status-error hover:bg-[#171E19] transition-colors"
                      title={member.isArchived ? 'Restore Athlete' : 'Archive Athlete'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="p-4 rounded-2xl bg-[#111613] border border-[#273129] shadow-card overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#273129] text-text-dim text-[11px] font-mono uppercase">
                <th className="text-left pb-3 font-medium">Athlete</th>
                <th className="text-left pb-3 font-medium">Member ID</th>
                <th className="text-left pb-3 font-medium">Branch</th>
                <th className="text-left pb-3 font-medium">Active Plan</th>
                <th className="text-left pb-3 font-medium">Status</th>
                <th className="text-left pb-3 font-medium">Expiry</th>
                <th className="text-right pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#273129]/60">
              {members.map((member) => {
                const sub = member.currentMembership;
                return (
                  <tr key={member._id} className="hover:bg-[#171E19]/40 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={member.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={member.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-[#273129]"
                        />
                        <div>
                          <p className="font-semibold text-text-main">{member.fullName}</p>
                          <p className="text-[10px] text-text-dim">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 font-mono font-bold text-primary">{member.memberId}</td>
                    <td className="py-3 text-text-muted">{member.branch?.name}</td>
                    <td className="py-3 text-text-main font-medium">
                      {sub?.plan?.name || 'Pending Plan'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${getStatusBadge(
                          member.status
                        )}`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-text-dim">
                      {sub ? new Date(sub.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedCardMember(member)}
                          className="p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-[#171E19]"
                          title="View Digital QR Pass"
                        >
                          <QrCode className="w-4 h-4 text-primary" />
                        </button>
                        {sub && (
                          <button
                            onClick={() => setSelectedRenewSub(sub)}
                            className="px-2 py-1 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-[#080B0A] text-[11px] font-semibold"
                          >
                            Renew
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

      {/* Modals */}
      <MemberCardModal
        member={selectedCardMember}
        isOpen={Boolean(selectedCardMember)}
        onClose={() => setSelectedCardMember(null)}
      />

      <RenewModal
        membership={selectedRenewSub}
        isOpen={Boolean(selectedRenewSub)}
        onClose={() => setSelectedRenewSub(null)}
        onSuccess={() => fetchMembers(pagination.page)}
      />

      <FreezeModal
        membership={selectedFreezeSub}
        isOpen={Boolean(selectedFreezeSub)}
        onClose={() => setSelectedFreezeSub(null)}
        onSuccess={() => fetchMembers(pagination.page)}
      />
    </div>
  );
};
