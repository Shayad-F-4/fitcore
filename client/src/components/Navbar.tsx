import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Dumbbell,
  Building2,
  Users,
  QrCode,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface NavbarProps {
  onOpenCheckIn: () => void;
  liveOccupancyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCheckIn, liveOccupancyCount }) => {
  const { user, activeBranch, branches, setActiveBranch, demoLogin, logout } = useAuth();
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const demoRoles = [
    { role: 'SUPER_ADMIN', label: 'Alex Vance', sub: 'Super Admin', icon: ShieldCheck, color: 'text-primary' },
    { role: 'RECEPTIONIST', label: 'Sarah Jenkins', sub: 'Front Desk / Kiosk', icon: UserCheck, color: 'text-status-info' },
    { role: 'GYM_ADMIN', label: 'Marcus Sterling', sub: 'Gym Manager', icon: Building2, color: 'text-amber-400' },
    { role: 'TRAINER', label: 'Elena Rostova', sub: 'Head Coach', icon: Dumbbell, color: 'text-purple-400' },
  ];

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#080B0A]/90 backdrop-blur-md border-b border-[#273129] px-4 md:px-6 flex items-center justify-between">
      {/* Left: Mobile Brand / Active Branch */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-glow-sm">
            <Dumbbell className="w-4 h-4" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-wider text-text-main">
            FIT<span className="text-primary">CORE</span>
          </span>
        </div>

        {/* Branch Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBranchMenu(!showBranchMenu);
              setShowDemoMenu(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111613] hover:bg-[#171E19] border border-[#273129] text-xs md:text-sm text-text-muted hover:text-text-main transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium max-w-[140px] md:max-w-[200px] truncate">
              {activeBranch ? activeBranch.name : 'All Facilities'}
            </span>
            <ChevronDown className="w-3 h-3 text-text-dim" />
          </button>

          {showBranchMenu && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl bg-[#111613] border border-[#273129] shadow-2xl py-1 z-50">
              <div className="px-3 py-2 border-b border-[#273129]/60 text-[11px] font-semibold text-text-dim uppercase tracking-wider">
                Select Active Branch
              </div>
              <button
                onClick={() => {
                  setActiveBranch(null);
                  setShowBranchMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#171E19] transition-colors ${
                  !activeBranch ? 'text-primary font-semibold' : 'text-text-muted'
                }`}
              >
                <span>All Locations (Global View)</span>
                {!activeBranch && <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-sm" />}
              </button>
              {branches.map((b) => (
                <button
                  key={b._id}
                  onClick={() => {
                    setActiveBranch(b);
                    setShowBranchMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#171E19] transition-colors ${
                    activeBranch?._id === b._id ? 'text-primary font-semibold' : 'text-text-muted'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-medium text-text-main">{b.name}</p>
                    <p className="text-[10px] text-text-dim">{b.city} • Code: {b.code}</p>
                  </div>
                  {activeBranch?._id === b._id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-sm shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Live Gym Occupancy Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#111613] border border-[#273129]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-xs font-mono text-text-muted">
            <strong className="text-text-main font-semibold">{liveOccupancyCount}</strong> In-Gym
          </span>
        </div>

        {/* Quick Check-In Button */}
        <button
          onClick={onOpenCheckIn}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-[#080B0A] font-semibold text-xs md:text-sm shadow-glow-sm transition-all transform active:scale-95"
          title="Receptionist check-in terminal"
        >
          <QrCode className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
          <span>⚡ Check-In</span>
        </button>

        {/* Demo Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowDemoMenu(!showDemoMenu);
              setShowBranchMenu(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111613] hover:bg-[#171E19] border border-[#273129] text-xs text-text-muted hover:text-text-main transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="hidden md:inline font-mono text-[11px] uppercase tracking-wider text-primary">Demo</span>
            <ChevronDown className="w-3 h-3 text-text-dim" />
          </button>

          {showDemoMenu && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl bg-[#111613] border border-[#273129] shadow-2xl py-1 z-50">
              <div className="px-3 py-2 border-b border-[#273129]/60 text-[11px] font-semibold text-text-dim uppercase tracking-wider">
                Quick Switch Demo Role
              </div>
              {demoRoles.map((dr) => {
                const Icon = dr.icon;
                const isActive = user?.role === dr.role;
                return (
                  <button
                    key={dr.role}
                    onClick={async () => {
                      await demoLogin(dr.role);
                      setShowDemoMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-[#171E19] transition-colors ${
                      isActive ? 'bg-primary/5 text-primary' : 'text-text-muted'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${dr.color}`} />
                    <div className="flex-1">
                      <p className="font-semibold text-text-main">{dr.label}</p>
                      <p className="text-[10px] text-text-dim">{dr.sub}</p>
                    </div>
                    {isActive && <span className="text-[10px] text-primary font-mono font-bold">ACTIVE</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        {user ? (
          <div className="flex items-center gap-2 pl-1 border-l border-[#273129]/60">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user.fullName}
              className="w-8 h-8 rounded-full object-cover border border-[#364439]"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-text-main leading-tight truncate max-w-[110px]">
                {user.fullName}
              </p>
              <p className="text-[10px] font-mono text-primary leading-tight">{user.role}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-text-dim hover:text-status-error hover:bg-[#171E19] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => demoLogin('SUPER_ADMIN')}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#171E19] text-primary font-semibold hover:bg-primary hover:text-[#080B0A] transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
