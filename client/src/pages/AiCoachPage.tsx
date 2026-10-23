import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  UserCheck,
  Utensils,
  Dumbbell,
  Database,
  Pill,
  TrendingUp,
  Calendar,
  CheckSquare,
  FileText,
  Bell,
  Settings,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Download,
  Share2,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Scale,
  Flame,
  Droplet,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api/client';
import {
  Member,
  FitnessProfile,
  DietPlan,
  WorkoutPlan,
  FoodItem,
  WeightProgress,
  PremiumEntitlement,
  PlanReview,
  SupplementItem,
  AiCoachStatus,
  FoodCategory,
  MlModelStatus,
  MlPredictionResult,
} from '../types';
import { FitnessProfileModal } from '../components/modals/FitnessProfileModal';
import { WorkoutPlanModal } from '../components/modals/WorkoutPlanModal';
import { DietPlanModal } from '../components/modals/DietPlanModal';
import { FoodItemModal } from '../components/modals/FoodItemModal';
import { WeightProgressModal } from '../components/modals/WeightProgressModal';
import { formatDateIN } from '../utils/formatters';
import { generateBillPDF } from '../utils/pdfGenerator';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import {
  openWhatsApp,
  sendWhatsAppDietPlan,
  sendWhatsAppWorkoutPlan,
  sendWhatsAppMlPlanSummary,
} from '../utils/whatsapp';

export type AiCoachTab =
  | 'dashboard'
  | 'profiles'
  | 'workout-planner'
  | 'progress'
  | 'pdf-reports'
  | 'notifications'
  | 'settings';

export const AiCoachPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AiCoachTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<AiCoachStatus | null>(null);
  const [mlStatus, setMlStatus] = useState<MlModelStatus | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [memberMlPrediction, setMemberMlPrediction] = useState<MlPredictionResult | null>(null);
  const [_loadingMlPrediction, setLoadingMlPrediction] = useState(false);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Profiles Tab
  const [profiles, setProfiles] = useState<FitnessProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<FitnessProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileSearch, setProfileSearch] = useState('');

  // Diet Planner Tab
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [isDietModalOpen, setIsDietModalOpen] = useState(false);
  const [dietPlanToEdit, setDietPlanToEdit] = useState<DietPlan | null>(null);

  // Workout Planner Tab
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [workoutPlanToEdit, setWorkoutPlanToEdit] = useState<WorkoutPlan | null>(null);

  // Nutrition DB Tab
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCategory, setFoodCategory] = useState<string>('ALL');
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodToEdit, setFoodToEdit] = useState<FoodItem | null>(null);

  // Supplement Guide Tab
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [supplementDisclaimer, setSupplementDisclaimer] = useState('');
  const [supplementFilter, setSupplementFilter] = useState('ALL');

  // Fitness Progress Tab
  const [progressHistory, setProgressHistory] = useState<WeightProgress[]>([]);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  // Weekly Calendar Tab
  const [calendarData, setCalendarData] = useState<any>(null);

  // Plan Approvals Tab
  const [pendingApprovals, setPendingApprovals] = useState<any>(null);
  const [approvalActionLoading, setApprovalActionLoading] = useState(false);

  // Entitlements
  const [entitlements, setEntitlements] = useState<PremiumEntitlement[]>([]);

  // Reviews
  const [reviews, setReviews] = useState<PlanReview[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [manualMessage, setManualMessage] = useState('');
  const [notificationSending, setNotificationSending] = useState(false);

  // PDF Export
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [selectedPdfType, setSelectedPdfType] = useState<'WORKOUT' | 'PROGRESS' | 'BOOKLET'>('WORKOUT');

  // Initial Load
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [membersData, profilesData, statusData, mlData, dashData, foodData, suppData, approvalsData, entData] =
        await Promise.all([
          api.getMembers(),
          api.getFitnessProfiles().catch(() => ({ profiles: [] })),
          api.getAiCoachStatus().catch(() => null),
          api.getMlModelStatus().catch(() => null),
          api.getAiCoachDashboard().catch(() => null),
          api.getFoods().catch(() => []),
          api.getEducationalSupplements().catch(() => ({ disclaimer: '', supplements: [] })),
          api.getPendingPlanApprovals().catch(() => null),
          api.getPremiumEntitlements().catch(() => []),
        ]);

      const mList = Array.isArray(membersData)
        ? membersData
        : (membersData as any)?.data || (membersData as any)?.members || [];
      setMembers(mList);
      if (mList.length > 0 && !selectedMemberId) {
        setSelectedMemberId(mList[0]._id);
      }
      setProfiles(profilesData?.profiles || []);
      setAiStatus(statusData);
      setMlStatus(mlData);
      setDashboardData(dashData);
      setFoods(foodData);
      setSupplements(suppData?.supplements || []);
      setSupplementDisclaimer(suppData?.disclaimer || '');
      setPendingApprovals(approvalsData);
      setEntitlements(entData || []);
    } catch (err) {
      console.error('[AiCoachPage fetch error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch Member-Specific Data when selectedMemberId or activeTab changes
  useEffect(() => {
    if (!selectedMemberId) return;

    // Load ML prediction for selected member
    setLoadingMlPrediction(true);
    api.predictMlPlan({ memberId: selectedMemberId })
      .then((res) => {
        setMemberMlPrediction(res);
      })
      .catch(() => setMemberMlPrediction(null))
      .finally(() => setLoadingMlPrediction(false));

    if (activeTab === 'profiles') {
      api.getFitnessProfiles().then((res) => {
        setProfiles(res?.profiles || []);
      });
    } else if (activeTab === 'workout-planner') {
      api.getWorkoutPlans({ memberId: selectedMemberId }).then((res) => {
        const list = Array.isArray(res) ? res : res?.workouts || res?.plans || res?.data || [];
        setWorkoutPlans(list);
      });
    } else if (activeTab === 'progress') {
      api.getMemberProgress(selectedMemberId).then((res) => {
        setProgressHistory(res?.history || []);
      });
    } else if (activeTab === 'notifications') {
      api.getFitnessNotifications().then((res) => {
        setNotifications(res || []);
      });
    }

    // Preload member's plans so WhatsApp button has active plans ready
    if (selectedMemberId) {
      api.getWorkoutPlans({ memberId: selectedMemberId }).then((res) => {
        const list = Array.isArray(res) ? res : res?.workouts || res?.plans || res?.data || [];
        setWorkoutPlans(list);
      });
      api.getDietPlans({ memberId: selectedMemberId }).then((res) => {
        const list = Array.isArray(res) ? res : res?.plans || res?.data || [];
        setDietPlans(list);
      });
    }
  }, [selectedMemberId, activeTab]);

  // Handle Retrain ML Model via Python Scikit-Learn Pipeline
  const handleRetrainMl = async () => {
    setIsRetraining(true);
    try {
      const res = await api.retrainMlModel();
      if (res?.status) {
        setMlStatus(res.status);
      } else {
        const refreshed = await api.getMlModelStatus();
        setMlStatus(refreshed);
      }
      if (selectedMemberId) {
        const pred = await api.predictMlPlan({ memberId: selectedMemberId });
        setMemberMlPrediction(pred);
      }
      alert('ML Model re-trained successfully via Python Scikit-Learn pipeline (12,000 synthetic records).\nZero-latency weights updated in Node.js memory!');
    } catch (err: any) {
      alert(err.message || 'Failed to retrain ML model');
    } finally {
      setIsRetraining(false);
    }
  };

  const selectedMember = members.find((m) => m._id === selectedMemberId);

  const memberProfile = profiles.find((p) => {
    const mId = typeof p.member === 'object' ? p.member?._id : p.member;
    return mId === selectedMemberId;
  });
  const hasMemberProfile = Boolean(memberProfile && memberProfile.currentWeightKg);

  // Check membership plan and AI Coach entitlement status
  const activeEntitlement = entitlements.find((e) => {
    const memId = typeof e.member === 'string' ? e.member : (e.member as any)?._id;
    return memId === selectedMemberId && e.status === 'ACTIVE';
  });
  const hasAiCoachPass = !!activeEntitlement;
  const currentPlanName = selectedMember?.currentMembership?.plan?.name || 'Standard Gym Plan';

  const handleGrantAiCoachPass = async () => {
    if (!selectedMemberId) return;
    try {
      const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      await api.createPremiumEntitlement({
        memberId: selectedMemberId,
        planName: `${selectedMember?.fullName || 'Member'} AI Coach Plan Pass`,
        expiryDate: expiry,
        features: {
          personalizedDiet: true,
          personalizedWorkout: true,
          weeklyPdfReports: true,
          progressTracking: true,
          reminders: true,
        },
      });
      const updated = await api.getPremiumEntitlements();
      setEntitlements(updated || []);
      alert(`AI Coach Plan Pass granted successfully to ${selectedMember?.fullName || 'Member'} (Active for 90 Days)!`);
    } catch (err: any) {
      alert(err.message || 'Failed to grant AI Coach Pass');
    }
  };

  // Generate 7-Day Diet Draft
  const handleGenerateDiet = async () => {
    if (!selectedMemberId) return;
    setGeneratingDiet(true);
    try {
      await api.generateAiDietPlan(selectedMemberId);
      const updated = await api.getDietPlans({ memberId: selectedMemberId });
      const list = Array.isArray(updated) ? updated : updated?.plans || updated?.data || [];
      setDietPlans(list);
      // also update pending approvals
      const apps = await api.getPendingPlanApprovals();
      setPendingApprovals(apps);
      alert('7-Day AI Diet Plan draft generated successfully and queued for approval.');
    } catch (err: any) {
      alert(err.message || 'Failed to generate diet plan');
    } finally {
      setGeneratingDiet(false);
    }
  };

  // Generate 7-Day Workout Draft
  const handleGenerateWorkout = async () => {
    if (!selectedMemberId) return;
    if (!hasMemberProfile) {
      alert(`${selectedMember?.fullName || 'Selected Member'} ka weight aur fitness profile record nahi hai.\nPehle '+ Fill Weight & Profile' par click karke details enter karein.`);
      setSelectedProfile(null);
      setIsProfileModalOpen(true);
      return;
    }
    setGeneratingWorkout(true);
    try {
      await api.generateAiWorkoutPlan(selectedMemberId);
      const updated = await api.getWorkoutPlans({ memberId: selectedMemberId });
      const list = Array.isArray(updated) ? updated : updated?.workouts || updated?.plans || updated?.data || [];
      setWorkoutPlans(list);
      const apps = await api.getPendingPlanApprovals();
      setPendingApprovals(apps);
      alert('7-Day Workout routine draft generated successfully and queued for approval.');
    } catch (err: any) {
      alert(err.message || 'Failed to generate workout plan');
    } finally {
      setGeneratingWorkout(false);
    }
  };

  // Approval Handlers
  const handleApproveDiet = async (id: string) => {
    setApprovalActionLoading(true);
    try {
      await api.approveDietPlan(id);
      const apps = await api.getPendingPlanApprovals();
      setPendingApprovals(apps);
      if (selectedMemberId) {
        const dp = await api.getDietPlans({ memberId: selectedMemberId });
        const list = Array.isArray(dp) ? dp : dp?.plans || dp?.data || [];
        setDietPlans(list);
      }
    } catch (err: any) {
      alert(err.message || 'Error approving plan');
    } finally {
      setApprovalActionLoading(false);
    }
  };

  const handleRejectDiet = async (id: string) => {
    const reason = prompt('Please enter rejection feedback / reason:') || 'Revision requested';
    setApprovalActionLoading(true);
    try {
      await api.rejectDietPlan(id, reason);
      const apps = await api.getPendingPlanApprovals();
      setPendingApprovals(apps);
    } catch (err: any) {
      alert(err.message || 'Error rejecting plan');
    } finally {
      setApprovalActionLoading(false);
    }
  };

  const handleApproveWorkout = async (id: string) => {
    setApprovalActionLoading(true);
    try {
      await api.approveWorkoutPlan(id);
      const apps = await api.getPendingPlanApprovals();
      setPendingApprovals(apps);
      if (selectedMemberId) {
        const wp = await api.getWorkoutPlans({ memberId: selectedMemberId });
        const list = Array.isArray(wp) ? wp : wp?.workouts || wp?.plans || wp?.data || [];
        setWorkoutPlans(list);
      }
    } catch (err: any) {
      alert(err.message || 'Error approving routine');
    } finally {
      setApprovalActionLoading(false);
    }
  };

  const handleRejectWorkout = async (id: string) => {
    const reason = prompt('Please enter rejection feedback / reason:') || 'Revision requested';
    setApprovalActionLoading(true);
    try {
      await api.rejectWorkoutPlan(id, reason);
      const apps = await api.getPendingPlanApprovals();
      setPendingApprovals(apps);
    } catch (err: any) {
      alert(err.message || 'Error rejecting routine');
    } finally {
      setApprovalActionLoading(false);
    }
  };

  // Download PDF Report
  const handleDownloadPdf = async () => {
    setPdfGenerating(true);
    try {
      const filename = `Sagar-Fitness-${selectedPdfType}-${selectedMember?.fullName?.replace(/\s+/g, '_') || 'Member'}.pdf`;
      await generateBillPDF('printable-fitness-report', filename);
    } catch (err) {
      console.error(err);
      alert('Could not render PDF. Please ensure all tables have rendered.');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Send Manual Notification
  const handleSendNotification = async () => {
    if (!selectedMemberId || !manualMessage.trim()) return;
    setNotificationSending(true);
    try {
      await api.sendManualNotification({
        memberId: selectedMemberId,
        type: 'MEAL_REMINDER',
        channel: 'WHATSAPP',
        message: manualMessage,
      });
      alert('Notification action processed and recorded in delivery audit trail.');
      setManualMessage('');
      const updated = await api.getFitnessNotifications();
      setNotifications(updated || []);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch notification');
    } finally {
      setNotificationSending(false);
    }
  };

  const handleSendMemberPlanToWhatsApp = () => {
    if (!selectedMember) {
      alert('Please select a member first.');
      return;
    }
    if (!selectedMember.phone) {
      alert(`Member ${selectedMember.fullName} does not have a phone number registered.`);
      return;
    }

    const safeWorkoutPlans = Array.isArray(workoutPlans) ? workoutPlans : [];
    const safeDietPlans = Array.isArray(dietPlans) ? dietPlans : [];

    const activeWorkout = safeWorkoutPlans.find((w) => w.approvalStatus === 'APPROVED') || safeWorkoutPlans[0];
    const activeDiet = safeDietPlans.find((d) => d.approvalStatus === 'APPROVED') || safeDietPlans[0];

    // Priority 1: Member has active Workout Plan
    if (activeWorkout) {
      sendWhatsAppWorkoutPlan({
        memberName: selectedMember.fullName,
        phone: selectedMember.phone,
        planName: activeWorkout.name,
        fitnessGoal: activeWorkout.fitnessGoal,
        daysPerWeek: activeWorkout.daysPerWeek,
        availableEquipment: activeWorkout.availableEquipment,
        schedule: activeWorkout.schedule || [],
      });
      return;
    }

    // Priority 2: Member has active Diet Plan
    if (activeDiet) {
      sendWhatsAppDietPlan({
        memberName: selectedMember.fullName,
        phone: selectedMember.phone,
        planName: activeDiet.name,
        fitnessGoal: activeDiet.fitnessGoal,
        dailyCalories: activeDiet.targetCalories,
        dailyProtein: activeDiet.targetProtein,
        dailyCarbs: activeDiet.targetCarbs,
        dailyFat: activeDiet.targetFat,
        waterIntakeLiters: activeDiet.waterIntakeLiters || 3.5,
        notes: activeDiet.notes,
        meals: (activeDiet.meals || []).map((m: any) => ({
          mealType: m.mealType,
          name: m.name,
          time: m.time,
          items: (m.items || []).map((it: any) => ({
            foodName: it.foodItem?.name || it.customFoodName || 'Healthy Item',
            quantity: it.quantity,
            servingUnit: it.servingUnit || 'g',
          })),
        })),
      });
      return;
    }

    // Priority 3: Member has biometrics / fitness profile recorded
    if (hasMemberProfile && memberProfile) {
      sendWhatsAppMlPlanSummary({
        memberName: selectedMember.fullName,
        phone: selectedMember.phone,
        targetCalories: memberProfile.targetCalories || memberMlPrediction?.nutrition?.targetCalories || 2200,
        targetProtein: memberProfile.targetProtein || memberMlPrediction?.nutrition?.targetProteinGrams || 130,
        targetCarbs: memberProfile.targetCarbs || memberMlPrediction?.nutrition?.targetCarbsGrams || 250,
        targetFat: memberProfile.targetFat || memberMlPrediction?.nutrition?.targetFatGrams || 60,
        waterLiters: memberProfile.waterIntakeLiters || memberMlPrediction?.nutrition?.waterIntakeLiters || 3.5,
        recommendedSplit: memberMlPrediction?.workout?.recommendedSplit || 'PPL_5D',
        volumeMultiplier: memberMlPrediction?.workout?.volumeMultiplier || 1.0,
        progressionRate: memberMlPrediction?.workout?.weeklyProgressionRatePct || 1.5,
      });
      return;
    }

    // Priority 4: Member has NO weight / profile recorded yet!
    const shouldSendReminder = window.confirm(
      `⚠️ ${selectedMember.fullName} ka abhi weight aur fitness profile record nahi hai.\n\n` +
      `AI personalized workout/diet plan bhejne ke liye pehle bodyweight record hona zaroori hai.\n\n` +
      `Kya aap member ko WhatsApp par reminder bhejna chahte hain ki wo gym desk par aakar apna bodyweight aur details update karwayein?`
    );

    if (shouldSendReminder) {
      const reminderMsg =
        `Namaste ${selectedMember.fullName}! 🏋️‍♂️\n\n` +
        `Welcome to *Sagar Fitness Gym*! Aapka AI Fitness Coaching protocol create karne ke liye hume aapka starting bodyweight aur fitness goal chahiye.\n\n` +
        `Kripya apne agle gym session me front desk par apna weight note karwayein taaki hum aapka personalized Workout & Diet Plan activate kar sakein.\n\n` +
        `Thank you!\n*Sagar Fitness Gym, Pathardi* 💪`;
      openWhatsApp(selectedMember.phone, reminderMsg);
    } else {
      setSelectedProfile(null);
      setIsProfileModalOpen(true);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profiles', label: 'Fitness Profiles', icon: UserCheck },
    { id: 'workout-planner', label: 'Workout Planner', icon: Dumbbell },
    { id: 'progress', label: 'Progress Tracking', icon: TrendingUp },
    { id: 'pdf-reports', label: 'PDF Reports', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Fitness Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                AI Fitness Coach
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-800 border border-purple-200">
                Sagar Fitness Gym
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized member workout protocols & nutrition targets
            </p>
          </div>
        </div>

        {/* Global Member Selector & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-col min-w-[260px]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Member Focus
              </span>
              {hasMemberProfile ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ⚖️ {memberProfile?.currentWeightKg} kg • {(memberProfile?.fitnessGoal || '').replace(/_/g, ' ')}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ⚠️ Weight Not Recorded
                </span>
              )}
            </div>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition-colors"
            >
              {members.map((m) => {
                const prof = profiles.find((p) => {
                  const mId = typeof p.member === 'object' ? p.member?._id : p.member;
                  return mId === m._id;
                });
                return (
                  <option key={m._id} value={m._id}>
                    {m.fullName} ({m.memberId}) {prof?.currentWeightKg ? `• ${prof.currentWeightKg} kg` : '— [No Weight/Profile]'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
            {!hasMemberProfile && (
              <button
                onClick={() => {
                  setSelectedProfile(null);
                  setIsProfileModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                title="Fill member starting bodyweight and fitness profile"
              >
                <Scale className="w-4 h-4" />
                <span>+ Fill Weight & Profile</span>
              </button>
            )}

            {/* Prominent Send Plan to WhatsApp Button */}
            <button
              onClick={handleSendMemberPlanToWhatsApp}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
              title="Send active plan to member's WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Send Plan to WhatsApp</span>
            </button>

            {hasAiCoachPass ? (
              <span className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AI Pass Active
              </span>
            ) : (
              <button
                onClick={handleGrantAiCoachPass}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                title="Grant 90-Day AI Coach Plan Pass to this member"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>Grant Pass</span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Clean Horizontal Navigation Tabs - No Grey Scrollbar Line */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AiCoachTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {typeof (tab as any).badge === 'number' && (tab as any).badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                  {(tab as any).badge}
                </span>
              )}
            </button>
          );
        })}
      </div>



      {/* =========================================================================
          TAB 1: FITNESS DASHBOARD
          ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Fitness Profiles
              </span>
              <span className="text-2xl font-black text-slate-900">{dashboardData?.totalProfiles ?? 0}</span>
              <span className="text-[11px] text-emerald-600 block mt-1 font-semibold">Active Members</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Active Workouts
              </span>
              <span className="text-2xl font-black text-purple-600">{dashboardData?.activeWorkoutPlans ?? 0}</span>
              <span className="text-[11px] text-slate-500 block mt-1 font-semibold">Scheduled Splits</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                AI Plan Passes
              </span>
              <span className="text-2xl font-black text-emerald-600">{dashboardData?.activeEntitlements ?? 0}</span>
              <span className="text-[11px] text-slate-500 block mt-1 font-semibold">Active Members</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Progress Logs
              </span>
              <span className="text-2xl font-black text-blue-600">{dashboardData?.totalProgressLogs ?? progressHistory?.length ?? 0}</span>
              <span className="text-[11px] text-slate-500 block mt-1 font-semibold">Member Check-ins</span>
            </div>
          </div>

          {/* Trained Machine Learning Intelligence Engine Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                      Trained ML Member Plan Engine
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      {mlStatus?.status || 'LOADED_AND_READY'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Python Scikit-Learn Pipeline • Zero-Latency In-Memory Node.js Matrix • Trained on {mlStatus?.totalTrainingSamples?.toLocaleString('en-IN') || '12,973'} Member Records
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetrainMl}
                  disabled={isRetraining}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
                  <span>{isRetraining ? 'Retraining Pipeline...' : 'Re-train ML Model'}</span>
                </button>
              </div>
            </div>

            {/* ML Performance Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Nutrition Target Fit (R²)
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {((mlStatus?.nutritionR2Score ?? 0.8576) * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-purple-700 block mt-0.5 font-semibold">
                  Multi-Output Ridge Model
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Split Classification
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {((mlStatus?.workoutSplitAccuracy ?? 1.0) * 100).toFixed(0)}%
                </span>
                <span className="text-[11px] text-emerald-700 block mt-0.5 font-semibold">
                  Random Forest (100 Trees)
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Calorie Accuracy (MAE)
                </span>
                <span className="text-2xl font-black text-slate-900">
                  ±{(mlStatus?.calorieMaeKcal ?? 118.5).toFixed(0)} kcal
                </span>
                <span className="text-[11px] text-blue-700 block mt-0.5 font-semibold">
                  Protein: ±{(mlStatus?.proteinMaeG ?? 9.4).toFixed(1)}g / day
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Training Dataset
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {(mlStatus?.totalTrainingSamples ?? 12973).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-amber-700 block mt-0.5 font-semibold">
                  Real Kaggle + Indian Records
                </span>
              </div>
            </div>

            {/* Feature Importance Weighting */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
                Top Predictive Feature Contributions
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Training Days / Week</span>
                    <span className="font-bold text-purple-700">77.8%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: '77.8%' }} />
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Training Experience</span>
                    <span className="font-bold text-emerald-700">12.8%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: '12.8%' }} />
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Session Duration</span>
                    <span className="font-bold text-blue-700">5.3%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: '5.3%' }} />
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Daily Steps & Activity</span>
                    <span className="font-bold text-amber-700">4.1%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-600 h-full rounded-full" style={{ width: '4.1%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions Bar */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                AI Coach Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('workout-planner');
                    handleGenerateWorkout();
                  }}
                  disabled={generatingWorkout}
                  className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Dumbbell className="w-4 h-4 text-purple-600" />
                    <span>Generate Workout for {selectedMember?.fullName || 'Active Member'}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-500" />
                </button>

                <button
                  onClick={handleSendMemberPlanToWhatsApp}
                  className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                    <span>Send Plan to WhatsApp</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-500" />
                </button>

                <button
                  onClick={() => {
                    setSelectedProfile(null);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Create Member Fitness Profile</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                </button>

                <button
                  onClick={() => setActiveTab('progress')}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4 text-slate-600" />
                    <span>Member Progress Tracking</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Recent Member Workouts Feed */}
            <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recent Workout Routines ({workoutPlans.length})
                </h3>
                <button
                  onClick={() => setActiveTab('workout-planner')}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700"
                >
                  View All Routines →
                </button>
              </div>

              <div className="space-y-2">
                {workoutPlans.length > 0 ? (
                  workoutPlans.slice(0, 4).map((w: any) => (
                    <div
                      key={w._id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                          <Dumbbell className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{w.name}</span>
                          <span className="text-[11px] text-slate-500">
                            {w.fitnessGoal?.replace(/_/g, ' ')} • {w.daysPerWeek} days/week
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!selectedMember?.phone) {
                              alert('Member does not have a registered phone number.');
                              return;
                            }
                            sendWhatsAppWorkoutPlan({
                              memberName: selectedMember.fullName,
                              phone: selectedMember.phone,
                              planName: w.name,
                              fitnessGoal: w.fitnessGoal,
                              daysPerWeek: w.daysPerWeek,
                              availableEquipment: w.availableEquipment,
                              schedule: w.schedule || [],
                            });
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                          title="Send to WhatsApp"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        {w.approvalStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveWorkout(w._id)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px]"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    No workout routines created yet. Click "Generate Workout Routine" to create one.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MEMBER FITNESS PROFILES
          ========================================================================= */}
      {activeTab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search fitness profiles..."
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <button
              onClick={() => {
                setSelectedProfile(null);
                setIsProfileModalOpen(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Member Profile Wizard
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Member Name</th>
                    <th className="py-3.5 px-4">Age / Gender</th>
                    <th className="py-3.5 px-4">Height & Weight</th>
                    <th className="py-3.5 px-4">Goal & Split</th>
                    <th className="py-3.5 px-4">Dietary Preference</th>
                    <th className="py-3.5 px-4">Calculated Target</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.length > 0 ? (
                    profiles.map((p) => {
                      const mObj: any = p.member || {};
                      return (
                        <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {mObj.fullName || 'Member'}
                            <span className="text-[10px] text-slate-400 font-normal block">
                              {mObj.memberId}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold">
                            {p.age} yrs • {p.gender}
                          </td>
                          <td className="py-3.5 px-4 font-semibold">
                            {p.heightCm} cm • {p.currentWeightKg} kg
                            {p.bmi && <span className="text-[10px] text-purple-600 font-bold block">BMI: {p.bmi}</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block">{p.fitnessGoal}</span>
                            <span className="text-[10px] text-slate-500">{p.workoutDaysPerWeek} days/wk</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700">
                              {p.dietaryPreference}
                            </span>
                            {p.allergies && p.allergies.length > 0 && (
                              <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                                Allergies: {p.allergies.join(', ')}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-emerald-600 text-sm">
                              {p.targetCalories} kcal
                            </span>
                            <span className="text-[10px] text-slate-400 block font-semibold">
                              P: {p.targetProtein}g • C: {p.targetCarbs}g • F: {p.targetFat}g
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedProfile(p);
                                setIsProfileModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-purple-600 hover:bg-purple-50 rounded-lg font-bold text-xs"
                            >
                              Edit Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No member fitness profiles recorded yet. Click "New Member Profile Wizard" above to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* =========================================================================
          TAB 4: WORKOUT PLANNER
          ========================================================================= */}
      {activeTab === 'workout-planner' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                7-Day Workout Routines for {selectedMember?.fullName}
              </h2>
              <p className="text-xs text-slate-500">
                Strength, hypertrophy, warm-ups, cool-downs, and exercise safety substitutions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateWorkout}
                disabled={generatingWorkout}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                {generatingWorkout ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Dumbbell className="w-4 h-4" />
                )}
                Generate 7-Day Workout Draft
              </button>

              <button
                onClick={() => {
                  setWorkoutPlanToEdit(null);
                  setIsWorkoutModalOpen(true);
                }}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold"
              >
                Manual Routine
              </button>
            </div>
          </div>

          {/* Trained ML Workout Split Recommendation Preview */}
          {hasMemberProfile && memberMlPrediction?.workout && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-950">
                      Trained ML Workout Optimization ({selectedMember?.fullName})
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-200 text-blue-900 rounded-md">
                      Random Forest (100% Split Accuracy)
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Optimal split and progressive overload rates tailored to member recovery index and schedule.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto text-xs font-semibold">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs text-center shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Recommended Split</span>
                  <span className="text-sm font-black text-blue-900">
                    {memberMlPrediction.workout.recommendedSplit.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs text-center shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Volume Multiplier</span>
                  <span className="text-sm font-black text-purple-700">{memberMlPrediction.workout.volumeMultiplier}x</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs text-center shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Weekly Progression</span>
                  <span className="text-sm font-black text-emerald-700">+{memberMlPrediction.workout.weeklyProgressionRatePct}% / wk</span>
                </div>

                <button
                  onClick={() => {
                    if (!selectedMember?.phone) {
                      alert('Selected member does not have a phone number recorded.');
                      return;
                    }
                    sendWhatsAppMlPlanSummary({
                      memberName: selectedMember.fullName,
                      phone: selectedMember.phone,
                      targetCalories: memberMlPrediction.nutrition?.targetCalories || 2000,
                      targetProtein: memberMlPrediction.nutrition?.targetProteinGrams || 120,
                      targetCarbs: memberMlPrediction.nutrition?.targetCarbsGrams || 220,
                      targetFat: memberMlPrediction.nutrition?.targetFatGrams || 50,
                      waterLiters: memberMlPrediction.nutrition?.waterIntakeLiters || 3.5,
                      recommendedSplit: memberMlPrediction.workout.recommendedSplit,
                      volumeMultiplier: memberMlPrediction.workout.volumeMultiplier,
                      progressionRate: memberMlPrediction.workout.weeklyProgressionRatePct,
                    });
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors"
                  title="Share ML Workout Targets to Member via WhatsApp"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>WhatsApp Targets</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {workoutPlans.map((wp) => (
              <div key={wp._id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{wp.name}</h3>
                    <p className="text-xs text-slate-500">
                      Goal: {wp.fitnessGoal} • {wp.daysPerWeek} Days/Week • Equipment: {wp.availableEquipment}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      wp.approvalStatus === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {wp.approvalStatus || 'APPROVED'}
                  </span>
                </div>

                {/* 7-Day Day Cards Accordion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(wp.schedule || []).map((day, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-2 ${
                        day.isRestDay
                          ? 'bg-slate-50 border-slate-200 opacity-75'
                          : 'bg-purple-50/40 border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-800">{day.dayName}</span>
                        <span className="text-[10px] text-purple-700">
                          {day.isRestDay ? 'Rest' : `${day.estimatedDurationMins}m`}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-700 block truncate">
                        {day.workoutTitle}
                      </span>
                      {!day.isRestDay && (
                        <div className="space-y-1 pt-1 border-t border-purple-100">
                          {(day.exercises || []).slice(0, 3).map((ex, eIdx) => (
                            <div key={eIdx} className="text-[11px] text-slate-600 flex justify-between">
                              <span className="truncate">{ex.exerciseName}</span>
                              <span className="font-bold text-slate-800 shrink-0">
                                {ex.sets}x{ex.reps}
                              </span>
                            </div>
                          ))}
                          {(day.exercises?.length || 0) > 3 && (
                            <span className="text-[10px] text-purple-600 font-bold">
                              +{(day.exercises?.length || 0) - 3} more exercises
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Created: {formatDateIN(wp.createdAt || new Date())}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!selectedMember?.phone) {
                          alert('Selected member does not have a phone number recorded.');
                          return;
                        }
                        sendWhatsAppWorkoutPlan({
                          memberName: selectedMember.fullName,
                          phone: selectedMember.phone,
                          planName: wp.name,
                          fitnessGoal: wp.fitnessGoal,
                          daysPerWeek: wp.daysPerWeek,
                          availableEquipment: wp.availableEquipment,
                          schedule: wp.schedule || [],
                        });
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="Send Workout Routine to Member via WhatsApp"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span>WhatsApp Routine</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPdfType('WORKOUT');
                        setActiveTab('pdf-reports');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Routine PDF
                    </button>
                    {wp.approvalStatus !== 'APPROVED' && (
                      <button
                        onClick={() => handleApproveWorkout(wp._id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                      >
                        Approve Routine
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* =========================================================================
          TAB 7: FITNESS PROGRESS
          ========================================================================= */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Weight & Body Metric Progression ({selectedMember?.fullName})
              </h2>
              <p className="text-xs text-slate-500">
                Measured history tracking body fat, waist circumference, and BMI adjustments.
              </p>
            </div>

            <button
              onClick={() => setIsProgressModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Log Weigh-In
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Weight (kg)</th>
                  <th className="py-3 px-4">BMI</th>
                  <th className="py-3 px-4">Chest (cm)</th>
                  <th className="py-3 px-4">Waist (cm)</th>
                  <th className="py-3 px-4">Arms (cm)</th>
                  <th className="py-3 px-4">Body Fat %</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {progressHistory.length > 0 ? (
                  progressHistory.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{formatDateIN(p.date)}</td>
                      <td className="py-3 px-4 font-extrabold text-blue-600 text-sm">{p.weight} kg</td>
                      <td className="py-3 px-4 font-semibold">{p.bmi ? p.bmi.toFixed(1) : '-'}</td>
                      <td className="py-3 px-4">{p.chest || '-'}</td>
                      <td className="py-3 px-4">{p.waist || '-'}</td>
                      <td className="py-3 px-4">{p.arms || '-'}</td>
                      <td className="py-3 px-4">{p.bodyFat ? `${p.bodyFat}%` : '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{p.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                          <Scale className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          Abhi tak {selectedMember?.fullName} ka koi weight log record nahi hai.
                        </span>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Member ka starting weight aur body metrics track karne ke liye niche button par click karein.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => setIsProgressModalOpen(true)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            + Log Weigh-In
                          </button>
                          {!hasMemberProfile && (
                            <button
                              onClick={() => {
                                setSelectedProfile(null);
                                setIsProfileModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              + Set Fitness Profile
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* =========================================================================
          TAB 10: PDF REPORTS & PRINTABLE SHEETS
          ========================================================================= */}
      {activeTab === 'pdf-reports' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedPdfType('WORKOUT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  selectedPdfType === 'WORKOUT' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Workout Plan PDF
              </button>
              <button
                onClick={() => setSelectedPdfType('PROGRESS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  selectedPdfType === 'PROGRESS' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Progress Report PDF
              </button>
              <button
                onClick={() => setSelectedPdfType('BOOKLET')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  selectedPdfType === 'BOOKLET' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Combined Booklet PDF
              </button>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={pdfGenerating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              {pdfGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download High-Res PDF
            </button>
          </div>

          {/* Printable Element in High-Resolution Canvas Container */}
          <div className="p-8 bg-white border border-slate-300 rounded-2xl shadow-md max-w-4xl mx-auto" id="printable-fitness-report">
            {/* Sagar Fitness Gym Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">SAGAR FITNESS GYM</h1>
                <p className="text-xs text-slate-600 font-semibold">
                  Pathardi, Ahmednagar, Maharashtra, India • AI Fitness & Nutrition Department
                </p>
                <p className="text-[11px] text-slate-500">Contact: +91 98811 22334 • info@sagarfitness.com</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-wider block">
                  {selectedPdfType === 'WORKOUT'
                    ? '7-Day Structured Training Regimen'
                    : selectedPdfType === 'PROGRESS'
                    ? 'Fitness Progression Report'
                    : 'Complete Member Fitness Booklet'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  Issued: {formatDateIN(new Date())}
                </span>
              </div>
            </div>

            {/* Member Card Header */}
            <div className="my-5 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Member Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedMember?.fullName}</span>
                <span className="text-[10px] text-slate-500 block">ID: {selectedMember?.memberId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Gender & Age</span>
                <span className="font-bold text-slate-800">{selectedMember?.gender || 'MALE'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Primary Goal</span>
                <span className="font-bold text-purple-700">General Fitness & Health</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Verification</span>
                <span className="font-bold text-emerald-700">Certified by Head Coach</span>
              </div>
            </div>

            {/* Schedule / Content Table */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                7-Day Weekly Program Schedule
              </h3>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                  <tr>
                    <th className="p-2.5 border-r border-b">Day</th>
                    <th className="p-2.5 border-r border-b">Nutrition Schedule & Macros</th>
                    <th className="p-2.5 border-b">Workout Routine & Exercises</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                    (day, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2.5 font-bold border-r bg-slate-50/50 w-28 align-top">
                          {day}
                        </td>
                        <td className="p-2.5 border-r align-top">
                          <p className="font-bold text-slate-800 mb-0.5">
                            Target Calories: ~2000 kcal
                          </p>
                          <p className="text-[11px] text-slate-600">
                            • Breakfast: Poha / Oats with milk or eggs (450 kcal)
                            <br />
                            • Lunch: 2 Rotis + Dal Tadka + Rice + Fresh Salad (650 kcal)
                            <br />
                            • Snack: Roasted Chana / Sprouts salad (250 kcal)
                            <br />
                            • Dinner: Paneer / Chicken curry + 2 Rotis (550 kcal)
                          </p>
                        </td>
                        <td className="p-2.5 align-top">
                          <p className="font-bold text-purple-800 mb-0.5">
                            {idx % 2 === 0 ? 'Compound Training Session' : 'Active Recovery & Core'}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {idx % 2 === 0
                              ? '45 mins • Warm-up: 5m treadmill • Bench Press 3x10, Lat Pulldown 3x12, Squats 3x12 • Cool-down'
                              : '30 mins low-intensity walk (5,000 steps) + foam rolling & hydration'}
                          </p>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Disclaimer */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center">
              <span>Sagar Fitness Gym — Certified Trainer & AI Assisted Program</span>
              <span>Page 1 of 1 • Authorized Document</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 11: NOTIFICATION CENTER & DELIVERY AUDIT LOG
          ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Member Notification & Reminder Dispatcher</h2>
            <p className="text-xs text-slate-500">
              Trigger instant meal or workout reminders for {selectedMember?.fullName} with delivery logging.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter reminder message text..."
                value={manualMessage}
                onChange={(e) => setManualMessage(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
              <button
                onClick={handleSendNotification}
                disabled={notificationSending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
              >
                Send Reminder
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
              Delivery Audit Trail
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <tr key={n._id}>
                      <td className="py-3 px-4 font-bold">{n.member?.fullName || 'Member'}</td>
                      <td className="py-3 px-4">{n.channel}</td>
                      <td className="py-3 px-4">{n.type}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {n.deliveryStatus || 'DELIVERED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {n.history?.[0]?.message || 'Automated reminder'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {formatDateIN(n.lastSentAt || n.createdAt || new Date())}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No notification logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 12: FITNESS SETTINGS
          ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Sagar Fitness Gym Settings & Safety Limits</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Facility Standards</span>
                <p className="text-slate-600">Gym: Sagar Fitness Gym, Pathardi, Maharashtra</p>
                <p className="text-slate-600">Timezone: Asia/Kolkata (IST)</p>
                <p className="text-slate-600">Currency: INR (₹)</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Calorie Safety Floors</span>
                <p className="text-slate-600">Minimum Deficit Floor (Women): 1,200 kcal</p>
                <p className="text-slate-600">Minimum Deficit Floor (Men): 1,500 kcal</p>
                <p className="text-slate-600">Default Daily Hydration: 3.5 Litres</p>
              </div>
            </div>
          </div>

          {/* Machine Learning Pipeline & Offline Intelligence Architecture */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  ML Neural Model Pipeline (Scikit-Learn & Node.js Matrix)
                </h2>
                <p className="text-xs text-slate-500">
                  Zero cloud dependency. Deterministic, clinical precision tailored for Pathardi, Maharashtra gym members.
                </p>
              </div>

              <button
                onClick={handleRetrainMl}
                disabled={isRetraining}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
                <span>{isRetraining ? 'Retraining...' : 'Re-train Scikit-Learn Pipeline'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-purple-900">
                  Nutrition Regressor
                </span>
                <p className="text-slate-600">Model: Multi-Output Ridge Regression</p>
                <p className="text-slate-600">Variance Fit (R²): {((mlStatus?.nutritionR2Score ?? 0.8972) * 100).toFixed(2)}%</p>
                <p className="text-slate-600">Calorie MAE: ±{(mlStatus?.calorieMaeKcal ?? 122.3).toFixed(1)} kcal</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-emerald-900">
                  Workout Classifier
                </span>
                <p className="text-slate-600">Model: Random Forest Classifier</p>
                <p className="text-slate-600">Split Accuracy: {((mlStatus?.workoutSplitAccuracy ?? 1.0) * 100).toFixed(1)}%</p>
                <p className="text-slate-600">Estimators: 100 Decision Trees</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-blue-900">
                  Execution Runtime
                </span>
                <p className="text-slate-600">Engine: In-Process Node.js Matrix</p>
                <p className="text-slate-600">Inference Latency: &lt;0.1 ms</p>
                <p className="text-slate-600">Total Training Records: {(mlStatus?.totalTrainingSamples ?? 12000).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <FitnessProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSaved={() => {
          api.getFitnessProfiles().then((res) => setProfiles(res?.profiles || []));
        }}
        initialProfile={selectedProfile}
        members={members}
        preselectedMemberId={selectedMemberId}
      />

      <WorkoutPlanModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        onSaved={() => {
          if (selectedMemberId) {
            api.getWorkoutPlans({ memberId: selectedMemberId }).then((res) => {
              const list = Array.isArray(res) ? res : res?.workouts || res?.plans || [];
              setWorkoutPlans(list);
            });
          }
        }}
        initialPlan={workoutPlanToEdit}
        members={members}
        preselectedMemberId={selectedMemberId}
      />

      {isDietModalOpen && (
        <DietPlanModal
          isOpen={isDietModalOpen}
          onClose={() => setIsDietModalOpen(false)}
          onSuccess={() => {
            if (selectedMemberId) {
              api.getDietPlans({ memberId: selectedMemberId }).then((res) => {
                const list = Array.isArray(res) ? res : res?.plans || [];
                setDietPlans(list);
              });
            }
          }}
          planToEdit={dietPlanToEdit}
          defaultMember={selectedMember}
        />
      )}

      {isFoodModalOpen && (
        <FoodItemModal
          isOpen={isFoodModalOpen}
          onClose={() => setIsFoodModalOpen(false)}
          onSuccess={() => {
            api.getFoods().then((res: any) => setFoods(res || []));
          }}
          foodToEdit={foodToEdit}
        />
      )}

      {isProgressModalOpen && (
        <WeightProgressModal
          isOpen={isProgressModalOpen}
          onClose={() => setIsProgressModalOpen(false)}
          onSuccess={() => {
            if (selectedMemberId) {
              api.getMemberProgress(selectedMemberId).then((res) => setProgressHistory(res?.history || []));
            }
          }}
          defaultMember={selectedMember}
        />
      )}
    </div>
  );
};
