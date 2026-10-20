import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  UserCheck,
  Receipt,
  FileBarChart,
  Settings,
  X,
  Dumbbell,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenRegister?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile, onOpenRegister }) => {
  const { user, activeBranch } = useAuth();

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN';

  const allNavItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
      activeColor: 'border-l-4 border-l-blue-500 bg-blue-50/80 text-blue-700 font-bold',
      iconActive: 'bg-blue-100 text-blue-600',
      dotColor: 'bg-blue-600',
    },
    {
      to: '/members',
      label: 'Members',
      icon: Users,
      activeColor: 'border-l-4 border-l-emerald-500 bg-emerald-50/80 text-emerald-800 font-bold',
      iconActive: 'bg-emerald-100 text-emerald-600',
      dotColor: 'bg-emerald-600',
    },
    {
      to: '/attendance',
      label: 'Attendance',
      icon: UserCheck,
      activeColor: 'border-l-4 border-l-amber-500 bg-amber-50/80 text-amber-800 font-bold',
      iconActive: 'bg-amber-100 text-amber-600',
      dotColor: 'bg-amber-600',
    },
    {
      to: '/plans',
      label: 'Membership Plans',
      icon: CreditCard,
      adminOnly: true,
      activeColor: 'border-l-4 border-l-purple-500 bg-purple-50/80 text-purple-800 font-bold',
      iconActive: 'bg-purple-100 text-purple-600',
      dotColor: 'bg-purple-600',
    },
    {
      to: '/billing',
      label: 'Billing',
      icon: Receipt,
      activeColor: 'border-l-4 border-l-rose-500 bg-rose-50/80 text-rose-800 font-bold',
      iconActive: 'bg-rose-100 text-rose-600',
      dotColor: 'bg-rose-600',
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: FileBarChart,
      activeColor: 'border-l-4 border-l-cyan-500 bg-cyan-50/80 text-cyan-800 font-bold',
      iconActive: 'bg-cyan-100 text-cyan-600',
      dotColor: 'bg-cyan-600',
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      adminOnly: true,
      activeColor: 'border-l-4 border-l-indigo-500 bg-indigo-50/80 text-indigo-800 font-bold',
      iconActive: 'bg-indigo-100 text-indigo-600',
      dotColor: 'bg-indigo-600',
    },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none transition-transform duration-200 ease-in-out shadow-[2px_0_8px_rgba(0,0,0,0.02)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="h-16 sm:h-20 px-4 border-b border-slate-200/70 flex items-center justify-center relative shrink-0">
            <NavLink to="/" onClick={onCloseMobile} className="flex items-center justify-center group py-1">
              <img
                src="/logo.png"
                alt="Sagar Fitness Gym"
                className="h-11 sm:h-13 w-auto max-w-[210px] object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </NavLink>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden absolute right-3 h-9 w-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Role Indicator Card */}
          <div className="mx-3.5 my-2.5 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Workspace
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs ${
                  isAdmin
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isAdmin ? '👑 Gym Owner' : '🏢 Front Desk'}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1 truncate">
              {isAdmin ? 'Full System & Revenue Access' : 'Counter & Check-In Desk'}
            </div>
          </div>

          {/* Navigation Links with Card-style Accents */}
          <nav className="p-3.5 pt-1 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all active:scale-[0.98] ${
                      isActive
                        ? `${item.activeColor} shadow-2xs`
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium border-l-4 border-l-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? item.iconActive
                              : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor} shrink-0`} />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info: Sagar Fitness Gym Card */}
        <div className="p-3 border-t border-slate-200/70 bg-slate-50/40 shrink-0">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="truncate font-black text-slate-900 text-xs block">
                  Sagar Fitness Gym
                </span>
                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                  Official Gym Management
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
