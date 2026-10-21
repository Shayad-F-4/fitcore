import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Dumbbell,
  Users,
  HeartPulse,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot / Reset Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ensure clean state on load and reset landing route to dashboard
  useEffect(() => {
    // Clear any previously saved email so the field starts blank by default
    localStorage.removeItem('fitcore_remember_id');

    // Ensure that upon reaching the login screen, URL resets to '/' so after login it lands cleanly on Dashboard
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both your Email / User ID and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      localStorage.removeItem('fitcore_remember_id');

      await login({
        identifier: identifier.trim(),
        email: identifier.trim(),
        password,
      });

      // Explicitly land on Dashboard ('/') after login
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(
        err.message || 'Invalid Email/ID or password credentials. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotMsg({ type: 'error', text: 'Please enter your registered Gmail / email address.' });
      return;
    }

    setForgotLoading(true);
    setForgotMsg(null);

    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setForgotMsg({
        type: 'success',
        text: res.message || `A 6-digit OTP code has been sent to ${forgotEmail.trim()}. Please check your Gmail inbox or spam.`,
      });
      setResetToken(''); // Keep blank - user must manually enter OTP from their Gmail inbox
      setForgotStep('reset');
    } catch (err: any) {
      setForgotMsg({
        type: 'error',
        text: err.message || 'Failed to dispatch password recovery OTP. Please try again.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword) {
      setForgotMsg({ type: 'error', text: 'Please enter both the 6-digit OTP code and your new password.' });
      return;
    }

    if (newPassword.length < 6) {
      setForgotMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotMsg({ type: 'error', text: 'Passwords do not match. Please verify and retype.' });
      return;
    }

    setForgotLoading(true);
    setForgotMsg(null);

    try {
      const res = await api.resetPassword(resetToken.trim(), newPassword);
      setForgotMsg({
        type: 'success',
        text: res.message || 'Password reset successfully! You can now log in with your new password.',
      });
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep('request');
        setForgotMsg(null);
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setForgotMsg({
        type: 'error',
        text: err.message || 'The OTP verification code is invalid or has expired.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex items-center justify-center bg-slate-950 font-sans select-none">
      {/* 1. Full-Height Gym Background Image with Dark Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url('/login-bg.webp')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/55 backdrop-blur-[0.5px]" />
      </div>

      {/* 2. Lime Green Geometric Corner Accents Matching Reference Design */}
      {/* Top-Left Lime-Green Angular Ribbon */}
      <div className="absolute top-0 left-0 w-36 h-36 sm:w-56 sm:h-56 pointer-events-none z-10 overflow-hidden">
        <div className="w-[180%] h-[180%] bg-gradient-to-br from-[#84cc16] via-[#65a30d] to-transparent transform -rotate-45 -translate-x-[45%] -translate-y-[45%] opacity-90 shadow-2xl" />
      </div>

      {/* Bottom-Right Lime-Green Angular Ribbon */}
      <div className="absolute bottom-0 right-0 w-44 h-44 sm:w-64 sm:h-64 pointer-events-none z-10 overflow-hidden">
        <div className="w-[180%] h-[180%] bg-gradient-to-tl from-[#84cc16] via-[#4d7c0f] to-transparent transform -rotate-45 translate-x-[45%] translate-y-[45%] opacity-85 shadow-2xl" />
      </div>

      {/* 3. Main Content: Responsive Two-Column Layout */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 pb-12 sm:pb-16 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 min-h-screen">
        {/* Left Column (Desktop Only): Feature Highlights anchored at bottom left */}
        <div className="hidden lg:flex flex-col justify-end self-end w-full max-w-lg pb-6">
          <div className="flex items-center gap-10 xl:gap-14 pt-4">
            {/* Feature 1: Modern Facilities */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl bg-black/40 backdrop-blur-md border border-lime-400/40 flex items-center justify-center text-lime-400 mb-2 shadow-lg shadow-lime-950/40">
                <Dumbbell className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-100 leading-tight">
                MODERN<br />FACILITIES
              </span>
            </div>

            {/* Feature 2: Expert Trainers */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl bg-black/40 backdrop-blur-md border border-lime-400/40 flex items-center justify-center text-lime-400 mb-2 shadow-lg shadow-lime-950/40">
                <Users className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-100 leading-tight">
                EXPERT<br />TRAINERS
              </span>
            </div>

            {/* Feature 3: Healthy Community */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl bg-black/40 backdrop-blur-md border border-lime-400/40 flex items-center justify-center text-lime-400 mb-2 shadow-lg shadow-lime-950/40">
                <HeartPulse className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-100 leading-tight">
                HEALTHY<br />COMMUNITY
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Pristine White Login Card */}
        <div className="w-full flex flex-col items-center lg:items-end justify-center my-auto py-2">
          <div className="w-full max-w-[440px] sm:max-w-[460px] bg-white rounded-3xl shadow-2xl shadow-black/60 border border-white/80 p-5 sm:p-7 text-slate-900 transition-all duration-200">
            {/* Sagar Fitness Gym Logo */}
            <div className="flex items-center justify-center">
              <picture>
                <source srcSet="/logo.webp" type="image/webp" />
                <img
                  src="/logo.png"
                  alt="Sagar Fitness Gym"
                  className="h-11 sm:h-12 w-auto max-w-[240px] object-contain"
                  width="240"
                  height="48"
                />
              </picture>
            </div>

            {/* Horizontal Divider with Gym Management System Subtitle */}
            <div className="relative flex items-center justify-center my-3.5">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400 whitespace-nowrap">
                Gym Management System
              </span>
            </div>

            {/* Heading & Subtitle */}
            <div className="text-center pt-1 pb-1">
              <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Sign in to manage your gym
              </p>
            </div>

            {/* Database Error Alert */}
            {error && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4" autoComplete="off">
              {/* Email Address / User ID Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 tracking-wide">
                  Email Address or User ID
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or user ID"
                    className="w-full h-12 pl-11 pr-4 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 tracking-wide">
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-12 pl-11 pr-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span className="font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotMsg(null);
                    setShowForgotModal(true);
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <div className="pt-1.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 sm:h-12.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  OR
                </span>
              </div>

              {/* Authorized Gym Staff Notice Card */}
              <div className="p-3 sm:p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-3 text-left">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    Authorized gym staff only.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Need an account? Contact your Gym Administrator.
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Discreet Footer Text with Proper Spacing and Centering */}
          <div className="w-full max-w-[440px] sm:max-w-[460px] text-center text-xs text-slate-300/85 font-medium mt-3.5 mb-1 px-3 flex items-center justify-center gap-2 drop-shadow-sm select-none">
            <span>Sagar Fitness Gym</span>
            <span className="text-lime-400 font-bold">•</span>
            <span>Pathardi, Maharashtra</span>
          </div>
        </div>
      </div>

      {/* Forgot Password / Real OTP Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {forgotStep === 'request' ? 'Password Recovery' : 'Enter 6-Digit OTP'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotMsg(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  forgotMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {forgotMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span className="leading-snug font-medium">{forgotMsg.text}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4 pt-1">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered email address or User ID (e.g. <strong>admin</strong>). We will send a <strong>6-digit verification OTP code</strong> directly to your email inbox.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Registered Email or User ID
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. admin or your Gmail address"
                      className="w-full h-12 pl-11 pr-4 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('reset');
                      setForgotMsg(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer"
                  >
                    Already have an OTP?
                  </button>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-60 cursor-pointer"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>Send 6-Digit OTP</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                  A 6-digit verification code was sent to <strong className="text-slate-900">{forgotEmail}</strong>. Enter it below with your new password:
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide text-center">
                    6-Digit Verification Code (OTP)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full h-12 text-center text-xl font-bold font-mono tracking-[10px] text-blue-700 bg-blue-50/50 border border-blue-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('request');
                      setForgotMsg(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    ← Change Email / Resend
                  </button>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-60 cursor-pointer"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>Verify OTP & Save Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


