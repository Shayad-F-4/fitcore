import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Building2,
  Menu,
  Check,
  User as UserIcon,
  X,
  ExternalLink,
  RefreshCw,
  Zap,
  MessageCircle,
} from 'lucide-react';
import { sendWhatsAppReminder, openWhatsApp, getWelcomeMessage } from '../utils/whatsapp';
import { Avatar } from './Avatar';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onSelectMember?: (memberId: string) => void;
  onRenewMember?: (membership: any) => void;
  onOpenQuickPunch?: () => void;
  onOpenRegister?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onSelectMember,
  onRenewMember,
  onOpenQuickPunch,
  onOpenRegister,
}) => {
  const { user, activeBranch, logout } = useAuth();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Expiring memberships for alerts
  const [expiringList, setExpiringList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Global search & Quick Check-In state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isPunching, setIsPunching] = useState(false);

  // Live gym occupancy count
  const [liveOccupancy, setLiveOccupancy] = useState<number>(0);

  // Toast feedback message
  const [toast, setToast] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    desc: string;
  } | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const showToast = (type: 'success' | 'warning' | 'error', title: string, desc: string) => {
    setToast({ type, title, desc });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchLiveOccupancy = async () => {
    try {
      const res = await api.getLiveOccupancy(activeBranch?._id);
      setLiveOccupancy(res.count || 0);
    } catch {
      // Ignore background error
    }
  };

  // Current page title mapping
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/members')) return 'Members';
    if (path.startsWith('/plans')) return 'Membership Plans';
    if (path.startsWith('/attendance')) return 'Attendance';
    if (path.startsWith('/payments') || path.startsWith('/billing')) return 'Payments';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Sagar Fitness Gym';
  };

  const fetchExpiryAlerts = async () => {
    try {
      const data = await api.getExpiringMemberships(7);
      setExpiringList(data || []);
      setUnreadCount(data ? data.length : 0);
    } catch {
      // Ignore background error
    }
  };

  useEffect(() => {
    fetchExpiryAlerts();
    fetchLiveOccupancy();
    const interval = setInterval(() => {
      fetchExpiryAlerts();
      fetchLiveOccupancy();
    }, 20000);
    return () => clearInterval(interval);
  }, [activeBranch]);

  // Quick Punch / Check-in Handler
  const handleQuickPunch = async (identifierOverride?: string) => {
    const target = identifierOverride || searchQuery.trim();
    if (!target) return;

    setIsPunching(true);
    try {
      const res = await api.checkIn({
        identifier: target,
        branchId: activeBranch?._id,
        method: 'MANUAL',
      });

      await fetchLiveOccupancy();

      if (res.type === 'CHECK_OUT') {
        showToast(
          'success',
          `👋 Checked Out: ${res.member?.fullName || 'Member'}`,
          `Session complete (${res.durationMinutes || 0} mins inside gym)`
        );
      } else {
        if (res.membershipValid) {
          showToast(
            'success',
            `✅ Checked In: ${res.member?.fullName || 'Member'}`,
            `Welcome to Sagar Fitness Gym! Active membership confirmed.`
          );
        } else {
          showToast(
            'warning',
            `⚠️ Alert: ${res.member?.fullName || 'Member'}`,
            `Checked in, but membership is expired or pending renewal!`
          );
        }
      }
      setSearchQuery('');
      setShowSearchResults(false);
    } catch (err: any) {
      showToast(
        'error',
        'Check-In Failed',
        err.message || 'No member found matching this ID or phone number.'
      );
    } finally {
      setIsPunching(false);
    }
  };

  // Global search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.getMembers({ search: searchQuery.trim(), limit: 5 });
        setSearchResults(res.data || []);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysRemainingLabel = (expiryDate: string) => {
    const now = new Date();
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Expired ${Math.abs(diffDays)}d ago`, isExpired: true };
    }
    if (diffDays === 0) {
      return { text: 'Expires today', isToday: true };
    }
    return { text: `${diffDays} days remaining`, isSoon: true };
  };

  return (
    <>
      {/* Floating Toast Feedback for Quick Check-In */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white border border-[#E5E7EB] rounded-xl shadow-modal p-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : toast.type === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#202124]">{toast.title}</div>
              <div className="text-xs text-[#6B7280] mt-0.5 leading-snug">{toast.desc}</div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="h-16 sm:h-20 px-3 sm:px-4 md:px-8 flex items-center justify-between gap-2.5 sm:gap-4 relative">
        {/* Mobile Search Overlay Mode */}
        {isMobileSearchOpen ? (
          <div className="flex sm:hidden items-center w-full gap-2 py-2">
            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Phone or Member ID..."
                className="w-full h-11 pl-9 pr-8 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-slate-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleQuickPunch()}
                disabled={isPunching}
                className="h-11 px-3.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1 shrink-0 active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Punch</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setShowSearchResults(false);
              }}
              className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 flex items-center justify-center shrink-0 active:scale-95"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            {/* Left: Mobile hamburger, Compact Brand Logo & Page Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={onToggleSidebar}
                className="lg:hidden h-10 w-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center shrink-0 border border-slate-200"
                aria-label="Toggle Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <Link to="/" className="lg:hidden shrink-0 flex items-center">
                  <img
                    src="/logo.png"
                    alt="Sagar Fitness"
                    className="h-8 w-auto max-w-[110px] object-contain"
                  />
                </Link>
                <span className="hidden sm:inline-block lg:hidden text-slate-300">|</span>
                <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
          </>
        )}

        {/* Center: Global Member Search & Quick Punch */}
        <div ref={searchRef} className="relative flex-1 max-w-xl lg:max-w-2xl mx-2 sm:mx-6 hidden sm:block">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuickPunch();
            }}
            className="relative flex items-center w-full"
          >
            <div className="w-full h-12 flex items-center bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white border border-slate-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 rounded-xl transition-all overflow-hidden pl-3.5 pr-2 gap-2.5 shadow-2xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true);
                }}
                placeholder="Quick Check-In: Enter Phone or Member ID..."
                className="w-full h-full text-sm bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium px-1"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                {searchQuery ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowSearchResults(false);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 active:scale-90 rounded-lg shrink-0 transition-transform"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={isPunching}
                      className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Punch</span>
                    </button>
                  </div>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-500 font-mono shadow-2xs">
                    <span>Enter</span>
                    <span className="text-xs">↵</span>
                  </span>
                )}
              </div>
            </div>
          </form>

          {/* Global Search & Action Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>Matching Members ({searchResults.length})</span>
                <span>Press Enter to Punch or click to view</span>
              </div>

              {isSearching ? (
                <div className="p-4 text-center text-xs text-slate-500">Searching members...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-500">
                  No member found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {searchResults.map((member) => (
                    <div
                      key={member._id}
                      className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectMember) onSelectMember(member._id);
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-3 min-w-0 text-left flex-1"
                      >
                        <Avatar
                          src={member.photoUrl}
                          name={member.fullName}
                          sizeClassName="w-10 h-10"
                          shape="rounded-xl"
                          badgeColor="bg-blue-50 text-blue-700"
                          className="shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {member.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            ID: <span className="font-mono text-blue-700 font-bold">{member.memberId}</span> • {member.phone}
                          </div>
                        </div>
                      </button>

                      {/* Instant Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickPunch(member.memberId || member.phone)}
                          className="h-8 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 transition-colors flex items-center gap-1 shadow-xs"
                          title="Quick Punch Check-In"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
                          <span>Punch</span>
                        </button>
                        {member.phone && (
                          <button
                            type="button"
                            onClick={() => {
                              openWhatsApp(member.phone, getWelcomeMessage(member.fullName, member.memberId));
                            }}
                            className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors border border-emerald-200 flex items-center gap-1"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions: Notifications & Staff Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
          {/* Mobile Search Button */}
          {!isMobileSearchOpen && (
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="sm:hidden h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-2xs"
              title="Quick Search"
              aria-label="Quick Search"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Expiration Alerts Bell */}
          <div ref={notifRef} className="relative shrink-0">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-2xs"
              title="Membership Expiry Alerts"
              aria-label="Membership Expiry Alerts"
            >
              <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute right-[-8px] sm:right-0 mt-2 w-[calc(100vw-24px)] max-w-sm sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Expiry Alerts
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {unreadCount} {unreadCount === 1 ? 'membership' : 'memberships'} expiring or expired
                    </p>
                  </div>
                  <button
                    onClick={fetchExpiryAlerts}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors"
                    title="Refresh alerts"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {expiringList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No memberships expiring within the next 7 days.
                    </div>
                  ) : (
                    expiringList.map((item) => {
                      const memberObj = item.member || {};
                      const planObj = item.plan || {};
                      const daysInfo = getDaysRemainingLabel(item.expiryDate);

                      return (
                        <div key={item._id} className="p-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {memberObj.fullName || 'Member'}
                              </div>
                              <div className="text-xs text-slate-500">
                                {planObj.name || 'Membership'} • Expires:{' '}
                                {new Date(item.expiryDate).toLocaleDateString()}
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                                daysInfo.isExpired
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : daysInfo.isToday
                                  ? 'bg-amber-100 text-amber-800 font-bold'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {daysInfo.text}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (memberObj._id && onSelectMember) {
                                  onSelectMember(memberObj._id);
                                }
                                setShowNotifications(false);
                              }}
                              className="group inline-flex items-center gap-1.5 h-7.5 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                            >
                              <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100">
                                <ExternalLink className="w-3 h-3" />
                              </div>
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onRenewMember) {
                                  onRenewMember(item);
                                }
                                setShowNotifications(false);
                              }}
                              className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-xs"
                            >
                              Renew
                            </button>

                            {memberObj.phone && (
                              <button
                                type="button"
                                onClick={() => {
                                  const diffDays = Math.ceil(
                                    (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                  );
                                  sendWhatsAppReminder({
                                    name: memberObj.fullName || 'Member',
                                    phone: memberObj.phone,
                                    planName: planObj.name,
                                    expiryDate: item.expiryDate,
                                    daysRemaining: diffDays,
                                  });
                                  setShowNotifications(false);
                                }}
                                className="group inline-flex items-center gap-1.5 h-7.5 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs"
                                title="Send WhatsApp Reminder"
                              >
                                <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                                  <MessageCircle className="w-3 h-3" />
                                </div>
                                <span>WhatsApp</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logged-in Staff Profile & Logout */}
          <div ref={userRef} className="relative shrink-0">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-10 sm:h-12 flex items-center gap-2 sm:gap-3 px-2 sm:px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition-all text-left shrink-0 whitespace-nowrap shadow-2xs"
            >
              <Avatar
                src={user?.avatarUrl}
                name={user?.fullName || 'U'}
                sizeClassName="w-7 h-7 sm:w-8 sm:h-8"
                shape="rounded-full"
                badgeColor="bg-slate-900 text-white"
                className="shrink-0"
              />
              <div className="hidden lg:block shrink-0">
                <div className="text-sm font-semibold text-slate-900 leading-tight whitespace-nowrap">
                  {user?.fullName || 'Staff User'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap font-medium">
                  {user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN'
                    ? '👑 Gym Admin'
                    : user?.role === 'RECEPTIONIST'
                    ? '🏢 Front Desk'
                    : 'Staff'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden lg:block shrink-0" />
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-24px)] bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                    {user?.email}
                  </div>
                  <div className="mt-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN'
                        ? '👑 Gym Admin / Owner'
                        : '🏢 Front Desk Staff'}
                    </span>
                  </div>
                </div>


                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left h-9 px-3 rounded-xl text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>
    </>
  );
};
