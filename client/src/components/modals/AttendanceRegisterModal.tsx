import React from 'react';
import { X, Printer, Dumbbell, Calendar, Building2 } from 'lucide-react';
import { Attendance, Branch } from '../../types';

interface AttendanceRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  attendanceLogs: Attendance[];
  branch?: Branch | null;
}

export const AttendanceRegisterModal: React.FC<AttendanceRegisterModalProps> = ({
  isOpen,
  onClose,
  date,
  attendanceLogs,
  branch,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header - Screen Only */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 no-print">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daily Attendance Register Sheet
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Official printable attendance sheet for {formattedDate}.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Register</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 print:p-0">
          <div
            id="printable-attendance-register"
            className="border border-slate-200 rounded-xl p-6 bg-white print:border-none print:p-0 space-y-4 font-sans text-xs text-black shadow-xs print:shadow-none"
          >
            {/* Top Facility Header */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="Sagar Fitness Gym"
                    className="h-9 w-auto max-w-[160px] object-contain"
                  />
                </div>
                <p className="text-xs text-slate-700 font-medium mt-1">
                  Daily Attendance & Access Verification Sheet
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-medium">
                  <span>Facility: {branch?.name || 'Main Campus'}</span>
                  <span>•</span>
                  <span>Code: {branch?.code || 'FC-MAIN'}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-slate-900">{formattedDate}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Total Visits Recorded: <span className="font-bold text-slate-900">{attendanceLogs.length}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Report Generated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            {attendanceLogs.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                No attendance visits recorded for {formattedDate}.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-bold uppercase text-[10px]">
                      <th className="p-2.5 border-r border-slate-200 w-10 text-center">#</th>
                      <th className="p-2.5 border-r border-slate-200">Member Name</th>
                      <th className="p-2.5 border-r border-slate-200">Member ID</th>
                      <th className="p-2.5 border-r border-slate-200">Check-In</th>
                      <th className="p-2.5 border-r border-slate-200">Check-Out</th>
                      <th className="p-2.5 border-r border-slate-200">Duration</th>
                      <th className="p-2.5 border-r border-slate-200">Status</th>
                      <th className="p-2.5 w-28 text-center">Staff Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceLogs.map((log, index) => {
                      const memberObj = log.member || ({} as any);
                      const checkInFormatted = new Date(log.checkInTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const checkOutFormatted = log.checkOutTime
                        ? new Date(log.checkOutTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Inside';

                      return (
                        <tr key={log._id} className="hover:bg-slate-50/60">
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono text-slate-400">
                            {index + 1}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                            {memberObj.fullName || 'Member'}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-blue-700">
                            {memberObj.memberId || '—'}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-mono text-slate-700">{checkInFormatted}</td>
                          <td className="p-2.5 border-r border-slate-200 font-mono text-slate-700">{checkOutFormatted}</td>
                          <td className="p-2.5 border-r border-slate-200 font-medium text-slate-600">
                            {log.durationMinutes ? `${log.durationMinutes} mins` : '—'}
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <span className="font-semibold text-emerald-700">
                              {memberObj.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="p-2.5 border-dashed text-center text-slate-300">
                            _________________
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Verification Signatures Footer */}
            <div className="pt-8 flex justify-between items-end text-xs text-slate-700">
              <div>
                <p className="font-bold">Reception Supervisor Signature</p>
                <div className="mt-6 border-b border-slate-400 w-48" />
              </div>

              <div>
                <p className="font-bold">Facility Manager Verification</p>
                <div className="mt-6 border-b border-slate-400 w-48" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
