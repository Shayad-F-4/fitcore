import React, { useState } from 'react';
import { Dumbbell, ShieldCheck, UserCheck, Building2, Flame, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('admin@fitcore.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Login failed. Check email and password.');
    } finally {
      setLoading(false);
    }
  };

  const demoPresets = [
    {
      role: 'SUPER_ADMIN',
      name: 'Alex Vance',
      title: 'Super Admin',
      icon: ShieldCheck,
      desc: 'Full administrative rights & global telemetry',
      color: 'border-primary/40 bg-primary/5',
    },
    {
      role: 'RECEPTIONIST',
      name: 'Sarah Jenkins',
      title: 'Front Desk / Kiosk',
      icon: UserCheck,
      desc: 'Fast QR check-ins, registrations & renewals',
      color: 'border-status-info/40 bg-status-info/5',
    },
    {
      role: 'GYM_ADMIN',
      name: 'Marcus Sterling',
      title: 'Gym Manager',
      icon: Building2,
      desc: 'Branch operations, revenue & equipment control',
      color: 'border-amber-400/40 bg-amber-400/5',
    },
  ];

  return (
    <div className="min-h-screen bg-[#080B0A] text-[#F5F7F5] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-grid-pattern">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 text-primary shadow-glow-primary mb-2">
            <Flame className="w-7 h-7 fill-primary text-primary" />
          </div>
          <h1 className="font-display font-black text-3xl tracking-tight">
            FIT<span className="text-primary text-glow">CORE</span>
          </h1>
          <p className="text-xs text-text-dim uppercase font-mono tracking-widest">
            Next-Gen Gym Operating System
          </p>
        </div>

        {/* Login Box */}
        <div className="p-6 rounded-3xl bg-[#111613] border border-[#273129] shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-status-error/15 border border-status-error/30 text-status-error text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Staff Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B0A] border border-[#273129] focus:border-primary text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-[#080B0A] font-extrabold text-xs uppercase tracking-wider transition-all shadow-glow-sm transform active:scale-95"
            >
              {loading ? 'Authenticating...' : 'Sign In to Terminal'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#273129]" />
            <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-widest text-text-dim">
              Instant One-Click Demo
            </span>
            <div className="flex-grow border-t border-[#273129]" />
          </div>

          {/* Quick Demo Logins */}
          <div className="space-y-2">
            {demoPresets.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.role}
                  onClick={() => demoLogin(d.role)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between hover:scale-[1.01] transition-all group ${d.color}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-semibold text-text-main text-xs">{d.name}</p>
                      <p className="text-[10px] text-text-dim">{d.title}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-dim group-hover:text-primary transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[11px] text-text-dim font-mono">
          Default seed credentials: admin@fitcore.com / password123
        </p>
      </div>
    </div>
  );
};
