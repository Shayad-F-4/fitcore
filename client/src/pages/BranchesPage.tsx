import React from 'react';
import { Building2, MapPin, Phone, Mail, Clock, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BranchesPage: React.FC = () => {
  const { branches, activeBranch, setActiveBranch } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#273129]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-main tracking-tight">
              Facility Locations & Branches
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#111613] text-primary border border-[#273129] font-bold">
              {branches.length} Gyms
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
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
              className={`rounded-3xl p-6 transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#172317] border-2 border-primary shadow-glow-primary'
                  : 'bg-[#111613] border border-[#273129] hover:border-[#364439] shadow-card'
              }`}
            >
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-[#273129]">
                  <span className="text-xs font-mono font-bold text-primary px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                    CODE: {b.code}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-primary font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ACTIVE CONTEXT
                    </span>
                  )}
                </div>

                <div className="py-4">
                  <h3 className="font-display font-extrabold text-xl text-text-main">
                    {b.name}
                  </h3>
                  <p className="text-xs text-text-dim font-mono mt-1">{b.city} Division</p>
                </div>

                {/* Details list */}
                <div className="space-y-2.5 text-xs text-text-muted py-2 border-t border-[#273129]/60">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{b.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-mono text-[11px]">{b.openingHours}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <span>Rated Capacity: <strong>{b.capacity} athletes</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-text-dim shrink-0" />
                    <span className="font-mono text-[11px]">{b.phone}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-text-dim shrink-0" />
                    <span className="text-[11px]">{b.email}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-6 mt-4 border-t border-[#273129]">
                <button
                  onClick={() => setActiveBranch(isSelected ? null : b)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-[#111613] text-text-muted hover:text-text-main border border-[#273129]'
                      : 'bg-primary hover:bg-primary-hover text-[#080B0A] shadow-glow-sm'
                  }`}
                >
                  <span>{isSelected ? 'Clear Context (View All)' : 'Switch to this Branch'}</span>
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
