import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  Receipt,
  Building2,
  ShieldCheck,
  Dumbbell,
  Activity,
  Flame,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/members', label: 'Member Directory', icon: Users },
    { to: '/plans', label: 'Plans & Pricing', icon: CreditCard },
    { to: '/attendance', label: 'Live Check-In Kiosk', icon: QrCode, badge: 'Live' },
    { to: '/billing', label: 'Billing & Receipts', icon: Receipt },
    { to: '/branches', label: 'Branches', icon: Building2 },
    { to: '/audit', label: 'Activity Logs', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-[#080B0A] border-r border-[#273129] flex flex-col justify-between shrink-0 hidden lg:flex min-h-screen">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 border-b border-[#273129] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-glow-sm">
            <Flame className="w-5 h-5 fill-primary text-primary" />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-wider text-text-main flex items-center gap-1">
              FIT<span className="text-primary text-glow">CORE</span>
            </span>
            <span className="block text-[10px] uppercase font-mono tracking-widest text-text-dim">
              Gym OS • Elite V2.6
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-6 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-text-dim">
            Core Modules
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/25 shadow-glow-sm'
                      : 'text-text-muted hover:text-text-main hover:bg-[#111613]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-primary' : 'text-text-dim group-hover:text-text-main'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/20 text-primary font-bold animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Footer System Status Card */}
      <div className="p-4 m-3 rounded-xl bg-[#111613] border border-[#273129]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-text-dim uppercase tracking-wider">Cloud Engine</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-status-success">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-ping"></span>
            Operational
          </span>
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          FitCore Real-time Sync & Biometric Access ready.
        </p>
        <div className="mt-2.5 pt-2 border-t border-[#273129]/60 flex items-center justify-between text-[10px] text-text-dim font-mono">
          <span>MongoDB v8.0</span>
          <span>Port 5000</span>
        </div>
      </div>
    </aside>
  );
};
