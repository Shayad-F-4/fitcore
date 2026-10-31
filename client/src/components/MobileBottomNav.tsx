import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Receipt,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: 'Home',
      icon: LayoutDashboard,
      exact: true,
      activeColor: 'text-blue-600',
      activeBg: 'bg-blue-50/90 text-blue-700',
      activeIndicator: 'bg-blue-600',
    },
    {
      to: '/members',
      label: 'Members',
      icon: Users,
      exact: false,
      activeColor: 'text-emerald-600',
      activeBg: 'bg-emerald-50/90 text-emerald-800',
      activeIndicator: 'bg-emerald-600',
    },
    {
      to: '/attendance',
      label: 'Attendance',
      icon: UserCheck,
      exact: false,
      activeColor: 'text-amber-600',
      activeBg: 'bg-amber-50/90 text-amber-800',
      activeIndicator: 'bg-amber-600',
    },
    {
      to: '/billing',
      label: 'Billing',
      icon: Receipt,
      exact: false,
      activeColor: 'text-rose-600',
      activeBg: 'bg-rose-50/90 text-rose-800',
      activeIndicator: 'bg-rose-600',
    },
  ];

  // Secondary routes where "More" is logically active
  const isMoreActive =
    location.pathname.startsWith('/plans') ||
    location.pathname.startsWith('/pos') ||
    location.pathname.startsWith('/inventory') ||
    location.pathname.startsWith('/reports') ||
    location.pathname.startsWith('/settings') ||
    isSidebarOpen;

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-safe select-none transition-all print:hidden"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive: linkActive }) => {
                const active = linkActive || isActive;
                return `relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] active:scale-95 touch-manipulation ${
                  active ? item.activeBg : 'text-slate-500 hover:text-slate-900'
                }`;
              }}
            >
              {({ isActive: linkActive }) => {
                const active = linkActive || isActive;
                return (
                  <>
                    <div className="relative flex items-center justify-center">
                      <Icon
                        className={`w-5 h-5 transition-transform duration-150 ${
                          active ? 'scale-110 ' + item.activeColor : 'text-slate-500'
                        }`}
                      />
                      {active && (
                        <span
                          className={`absolute -top-1 right-[-4px] w-1.5 h-1.5 rounded-full ${item.activeIndicator}`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                        active ? 'font-bold ' + item.activeColor : 'font-medium text-slate-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                );
              }}
            </NavLink>
          );
        })}

        {/* More Destination (Triggers Navigation Drawer for Secondary Options) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open More Menu"
          aria-expanded={isSidebarOpen}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] active:scale-95 touch-manipulation cursor-pointer ${
            isMoreActive
              ? 'bg-purple-50/90 text-purple-800'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Menu
              className={`w-5 h-5 transition-transform duration-150 ${
                isMoreActive ? 'scale-110 text-purple-700' : 'text-slate-500'
              }`}
            />
            {isMoreActive && (
              <span className="absolute -top-1 right-[-4px] w-1.5 h-1.5 rounded-full bg-purple-600" />
            )}
          </div>
          <span
            className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
              isMoreActive ? 'font-bold text-purple-700' : 'font-medium text-slate-500'
            }`}
          >
            More
          </span>
        </button>
      </div>
    </nav>
  );
};
