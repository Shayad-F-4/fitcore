import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, User, FileText, RefreshCw } from 'lucide-react';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#273129]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-main tracking-tight">
              Security & Activity Audit Logs
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#111613] text-primary border border-[#273129] font-bold">
              {pagination.total} Records
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Immutable log of all staff actions, payments, membership status transitions & check-in events.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111613] hover:bg-[#171E19] border border-[#273129] text-xs font-mono text-text-dim hover:text-text-main transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="p-4 rounded-2xl bg-[#111613] border border-[#273129] shadow-card overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-text-dim font-mono">
            Loading System Audit Stream...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-dim">
            No audit records found.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#273129] text-text-dim text-[11px] font-mono uppercase">
                <th className="text-left pb-3 font-medium">Timestamp</th>
                <th className="text-left pb-3 font-medium">Action Event</th>
                <th className="text-left pb-3 font-medium">Staff Member</th>
                <th className="text-left pb-3 font-medium">Entity Type</th>
                <th className="text-left pb-3 font-medium">Metadata / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#273129]/60 font-mono">
              {logs.map((log) => {
                return (
                  <tr key={log._id} className="hover:bg-[#171E19]/40 transition-colors">
                    <td className="py-3 text-text-dim text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-text-muted">
                      {log.userName || 'System'}
                      {log.userRole && (
                        <span className="text-[10px] text-text-dim block">{log.userRole}</span>
                      )}
                    </td>
                    <td className="py-3 text-text-main">{log.entity}</td>
                    <td className="py-3 text-[11px] text-text-dim max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
