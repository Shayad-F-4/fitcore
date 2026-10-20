import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  RefreshCw,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDisplayPhoneIN } from '../utils/formatters';
import { openWhatsApp, getExpiryReminderMessage } from '../utils/whatsapp';

interface ExpiryManagerProps {
  onRenewMember?: (membership: any) => void;
  onSelectMember?: (memberId: string) => void;
  gymName?: string;
}

export const ExpiryManager: React.FC<ExpiryManagerProps> = ({
  onRenewMember,
  onSelectMember,
  gymName = 'Sagar Fitness Gym',
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN';

  const [data, setData] = useState<{
    summary: { in2DaysCount: number; in4To5DaysCount: number; expiredCount: number };
    expiringIn2Days: any[];
    expiringIn4To5Days: any[];
    expired: any[];
    whatsappConfigured: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [filter, setFilter] = useState<'2days' | '4to5days' | 'expired'>('2days');
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getGroupedExpiry();
      setData(res);
    } catch (err) {
      console.error('Failed to load expiry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSchedulerNow = async () => {
    try {
      setRunningJob(true);
      const res = await api.runReminderSchedulerNow();
      setNotice(
        `Scheduler Finished: ${res.data?.sentCount || 0} sent, ${res.data?.notConfiguredCount || 0} setup required, ${res.data?.skippedCount || 0} skipped.`
      );
      await loadData();
      setTimeout(() => setNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger scheduler');
    } finally {
      setRunningJob(false);
    }
  };

  const handleManualSend = async (item: any) => {
    const member = item.member;
    if (!member?.phone) {
      alert('This member has no phone number recorded');
      return;
    }

    const message = item.prefilledMessage || getExpiryReminderMessage({
      name: member.fullName,
      expiryDate: item.membership.expiryDate,
      gymName,
    });

    openWhatsApp(member.phone, message);

    try {
      await api.logManualReminder({
        membershipId: item.membership._id,
        memberId: member._id,
        recipientPhone: member.phone,
        recipientName: member.fullName,
        message,
      });
      setNotice(`WhatsApp reminder opened & recorded for ${member.fullName}`);
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Failed to log reminder:', err);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        Loading membership expiry records...
      </div>
    );
  }

  const summary = data?.summary || { in2DaysCount: 0, in4To5DaysCount: 0, expiredCount: 0 };
  const isWhatsAppConfigured = data?.whatsappConfigured ?? false;

  return (
    <div className="space-y-4">
      {/* Small, discreet setup status note */}
      {!isWhatsAppConfigured && (
        <div className="px-3.5 py-2 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Automated WhatsApp delivery requires Cloud API setup in Settings. Manual WhatsApp reminder button is fully operational.</span>
          </div>
          <a href="/settings" className="font-semibold text-amber-700 hover:text-amber-900 hover:underline shrink-0 ml-3">
            Configure in Settings →
          </a>
        </div>
      )}

      {notice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Compact Filter Navigation & Admin Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('2days')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              filter === '2days'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring in 2 Days</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === '2days' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {summary.in2DaysCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('4to5days')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              filter === '4to5days'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Expiring in 4–5 Days</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === '4to5days' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {summary.in4To5DaysCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('expired')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              filter === 'expired'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Expired Memberships</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === 'expired' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {summary.expiredCount}
            </span>
          </button>
        </div>

        {/* Admin only: manual trigger of background 2-day scheduler */}
        {isAdmin && filter === '2days' && (
          <button
            onClick={handleRunSchedulerNow}
            disabled={runningJob}
            className="group inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-2xs hover:shadow-xs shrink-0 disabled:opacity-50"
            title="Execute automated 2-day reminder scanner now"
          >
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <RefreshCw className={`w-3 h-3 ${runningJob ? 'animate-spin' : ''}`} />
            </div>
            <span>{runningJob ? 'Checking...' : 'Run Auto Scanner'}</span>
          </button>
        )}
      </div>

      {/* Filter 1: Expiring in 2 Days */}
      {filter === '2days' && (
        <div className="space-y-3">
          {(data?.expiringIn2Days || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/75 border border-dashed border-slate-200 rounded-2xl">
              No active memberships are expiring in 2 days.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Expiry Date</th>
                      <th className="px-4 py-3">Auto Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.expiringIn2Days.map((item, idx) => {
                      const member = item.member;
                      const status = item.notificationStatus;

                      let statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          Scheduled
                        </span>
                      );

                      if (status === 'SENT') {
                        statusBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Delivered
                          </span>
                        );
                      } else if (status === 'NOT_CONFIGURED') {
                        statusBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Setup Required
                          </span>
                        );
                      } else if (status === 'FAILED') {
                        statusBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Failed
                          </span>
                        );
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => onSelectMember && onSelectMember(member._id)}
                              className="font-semibold text-slate-900 hover:text-blue-600 text-left transition-colors"
                            >
                              {member.fullName}
                            </button>
                            <div className="text-[11px] font-mono text-slate-400">{member.memberId}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {formatDisplayPhoneIN(member.phone)}
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium">
                            {item.plan?.name || 'Standard Pass'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium font-mono">
                            {item.expiryDateFormatted}
                          </td>
                          <td className="px-4 py-3">{statusBadge}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleManualSend(item)}
                              className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                              title="Open WhatsApp with prefilled reminder"
                            >
                              <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                                <MessageCircle className="w-3 h-3" />
                              </div>
                              <span>WhatsApp</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (Zero Sideways Scroll) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {data?.expiringIn2Days.map((item, idx) => {
                  const member = item.member;
                  const status = item.notificationStatus;

                  return (
                    <div key={idx} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => onSelectMember && onSelectMember(member._id)}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 text-left block truncate"
                          >
                            {member.fullName}
                          </button>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            ID: {member.memberId} • {formatDisplayPhoneIN(member.phone)}
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
                          In 2 Days
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <span className="font-semibold text-slate-700">{item.plan?.name || 'Standard Pass'}</span>
                        <span className="font-mono text-slate-500">{item.expiryDateFormatted}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleManualSend(item)}
                        className="w-full min-h-[44px] h-11 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 transition-all shadow-2xs"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Send WhatsApp Reminder</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter 2: Expiring in 4–5 Days */}
      {filter === '4to5days' && (
        <div className="space-y-3">
          {(data?.expiringIn4To5Days || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/75 border border-dashed border-slate-200 rounded-2xl">
              No active memberships expiring in the 4–5 day window.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Expiry Date</th>
                      <th className="px-4 py-3">Days Remaining</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.expiringIn4To5Days.map((item, idx) => {
                      const member = item.member;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => onSelectMember && onSelectMember(member._id)}
                              className="font-semibold text-slate-900 hover:text-blue-600 text-left transition-colors"
                            >
                              {member.fullName}
                            </button>
                            <div className="text-[11px] font-mono text-slate-400">{member.memberId}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {formatDisplayPhoneIN(member.phone)}
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium">
                            {item.plan?.name || 'Standard Pass'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium font-mono">
                            {item.expiryDateFormatted}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              In {item.daysRemaining} days
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleManualSend(item)}
                              className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                            >
                              <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                                <MessageCircle className="w-3 h-3" />
                              </div>
                              <span>Remind on WhatsApp</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {data?.expiringIn4To5Days.map((item, idx) => {
                  const member = item.member;
                  return (
                    <div key={idx} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => onSelectMember && onSelectMember(member._id)}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 text-left block truncate"
                          >
                            {member.fullName}
                          </button>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            ID: {member.memberId} • {formatDisplayPhoneIN(member.phone)}
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          In {item.daysRemaining} Days
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <span className="font-semibold text-slate-700">{item.plan?.name || 'Standard Pass'}</span>
                        <span className="font-mono text-slate-500">{item.expiryDateFormatted}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleManualSend(item)}
                        className="w-full min-h-[44px] h-11 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 transition-all shadow-2xs"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Send WhatsApp Reminder</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter 3: Expired Memberships */}
      {filter === 'expired' && (
        <div className="space-y-3">
          {(data?.expired || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/75 border border-dashed border-slate-200 rounded-2xl">
              No expired memberships found.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Expired On</th>
                      <th className="px-4 py-3">Overdue</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.expired.map((item, idx) => {
                      const member = item.member;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => onSelectMember && onSelectMember(member._id)}
                              className="font-semibold text-slate-900 hover:text-blue-600 text-left transition-colors"
                            >
                              {member.fullName}
                            </button>
                            <div className="text-[11px] font-mono text-slate-400">{member.memberId}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {formatDisplayPhoneIN(member.phone)}
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium">
                            {item.plan?.name || 'Standard Pass'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium font-mono">
                            {item.expiryDateFormatted}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {item.daysOverdue} days ago
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  const msg = `Hi ${member.fullName}, your membership at ${gymName} expired on ${item.expiryDateFormatted}. Please renew at the front desk to resume your workouts without interruption. Thank you!`;
                                  openWhatsApp(member.phone, msg);
                                }}
                                className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-emerald-600 hover:bg-emerald-50/50 flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              {onRenewMember && (
                                <button
                                  onClick={() => onRenewMember(item.membership)}
                                  className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                >
                                  <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                                    <CreditCard className="w-3 h-3" />
                                  </div>
                                  <span>Renew</span>
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

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {data?.expired.map((item, idx) => {
                  const member = item.member;
                  return (
                    <div key={idx} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => onSelectMember && onSelectMember(member._id)}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 text-left block truncate"
                          >
                            {member.fullName}
                          </button>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            ID: {member.memberId} • {formatDisplayPhoneIN(member.phone)}
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          {item.daysOverdue} Days Overdue
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <span className="font-semibold text-slate-700">{item.plan?.name || 'Standard Pass'}</span>
                        <span className="font-mono text-slate-500">Expired: {item.expiryDateFormatted}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Hi ${member.fullName}, your membership at ${gymName} expired on ${item.expiryDateFormatted}. Please renew at the front desk to resume your workouts without interruption. Thank you!`;
                            openWhatsApp(member.phone, msg);
                          }}
                          className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 transition-all shadow-2xs"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        {onRenewMember && (
                          <button
                            type="button"
                            onClick={() => onRenewMember(item.membership)}
                            className="flex-1 min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-2xs"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Renew Plan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
