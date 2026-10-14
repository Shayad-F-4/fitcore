import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Clock,
  QrCode,
  UserPlus,
  CreditCard,
  Building,
  RefreshCw,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DashboardData, Membership } from '../types';
import { RenewModal } from '../components/modals/RenewModal';
import { MemberCardModal } from '../components/modals/MemberCardModal';

interface DashboardPageProps {
  onOpenCheckIn: () => void;
  onOpenRegister: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCheckIn,
  onOpenRegister,
}) => {
  const { activeBranch } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRenewSub, setSelectedRenewSub] = useState<Membership | null>(null);
  const [selectedCardMember, setSelectedCardMember] = useState<any | null>(null);
  const [liveOccupants, setLiveOccupants] = useState<any[]>([]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, liveRes] = await Promise.all([
        api.getDashboardStats(activeBranch?._id),
        api.getLiveOccupancy(activeBranch?._id),
      ]);
      setData(dashRes);
      setLiveOccupants(liveRes.occupants || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeBranch]);

  const handleQuickCheckOut = async (attendanceId: string) => {
    try {
      await api.checkOut(attendanceId);
      fetchDashboard();
    } catch (err) {
      console.error('Failed to check out:', err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-text-dim uppercase tracking-wider">
            Loading FitCore Telemetry...
          </span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalMembers: 0,
    activeMembers: 0,
    newMembersThisMonth: 0,
    liveOccupancy: 0,
    gymCapacity: 200,
    occupancyPercentage: 0,
    todayTotalCheckins: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#273129]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-main tracking-tight">
              Command Dashboard
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase">
              {activeBranch ? activeBranch.name : 'All Facilities'}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Real-time biometric attendance, subscription health, and revenue telemetry.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenRegister}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171E19] hover:bg-[#273129] border border-[#273129] text-xs font-semibold text-text-main transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-primary" />
            <span>+ Athlete</span>
          </button>
          <button
            onClick={onOpenCheckIn}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-bold text-xs tracking-wider uppercase transition-all shadow-glow-sm"
          >
            <QrCode className="w-4 h-4 stroke-[2.5]" />
            <span>⚡ Check-In</span>
          </button>
          <button
            onClick={fetchDashboard}
            title="Refresh Metrics"
            className="p-2 rounded-xl bg-[#111613] hover:bg-[#171E19] border border-[#273129] text-text-dim hover:text-text-main transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Athletes */}
        <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] hover:border-[#364439] transition-all shadow-card group">
          <div className="flex items-center justify-between text-text-dim mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Active Athletes</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-text-main">
              {metrics.activeMembers}
            </span>
            <span className="text-xs text-text-dim font-mono">/ {metrics.totalMembers} total</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-status-success font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{metrics.newMembersThisMonth} new athletes this month</span>
          </div>
        </div>

        {/* Card 2: Live Gym Occupancy */}
        <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] hover:border-[#364439] transition-all shadow-card group">
          <div className="flex items-center justify-between text-text-dim mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Live Occupancy</span>
            <div className="w-8 h-8 rounded-lg bg-status-info/10 text-status-info flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-text-main">
              {metrics.liveOccupancy}
            </span>
            <span className="text-xs text-text-dim font-mono">
              / {metrics.gymCapacity} max capacity
            </span>
          </div>
          {/* Progress bar towards capacity */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-mono text-text-dim mb-1">
              <span>Floor Density</span>
              <span className="text-primary font-semibold">{metrics.occupancyPercentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#171E19] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 shadow-glow-sm"
                style={{ width: `${Math.min(100, metrics.occupancyPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Monthly Revenue */}
        <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] hover:border-[#364439] transition-all shadow-card group">
          <div className="flex items-center justify-between text-text-dim mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Monthly Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-text-main">
              ${metrics.monthlyRevenue.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 text-xs text-text-dim flex items-center justify-between font-mono">
            <span>Cumulative:</span>
            <strong className="text-text-muted font-bold">${metrics.totalRevenue.toLocaleString()}</strong>
          </div>
        </div>

        {/* Card 4: Expiring Subscriptions Warning */}
        <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] hover:border-[#364439] transition-all shadow-card group">
          <div className="flex items-center justify-between text-text-dim mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Renewal Watch</span>
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-amber-400">
              {data?.expiringMemberships?.length || 0}
            </span>
            <span className="text-xs text-text-dim font-mono">within 7 days</span>
          </div>
          <div className="mt-3 text-xs text-amber-400/80 font-medium">
            High priority renewals requiring follow-up
          </div>
        </div>
      </div>

      {/* Main Charts & Live Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue Trajectory & Peak Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-text-main">
                  Monthly Revenue Trajectory
                </h3>
                <p className="text-xs text-text-dim">Gross membership dues collected (Past 6 Months)</p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#171E19] text-primary border border-[#273129]">
                USD ($)
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.monthlyRevenueData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B7FF3C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#B7FF3C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#273129" vertical={false} />
                  <XAxis dataKey="month" stroke="#657369" fontSize={11} tickLine={false} />
                  <YAxis stroke="#657369" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111613',
                      borderColor: '#273129',
                      borderRadius: '0.75rem',
                      color: '#F5F7F5',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#B7FF3C"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expiring Memberships Quick Renewal Table */}
          <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <h3 className="font-display font-bold text-base text-text-main">
                  Expiring Subscriptions (Next 7 Days)
                </h3>
              </div>
              <span className="text-xs text-text-dim font-mono">
                {data?.expiringMemberships?.length || 0} athletes expiring
              </span>
            </div>

            {(!data?.expiringMemberships || data.expiringMemberships.length === 0) ? (
              <div className="py-8 text-center text-xs text-text-dim">
                No memberships expiring in the next 7 days. All athletes are up to date!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#273129] text-text-dim text-[11px] font-mono uppercase">
                      <th className="text-left pb-2 font-medium">Athlete</th>
                      <th className="text-left pb-2 font-medium">Plan Tier</th>
                      <th className="text-left pb-2 font-medium">Expiry Date</th>
                      <th className="text-right pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#273129]/60">
                    {data.expiringMemberships.map((sub: any) => {
                      const member = sub.member;
                      const expiry = new Date(sub.expiryDate);
                      const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 3600 * 24));
                      return (
                        <tr key={sub._id} className="hover:bg-[#171E19]/40 transition-colors">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={member?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={member?.fullName}
                                className="w-7 h-7 rounded-full object-cover border border-[#273129]"
                              />
                              <div>
                                <p className="font-semibold text-text-main">{member?.fullName}</p>
                                <p className="text-[10px] font-mono text-text-dim">{member?.memberId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 text-text-muted">{sub.plan?.name}</td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 font-mono text-amber-400 font-semibold">
                              {expiry.toLocaleDateString()}
                              <span className="text-[10px] text-amber-400/80">({daysLeft}d left)</span>
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => setSelectedRenewSub(sub)}
                              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-[#080B0A] font-semibold text-[11px] transition-colors"
                            >
                              Renew Now
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
        </div>

        {/* Right 1 Col: Live Gym Floor & Recent Activity Stream */}
        <div className="space-y-6">
          {/* Live In-Gym Athletes Card */}
          <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                <h3 className="font-display font-bold text-base text-text-main">
                  Live on Gym Floor
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-primary">
                {liveOccupants.length} Inside
              </span>
            </div>

            {liveOccupants.length === 0 ? (
              <div className="py-10 text-center text-xs text-text-dim">
                Gym is currently empty. Use Fast Check-In above to log an athlete!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {liveOccupants.map((occ) => {
                  const checkIn = new Date(occ.checkInTime);
                  const durationMins = Math.round((Date.now() - checkIn.getTime()) / 60000);
                  const member = occ.member;
                  return (
                    <div
                      key={occ._id}
                      className="p-2.5 rounded-xl bg-[#080B0A] border border-[#273129] flex items-center justify-between hover:border-[#364439] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={member?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={member?.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-main truncate">
                            {member?.fullName}
                          </p>
                          <p className="text-[10px] text-text-dim font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-primary" />
                            {durationMins < 60 ? `${durationMins}m in-gym` : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setSelectedCardMember(member)}
                          title="View Digital Pass"
                          className="p-1 rounded-lg text-text-dim hover:text-text-main hover:bg-[#171E19]"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleQuickCheckOut(occ._id)}
                          className="px-2 py-1 rounded-md bg-[#171E19] hover:bg-status-error/20 hover:text-status-error text-[10px] font-mono text-text-dim transition-colors"
                          title="Check athlete out"
                        >
                          Out
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Audit Activities Feed */}
          <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-text-dim" />
                <h3 className="font-display font-bold text-base text-text-main">
                  Audit Telemetry Feed
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {(data?.recentActivity || []).map((act: any) => {
                const timeAgo = new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={act._id} className="flex items-start gap-2.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-main truncate">
                        {act.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-text-dim">
                        by {act.userName || 'System'} • {timeAgo}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RenewModal
        membership={selectedRenewSub}
        isOpen={Boolean(selectedRenewSub)}
        onClose={() => setSelectedRenewSub(null)}
        onSuccess={fetchDashboard}
      />

      <MemberCardModal
        member={selectedCardMember}
        isOpen={Boolean(selectedCardMember)}
        onClose={() => setSelectedCardMember(null)}
      />
    </div>
  );
};
