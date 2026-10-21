import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  Shield,
  Key,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Save,
  Plus,
  Camera,
  Activity,
  LogIn,
  UserCheck,
  UserPlus,
  Receipt,
  RefreshCw,
  Clock,
  Filter,
  User,
  Trash2,
  Edit2,
  X,
  ExternalLink,
  Laptop,
  Send,
  Smartphone,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, getMediaUrl } from '../api/client';
import { Branch } from '../types';
import { formatDateIN } from '../utils/formatters';
import { Avatar } from '../components/Avatar';
import { WhatsAppIcon } from '../components/WhatsAppIcon';

export const SettingsPage: React.FC = () => {
  const { user, branches, activeBranch, setActiveBranch, updateCurrentUser } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN';
  const [activeTab, setActiveTab] = useState<'general' | 'whatsapp' | 'staff' | 'security' | 'activity'>('general');

  // General & WhatsApp Settings State (Persisted in DB)
  const [gymSettings, setGymSettings] = useState<any>({
    gymName: 'Sagar Fitness Gym',
    tagline: 'Strength • Transformation • Health Center',
    phone: '+91 98220 10001',
    email: 'info@sagarfitness.com',
    address: 'Sagar Fitness Gym, Pathardi',
    city: 'Pathardi',
    state: 'Maharashtra',
    pincode: '414102',
    gstin: '',
    isTaxEnabled: false,
    taxRatePercent: 18,
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    whatsapp: {
      enabled: false,
      autoReminder2DaysEnabled: true,
      phoneNumberId: '',
      accessToken: '',
      templateName: 'membership_expiry_reminder',
      businessAccountId: '',
      autoSendHour: 9,
    },
    whatsappStatus: {
      isConfigured: false,
      source: 'NONE',
      autoReminder2DaysEnabled: true,
    },
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // WhatsApp Test State
  const [testPhone, setTestPhone] = useState('');
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Staff Management State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST',
    phone: '',
    avatarUrl: '',
  });
  const [uploadingStaffPhoto, setUploadingStaffPhoto] = useState(false);
  const [creatingStaffLoading, setCreatingStaffLoading] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [staffMsg, setStaffMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    fullName: '',
    phone: '',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    avatarUrl: '',
    branch: '',
  });
  const [updatingStaffLoading, setUpdatingStaffLoading] = useState(false);

  // Delete Staff Modal State (Admin only)
  const [deleteTargetStaff, setDeleteTargetStaff] = useState<any | null>(null);
  const [deletingStaffLoading, setDeletingStaffLoading] = useState(false);

  // Password & Profile State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Profile Form & Avatar
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
  });
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Audit Logs (Desk Activity & Login History) State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditRoleFilter, setAuditRoleFilter] = useState('ALL');
  const [auditPagination, setAuditPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    } else if (activeTab === 'activity') {
      fetchAuditLogs(1);
    }
  }, [activeTab, auditActionFilter, auditRoleFilter]);

  const fetchStaff = async () => {
    try {
      setLoadingStaff(true);
      const res = await api.getStaff();
      setStaffList(res || []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    try {
      setLoadingAudit(true);
      const res = await api.getAuditLogs({
        page,
        limit: 50,
        action: auditActionFilter,
        userRole: auditRoleFilter,
      });
      setAuditLogs(res.data || []);
      setAuditPagination(res.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await api.getSettings();
      if (res) {
        setGymSettings(res);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators can update gym settings');
      return;
    }
    try {
      setSavingSettings(true);
      setGeneralError(null);
      await api.updateSettings(gymSettings);
      setGeneralSaved(true);
      setTimeout(() => setGeneralSaved(false), 2500);
      fetchSettings();
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;
    try {
      setTestingWhatsApp(true);
      setTestResult(null);
      setTestError(null);
      const res = await api.testWhatsApp(testPhone.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestError(err.message || 'WhatsApp test failed');
    } finally {
      setTestingWhatsApp(false);
    }
  };

  // Profile Avatar Upload Handler
  const handleUserAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          // Set immediate local preview so the user sees their new photo instantly
          updateCurrentUser({ avatarUrl: base64 });
          const uploadRes = await api.uploadPhoto(base64, file.name);
          await api.updateProfile({ avatarUrl: uploadRes.url });
          updateCurrentUser({ avatarUrl: uploadRes.url });
          setProfileMsg('Profile picture updated successfully!');
          setTimeout(() => setProfileMsg(null), 3000);
        } catch (err: any) {
          alert(err.message || 'Failed to upload photo');
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || 'Failed to read image');
      setUploadingAvatar(false);
    }
  };

  const handleRemoveUserAvatar = async () => {
    try {
      setUploadingAvatar(true);
      await api.updateProfile({ avatarUrl: '' });
      updateCurrentUser({ avatarUrl: '' });
      setProfileMsg('Profile picture removed.');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to remove picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Staff Avatar Upload Handler (New or Edit)
  const handleStaffPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingStaffPhoto(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          // Set immediate local base64 preview
          if (isNew) {
            setStaffForm((prev) => ({ ...prev, avatarUrl: base64 }));
          } else {
            setEditStaffForm((prev) => ({ ...prev, avatarUrl: base64 }));
          }
          const uploadRes = await api.uploadPhoto(base64, file.name);
          if (isNew) {
            setStaffForm((prev) => ({ ...prev, avatarUrl: uploadRes.url }));
          } else {
            setEditStaffForm((prev) => ({ ...prev, avatarUrl: uploadRes.url }));
          }
        } catch (err: any) {
          alert(err.message || 'Failed to upload staff photo');
        } finally {
          setUploadingStaffPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || 'Failed to process file');
      setUploadingStaffPhoto(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffModalError(null);
    setCreatingStaffLoading(true);
    try {
      await api.register({
        ...staffForm,
        branchId: activeBranch?._id,
      });
      setStaffMsg({ type: 'success', text: `Staff account for ${staffForm.fullName} created successfully.` });
      setShowAddStaffModal(false);
      setStaffForm({ fullName: '', email: '', password: '', role: 'RECEPTIONIST', phone: '', avatarUrl: '' });
      fetchStaff();
    } catch (err: any) {
      setStaffModalError(err.message || 'Failed to create staff account. Please verify the email and details.');
    } finally {
      setCreatingStaffLoading(false);
    }
  };

  const handleOpenEditStaff = (st: any) => {
    setEditingStaff(st);
    setEditStaffForm({
      fullName: st.fullName || '',
      phone: st.phone || '',
      role: st.role || 'RECEPTIONIST',
      status: st.status || 'ACTIVE',
      avatarUrl: st.avatarUrl || '',
      branch: st.branch?._id || '',
    });
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      setUpdatingStaffLoading(true);
      await api.updateStaff(editingStaff._id, editStaffForm);
      setEditingStaff(null);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to update staff member');
    } finally {
      setUpdatingStaffLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteTargetStaff) return;
    try {
      setDeletingStaffLoading(true);
      await api.deleteStaff(deleteTargetStaff._id);
      setStaffMsg({
        type: 'success',
        text: `Staff account "${deleteTargetStaff.fullName}" was permanently deleted from the database.`,
      });
      setStaffList((prev) => prev.filter((s) => s._id !== deleteTargetStaff._id));
      setDeleteTargetStaff(null);
      await fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff member');
    } finally {
      setDeletingStaffLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setSecurityMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    try {
      setSecurityLoading(true);
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSecurityMsg({ type: 'success', text: 'Password updated successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setSecurityMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      setProfileLoading(true);
      await api.updateProfile(profileForm);
      updateCurrentUser(profileForm);
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Helper for audit action badges
  const renderAuditActionBadge = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <LogIn className="w-3 h-3" />
            Login
          </span>
        );
      case 'MEMBER_REGISTERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <UserPlus className="w-3 h-3" />
            Registered Member
          </span>
        );
      case 'MEMBER_CHECK_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <UserCheck className="w-3 h-3" />
            Check-In
          </span>
        );
      case 'MEMBER_CHECK_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <UserCheck className="w-3 h-3" />
            Check-Out
          </span>
        );
      case 'PAYMENT_RECORDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Receipt className="w-3 h-3" />
            Payment
          </span>
        );
      case 'PROFILE_UPDATED':
      case 'STAFF_UPDATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3" />
            Settings Updated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Activity className="w-3 h-3" />
            {action.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  // Helper for audit description
  const formatAuditDetails = (log: any) => {
    if (log.action === 'USER_LOGIN') {
      return log.ip ? `Logged in from IP: ${log.ip}` : 'Logged in successfully';
    }
    if (log.action === 'MEMBER_REGISTERED') {
      return `New Member: ${log.details?.memberName || log.entityId || 'Member'}`;
    }
    if (log.action === 'MEMBER_CHECK_IN' || log.action === 'MEMBER_CHECK_OUT') {
      return `Member: ${log.details?.memberName || log.entityId || 'Member'}`;
    }
    if (log.action === 'PAYMENT_RECORDED') {
      return `Amount: $${log.details?.amount || '0'} via ${log.details?.paymentMethod || 'Cash'}`;
    }
    if (log.details) {
      try {
        return Object.entries(log.details)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
      } catch {
        return 'System event recorded';
      }
    }
    return 'Action recorded';
  };

  const filteredStaff = staffList.filter((st) => {
    if (!staffSearchQuery.trim()) return true;
    const q = staffSearchQuery.toLowerCase();
    return (
      st.fullName?.toLowerCase().includes(q) ||
      st.email?.toLowerCase().includes(q) ||
      st.role?.toLowerCase().includes(q) ||
      st.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Settings & Administration
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Configure {gymSettings.gymName || 'Sagar Fitness Gym'} defaults, official branding, staff logins, and security.
              </p>
            </div>
          </div>
        </div>

        {/* System Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 bg-white border border-slate-200/80 rounded-lg shadow-2xs flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>IST (UTC+5:30)</span>
          </div>

          <div className="px-3 py-1.5 bg-blue-50/80 border border-blue-200/80 rounded-lg text-xs font-semibold text-blue-700 flex items-center gap-1.5">
            <span>₹ Direct Billing (Tax-Free)</span>
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Bar */}
      <div className="p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-xl flex items-center gap-1 overflow-x-auto shadow-inner no-scrollbar">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === 'general' ? 'text-blue-600' : 'text-slate-400'}`} />
          Gym Profile
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'whatsapp'
              ? 'bg-white text-emerald-600 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <WhatsAppIcon className="w-4 h-4" />
          WhatsApp Automation
          {gymSettings.whatsappStatus?.isConfigured ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          ) : (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800">
              Setup Req
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'staff'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'staff' ? 'text-blue-600' : 'text-slate-400'}`} />
          Staff Accounts
          {staffList.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-200/70 text-slate-700">
              {staffList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Shield className={`w-4 h-4 ${activeTab === 'security' ? 'text-blue-600' : 'text-slate-400'}`} />
          Profile & Security
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'activity'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Activity className={`w-4 h-4 ${activeTab === 'activity' ? 'text-blue-600' : 'text-slate-400'}`} />
          Desk Activity & Logins
        </button>
      </div>

      {/* Tab 1: General & Indian Gym Profile */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Form: 8 cols */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">
                      Sagar Fitness Gym Business Profile
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    Official business details rendered on member receipts, PDF bills, and automated WhatsApp communication.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
                    India Edition (INR • Asia/Kolkata)
                  </span>
                </div>
              </div>

              {/* Status alerts */}
              {generalSaved && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Gym business profile updated successfully across all receipts and desk modules.</span>
                </div>
              )}

              {generalError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold">{generalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveGeneral} className="space-y-6">
                {/* Brand Identity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Brand Identity & Receipt Header
                  </div>

                  {/* Sagar Fitness Logo showcase card */}
                  <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs shrink-0">
                        <img
                          src="/logo.png"
                          alt="Sagar Fitness Gym"
                          className="h-12 sm:h-13 w-auto max-w-[180px] object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          Official Sagar Fitness Gym Brand Logo
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Displays automatically on the login portal, invoice headers, and desk printouts.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 shrink-0">
                      Primary Brand Asset
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Gym Business Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={gymSettings.gymName || ''}
                          onChange={(e) => setGymSettings({ ...gymSettings, gymName: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          placeholder="e.g. Sagar Fitness GYM"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Tagline / Motto
                      </label>
                      <div className="relative">
                        <Sparkles className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={gymSettings.tagline || ''}
                          onChange={(e) => setGymSettings({ ...gymSettings, tagline: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          placeholder="e.g. Strength • Transformation • Health Center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    Desk Communication & Inquiries
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Front Desk Contact Phone (+91) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          value={gymSettings.phone || ''}
                          onChange={(e) => setGymSettings({ ...gymSettings, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          placeholder="+91 98220 10001"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Appears on receipts for member customer support inquiries</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Official Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={gymSettings.email || ''}
                          onChange={(e) => setGymSettings({ ...gymSettings, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          placeholder="info@sagarfitness.com"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Official inbox for gym correspondence and administrative alerts</p>
                    </div>
                  </div>
                </div>

                {/* Facility & Location Section */}
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Physical Facility & Postal Address
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Gym Street Address & Landmark <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={gymSettings.address || ''}
                        onChange={(e) => setGymSettings({ ...gymSettings, address: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="e.g. Main Road, Pathardi, Maharashtra"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={gymSettings.city || ''}
                        onChange={(e) => setGymSettings({ ...gymSettings, city: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="e.g. Pathardi"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={gymSettings.state || ''}
                        onChange={(e) => setGymSettings({ ...gymSettings, state: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="e.g. Maharashtra"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        value={gymSettings.pincode || ''}
                        onChange={(e) => setGymSettings({ ...gymSettings, pincode: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="e.g. 411045"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax-Free Billing Policy */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/40 border border-emerald-200/80 rounded-2xl space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950">Tax-Free Billing Policy</span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/50">
                      Flat Rates • 0% Tax
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed font-normal">
                    Sagar Fitness Gym operates on a direct, tax-free billing structure. No GST or tax surcharges are added to transactions. Remaining Balance is strictly calculated as Total Membership Fee minus Total Valid Payments.
                  </p>
                </div>

                {/* Indian Operational Standards (Read-Only) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Operating Currency
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Indian Rupee (INR)</span>
                      <span className="font-extrabold text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">₹</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Formatted with en-IN standards (e.g. ₹1,29,999)</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Timezone Standard
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Asia/Kolkata (IST)</span>
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">UTC+5:30</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Receipts & records use DD/MM/YYYY formatting</p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-400 font-medium">
                    {isAdmin ? 'Changes apply immediately across all modules.' : 'Only administrators can save settings.'}
                  </div>
                  <button
                    type="submit"
                    disabled={savingSettings || !isAdmin}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-98"
                  >
                    {savingSettings ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Gym Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Live Receipt Header & Gym Overview Preview (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Receipt Preview Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">Live Customer Receipt Header</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Real-time Preview
                </span>
              </div>

              {/* Realistic Receipt Canvas */}
              <div className="p-5 bg-gradient-to-b from-white to-slate-50/50 space-y-3.5">
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="h-10 w-auto max-w-[130px] object-contain"
                    />
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Bill</div>
                      <div className="text-[11px] font-mono font-bold text-slate-800">#SFG-REC-1042</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                      {gymSettings.gymName || 'Sagar Fitness GYM'}
                    </h3>
                    <p className="text-[10px] font-semibold text-blue-600 mt-0.5">
                      {gymSettings.tagline || 'Strength • Transformation • Health Center'}
                    </p>
                  </div>

                  <div className="space-y-1 text-[10px] text-slate-500 pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {gymSettings.address || 'Main Road, Pathardi'}, {gymSettings.city || 'Pathardi'} - {gymSettings.pincode || '414102'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{gymSettings.phone || '+91 98220 10001'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{gymSettings.email || 'info@sagarfitness.com'}</span>
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-[10px] font-semibold text-slate-700">
                    <span>Tax Policy: Flat 0% (Tax-Free)</span>
                    <span className="text-emerald-700 font-bold">✓ Official Receipt</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-normal text-center">
                  This header dynamically updates whenever you print member bills, generate PDF receipts, or send WhatsApp receipts.
                </p>
              </div>
            </div>

            {/* System Status / Quick Info Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Gym System Operations
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Software License</span>
                  <span className="font-bold text-slate-800">Sagar Fitness Pro (v2.4)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Primary Facility</span>
                  <span className="font-bold text-slate-800">Pathardi, Maharashtra</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">System Database</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Connected (Cloud)</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Active Staff Logins</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{staffList.length} Accounts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp Cloud API & Automation */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Credentials & Test Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <WhatsAppIcon className="w-6 h-6" />
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">
                      WhatsApp Cloud API Automation
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    Official Meta WhatsApp Business Cloud API integration for automated 2-day membership reminders.
                  </p>
                </div>

                <div>
                  {gymSettings.whatsappStatus?.isConfigured ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Configured & Live ({gymSettings.whatsappStatus.source === 'ENVIRONMENT_VARIABLES' ? 'ENV' : 'Database'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Setup Required
                    </span>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              {!gymSettings.whatsappStatus?.isConfigured ? (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    WhatsApp Cloud API is not yet configured.
                  </div>
                  <p className="leading-relaxed">
                    To send automated 2-day membership expiry reminders directly to Indian gym members (+91), enter your official Meta WhatsApp Cloud API credentials below or define <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">WHATSAPP_ACCESS_TOKEN</code> and <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">WHATSAPP_PHONE_NUMBER_ID</code> in backend environment variables.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    ⚠️ Without credentials, the system records skipped reminders as &ldquo;Setup Required&rdquo; and does not pretend messages were delivered.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-800">WhatsApp Automation Active</span>
                    <p className="text-emerald-700 text-[11px] mt-0.5">
                      Scheduled daily job scans memberships and dispatches automated reminders 2 days prior to expiry in Asia/Kolkata timezone.
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSaveGeneral} className="space-y-4">
                {/* 2-Day Automation Toggle Switch */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Automatic 2-Day Expiry Reminders
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Delivers WhatsApp reminder automatically to active members whose membership expires in 2 days.
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gymSettings.whatsapp?.autoReminder2DaysEnabled ?? true}
                      onChange={(e) =>
                        setGymSettings({
                          ...gymSettings,
                          whatsapp: {
                            ...(gymSettings.whatsapp || {}),
                            autoReminder2DaysEnabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* API Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      WhatsApp Phone Number ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 109283948291029"
                      value={gymSettings.whatsapp?.phoneNumberId || ''}
                      onChange={(e) =>
                        setGymSettings({
                          ...gymSettings,
                          whatsapp: {
                            ...(gymSettings.whatsapp || {}),
                            phoneNumberId: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Found in Meta Developer Portal under WhatsApp &gt; API Setup</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Meta System User Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="EAA..."
                      value={gymSettings.whatsapp?.accessToken || ''}
                      onChange={(e) =>
                        setGymSettings({
                          ...gymSettings,
                          whatsapp: {
                            ...(gymSettings.whatsapp || {}),
                            accessToken: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Never exposed to frontend; masked securely</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Approved WhatsApp Template Name
                    </label>
                    <input
                      type="text"
                      value={gymSettings.whatsapp?.templateName || 'membership_expiry_reminder'}
                      onChange={(e) =>
                        setGymSettings({
                          ...gymSettings,
                          whatsapp: {
                            ...(gymSettings.whatsapp || {}),
                            templateName: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Approved template with 3 parameters: name, gym, date</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Meta Business Account ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 782910293847"
                      value={gymSettings.whatsapp?.businessAccountId || ''}
                      onChange={(e) =>
                        setGymSettings({
                          ...gymSettings,
                          whatsapp: {
                            ...(gymSettings.whatsapp || {}),
                            businessAccountId: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings || !isAdmin}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingSettings ? 'Saving...' : 'Save WhatsApp Configuration'}
                  </button>
                </div>
              </form>

              {/* Test WhatsApp Connection Tool */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Test WhatsApp Cloud API Connection
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dispatch a test message using the configured Meta Cloud API to verify credentials and template delivery.
                </p>

                <form onSubmit={handleTestWhatsApp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="tel"
                    placeholder="Indian Mobile (e.g. 9876543210)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-600 focus:outline-none font-mono bg-white"
                  />
                  <button
                    type="submit"
                    disabled={testingWhatsApp || !testPhone.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testingWhatsApp ? 'Testing...' : 'Send Test WhatsApp'}
                  </button>
                </form>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {testResult.success ? '✅ Test Message Dispatched' : '⚠️ API Response:'}
                    </div>
                    <div className="text-[11px] mt-1 font-mono">{testResult.error || 'Message sent successfully via Meta Cloud API.'}</div>
                    {testResult.waMessageId && (
                      <div className="text-[10px] text-slate-500 mt-0.5">Meta Message ID: {testResult.waMessageId}</div>
                    )}
                  </div>
                )}

                {testError && (
                  <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                    {testError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live WhatsApp Message Mockup (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Member WhatsApp Experience</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live Mockup
                </span>
              </div>

              {/* WhatsApp App Mockup */}
              <div className="p-4 bg-slate-100 flex justify-center">
                <div className="w-full max-w-[340px] rounded-2xl overflow-hidden shadow-md border border-slate-300/80 bg-[#ECE5DD]">
                  {/* WhatsApp App Header */}
                  <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center gap-2.5 shadow-xs">
                    <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
                      <img src="/logo.png" alt="Sagar Fitness" className="h-6 w-auto object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate flex items-center gap-1">
                        {gymSettings.gymName || 'Sagar Fitness Gym'}
                        <span className="w-3 h-3 bg-white text-[#075E54] rounded-full text-[8px] flex items-center justify-center font-bold">✓</span>
                      </div>
                      <div className="text-[10px] text-emerald-100 truncate">Official Business Account</div>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="p-3.5 space-y-3 min-h-[220px]">
                    <div className="flex justify-center">
                      <span className="text-[9px] font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-md shadow-2xs">
                        Today
                      </span>
                    </div>

                    {/* WhatsApp Message Bubble */}
                    <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-2xs max-w-[90%] space-y-1.5 border border-slate-200/60 text-slate-800">
                      <div className="text-[11px] font-bold text-[#075E54] flex items-center gap-1">
                        <span>🔔 Sagar Fitness Gym Expiry Alert</span>
                      </div>
                      <p className="text-[11px] leading-snug">
                        Dear <strong className="text-slate-900">Rahul Sharma</strong>,
                      </p>
                      <p className="text-[11px] leading-snug">
                        Your <strong className="text-slate-900">3 Month Strength & Cardio</strong> membership expires in <strong className="text-emerald-700">2 days</strong> on <strong className="text-slate-900">22 Oct 2026</strong>.
                      </p>
                      <p className="text-[11px] leading-snug text-slate-600">
                        Kindly visit the front desk to renew and keep your workout routine active!
                      </p>
                      <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                        📞 Desk: {gymSettings.phone || '+91 98220 10001'}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-0.5">
                        <span>09:00 AM</span>
                        <span className="text-blue-500 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-500">
                  Delivered automatically at <strong>09:00 AM IST</strong> to active members whose plan expires in 2 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Staff Accounts */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Stat Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Staff
              </div>
              <div className="text-2xl font-black text-slate-900">{staffList.length}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Registered team accounts</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Active Logins
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {staffList.filter((s) => s.status === 'ACTIVE').length}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Operational desk credentials</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Administrators
              </div>
              <div className="text-2xl font-black text-purple-600">
                {staffList.filter((s) => s.role === 'SUPER_ADMIN' || s.role === 'GYM_ADMIN').length}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Owners & Managers</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Front Desk
              </div>
              <div className="text-2xl font-black text-blue-600">
                {staffList.filter((s) => s.role === 'RECEPTIONIST').length}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Reception & Check-in Desk</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Staff Accounts & Desk Logins</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage Sagar Fitness Gym staff accounts, role permissions, and desk login privileges.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Search staff..."
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none w-44 sm:w-56"
                  />
                </div>

                <button
                  onClick={() => {
                    setStaffMsg(null);
                    setStaffModalError(null);
                    setStaffForm({
                      fullName: '',
                      email: '',
                      password: '',
                      role: 'RECEPTIONIST',
                      phone: '',
                      avatarUrl: '',
                    });
                    setShowAddStaffModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Staff Account
                </button>
              </div>
            </div>

            {staffMsg && (
              <div
                className={`m-5 p-3 rounded-xl text-xs font-medium ${
                  staffMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {staffMsg.text}
              </div>
            )}

            {loadingStaff ? (
              <div className="p-12 text-center text-sm text-slate-500">Loading staff accounts...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                {staffSearchQuery ? `No staff accounts match "${staffSearchQuery}".` : 'No staff accounts found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3">Staff Member</th>
                      <th className="px-5 py-3">Email Address</th>
                      <th className="px-5 py-3">Role & Permissions</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map((st) => (
                      <tr key={st._id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={st.avatarUrl}
                              name={st.fullName}
                              sizeClassName="w-9 h-9"
                              shape="rounded-full"
                              badgeColor="bg-blue-100 text-blue-700 font-bold"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{st.fullName}</div>
                              <div className="text-xs text-slate-500 font-normal">{st.phone || 'No phone'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">{st.email}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                              st.role === 'SUPER_ADMIN' || st.role === 'GYM_ADMIN'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {st.role === 'RECEPTIONIST'
                              ? '🏢 Front Desk'
                              : st.role === 'SUPER_ADMIN'
                              ? '👑 Gym Owner'
                              : st.role === 'GYM_ADMIN'
                              ? '🛡️ Manager'
                              : st.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              st.status === 'ACTIVE'
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : st.status === 'SUSPENDED'
                                ? 'text-red-700 bg-red-50 border border-red-200'
                                : 'text-slate-600 bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditStaff(st)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit / Photo
                            </button>

                            {isAdmin && (
                              st._id === user?.id || (user as any)?._id === st._id || (st.email && user?.email && st.email.toLowerCase() === user.email.toLowerCase()) ? (
                                <span className="text-[11px] font-bold text-slate-400 px-2.5 py-0.5 bg-slate-100 rounded-full" title="Your logged-in administrator account">
                                  (You)
                                </span>
                              ) : (
                                <button
                                  onClick={() => setDeleteTargetStaff(st)}
                                  title={
                                    user?.role === 'GYM_ADMIN' && st.role === 'SUPER_ADMIN'
                                      ? 'Only Gym Owner can delete Owner account'
                                      : 'Delete staff account'
                                  }
                                  disabled={user?.role === 'GYM_ADMIN' && st.role === 'SUPER_ADMIN'}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                    user?.role === 'GYM_ADMIN' && st.role === 'SUPER_ADMIN'
                                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                      : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Profile & Password */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Details & Photo */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-subtle space-y-5">
            <h3 className="text-base font-bold text-[#202124] pb-3 border-b border-[#E5E7EB]">
              Profile Photo & Personal Information
            </h3>

            {/* Profile Avatar Upload Widget */}
            <div className="pb-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="relative group shrink-0">
                <Avatar
                  src={user?.avatarUrl}
                  name={user?.fullName || 'U'}
                  sizeClassName="w-20 h-20"
                  shape="rounded-full"
                  badgeColor="bg-blue-600 text-white font-bold text-2xl"
                  className="border-2 border-white shadow-md ring-2 ring-blue-500/20"
                />

                <label
                  className={`absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white cursor-pointer transition-opacity ${
                    uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Upload Profile Picture"
                >
                  {uploadingAvatar ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px] font-semibold mt-0.5">Change</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAvatar}
                    className="hidden"
                    onChange={handleUserAvatarUpload}
                  />
                </label>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="font-bold text-[#202124] text-base">{user?.fullName}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN' ? '👑 Gym Owner / Admin' : '🏢 Front Desk / Receptionist'}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Upload your avatar photo. This will display in the top navigation bar and on staff activity logs.
                </p>

                <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    {uploadingAvatar ? 'Uploading...' : 'Upload New Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingAvatar}
                      className="hidden"
                      onChange={handleUserAvatarUpload}
                    />
                  </label>

                  {user?.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveUserAvatar}
                      className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {profileMsg && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-xs text-green-700">
                {profileMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  readOnly
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-md text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Mobile Phone
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Assigned Role
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.role?.replace('_', ' ') || 'Staff'}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-md text-gray-500 capitalize"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
                >
                  {profileLoading ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-subtle">
            <h3 className="text-base font-bold text-[#202124] pb-3 border-b border-[#E5E7EB]">
              Change Password
            </h3>

            {securityMsg && (
              <div
                className={`mt-4 p-3 rounded-md text-xs ${
                  securityMsg.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {securityMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={securityLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
                >
                  {securityLoading ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 5: Desk Activity & Logins */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-subtle flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[#6B7280]">Total Audit Events</div>
                <div className="text-2xl font-bold text-[#202124] mt-1">{auditPagination.total}</div>
                <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Live event stream</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-subtle flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[#6B7280]">Staff Logins Logged</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {auditLogs.filter((l) => l.action === 'USER_LOGIN').length}
                </div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">In current page view</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <LogIn className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-subtle flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[#6B7280]">Latest Event Recorded</div>
                <div className="text-sm font-bold text-[#202124] mt-1 truncate max-w-[180px]">
                  {auditLogs[0] ? new Date(auditLogs[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                </div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">
                  {auditLogs[0] ? new Date(auditLogs[0].createdAt).toLocaleDateString() : '—'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Activity Log Table Container */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-subtle overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#202124] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Staff Login History & Activity Logs
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Real-time tracking of staff logins, member registrations, attendance check-ins, and payments.
                </p>
              </div>

              {/* Filters & Refresh */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Action:</span>
                </div>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none bg-white font-medium"
                >
                  <option value="ALL">All Actions</option>
                  <option value="USER_LOGIN">🔐 Logins Only</option>
                  <option value="MEMBER_REGISTERED">👤 Member Registrations</option>
                  <option value="MEMBER_CHECK_IN">⏱️ Check-In Punch</option>
                  <option value="PAYMENT_RECORDED">💳 Payment Collected</option>
                </select>

                <select
                  value={auditRoleFilter}
                  onChange={(e) => setAuditRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md focus:border-blue-600 focus:outline-none bg-white font-medium"
                >
                  <option value="ALL">All Roles</option>
                  <option value="RECEPTIONIST">🏢 Front Desk Staff</option>
                  <option value="GYM_ADMIN">🛡️ Gym Manager</option>
                  <option value="SUPER_ADMIN">👑 Gym Owner</option>
                </select>

                <button
                  onClick={() => fetchAuditLogs(1)}
                  disabled={loadingAudit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] hover:bg-gray-50 rounded-md text-xs font-semibold text-[#202124] transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin text-blue-600' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loadingAudit ? (
              <div className="p-16 text-center text-sm text-[#6B7280] flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Fetching activity logs...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#6B7280]">
                No audit logs found for the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-5 py-3">Staff Member</th>
                      <th className="px-5 py-3">Event / Action</th>
                      <th className="px-5 py-3">Details</th>
                      <th className="px-5 py-3">Date & Time</th>
                      <th className="px-5 py-3 text-right">IP / Origin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {auditLogs.map((log) => {
                      const logUser = log.user || {};
                      const avatar = logUser.avatarUrl || '';
                      const name = log.userName || logUser.fullName || 'System / Staff';
                      const role = log.userRole || logUser.role || 'STAFF';

                      return (
                        <tr key={log._id} className="hover:bg-gray-50/75 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={avatar}
                                name={name}
                                sizeClassName="w-8 h-8"
                                shape="rounded-full"
                                badgeColor="bg-blue-100 text-blue-700 font-bold"
                              />
                              <div>
                                <div className="font-semibold text-xs text-[#202124]">{name}</div>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">
                                  {role === 'RECEPTIONIST'
                                    ? '🏢 Front Desk'
                                    : role === 'SUPER_ADMIN'
                                    ? '👑 Gym Owner'
                                    : role === 'GYM_ADMIN'
                                    ? '🛡️ Manager'
                                    : role.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            {renderAuditActionBadge(log.action)}
                          </td>

                          <td className="px-5 py-3.5 text-xs text-[#202124] font-medium">
                            {formatAuditDetails(log)}
                          </td>

                          <td className="px-5 py-3.5 text-xs text-[#6B7280]">
                            <div>{new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono text-xs text-[#6B7280]">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                              {log.ip || '127.0.0.1'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg shadow-modal overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#202124]">Add Staff Account</h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-3.5">
              {/* Modal Error Banner */}
              {staffModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-snug">{staffModalError}</span>
                </div>
              )}

              {/* Staff Avatar Upload */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                <Avatar
                  src={staffForm.avatarUrl}
                  name={staffForm.fullName || 'Staff'}
                  sizeClassName="w-14 h-14"
                  shape="rounded-full"
                  badgeColor="bg-blue-50 text-blue-700 font-bold text-lg border border-dashed border-blue-300"
                />

                <div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#202124] rounded-md text-xs font-semibold cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    {uploadingStaffPhoto ? 'Uploading...' : 'Upload Staff Picture'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingStaffPhoto}
                      className="hidden"
                      onChange={(e) => handleStaffPhotoUpload(e, true)}
                    />
                  </label>
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    Optional picture for front desk login identification.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. frontdesk@sagarfitness.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Assigned Staff Role
                </label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                >
                  <option value="RECEPTIONIST">🏢 Front Desk / Receptionist (Member add & attendance only)</option>
                  <option value="GYM_ADMIN">🛡️ Gym Manager</option>
                  <option value="TRAINER">🏋️ Trainer / Coach</option>
                  <option value="SUPER_ADMIN">👑 Gym Owner / Super Admin</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStaffLoading || uploadingStaffPhoto}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
                >
                  {creatingStaffLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg shadow-modal overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#202124]">Edit Staff Member</h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="p-6 space-y-3.5">
              {/* Photo Upload in Edit Staff */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                <Avatar
                  src={editStaffForm.avatarUrl}
                  name={editStaffForm.fullName || 'Staff'}
                  sizeClassName="w-14 h-14"
                  shape="rounded-full"
                  badgeColor="bg-blue-50 text-blue-700 font-bold text-lg border border-dashed border-blue-300"
                />

                <div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-semibold cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    {uploadingStaffPhoto ? 'Uploading...' : 'Change Staff Picture'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingStaffPhoto}
                      className="hidden"
                      onChange={(e) => handleStaffPhotoUpload(e, false)}
                    />
                  </label>
                  {editStaffForm.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setEditStaffForm({ ...editStaffForm, avatarUrl: '' })}
                      className="block text-[11px] text-red-600 hover:underline mt-1"
                    >
                      Remove picture
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editStaffForm.fullName}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editStaffForm.phone}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Role
                </label>
                <select
                  value={editStaffForm.role}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                >
                  <option value="RECEPTIONIST">🏢 Front Desk / Receptionist</option>
                  <option value="GYM_ADMIN">🛡️ Gym Manager</option>
                  <option value="TRAINER">🏋️ Trainer / Coach</option>
                  <option value="SUPER_ADMIN">👑 Gym Owner / Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Account Status
                </label>
                <select
                  value={editStaffForm.status}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-md focus:border-blue-600 focus:outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-between border-t">
                {isAdmin &&
                !(
                  editingStaff._id === user?.id ||
                  (user as any)?._id === editingStaff._id ||
                  (editingStaff.email && user?.email && editingStaff.email.toLowerCase() === user.email.toLowerCase())
                ) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingStaff;
                      setEditingStaff(null);
                      setDeleteTargetStaff(target);
                    }}
                    disabled={user?.role === 'GYM_ADMIN' && editingStaff.role === 'SUPER_ADMIN'}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                      user?.role === 'GYM_ADMIN' && editingStaff.role === 'SUPER_ADMIN'
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Account
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingStaffLoading}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded"
                  >
                    {updatingStaffLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deleteTargetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-xl shadow-modal overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202124]">Delete Staff Account</h3>
                  <p className="text-[11px] text-red-600 font-semibold uppercase tracking-wider">
                    Admin Only Action
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTargetStaff(null)}
                disabled={deletingStaffLoading}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to permanently delete this staff member account? This will revoke their Sagar Fitness Gym desk login credentials and access immediately.
              </p>

              {/* Staff Member Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={deleteTargetStaff.avatarUrl}
                    name={deleteTargetStaff.fullName || 'S'}
                    sizeClassName="w-10 h-10"
                    shape="rounded-full"
                    badgeColor="bg-blue-100 text-blue-700 font-bold text-sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#202124] truncate">
                      {deleteTargetStaff.fullName}
                    </div>
                    <div className="text-xs text-[#6B7280] truncate">{deleteTargetStaff.email}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between text-xs text-[#6B7280]">
                  <span>
                    Role:{' '}
                    <strong className="text-[#202124]">
                      {deleteTargetStaff.role === 'RECEPTIONIST'
                        ? '🏢 Front Desk'
                        : deleteTargetStaff.role === 'SUPER_ADMIN'
                        ? '👑 Gym Owner'
                        : deleteTargetStaff.role === 'GYM_ADMIN'
                        ? '🛡️ Manager'
                        : deleteTargetStaff.role}
                    </strong>
                  </span>
                  <span>
                    Status:{' '}
                    <strong className="text-emerald-700">{deleteTargetStaff.status}</strong>
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-800 leading-normal">
                  <strong>Warning:</strong> This action cannot be undone. System audit logs for historical actions performed by this user will remain preserved.
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTargetStaff(null)}
                disabled={deletingStaffLoading}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200/70 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={deletingStaffLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
              >
                {deletingStaffLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Staff Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
