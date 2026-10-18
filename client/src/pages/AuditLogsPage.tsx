import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, User, FileText, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs(page, 20);
      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-bold text-2xl text-slate-900 tracking-tight">
              Security & Activity Audit Logs
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {pagination.total} Records
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable log of all staff actions, payments, membership status transitions & check-in events.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="group inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-2xs hover:shadow-xs self-start sm:self-auto"
        >
          <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </div>
          <span>Refresh</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading System Audit Stream...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No audit records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action Event</th>
                  <th className="px-5 py-3">Staff Member</th>
                  <th className="px-5 py-3">Entity Type</th>
                  <th className="px-5 py-3">Metadata / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {logs.map((log) => {
                  return (
                    <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-sans">
                        <div className="font-semibold text-slate-900">{log.userName || 'System'}</div>
                        {log.userRole && (
                          <div className="text-[11px] text-slate-400 font-mono">{log.userRole}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 font-sans font-medium">{log.entity}</td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate" title={log.details ? JSON.stringify(log.details) : ''}>
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/75 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-semibold text-slate-900">{pagination.total}</span> records
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs hover:shadow-xs flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700 px-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs hover:shadow-xs flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
