import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Users,
  Activity,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Attendance } from '../types';

export const AttendancePage: React.FC = () => {
  const { activeBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'today'>('live');
  const [liveOccupants, setLiveOccupants] = useState<Attendance[]>([]);
  const [todayLogs, setTodayLogs] = useState<Attendance[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Scan input
  const [identifier, setIdentifier] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [liveRes, todayRes, statsRes] = await Promise.all([
        api.getLiveOccupancy(activeBranch?._id),
        api.getTodayAttendance(activeBranch?._id),
        api.getAttendanceStats(activeBranch?._id),
      ]);
      setLiveOccupants(liveRes.occupants || []);
      setTodayLogs(todayRes || []);
      setHourlyData(statsRes.hourlyChartData || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s auto-refresh for live kiosk
    return () => clearInterval(interval);
  }, [activeBranch]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setScanError(null);
    setScanResult(null);

    try {
      const res = await api.checkIn({
        identifier: identifier.trim(),
        branchId: activeBranch?._id,
        method: 'QR_CODE',
      });
      setScanResult(res);
      setIdentifier('');
      fetchData();
    } catch (err: any) {
      setScanError(err.message || 'Scan rejected. Athlete not found or membership issue.');
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    try {
      await api.checkOut(attendanceId);
      fetchData();
    } catch (err) {
      console.error('Failed to check out:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#273129]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-main tracking-tight">
              Reception Attendance Kiosk
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold uppercase">
              Live Terminal
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Real-time biometric turnstile simulation, QR pass scanner & facility capacity monitor.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111613] hover:bg-[#171E19] border border-[#273129] text-xs font-mono text-text-dim hover:text-text-main transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Floor</span>
        </button>
      </div>

      {/* Top Scanner Terminal Box */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#111613] via-[#141C16] to-[#111613] border-2 border-primary/40 shadow-glow-primary">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
                Kiosk Scanner Gun Armed & Ready
              </span>
            </div>
            <span className="text-xs font-mono text-text-dim">Auto-toggles Entry & Exit</span>
          </div>

          <form onSubmit={handleScanSubmit} className="relative">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Scan Barcode / QR token or input Member ID (e.g. FC-1001, FC-1002)..."
              autoFocus
              className="w-full px-5 py-3.5 rounded-2xl bg-[#080B0A] border-2 border-[#273129] focus:border-primary text-text-main font-mono text-base placeholder:text-text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
            />
            <button
              type="submit"
              disabled={!identifier.trim()}
              className="absolute right-2.5 top-2.5 bottom-2.5 px-5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-[#080B0A] font-bold text-xs tracking-wider uppercase transition-colors"
            >
              Scan Pass
            </button>
          </form>

          {/* Quick Click Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-text-dim font-mono text-[11px]">Quick click test:</span>
            {['FC-1001', 'FC-1002', 'FC-1003', 'FC-1004', 'FC-1006'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setIdentifier(id);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#171E19] hover:bg-primary/20 hover:text-primary text-text-muted font-mono text-[11px] border border-[#273129] transition-colors"
              >
                {id}
              </button>
            ))}
          </div>

          {/* Feedback banner */}
          {scanResult && (
            <div className="p-4 rounded-2xl bg-status-success/15 border border-status-success/40 flex items-center gap-3 text-status-success animate-in zoom-in-95 duration-150">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">
                  {scanResult.type === 'CHECK_IN' ? 'Athlete Verified & Admitted:' : 'Athlete Exited Facility:'}
                </span>{' '}
                {scanResult.member.fullName} ({scanResult.member.memberId})
              </div>
            </div>
          )}

          {scanError && (
            <div className="p-4 rounded-2xl bg-status-error/15 border border-status-error/40 flex items-center gap-3 text-status-error text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics: Rush Hours Hourly Chart */}
      <div className="p-5 rounded-2xl bg-[#111613] border border-[#273129] shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-text-main">
              Today's Facility Peak Hours Curve
            </h3>
            <p className="text-xs text-text-dim">Hourly athlete check-in distribution (6 AM – 10 PM)</p>
          </div>
          <span className="text-xs font-mono text-primary font-bold">
            Total Today: {todayLogs.length} Check-ins
          </span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#273129" vertical={false} />
              <XAxis dataKey="hour" stroke="#657369" fontSize={10} tickLine={false} />
              <YAxis stroke="#657369" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111613',
                  borderColor: '#273129',
                  borderRadius: '0.75rem',
                  color: '#F5F7F5',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" fill="#B7FF3C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs: Currently on Floor vs Today's History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#273129] pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('live')}
              className={`text-sm font-display font-bold pb-2 -mb-2.5 transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'live'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-dim hover:text-text-main'
              }`}
            >
              <span>Currently on Floor</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {liveOccupants.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('today')}
              className={`text-sm font-display font-bold pb-2 -mb-2.5 transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'today'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-dim hover:text-text-main'
              }`}
            >
              <span>Today's Total Visits</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#171E19] text-text-muted">
                {todayLogs.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: Live In Gym */}
        {activeTab === 'live' ? (
          <div className="p-4 rounded-2xl bg-[#111613] border border-[#273129] shadow-card overflow-x-auto">
            {liveOccupants.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-dim">
                No athletes currently on the gym floor. Scan an athlete above to admit them!
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#273129] text-text-dim text-[11px] font-mono uppercase">
                    <th className="text-left pb-3 font-medium">Athlete</th>
                    <th className="text-left pb-3 font-medium">Member ID</th>
                    <th className="text-left pb-3 font-medium">Entry Timestamp</th>
                    <th className="text-left pb-3 font-medium">Floor Time</th>
                    <th className="text-left pb-3 font-medium">Verification</th>
                    <th className="text-right pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#273129]/60">
                  {liveOccupants.map((occ) => {
                    const member = occ.member;
                    const checkIn = new Date(occ.checkInTime);
                    const durationMins = Math.round((Date.now() - checkIn.getTime()) / 60000);
                    return (
                      <tr key={occ._id} className="hover:bg-[#171E19]/40 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={member?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={member?.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-primary/30"
                            />
                            <span className="font-semibold text-text-main">{member?.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-primary font-bold">{member?.memberId}</td>
                        <td className="py-3 text-text-muted font-mono">
                          {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3">
                          <span className="text-[11px] font-mono text-text-main font-semibold">
                            {durationMins < 60 ? `${durationMins}m` : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171E19] text-text-dim border border-[#273129]">
                            {occ.method}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleCheckOut(occ._id)}
                            className="px-3 py-1 rounded-lg bg-status-info/10 hover:bg-status-info text-status-info hover:text-[#080B0A] font-semibold text-xs transition-colors"
                          >
                            Check Out
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Tab 2: Today's Full Log */
          <div className="p-4 rounded-2xl bg-[#111613] border border-[#273129] shadow-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#273129] text-text-dim text-[11px] font-mono uppercase">
                  <th className="text-left pb-3 font-medium">Athlete</th>
                  <th className="text-left pb-3 font-medium">Check-In</th>
                  <th className="text-left pb-3 font-medium">Check-Out</th>
                  <th className="text-left pb-3 font-medium">Method</th>
                  <th className="text-left pb-3 font-medium">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#273129]/60">
                {todayLogs.map((log) => {
                  const member = log.member;
                  return (
                    <tr key={log._id} className="hover:bg-[#171E19]/40 transition-colors">
                      <td className="py-3">
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
                      <td className="py-3 font-mono text-text-muted">
                        {new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 font-mono">
                        {log.checkOutTime ? (
                          <span className="text-text-muted">
                            {new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                            Active In Gym
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171E19] text-text-dim border border-[#273129]">
                          {log.method}
                        </span>
                      </td>
                      <td className="py-3 text-text-dim">{log.branch?.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
