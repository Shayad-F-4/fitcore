import React, { useState, useEffect } from 'react';
import {
  Clock,
  MessageCircle,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { api } from '../api/client';
import { formatDateTimeIN, formatDisplayPhoneIN } from '../utils/formatters';
import { ExpiryManager } from '../components/ExpiryManager';

interface ReportsPageProps {
  onOpenReceipt?: (payment: any) => void;
  onRenewMember?: (membership: any) => void;
  onSelectMember?: (memberId: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  onRenewMember,
  onSelectMember,
}) => {
  const [activeTab, setActiveTab] = useState<'expiry' | 'whatsappLogs'>('expiry');
  const [settings, setSettings] = useState<any>(null);

  // WhatsApp logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');
  const [logPage, setLogPage] = useState(1);
  const [logPagination, setLogPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    api.getSettings().then((res) => setSettings(res.data)).catch(console.error);
  }, []);

  const loadNotificationLogs = async (page = 1, status = logStatusFilter) => {
    try {
      setLogsLoading(true);
      const res = await api.getNotificationLogs(page, status);
      setLogs(res.logs || []);
      setLogPagination({
        total: res.pagination?.total || 0,
        totalPages: res.pagination?.totalPages || 1,
      });
      setLogPage(page);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'whatsappLogs') {
      loadNotificationLogs(1, logStatusFilter);
    }
  }, [activeTab, logStatusFilter]);

  const gymName = settings?.gymName || 'Sagar Fitness Gym';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Reports & Expiry Intelligence
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Membership renewal schedules and automated WhatsApp reminder history.
        </p>
      </div>

      {/* Two Simplified Sections / Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('expiry')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'expiry'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Membership Expiry</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsappLogs')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'whatsappLogs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp Reminder History</span>
        </button>
      </div>

      {/* SECTION A: Membership Expiry */}
      {activeTab === 'expiry' && (
        <ExpiryManager
          onRenewMember={onRenewMember}
          onSelectMember={onSelectMember}
          gymName={gymName}
        />
      )}

      {/* SECTION B: WhatsApp Reminder History */}
      {activeTab === 'whatsappLogs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">Filter Status:</span>
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Delivered (Sent)</option>
                <option value="NOT_CONFIGURED">Setup Required</option>
                <option value="FAILED">Failed</option>
                <option value="SKIPPED">Skipped (Duplicate Protected)</option>
              </select>
            </div>
            <button
              onClick={() => loadNotificationLogs(1, logStatusFilter)}
              className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-2xs hover:shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${logsLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {logsLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading reminder history...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/75 border border-dashed border-slate-200 rounded-2xl">
              No WhatsApp reminder logs found for this filter.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3">Reminder Type</th>
                      <th className="px-4 py-3">Delivery Status</th>
                      <th className="px-4 py-3">Message / Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log: any) => (
                      <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTimeIN(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {log.recipientName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {formatDisplayPhoneIN(log.recipientPhone)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {log.type === 'EXPIRY_2_DAYS'
                            ? '2-Day Auto Reminder'
                            : log.type === 'EXPIRY_MANUAL_4_5_DAYS'
                            ? '4-5 Day Manual Reminder'
                            : log.type}
                        </td>
                        <td className="px-4 py-3">
                          {log.status === 'SENT' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Delivered
                            </span>
                          ) : log.status === 'NOT_CONFIGURED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Setup Required
                            </span>
                          ) : log.status === 'FAILED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Failed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {log.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-sm truncate" title={log.failureReason || log.message}>
                          {log.failureReason ? (
                            <span className="text-rose-600 font-medium">{log.failureReason}</span>
                          ) : log.externalId ? (
                            <span className="font-mono text-[11px] text-slate-500">ID: {log.externalId}</span>
                          ) : (
                            log.message
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {logs.map((log: any) => (
                  <div key={log._id} className="p-4 space-y-2.5 bg-white text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm text-slate-900 block truncate">
                          {log.recipientName}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px] block mt-0.5">
                          {formatDisplayPhoneIN(log.recipientPhone)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatDateTimeIN(log.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-600 font-medium truncate">
                        {log.type === 'EXPIRY_2_DAYS'
                          ? '2-Day Auto Reminder'
                          : log.type === 'EXPIRY_MANUAL_4_5_DAYS'
                          ? '4-5 Day Manual Reminder'
                          : log.type}
                      </span>
                      <span className="shrink-0">
                        {log.status === 'SENT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Delivered
                          </span>
                        ) : log.status === 'NOT_CONFIGURED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Setup Required
                          </span>
                        ) : log.status === 'FAILED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Failed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {log.status}
                          </span>
                        )}
                      </span>
                    </div>

                    {(log.failureReason || log.message) && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                        {log.failureReason ? (
                          <span className="text-rose-600 font-medium">{log.failureReason}</span>
                        ) : (
                          log.message
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
