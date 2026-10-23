import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Printer,
  Edit2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building2,
  UserCheck,
  Receipt,
  Snowflake,
  ShieldAlert,
  Camera,
  Trash2,
  Archive,
  RotateCcw,
  Utensils,
  Scale,
  Plus,
  FileText,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Member, Membership, Payment, DietPlan } from '../../types';
import { sendWhatsAppReminder, openWhatsApp, getWelcomeMessage, sendWhatsAppDueReminder } from '../../utils/whatsapp';
import { formatINR, formatDateIN, formatTimeIN, formatDisplayPhoneIN, formatAttendanceDuration } from '../../utils/formatters';
import { DeleteMemberModal } from './DeleteMemberModal';
import { DietPlanModal } from './DietPlanModal';
import { WeightProgressModal } from './WeightProgressModal';
import { DietReportModal } from './DietReportModal';
import { Avatar } from '../Avatar';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface MemberProfileModalProps {
  memberId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCardModal?: (member: Member) => void;
  onOpenRenewModal?: (membership: Membership) => void;
  onOpenFreezeModal?: (membership: Membership) => void;
  onOpenCollectDue?: (dueItem: any) => void;
  onOpenReceipt?: (payment: any) => void;
  onMemberDeleted?: () => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  memberId,
  isOpen,
  onClose,
  onOpenCardModal,
  onOpenRenewModal,
  onOpenFreezeModal,
  onOpenCollectDue,
  onOpenReceipt,
  onMemberDeleted,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [data, setData] = useState<{
    member: Member;
    currentMembership?: Membership;
    memberships: Membership[];
    payments: Payment[];
    attendance: any[];
    auditHistory: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Diet & Fitness Profile State
  const [dietProfile, setDietProfile] = useState<any | null>(null);
  const [isDietModalOpen, setIsDietModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [dietPlanToEdit, setDietPlanToEdit] = useState<DietPlan | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !memberId) return;

    try {
      setUploadingPhoto(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          // Set immediate local preview so the user sees their photo right away
          setData((prev) =>
            prev ? { ...prev, member: { ...prev.member, photoUrl: base64 } } : null
          );
          const uploadRes = await api.uploadPhoto(base64, file.name);
          await api.updateMember(memberId, { photoUrl: uploadRes.url });
          setData((prev) =>
            prev ? { ...prev, member: { ...prev.member, photoUrl: uploadRes.url } } : null
          );
          window.dispatchEvent(
            new CustomEvent('fitcore:data-changed', {
              detail: { action: 'MEMBER_PHOTO_UPDATED', memberId },
            })
          );
        } catch (uploadErr: any) {
          alert(uploadErr.message || 'Failed to upload photo');
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || 'Failed to process image');
      setUploadingPhoto(false);
    }
  };

  const fetchProfile = async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMember(memberId);
      setData(res);
      setEditForm({
        fullName: res.member.fullName,
        phone: res.member.phone,
        email: res.member.email || '',
        address: res.member.address || '',
      });
      // Fetch diet & fitness profile
      api.getMemberDietProfile(memberId).then((dRes) => setDietProfile(dRes.data)).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Failed to load member profile');
    } finally {
      setLoading(false);
    }
  };

  const [thawing, setThawing] = useState(false);

  const handleThaw = async (subId: string) => {
    try {
      setThawing(true);
      await api.thawMembership(subId);
      window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBERSHIP_THAWED' } }));
      await fetchProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to unfreeze membership');
    } finally {
      setThawing(false);
    }
  };

  useEffect(() => {
    if (isOpen && memberId) {
      setIsEditing(false);
      fetchProfile();
    }
  }, [isOpen, memberId]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    try {
      setSavingEdit(true);
      await api.updateMember(memberId, editForm);
      setIsEditing(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to update member');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!isOpen) return null;

  const member = data?.member;
  const currentSub = data?.currentMembership;
  const pendingBalance = currentSub
    ? Math.max(0, (currentSub.amountDue || 0) - (currentSub.amountPaid || 0))
    : 0;

  // Build unified chronological activity history
  const activityList: Array<{
    date: Date;
    type: 'REGISTRATION' | 'RENEWAL' | 'PAYMENT' | 'ATTENDANCE' | 'FREEZE';
    title: string;
    description: string;
    payment?: any;
  }> = [];

  if (member) {
    activityList.push({
      date: new Date(member.joinDate || member.createdAt),
      type: 'REGISTRATION',
      title: 'Member Registered',
      description: `Registered with ID ${member.memberId}`,
    });
  }

  if (data?.memberships) {
    data.memberships.forEach((sub) => {
      activityList.push({
        date: new Date(sub.createdAt),
        type: 'RENEWAL',
        title: `Plan Assigned: ${(sub.plan as any)?.name || 'Membership'}`,
        description: `Valid from ${formatDateIN(sub.startDate)} to ${formatDateIN(sub.expiryDate)}`,
      });

      if (sub.renewalHistory) {
        sub.renewalHistory.forEach((r) => {
          activityList.push({
            date: new Date(r.renewedAt),
            type: 'RENEWAL',
            title: 'Membership Renewed',
            description: `Extended to ${formatDateIN(r.newExpiryDate)} (Paid: ${formatINR(r.amountPaid)})`,
          });
        });
      }

      if (sub.freezeHistory) {
        sub.freezeHistory.forEach((f) => {
          activityList.push({
            date: new Date(f.fromDate),
            type: 'FREEZE',
            title: 'Membership Frozen',
            description: `Frozen until ${formatDateIN(f.toDate)} (${f.reason})`,
          });
        });
      }
    });
  }

  if (data?.payments) {
    data.payments.forEach((p) => {
      activityList.push({
        date: new Date(p.paymentDate || p.createdAt),
        type: 'PAYMENT',
        title: `Payment Received: ${formatINR(p.amount)}`,
        description: `Receipt #${p.receiptNumber} via ${p.paymentMethod} (${p.status})`,
        payment: p,
      });
    });
  }

  if (data?.attendance) {
    data.attendance.slice(0, 10).forEach((att) => {
      activityList.push({
        date: new Date(att.checkInTime),
        type: 'ATTENDANCE',
        title: 'Gym Visit Check-In',
        description: att.checkOutTime
          ? `Check-out at ${new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${formatAttendanceDuration(att.checkInTime, att.checkOutTime, att.durationMinutes)})`
          : 'Active check-in (no check-out recorded)',
      });
    });
  }

  // Sort chronological descending
  activityList.sort((a, b) => b.date.getTime() - a.date.getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-green-50 text-[#15803D] border border-green-200">
            Active
          </span>
        );
      case 'FROZEN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-[#4B5563] border border-gray-200">
            Frozen
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-red-50 text-[#B91C1C] border border-red-200">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-6 sm:my-8">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Member Profile & Dossier</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-sm text-[#6B7280]">
            Loading member profile...
          </div>
        ) : error || !member ? (
          <div className="p-8 text-center text-sm text-red-600">
            {error || 'Member not found'}
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Top Identity Banner with Gym Picture */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Gym Background with contrast overlay */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('/gym-hero.png')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/65 to-slate-950/35" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="relative group shrink-0">
                  <Avatar
                    src={member.photoUrl}
                    name={member.fullName}
                    sizeClassName="w-16 h-16"
                    shape="rounded-2xl"
                    className="border-2 border-white/60 shadow-md shrink-0"
                    badgeColor="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl border-white/40"
                  />

                  <label
                    className={`absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer transition-opacity ${
                      uploadingPhoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title="Change Member Photo"
                  >
                    {uploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span className="text-[9px] font-semibold mt-0.5">Edit</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>

                <div className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-black text-white tracking-tight drop-shadow-md">{member.fullName}</h3>
                    {getStatusBadge(member.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white font-medium mt-1">
                    <span className="font-mono font-bold text-cyan-300 tracking-wider">ID: {member.memberId}</span>
                    <span className="text-white/60">•</span>
                    <span className="text-white">{member.phone}</span>

                    {member.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentSub) {
                            const diffDays = Math.ceil(
                              (new Date(currentSub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                            );
                            sendWhatsAppReminder({
                              name: member.fullName,
                              phone: member.phone,
                              planName: (currentSub.plan as any)?.name,
                              expiryDate: currentSub.expiryDate,
                              daysRemaining: diffDays,
                            });
                          } else {
                            openWhatsApp(
                              member.phone,
                              getWelcomeMessage(member.fullName, member.memberId)
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-colors shadow-xs"
                        title="Chat on WhatsApp"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    {member.email && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">{member.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Aesthetic Micro-Cards */}
              <div className="relative z-10 flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-white/90 hover:bg-white border border-white/50 hover:border-white transition-all active:scale-95 shadow-sm"
                >
                  <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100">
                    <Edit2 className="w-3 h-3 shrink-0" />
                  </div>
                  <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
                </button>

                {onOpenCardModal && (
                  <button
                    type="button"
                    onClick={() => onOpenCardModal(member)}
                    className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-white/90 hover:bg-white border border-white/50 hover:border-white transition-all active:scale-95 shadow-sm"
                  >
                    <div className="w-5.5 h-5.5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 transition-colors group-hover:bg-indigo-100">
                      <Printer className="w-3 h-3 shrink-0" />
                    </div>
                    <span>Print Card</span>
                  </button>
                )}

                {currentSub && onOpenRenewModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRenewModal(currentSub);
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md"
                  >
                    <div className="w-4.5 h-4.5 rounded bg-white/20 flex items-center justify-center shrink-0">
                      <CreditCard className="w-3 h-3 text-white" />
                    </div>
                    <span>Renew</span>
                  </button>
                )}

                {currentSub && currentSub.status === 'ACTIVE' && onOpenFreezeModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFreezeModal(currentSub);
                      onClose();
                    }}
                    className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-white/90 hover:bg-white border border-white/50 hover:border-white transition-all active:scale-95 shadow-sm"
                    title="Freeze Membership"
                  >
                    <div className="w-5.5 h-5.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100">
                      <Snowflake className="w-3 h-3 shrink-0" />
                    </div>
                    <span>Freeze</span>
                  </button>
                )}

                {currentSub && currentSub.status === 'FROZEN' && (
                  <button
                    type="button"
                    disabled={thawing}
                    onClick={() => handleThaw(currentSub._id)}
                    className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-emerald-800 bg-white/90 hover:bg-white border border-emerald-300 hover:border-emerald-400 transition-all active:scale-95 shadow-sm"
                    title="Unfreeze Membership"
                  >
                    <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                      <Snowflake className={`w-3 h-3 shrink-0 ${thawing ? 'animate-spin' : ''}`} />
                    </div>
                    <span>{thawing ? 'Unfreezing...' : 'Unfreeze'}</span>
                  </button>
                )}

                {currentSub && pendingBalance > 0 && onOpenCollectDue && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCollectDue({
                        membershipId: currentSub._id,
                        member: member,
                        planName: (currentSub.plan as any)?.name || 'Membership Plan',
                        amountDue: currentSub.amountDue,
                        amountPaid: currentSub.amountPaid,
                        amountPending: pendingBalance,
                      });
                      onClose();
                    }}
                    className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-white/90 hover:bg-white border border-white/50 hover:border-white transition-all active:scale-95 shadow-sm"
                    title="Collect Outstanding Due"
                  >
                    <div className="w-5.5 h-5.5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 transition-colors group-hover:bg-amber-100">
                      <Receipt className="w-3 h-3 shrink-0" />
                    </div>
                    <span>Collect Due (₹{pendingBalance})</span>
                  </button>
                )}

                {currentSub && pendingBalance > 0 && member.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      sendWhatsAppDueReminder({
                        name: member.fullName,
                        phone: member.phone,
                        planName: (currentSub.plan as any)?.name,
                        amountDue: currentSub.amountDue,
                        amountPaid: currentSub.amountPaid,
                        amountPending: pendingBalance,
                      });
                    }}
                    className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-white/90 hover:bg-white border border-white/50 hover:border-white transition-all active:scale-95 shadow-sm"
                    title="Send WhatsApp Due Reminder"
                  >
                    <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </div>
                    <span>Due Reminder</span>
                  </button>
                )}

                {isAdmin && (
                  <>
                    {member.isArchived || member.status === 'ARCHIVED' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!member._id) return;
                          try {
                            await api.restoreMember(member._id);
                            window.dispatchEvent(new CustomEvent('fitcore:data-changed'));
                            fetchProfile();
                          } catch (err: any) {
                            alert(err.message || 'Failed to restore member');
                          }
                        }}
                        className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-emerald-800 bg-white/90 hover:bg-white border border-emerald-300 hover:border-emerald-400 transition-all active:scale-95 shadow-sm"
                        title="Restore Member to Active Directory"
                      >
                        <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 transition-colors group-hover:bg-emerald-100">
                          <RotateCcw className="w-3 h-3 shrink-0" />
                        </div>
                        <span>Restore</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!member._id) return;
                          try {
                            await api.archiveMember(member._id);
                            window.dispatchEvent(new CustomEvent('fitcore:data-changed'));
                            onClose();
                          } catch (err: any) {
                            alert(err.message || 'Failed to archive member');
                          }
                        }}
                        className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-white/90 hover:bg-white border border-white/50 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
                        title="Archive Member (Move to Archived Directory)"
                      >
                        <div className="w-5.5 h-5.5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 transition-colors group-hover:bg-slate-200">
                          <Archive className="w-3 h-3 shrink-0" />
                        </div>
                        <span>Archive</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-lg text-xs font-semibold text-rose-700 bg-white/90 hover:bg-white border border-white/50 hover:border-rose-200 transition-all active:scale-95 shadow-sm"
                      title="Permanently Delete Member from Database"
                    >
                      <div className="w-5.5 h-5.5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 transition-colors group-hover:bg-rose-100">
                        <Trash2 className="w-3 h-3 shrink-0" />
                      </div>
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Edit Form Inline (if editing) */}
            {isEditing && (
              <form
                onSubmit={handleSaveEdit}
                className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3"
              >
                <div className="font-semibold text-xs text-blue-900">Edit Member Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {/* Section 1: Personal Information */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                  1. Personal Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Full Name</span>
                    <p className="font-bold text-slate-900 mt-0.5">{member.fullName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Member ID</span>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{member.memberId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Phone</span>
                    <p className="font-semibold text-slate-800 font-mono mt-0.5">{member.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Email</span>
                    <p className="font-medium text-slate-700 mt-0.5 truncate">{member.email || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Date of Birth</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {member.dob ? new Date(member.dob).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Gym Location</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      Sagar Fitness Gym
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Registration Date</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {new Date(member.joinDate || member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Emergency Contact</span>
                    <p className="font-semibold text-slate-800 mt-0.5 truncate">
                      {member.emergencyContact?.name
                        ? `${member.emergencyContact.name} (${member.emergencyContact.phone || ''})`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Membership Information */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                  2. Membership Information
                </h4>
                {currentSub ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Current Plan</span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {currentSub.plan ? (currentSub.plan as any).name : 'Standard Pass'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Start Date</span>
                      <p className="font-semibold font-mono text-slate-800 mt-0.5">
                        {new Date(currentSub.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Expiration Date</span>
                      <p className="font-semibold font-mono text-slate-800 mt-0.5">
                        {new Date(currentSub.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Status</span>
                      <p className="mt-1">{getStatusBadge(currentSub.status)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Amount Paid</span>
                      <p className="font-bold font-mono text-emerald-700 mt-0.5">
                        {formatINR(currentSub.amountPaid)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Remaining Balance</span>
                      <p
                        className={`font-bold font-mono mt-0.5 ${
                          pendingBalance > 0 ? 'text-amber-700' : 'text-slate-700'
                        }`}
                      >
                        {pendingBalance > 0 ? `${formatINR(pendingBalance)} (Unpaid)` : '₹0 (Paid in Full)'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 mt-3">
                    No active membership assigned currently. Click Renew Membership to assign a plan.
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Diet, Calories & Fitness Profile */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-lime-100 text-lime-800 flex items-center justify-center font-bold">
                      <Utensils className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      3. Diet, Calories & Fitness Profile
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {dietProfile?.activePlan ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsReportModalOpen(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Diet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDietPlanToEdit(dietProfile.activePlan);
                            setIsDietModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-lime-700 hover:bg-lime-800 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Plan</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDietPlanToEdit(null);
                          setIsDietModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Assign Diet Plan</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsProgressModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                    >
                      <Scale className="w-3 h-3" />
                      <span>Log Weight</span>
                    </button>
                  </div>
                </div>

                {dietProfile?.activePlan ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          {dietProfile.activePlan.name}
                        </span>
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-lime-100 text-lime-900 border border-lime-300">
                          {dietProfile.activePlan.fitnessGoal.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Valid: {formatDateIN(dietProfile.activePlan.startDate)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg text-center">
                        <span className="text-[10px] font-bold text-amber-800 block">Daily Target</span>
                        <span className="font-black text-amber-900 font-mono text-sm">
                          {dietProfile.activePlan.dailyCalories || dietProfile.activePlan.targetCalories} kcal
                        </span>
                      </div>
                      <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-center">
                        <span className="text-[10px] font-bold text-blue-800 block">Protein</span>
                        <span className="font-black text-blue-900 font-mono text-sm">
                          {dietProfile.activePlan.dailyProtein || dietProfile.activePlan.targetProtein}g
                        </span>
                      </div>
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                        <span className="text-[10px] font-bold text-emerald-800 block">Carbs</span>
                        <span className="font-black text-emerald-900 font-mono text-sm">
                          {dietProfile.activePlan.dailyCarbs || dietProfile.activePlan.targetCarbs}g
                        </span>
                      </div>
                      <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-center">
                        <span className="text-[10px] font-bold text-rose-800 block">Fats</span>
                        <span className="font-black text-rose-900 font-mono text-sm">
                          {dietProfile.activePlan.dailyFat || dietProfile.activePlan.targetFat}g
                        </span>
                      </div>
                      <div className="p-2 bg-cyan-50 border border-cyan-100 rounded-lg text-center">
                        <span className="text-[10px] font-bold text-cyan-800 block">Hydration</span>
                        <span className="font-black text-cyan-900 font-mono text-sm">
                          {dietProfile.activePlan.waterIntakeLiters || 3.5}L
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
                    No active diet protocol assigned to this member yet. Click "Assign Diet Plan" above to create one.
                  </div>
                )}

                {/* Latest Weight & BMI Strip */}
                {dietProfile?.latestProgress && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <Scale className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="text-slate-500 text-[11px]">Latest Check-In:</span>{' '}
                        <strong className="text-slate-900 font-bold font-mono">
                          {dietProfile.latestProgress.weight} kg
                        </strong>{' '}
                        <span className="text-[10px] text-slate-400">
                          ({formatDateIN(dietProfile.latestProgress.date)})
                        </span>
                      </div>
                    </div>

                    {dietProfile.latestProgress.bmi && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[11px]">BMI:</span>
                        <span className="font-mono font-bold text-slate-800 px-2 py-0.5 bg-white border border-slate-200 rounded">
                          {dietProfile.latestProgress.bmi}
                        </span>
                        {dietProfile.bmiData?.category && (
                          <span className="text-[10px] font-semibold text-slate-600">
                            ({dietProfile.bmiData.category})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Activity History */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                  4. Activity History
                </h4>
                {activityList.length === 0 ? (
                  <p className="text-xs text-slate-400 mt-3">No activity records recorded yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Date & Time</th>
                          <th className="px-4 py-3">Event</th>
                          <th className="px-4 py-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activityList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                              {item.date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}{' '}
                              <span className="text-slate-400">
                                {item.date.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {item.title}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="flex items-center justify-between gap-2">
                                <span>{item.description}</span>
                                {item.type === 'PAYMENT' && item.payment && onOpenReceipt && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenReceipt(item.payment)}
                                    className="group inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2 rounded-md text-[11px] font-semibold text-slate-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs hover:shadow-xs shrink-0"
                                    title="View & Print Official Bill"
                                  >
                                    <div className="w-4.5 h-4.5 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 transition-colors group-hover:bg-blue-100">
                                      <Receipt className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <span>Bill</span>
                                  </button>
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
          </div>
        )}
      </div>

      {/* Delete Member Confirmation Modal (Rendered at top-level outside overflow-hidden) */}
      {showDeleteModal && data?.member && (
        <DeleteMemberModal
          isOpen={showDeleteModal}
          member={{
            _id: data.member._id,
            memberId: data.member.memberId,
            fullName: data.member.fullName,
          }}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            onMemberDeleted?.();
            onClose();
          }}
        />
      )}

      {/* Diet & Fitness Modals */}
      {isDietModalOpen && data?.member && (
        <DietPlanModal
          isOpen={isDietModalOpen}
          onClose={() => setIsDietModalOpen(false)}
          onSuccess={() => {
            fetchProfile();
          }}
          planToEdit={dietPlanToEdit}
          defaultMember={data.member}
        />
      )}

      {isProgressModalOpen && data?.member && (
        <WeightProgressModal
          isOpen={isProgressModalOpen}
          onClose={() => setIsProgressModalOpen(false)}
          onSuccess={() => {
            fetchProfile();
          }}
          defaultMember={data.member}
        />
      )}

      {isReportModalOpen && dietProfile?.activePlan && (
        <DietReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          plan={dietProfile.activePlan}
          recentProgress={dietProfile.progressHistory || []}
        />
      )}
    </div>
  );
};
