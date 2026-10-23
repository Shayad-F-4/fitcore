import React, { useState, useEffect } from 'react';
import {
  Utensils,
  LayoutDashboard,
  Calculator,
  Apple,
  FileText,
  TrendingUp,
  FileBarChart,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Download,
  Share2,
  Copy,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Scale,
  Flame,
  Droplet,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import {
  DietPlan,
  FoodItem,
  Member,
  DietDashboardData,
  FoodCategory,
  FitnessGoal,
  WeightProgress,
  CalorieCalculationResult,
} from '../types';
import { DietPlanModal } from '../components/modals/DietPlanModal';
import { FoodItemModal } from '../components/modals/FoodItemModal';
import { WeightProgressModal } from '../components/modals/WeightProgressModal';
import { DietReportModal } from '../components/modals/DietReportModal';
import { formatDateIN } from '../utils/formatters';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { sendWhatsAppDietPlan } from '../utils/whatsapp';

type DietTab = 'dashboard' | 'calculator' | 'foods' | 'plans' | 'progress' | 'reports';

export const DietPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DietTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DietDashboardData | null>(null);

  // Foods tab state
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCategory, setFoodCategory] = useState<string>('ALL');
  const [foodLoading, setFoodLoading] = useState(false);

  // Plans tab state
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [planSearch, setPlanSearch] = useState('');
  const [planGoal, setPlanGoal] = useState<string>('ALL');
  const [planStatus, setPlanStatus] = useState<string>('ALL');
  const [planLoading, setPlanLoading] = useState(false);

  // Progress tab state
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberProfileData, setMemberProfileData] = useState<any | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // Calculator state
  const [calcAge, setCalcAge] = useState<number | string>(25);
  const [calcGender, setCalcGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [calcHeight, setCalcHeight] = useState<number | string>(175);
  const [calcWeight, setCalcWeight] = useState<number | string>(75);
  const [calcActivity, setCalcActivity] = useState<string>('MODERATELY_ACTIVE');
  const [calcGoal, setCalcGoal] = useState<FitnessGoal>('WEIGHT_LOSS');
  const [calcResult, setCalcResult] = useState<CalorieCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<DietPlan | null>(null);
  const [planDefaultMember, setPlanDefaultMember] = useState<Member | null>(null);
  const [planInitialTargets, setPlanInitialTargets] = useState<any | null>(null);

  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodToEdit, setFoodToEdit] = useState<FoodItem | null>(null);

  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressDefaultMember, setProgressDefaultMember] = useState<Member | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportPlan, setSelectedReportPlan] = useState<DietPlan | null>(null);

  // Load Dashboard Data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDietDashboard();
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load diet dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Foods
  const loadFoods = async () => {
    try {
      setFoodLoading(true);
      const params: Record<string, string> = { limit: '100' };
      if (foodSearch) params.search = foodSearch;
      if (foodCategory && foodCategory !== 'ALL') params.category = foodCategory;
      const res = await api.getFoods(params);
      setFoods(res.data.foods || []);
    } catch (err) {
      console.error('Failed to load foods:', err);
    } finally {
      setFoodLoading(false);
    }
  };

  // Load Plans
  const loadPlans = async () => {
    try {
      setPlanLoading(true);
      const params: Record<string, string> = { limit: '100' };
      if (planSearch) params.search = planSearch;
      if (planGoal && planGoal !== 'ALL') params.goal = planGoal;
      if (planStatus && planStatus !== 'ALL') params.status = planStatus;
      const res = await api.getDietPlans(params);
      setPlans(res.data.plans || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setPlanLoading(false);
    }
  };

  // Load Member Diet Profile
  const loadMemberProfile = async (memberId: string) => {
    if (!memberId) return;
    try {
      setProgressLoading(true);
      const res = await api.getMemberDietProfile(memberId);
      setMemberProfileData(res.data);
    } catch (err) {
      console.error('Failed to load member profile:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    api.getMembers({ limit: 100 }).then((res: any) => {
      const memList = res.data || [];
      setMembers(memList);
      if (memList.length > 0 && !selectedMemberId) {
        setSelectedMemberId(memList[0]._id);
      }
    });

    const handleDataChanged = () => {
      loadDashboard();
      if (activeTab === 'foods') loadFoods();
      if (activeTab === 'plans') loadPlans();
      if (activeTab === 'progress' && selectedMemberId) loadMemberProfile(selectedMemberId);
    };

    window.addEventListener('fitcore:data-changed', handleDataChanged);
    return () => window.removeEventListener('fitcore:data-changed', handleDataChanged);
  }, []);

  useEffect(() => {
    if (activeTab === 'foods') loadFoods();
    if (activeTab === 'plans') loadPlans();
    if (activeTab === 'progress' && selectedMemberId) loadMemberProfile(selectedMemberId);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'foods') {
      const delay = setTimeout(loadFoods, 300);
      return () => clearTimeout(delay);
    }
  }, [foodSearch, foodCategory]);

  useEffect(() => {
    if (activeTab === 'plans') {
      const delay = setTimeout(loadPlans, 300);
      return () => clearTimeout(delay);
    }
  }, [planSearch, planGoal, planStatus]);

  useEffect(() => {
    if (selectedMemberId && activeTab === 'progress') {
      loadMemberProfile(selectedMemberId);
    }
  }, [selectedMemberId]);

  // Execute Calorie Calculation
  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCalcError(null);
    try {
      setCalculating(true);
      const res = await api.calculateCalories({
        age: Number(calcAge),
        gender: calcGender,
        heightCm: Number(calcHeight),
        weightKg: Number(calcWeight),
        activityLevel: calcActivity,
        fitnessGoal: calcGoal,
      });
      setCalcResult(res.data);
    } catch (err: any) {
      setCalcError(err.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  // Run initial calculator evaluation
  useEffect(() => {
    handleCalculate();
  }, []);

  const handleDuplicatePlan = async (planId: string) => {
    if (!window.confirm('Create a duplicated copy of this diet plan?')) return;
    try {
      await api.duplicateDietPlan(planId);
      loadPlans();
      alert('Plan duplicated successfully as an Inactive draft.');
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate plan');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center font-bold shadow-2xs">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Diet & Calorie Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-100 text-lime-900 border border-lime-300">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sagar Fitness Gym, Pathardi • Mifflin-St Jeor Calorie Math • Verified Food Database • Diet Dossiers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFoodToEdit(null);
              setIsFoodModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all active:scale-95"
          >
            <Apple className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Food Item</span>
          </button>

          <button
            onClick={() => {
              setPlanToEdit(null);
              setPlanDefaultMember(null);
              setPlanInitialTargets(null);
              setIsPlanModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Diet Plan</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'dashboard', label: 'Nutrition Dashboard', icon: LayoutDashboard },
          { id: 'calculator', label: 'Calorie Calculator', icon: Calculator },
          { id: 'foods', label: 'Food Database', icon: Apple },
          { id: 'plans', label: 'Diet Plans', icon: FileText },
          { id: 'progress', label: 'Member Progress', icon: TrendingUp },
          { id: 'reports', label: 'Reports & Analytics', icon: FileBarChart },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DietTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-xl transition-all border-b-2 ${
                isActive
                  ? 'border-lime-600 text-lime-900 bg-lime-50/70'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-lime-700' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ====================================================================
          TAB 1: NUTRITION DASHBOARD
          ==================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Diet Plans
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {dashboardData?.kpi.totalPlans ?? 0}
              </span>
              <span className="text-[11px] text-slate-500">Created protocols</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Assigned
              </span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {dashboardData?.kpi.activePlans ?? 0}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Currently active</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fat Loss Goals
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {dashboardData?.kpi.weightLossPlans ?? 0}
              </span>
              <span className="text-[11px] text-amber-600 font-medium">Caloric deficits</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Muscle Gain
              </span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                {dashboardData?.kpi.muscleGainPlans ?? 0}
              </span>
              <span className="text-[11px] text-blue-600 font-medium">Hypertrophy bulk</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Need Progress Log
              </span>
              <span className="text-2xl font-black text-rose-600 mt-1 block">
                {dashboardData?.kpi.membersRequiringUpdateCount ?? 0}
              </span>
              <span className="text-[11px] text-rose-600 font-medium">&gt; 14 days no check-in</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Food Database
              </span>
              <span className="text-2xl font-black text-purple-700 mt-1 block">
                {dashboardData?.kpi.totalFoodItems ?? 0}
              </span>
              <span className="text-[11px] text-purple-600 font-medium">Verified items</span>
            </div>
          </div>

          {/* Action Center: Check-in Reminders & Recently Updated Plans */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Members Requiring Progress Update */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Members Requiring Check-In
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Active diet assigned, but no weight logged in the last 14 days
                    </p>
                  </div>
                </div>
              </div>

              {dashboardData?.membersNeedingCheckIn && dashboardData.membersNeedingCheckIn.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {dashboardData.membersNeedingCheckIn.map((m: any) => (
                    <div
                      key={m._id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs uppercase">
                          {m.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{m.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {m.memberId} • {m.phone}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const fullMember = members.find((x) => x._id === m._id) || (m as any);
                          setProgressDefaultMember(fullMember);
                          setIsProgressModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      >
                        <Scale className="w-3 h-3" />
                        <span>Log Weight</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  All active diet members have recorded check-ins within the last 14 days!
                </div>
              )}
            </div>

            {/* Right: Recently Updated Diet Plans */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-lime-100 text-lime-800 flex items-center justify-center font-bold">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Recently Updated Diet Protocols
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Active member plans with macronutrient targets
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="text-xs text-lime-700 hover:text-lime-900 font-bold flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {dashboardData?.recentPlans && dashboardData.recentPlans.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {dashboardData.recentPlans.map((plan: any) => (
                    <div
                      key={plan._id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">{plan.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              plan.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {plan.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Member: <strong className="text-slate-700">{plan.member?.fullName}</strong> •{' '}
                          <span className="font-mono text-amber-700 font-bold">
                            {plan.dailyCalories || plan.targetCalories} kcal
                          </span>{' '}
                          (P: {plan.dailyProtein || plan.targetProtein}g)
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedReportPlan(plan);
                            setIsReportModalOpen(true);
                          }}
                          className="w-7 h-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded flex items-center justify-center transition-colors"
                          title="Print / View PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setPlanToEdit(plan);
                            setIsPlanModalOpen(true);
                          }}
                          className="w-7 h-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded flex items-center justify-center transition-colors"
                          title="Edit Plan"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No diet plans created yet. Click "Create Diet Plan" to begin.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: CALORIE & MACRO CALCULATOR
          ==================================================================== */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calculator Inputs Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-lime-700" />
                <span>Mifflin-St Jeor Energy Calculator</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Validated formula to estimate BMR, TDEE, and optimal macros
              </p>
            </div>

            {calcError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{calcError}</span>
              </div>
            )}

            <form onSubmit={handleCalculate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender / Biological Sex <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={calcGender}
                    onChange={(e) => setCalcGender(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="MALE">Male (+5 offset)</option>
                    <option value="FEMALE">Female (-161 offset)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Age (Years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="12"
                    max="100"
                    required
                    value={calcAge}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setCalcAge(val === '' ? '' : Number(val));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Height (cm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    required
                    value={calcHeight}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setCalcHeight(val === '' ? '' : Number(val));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="30"
                    max="300"
                    required
                    value={calcWeight}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setCalcWeight(val === '' ? '' : Number(val));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Activity Level Multiplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={calcActivity}
                  onChange={(e) => setCalcActivity(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-lime-500"
                >
                  <option value="SEDENTARY">Sedentary (Desk job, little/no exercise) • 1.2x</option>
                  <option value="LIGHTLY_ACTIVE">Lightly Active (Gym training 1-3 days/week) • 1.375x</option>
                  <option value="MODERATELY_ACTIVE">Moderately Active (Gym training 3-5 days/week) • 1.55x</option>
                  <option value="VERY_ACTIVE">Very Active (Hard workouts 6-7 days/week) • 1.725x</option>
                  <option value="EXTRA_ACTIVE">Extra Active (Intense training + physical job) • 1.9x</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fitness & Transformation Goal <span className="text-red-500">*</span>
                </label>
                <select
                  value={calcGoal}
                  onChange={(e) => setCalcGoal(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-lime-500"
                >
                  <option value="WEIGHT_LOSS">Weight Loss / Fat Loss (Safe 15-20% deficit)</option>
                  <option value="MUSCLE_GAIN">Muscle Gain / Lean Bulk (+10-12% surplus)</option>
                  <option value="MAINTENANCE">Maintenance (Preserve bodyweight)</option>
                  <option value="ENDURANCE">Endurance Performance (+5% glycogen surplus)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={calculating}
                className="w-full py-2.5 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Calculator className="w-4 h-4" />
                <span>{calculating ? 'Calculating...' : 'Recalculate Energy & Macros'}</span>
              </button>
            </form>
          </div>

          {/* Calculator Results Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Calculated Energy Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tailored target for Sagar Fitness Gym athlete
                </p>
              </div>

              {calcResult && (
                <button
                  onClick={() => {
                    setPlanToEdit(null);
                    setPlanDefaultMember(null);
                    setPlanInitialTargets({
                      calories: calcResult.targetCalories,
                      protein: calcResult.targetProteinGrams,
                      carbs: calcResult.targetCarbsGrams,
                      fat: calcResult.targetFatGrams,
                      water: calcResult.waterIntakeLiters,
                      goal: calcGoal,
                    });
                    setIsPlanModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-lg shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Plan with These Targets</span>
                </button>
              )}
            </div>

            {calcResult ? (
              <div className="space-y-5">
                {/* Primary Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Basal Metabolic (BMR)
                    </span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                      {calcResult.bmr}
                    </span>
                    <span className="text-[10px] text-slate-500">kcal at complete rest</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Maintenance (TDEE)
                    </span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                      {calcResult.tdee}
                    </span>
                    <span className="text-[10px] text-slate-500">kcal daily burn</span>
                  </div>

                  <div className="p-3 bg-lime-50 border border-lime-300 rounded-xl">
                    <span className="text-[10px] font-bold text-lime-800 uppercase tracking-wider block">
                      Recommended Target
                    </span>
                    <span className="text-2xl font-black text-lime-900 font-mono mt-0.5 block">
                      {calcResult.targetCalories}
                    </span>
                    <span className="text-[10px] text-lime-700 font-semibold">kcal per day</span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                      BMI & Category
                    </span>
                    <span className="text-xl font-black text-blue-900 font-mono mt-0.5 block">
                      {calcResult.bmi}
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold truncate block">
                      {calcResult.bmiCategory}
                    </span>
                  </div>
                </div>

                {/* Macro Breakdown */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recommended Daily Macronutrient Distribution
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-700">Protein</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {calcResult.targetProteinGrams * 4} kcal
                        </span>
                      </div>
                      <span className="text-xl font-black text-blue-900 font-mono mt-1 block">
                        {calcResult.targetProteinGrams}g
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {((calcResult.targetProteinGrams / (Number(calcWeight) || 1))).toFixed(1)}g per kg bodyweight
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-700">Carbohydrates</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {calcResult.targetCarbsGrams * 4} kcal
                        </span>
                      </div>
                      <span className="text-xl font-black text-emerald-900 font-mono mt-1 block">
                        {calcResult.targetCarbsGrams}g
                      </span>
                      <span className="text-[10px] text-slate-500">Glycogen & daily energy</span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-rose-700">Healthy Fats</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {calcResult.targetFatGrams * 9} kcal
                        </span>
                      </div>
                      <span className="text-xl font-black text-rose-900 font-mono mt-1 block">
                        {calcResult.targetFatGrams}g
                      </span>
                      <span className="text-[10px] text-slate-500">25% essential lipids</span>
                    </div>
                  </div>

                  {/* Water Intake */}
                  <div className="flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-cyan-600" />
                      <span className="font-bold text-cyan-900">
                        Recommended Daily Water Intake:
                      </span>
                    </div>
                    <span className="font-black font-mono text-cyan-900 text-sm">
                      {calcResult.waterIntakeLiters} Liters / day
                    </span>
                  </div>
                </div>

                {/* Safety & Logic Notes */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-lime-700" />
                    <span>Calculation Formula & Logic</span>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px]">{calcResult.formulaUsed}</p>
                  <p className="text-slate-700">{calcResult.adjustmentDescription}</p>

                  {calcResult.safetyNotice && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px] font-medium">
                      ⚠️ {calcResult.safetyNotice}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 italic pt-1">{calcResult.disclaimer}</p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Enter parameters on the left and click Calculate to compute nutritional targets.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: FOOD DATABASE
          ==================================================================== */}
      {activeTab === 'foods' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                placeholder="Search food item name (e.g. egg, chicken, oats, paneer)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-lime-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={foodCategory}
                onChange={(e) => setFoodCategory(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-lime-500"
              >
                <option value="ALL">All Categories</option>
                <option value="PROTEINS">Proteins</option>
                <option value="CARBOHYDRATES">Carbohydrates</option>
                <option value="HEALTHY_FATS">Healthy Fats</option>
                <option value="DAIRY">Dairy</option>
                <option value="VEGETABLES">Vegetables</option>
                <option value="FRUITS">Fruits</option>
                <option value="SUPPLEMENTS">Supplements</option>
                <option value="SNACKS_OTHERS">Snacks & Others</option>
              </select>

              <button
                onClick={() => {
                  setFoodToEdit(null);
                  setIsFoodModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-xl shadow-2xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Food</span>
              </button>
            </div>
          </div>

          {/* Foods Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            {foodLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading food database...</div>
            ) : foods.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No food items found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Food Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Serving Size</th>
                      <th className="py-3 px-4 text-right">Calories</th>
                      <th className="py-3 px-4 text-right">Protein</th>
                      <th className="py-3 px-4 text-right">Carbs</th>
                      <th className="py-3 px-4 text-right">Fat</th>
                      <th className="py-3 px-4 text-right">Fiber</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {foods.map((food) => (
                      <tr key={food._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-900 font-bold">
                          {food.name}
                          {food.notes && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {food.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {food.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {food.servingSize} {food.servingUnit}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-amber-700">
                          {food.calories} kcal
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-700">
                          {food.protein}g
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          {food.carbs}g
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-700">
                          {food.fat}g
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {food.fiber || 0}g
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {food.source.includes('Verified') ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            food.source
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setFoodToEdit(food);
                              setIsFoodModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                            title="Edit Food"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
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

      {/* ====================================================================
          TAB 4: DIET PLANS DIRECTORY
          ==================================================================== */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                placeholder="Search plan name or member name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-lime-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={planGoal}
                onChange={(e) => setPlanGoal(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-lime-500"
              >
                <option value="ALL">All Goals</option>
                <option value="WEIGHT_LOSS">Weight Loss</option>
                <option value="MUSCLE_GAIN">Muscle Gain</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="ENDURANCE">Endurance</option>
              </select>

              <select
                value={planStatus}
                onChange={(e) => setPlanStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-lime-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <button
                onClick={() => {
                  setPlanToEdit(null);
                  setPlanDefaultMember(null);
                  setPlanInitialTargets(null);
                  setIsPlanModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-xl shadow-2xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Plan</span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          {planLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading diet plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No diet plans found. Click "New Plan" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                            plan.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {plan.status}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm truncate">{plan.name}</h4>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-lime-50 text-lime-800 border border-lime-200 shrink-0">
                        {plan.fitnessGoal.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Member Details */}
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{plan.member?.fullName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        {plan.member?.memberId}
                      </span>
                    </div>

                    {/* Calories and Macros */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <span className="text-[10px] font-bold text-amber-800 block">Calories</span>
                        <span className="font-black text-amber-900 font-mono">
                          {plan.dailyCalories || plan.targetCalories}
                        </span>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <span className="text-[10px] font-bold text-blue-800 block">Protein</span>
                        <span className="font-black text-blue-900 font-mono">
                          {plan.dailyProtein || plan.targetProtein}g
                        </span>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <span className="text-[10px] font-bold text-emerald-800 block">Carbs</span>
                        <span className="font-black text-emerald-900 font-mono">
                          {plan.dailyCarbs || plan.targetCarbs}g
                        </span>
                      </div>
                      <div className="p-2 bg-rose-50 rounded-lg">
                        <span className="text-[10px] font-bold text-rose-800 block">Fat</span>
                        <span className="font-black text-rose-900 font-mono">
                          {plan.dailyFat || plan.targetFat}g
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Meals: {plan.meals?.length || 0} scheduled</span>
                      <span>Start: {formatDateIN(plan.startDate)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedReportPlan(plan);
                        setIsReportModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Sheet</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {plan.member?.phone && (
                        <button
                          onClick={() => {
                            sendWhatsAppDietPlan({
                              memberName: plan.member.fullName,
                              phone: plan.member.phone,
                              planName: plan.name,
                              fitnessGoal: plan.fitnessGoal,
                              dailyCalories: plan.dailyCalories || plan.targetCalories,
                              dailyProtein: plan.dailyProtein || plan.targetProtein,
                              dailyCarbs: plan.dailyCarbs || plan.targetCarbs,
                              dailyFat: plan.dailyFat || plan.targetFat,
                              waterIntakeLiters: plan.waterIntakeLiters,
                              notes: plan.notes,
                              meals: (plan.meals || []).map((m: any) => ({
                                mealType: m.mealType,
                                name: m.name,
                                time: m.time,
                                items: (m.items || []).map((it: any) => ({
                                  foodName: it.foodName,
                                  quantity: it.quantity,
                                  servingUnit: it.servingUnit,
                                })),
                              })),
                            });
                          }}
                          className="w-7 h-7 text-emerald-600 hover:bg-emerald-50 rounded flex items-center justify-center transition-colors"
                          title="Share via WhatsApp"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDuplicatePlan(plan._id)}
                        className="w-7 h-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded flex items-center justify-center transition-colors"
                        title="Duplicate Plan"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setPlanToEdit(plan);
                          setIsPlanModalOpen(true);
                        }}
                        className="w-7 h-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded flex items-center justify-center transition-colors"
                        title="Edit Plan"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 5: MEMBER FITNESS & PROGRESS DOSSIER
          ==================================================================== */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Member Picker Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <span className="text-xs font-bold text-slate-800">Select Member Dossier:</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-lime-500 font-semibold"
              >
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullName} ({m.memberId}) — {m.phone}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  const m = members.find((x) => x._id === selectedMemberId);
                  setProgressDefaultMember(m || null);
                  setIsProgressModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition-colors shrink-0"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Record Weight</span>
              </button>
            </div>
          </div>

          {/* Member Dossier Body */}
          {progressLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading member fitness profile...
            </div>
          ) : memberProfileData ? (
            <div className="space-y-6">
              {/* Active Diet Plan Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Utensils className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Current Active Diet Protocol</h3>
                      <p className="text-xs text-slate-500">
                        {memberProfileData.activePlan
                          ? memberProfileData.activePlan.name
                          : 'No active diet protocol assigned currently'}
                      </p>
                    </div>
                  </div>

                  {memberProfileData.activePlan ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedReportPlan(memberProfileData.activePlan);
                          setIsReportModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Dossier</span>
                      </button>
                      <button
                        onClick={() => {
                          setPlanToEdit(memberProfileData.activePlan);
                          setIsPlanModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Plan</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const m = members.find((x) => x._id === selectedMemberId);
                        setPlanToEdit(null);
                        setPlanDefaultMember(m || null);
                        setIsPlanModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Assign Diet Plan</span>
                    </button>
                  )}
                </div>

                {memberProfileData.activePlan && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        Daily Calories
                      </span>
                      <span className="text-xl font-black text-amber-900 font-mono mt-0.5 block">
                        {memberProfileData.activePlan.dailyCalories || memberProfileData.activePlan.targetCalories} kcal
                      </span>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-xl">
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                        Protein
                      </span>
                      <span className="text-xl font-black text-blue-900 font-mono mt-0.5 block">
                        {memberProfileData.activePlan.dailyProtein || memberProfileData.activePlan.targetProtein}g
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Carbohydrates
                      </span>
                      <span className="text-xl font-black text-emerald-900 font-mono mt-0.5 block">
                        {memberProfileData.activePlan.dailyCarbs || memberProfileData.activePlan.targetCarbs}g
                      </span>
                    </div>

                    <div className="p-3 bg-rose-50 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                        Fats
                      </span>
                      <span className="text-xl font-black text-rose-900 font-mono mt-0.5 block">
                        {memberProfileData.activePlan.dailyFat || memberProfileData.activePlan.targetFat}g
                      </span>
                    </div>

                    <div className="p-3 bg-cyan-50 rounded-xl">
                      <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">
                        Hydration
                      </span>
                      <span className="text-xl font-black text-cyan-900 font-mono mt-0.5 block">
                        {memberProfileData.activePlan.waterIntakeLiters || 3.5}L
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Weight & Body Measurements Timeline Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Weight & Body Composition History
                      </h3>
                      <p className="text-xs text-slate-500">
                        Historical measurement log recorded by gym administrators
                      </p>
                    </div>
                  </div>

                  {memberProfileData.latestProgress && (
                    <div className="text-right text-xs">
                      <span className="text-slate-400">Latest Weight:</span>{' '}
                      <strong className="text-blue-700 font-bold text-sm">
                        {memberProfileData.latestProgress.weight} kg
                      </strong>{' '}
                      {memberProfileData.latestProgress.bmi && (
                        <span className="text-[11px] text-slate-500">
                          (BMI: {memberProfileData.latestProgress.bmi})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {memberProfileData.progressHistory && memberProfileData.progressHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Weight (kg)</th>
                          <th className="py-2.5 px-3">Height (cm)</th>
                          <th className="py-2.5 px-3">BMI</th>
                          <th className="py-2.5 px-3">Waist (cm)</th>
                          <th className="py-2.5 px-3">Chest (cm)</th>
                          <th className="py-2.5 px-3">Arms (cm)</th>
                          <th className="py-2.5 px-3">Body Fat</th>
                          <th className="py-2.5 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {memberProfileData.progressHistory.map((p: WeightProgress) => (
                          <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {formatDateIN(p.date)}
                            </td>
                            <td className="py-2.5 px-3 font-black text-blue-700 font-mono text-sm">
                              {p.weight} kg
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{p.height || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-800 font-bold">
                              {p.bmi || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{p.waist || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{p.chest || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{p.arms || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">
                              {p.bodyFat ? `${p.bodyFat}%` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500 italic max-w-xs truncate">
                              {p.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No progress entries recorded yet for this member. Click "Record Weight" above.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Please choose a member from the dropdown above to view their fitness dossier.
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 6: REPORTS & COMPLIANCE
          ==================================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Diet Protocols & Nutritional Compliance Overview
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Goal Breakdown Distribution
                </span>
                <p className="text-xs text-slate-500">
                  {dashboardData?.kpi.weightLossPlans || 0} Fat Loss •{' '}
                  {dashboardData?.kpi.muscleGainPlans || 0} Muscle Gain •{' '}
                  {dashboardData?.kpi.maintenancePlans || 0} Maintenance
                </p>
                <div className="w-full h-3 bg-slate-200 rounded-full flex overflow-hidden">
                  <div
                    className="bg-amber-500 h-full"
                    style={{
                      width: `${
                        ((dashboardData?.kpi.weightLossPlans || 0) /
                          Math.max(1, dashboardData?.kpi.totalPlans || 1)) *
                        100
                      }%`,
                    }}
                    title="Weight Loss"
                  />
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${
                        ((dashboardData?.kpi.muscleGainPlans || 0) /
                          Math.max(1, dashboardData?.kpi.totalPlans || 1)) *
                        100
                      }%`,
                    }}
                    title="Muscle Gain"
                  />
                  <div
                    className="bg-emerald-500 h-full"
                    style={{
                      width: `${
                        ((dashboardData?.kpi.maintenancePlans || 0) /
                          Math.max(1, dashboardData?.kpi.totalPlans || 1)) *
                        100
                      }%`,
                    }}
                    title="Maintenance"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Bi-Weekly Check-in Compliance
                </span>
                <p className="text-xs text-slate-500">
                  {Math.max(
                    0,
                    (dashboardData?.kpi.activePlans || 0) -
                      (dashboardData?.kpi.membersRequiringUpdateCount || 0)
                  )}{' '}
                  members up to date with weight logs
                </p>
                <div className="text-xl font-bold text-emerald-700 font-mono">
                  {dashboardData?.kpi.activePlans
                    ? Math.round(
                        ((dashboardData.kpi.activePlans -
                          dashboardData.kpi.membersRequiringUpdateCount) /
                          dashboardData.kpi.activePlans) *
                          100
                      )
                    : 100}
                  % Compliant
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Verified Food Database
                </span>
                <p className="text-xs text-slate-500">
                  {dashboardData?.kpi.totalFoodItems || 0} high-protein and whole food items
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Standard Indian Gym Diet Ready</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          GLOBAL MODALS
          ==================================================================== */}
      {isPlanModalOpen && (
        <DietPlanModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          onSuccess={(newPlan) => {
            loadPlans();
            loadDashboard();
            setSelectedReportPlan(newPlan);
            setIsReportModalOpen(true);
          }}
          planToEdit={planToEdit}
          defaultMember={planDefaultMember}
          initialTargets={planInitialTargets}
        />
      )}

      {isFoodModalOpen && (
        <FoodItemModal
          isOpen={isFoodModalOpen}
          onClose={() => setIsFoodModalOpen(false)}
          onSuccess={() => {
            loadFoods();
            loadDashboard();
          }}
          foodToEdit={foodToEdit}
        />
      )}

      {isProgressModalOpen && (
        <WeightProgressModal
          isOpen={isProgressModalOpen}
          onClose={() => setIsProgressModalOpen(false)}
          onSuccess={() => {
            loadDashboard();
            if (selectedMemberId) loadMemberProfile(selectedMemberId);
          }}
          defaultMember={progressDefaultMember}
        />
      )}

      {isReportModalOpen && (
        <DietReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          plan={selectedReportPlan}
          recentProgress={memberProfileData?.progressHistory || []}
        />
      )}
    </div>
  );
};
