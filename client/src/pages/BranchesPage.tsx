import React from 'react';
import { Building2, MapPin, Phone, Mail, Clock, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BranchesPage: React.FC = () => {
  const { branches, activeBranch, setActiveBranch } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-bold text-2xl text-slate-900 tracking-tight">
              Facility Locations & Branches
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {branches.length} Gyms
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Multi-branch fitness operations, capacity limits, operating hours, and location context.
          </p>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {branches.map((b) => {
          const isSelected = activeBranch?._id === b._id;
          return (
            <div
              key={b._id}
              className={`rounded-2xl transition-all flex flex-col justify-between overflow-hidden ${
                isSelected
                  ? 'bg-white border-2 border-blue-500 shadow-md ring-2 ring-blue-500/10'
                  : 'bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md'
              }`}
            >
              {/* Top Accent line */}
              <div
                className={`h-1.5 w-full ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'
                    : 'bg-slate-100'
                }`}
              />

              <div className="p-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-mono font-bold text-blue-700 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 shadow-2xs">
                    CODE: {b.code}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ACTIVE CONTEXT
                    </span>
                  )}
                </div>

                <div className="py-4">
                  <h3 className="font-bold text-xl text-slate-900">
                    {b.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{b.city} Division</p>
                </div>

                {/* Details list */}
                <div className="space-y-2.5 text-xs text-slate-600 py-2 border-t border-slate-100">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700">{b.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-700">{b.openingHours}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-slate-700">Rated Capacity: <strong className="text-slate-900">{b.capacity} athletes</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-700">{b.phone}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-700">{b.email}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="p-6 pt-0 mt-2">
                <button
                  onClick={() => setActiveBranch(isSelected ? null : b)}
                  className={`w-full h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 ${
                    isSelected
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-2xs'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs hover:shadow-md hover:shadow-blue-500/20'
                  }`}
                >
                  <span>{isSelected ? 'Clear Context (View All Gyms)' : 'Switch to this Branch'}</span>
                  {!isSelected && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
