import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  LogOut,
  X,
  AlertCircle,
  RefreshCw,
  Printer,
  Download,
  Calendar,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Attendance } from '../types';
import { AttendanceRegisterModal } from '../components/modals/AttendanceRegisterModal';
import { exportToCSV } from '../utils/csvExport';
import { Avatar } from '../components/Avatar';
import { formatAttendanceDuration, getAttendanceDurationMinutes } from '../utils/formatters';

export const AttendancePage: React.FC = () => {
  const { activeBranch } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [attendanceLogs, setAttendanceLogs] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Print modal state
  const [showPrintRegister, setShowPrintRegister] = useState(false);

  // Member search / lookup state
  const [identifier, setIdentifier] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [identifiedMember, setIdentifiedMember] = useState<any | null>(null);
  const [identifiedSub, setIdentifiedSub] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const fetchAttendance = async (date = selectedDate, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getTodayAttendance(activeBranch?._id, date);
      setAttendanceLogs(res || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(selectedDate, false);
    // If viewing today, auto-refresh every 15s silently without UI flicker
    if (selectedDate === todayStr) {
      const interval = setInterval(() => fetchAttendance(todayStr, true), 15000);
      return () => clearInterval(interval);
    }
  }, [activeBranch, selectedDate]);

  // Real-time synchronization across all tabs on member updates / check-ins (silent)
  useEffect(() => {
    const handleDataChanged = () => {
      fetchAttendance(selectedDate, true);
    };
    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, [selectedDate, activeBranch]);

  // Handle member lookup
  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) return;

    setLookingUp(true);
    setStatusMessage(null);
    setIdentifiedMember(null);
    setIdentifiedSub(null);

    try {
      // First search for the member
      const searchRes = await api.getMembers({ search: identifier.trim(), limit: 1 });
      const found = searchRes.data?.[0];

      if (!found) {
        setStatusMessage({
          type: 'error',
          text: `No member found matching "${identifier.trim()}". Check ID or phone number.`,
        });
        return;
      }

      // Fetch full profile for membership status check
      const profileRes = await api.getMember(found._id);
      setIdentifiedMember(profileRes.member);
      setIdentifiedSub(profileRes.currentMembership || null);

      if (profileRes.member.status === 'EXPIRED') {
        setStatusMessage({
          type: 'warning',
          text: 'Warning: Member subscription has expired. Please renew membership before check-in.',
        });
      } else if (profileRes.member.status === 'FROZEN') {
        setStatusMessage({
          type: 'warning',
          text: 'Warning: Membership is currently frozen. Unfreeze or renew to allow check-in.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Lookup failed.',
      });
    } finally {
      setLookingUp(false);
    }
  };

  // Perform Check-In
  const handleCheckIn = async () => {
    const searchTarget = identifiedMember?.memberId || identifier.trim();
    if (!searchTarget) return;

    try {
      setLookingUp(true);
      const res = await api.checkIn({
        identifier: searchTarget,
        branchId: activeBranch?._id,
        method: 'MANUAL',
      });

      setStatusMessage({
        type: 'success',
        text: `Checked in successfully: ${res.member?.fullName || 'Member'} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });

      setIdentifier('');
      setIdentifiedMember(null);
      setIdentifiedSub(null);
      fetchAttendance(selectedDate);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Check-in failed.',
      });
    } finally {
      setLookingUp(false);
    }
  };

  // Perform Check-Out
  const handleCheckOut = async (attendanceId: string) => {
    try {
      await api.checkOut(attendanceId);
      fetchAttendance(selectedDate);
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    }
  };

  // Export Daily Attendance to CSV
  const handleExportCSV = () => {
    const headers = [
      'Record ID',
      'Member Name',
      'Member ID',
      'Phone',
      'Check-In Time',
      'Check-Out Time',
      'Duration (Minutes)',
      'Status',
      'Method',
    ];

    const rows = attendanceLogs.map((log) => {
      const m = log.member || ({} as any);
      return [
        log._id,
        m.fullName || '',
        m.memberId || '',
        m.phone || '',
        new Date(log.checkInTime).toLocaleString(),
        log.checkOutTime ? new Date(log.checkOutTime).toLocaleString() : 'Inside',
        getAttendanceDurationMinutes(log.checkInTime, log.checkOutTime, log.durationMinutes) ?? '',
        m.status || 'ACTIVE',
        log.method || 'MANUAL',
      ];
    });

    exportToCSV(`sagar_fitness_attendance_${selectedDate}`, headers, rows);
  };

  // Count active occupants (no check-out time)
  const activeOccupants = attendanceLogs.filter((log) => !log.checkOutTime);
  const isViewingToday = selectedDate === todayStr;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Member check-in, daily visit logs, and official attendance sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Active now pill */}
          {isViewingToday && (
            <div className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Active Now: {activeOccupants.length} members</span>
            </div>
          )}

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            disabled={attendanceLogs.length === 0}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
            title="Download CSV report of attendance"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
              <Download className="w-3.5 h-3.5" />
            </div>
            <span>Export CSV</span>
          </button>

          {/* Print Register Sheet button */}
          <button
            onClick={() => setShowPrintRegister(true)}
            className="inline-flex items-center gap-2.5 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20"
            title="Open printable daily attendance register sheet"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-white/20 flex items-center justify-center shrink-0">
              <Printer className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Print Daily Sheet</span>
          </button>

          <button
            onClick={() => fetchAttendance(selectedDate)}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs"
            title="Refresh Attendance"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Member Search & Identification Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Fast Member Check-In
          </h3>
        </div>

        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter Member ID (e.g. FC-1001) or phone number..."
              className="w-full h-11 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors text-slate-900 placeholder-slate-400 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={lookingUp || !identifier.trim()}
            className="group inline-flex items-center justify-center gap-2 min-h-[44px] h-11 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all active:scale-95 shadow-2xs hover:shadow-xs disabled:opacity-50"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Search className="w-3.5 h-3.5" />
            </div>
            <span>{lookingUp ? 'Searching...' : 'Look Up'}</span>
          </button>

          <button
            type="button"
            onClick={handleCheckIn}
            disabled={lookingUp || !identifier.trim()}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-500/20 disabled:opacity-50"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-white/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Direct Check-In</span>
          </button>
        </form>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Identified Member Card Preview */}
        {identifiedMember && (
          <div className="p-4 bg-slate-50/75 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-3.5">
              <Avatar
                src={identifiedMember.photoUrl}
                name={identifiedMember.fullName}
                sizeClassName="w-14 h-14"
                shape="rounded-full"
                badgeColor="bg-blue-100 text-blue-700"
                className="shrink-0 shadow-2xs"
              />

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base text-slate-900">
                    {identifiedMember.fullName}
                  </h4>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      identifiedMember.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : identifiedMember.status === 'FROZEN'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {identifiedMember.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  ID: <span className="font-mono font-semibold text-slate-700">{identifiedMember.memberId}</span> • Phone: {identifiedMember.phone}
                </div>
                <div className="text-xs text-slate-500">
                  Plan: <span className="font-semibold text-slate-800">{identifiedSub?.plan?.name || 'No active plan'}</span>
                  {identifiedSub && ` • Expires: ${new Date(identifiedSub.expiryDate).toLocaleDateString()}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => {
                  setIdentifiedMember(null);
                  setIdentifiedSub(null);
                }}
                className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
              >
                Clear
              </button>
              <button
                onClick={handleCheckIn}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-500/20"
              >
                <UserCheck className="w-3.5 h-3.5 text-white" />
                Confirm Check-In
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Controls: Date Filter */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isViewingToday ? "Today's Attendance" : `Attendance Log for ${selectedDate}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Check-ins, check-outs, and duration for the selected date.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-xs font-semibold text-slate-800"
              />
            </div>

            {!isViewingToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
              >
                Reset to Today
              </button>
            )}

            <div className="h-7 px-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 font-semibold flex items-center">
              Visits: <strong className="text-slate-900 ml-1">{attendanceLogs.length}</strong>
            </div>
          </div>
        </div>

        {loading && attendanceLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading attendance records...
          </div>
        ) : attendanceLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No attendance visits recorded on {selectedDate}.
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Member ID</th>
                    <th className="px-5 py-3">Check-In Time</th>
                    <th className="px-5 py-3">Check-Out Time</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceLogs.map((log) => {
                    const memberObj = log.member || {};
                    const isCheckedIn = !log.checkOutTime;

                    const checkInDate = new Date(log.checkInTime);
                    const checkInTimeFormatted = checkInDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const checkOutTimeFormatted = log.checkOutTime
                      ? new Date(log.checkOutTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={memberObj.photoUrl}
                              name={memberObj.fullName}
                              sizeClassName="w-8 h-8"
                              shape="rounded-full"
                              badgeColor="bg-blue-50 text-blue-700"
                              className="shrink-0"
                            />
                            <span className="font-semibold text-slate-900">
                              {memberObj.fullName || 'Member'}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-500">
                          {memberObj.memberId || '—'}
                        </td>

                        <td className="px-5 py-3.5 text-sm text-slate-900 font-medium">
                          {checkInTimeFormatted}
                        </td>

                        <td className="px-5 py-3.5 text-sm text-slate-500 font-medium">
                          {checkOutTimeFormatted}
                        </td>

                        <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">
                          {formatAttendanceDuration(log.checkInTime, log.checkOutTime, log.durationMinutes)}
                        </td>

                        <td className="px-5 py-3.5">
                          {isCheckedIn ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Inside Gym
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <CheckCircle className="w-3 h-3 text-slate-500" />
                              Completed
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {isCheckedIn && (
                            <button
                              onClick={() => handleCheckOut(log._id)}
                              className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                              title="Check Out Member"
                            >
                              <div className="w-5.5 h-5.5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 transition-colors group-hover:bg-rose-100">
                                <LogOut className="w-3 h-3" />
                              </div>
                              <span>Check Out</span>
                            </button>
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
              {attendanceLogs.map((log) => {
                const memberObj = log.member || {};
                const isCheckedIn = !log.checkOutTime;

                const checkInDate = new Date(log.checkInTime);
                const checkInTimeFormatted = checkInDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const checkOutTimeFormatted = log.checkOutTime
                  ? new Date(log.checkOutTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—';

                return (
                  <div key={log._id} className="p-3.5 space-y-2.5 bg-white">
                    {/* Header: Photo, Name, Member ID, Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar
                          src={memberObj.photoUrl}
                          name={memberObj.fullName}
                          sizeClassName="w-10 h-10"
                          shape="rounded-full"
                          badgeColor="bg-blue-50 text-blue-700 border-blue-100"
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {memberObj.fullName || 'Member'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            ID: <span className="text-slate-800 font-semibold">{memberObj.memberId || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Inside Gym
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <CheckCircle className="w-3 h-3 text-slate-500" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time Details Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">In</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{checkInTimeFormatted}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Out</span>
                        <span className="font-medium text-slate-600 mt-0.5 block">{checkOutTimeFormatted}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duration</span>
                        <span className="font-bold text-blue-700 mt-0.5 block">
                          {formatAttendanceDuration(log.checkInTime, log.checkOutTime, log.durationMinutes, { short: true })}
                        </span>
                      </div>
                    </div>

                    {/* Check Out Action Button */}
                    {isCheckedIn && (
                      <button
                        type="button"
                        onClick={() => handleCheckOut(log._id)}
                        className="w-full min-h-[44px] h-11 inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all active:scale-[0.98] shadow-2xs"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>Check Out Member</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Printable Register Sheet Modal */}
      <AttendanceRegisterModal
        isOpen={showPrintRegister}
        onClose={() => setShowPrintRegister(false)}
        date={selectedDate}
        attendanceLogs={attendanceLogs}
        branch={activeBranch}
      />
    </div>
  );
};
