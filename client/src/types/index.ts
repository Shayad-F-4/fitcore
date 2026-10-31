export type UserRole = 'SUPER_ADMIN' | 'GYM_ADMIN' | 'RECEPTIONIST' | 'TRAINER' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  branch?: string | Branch;
  avatarUrl?: string;
  lastLogin?: string;
}

export interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  openingHours: string;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface MembershipPlan {
  _id: string;
  name: string;
  type: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL' | 'DAY_PASS' | 'TRIAL' | 'PT_PACKAGE';
  durationDays: number;
  price: number;
  description: string;
  features: string[];
  active: boolean;
  isPopular?: boolean;
  badge?: string;
  createdAt?: string;
}

export interface FreezeRecord {
  fromDate: string;
  toDate: string;
  reason: string;
  thawedAt?: string;
}

export interface RenewalRecord {
  renewedAt: string;
  previousExpiryDate: string;
  newExpiryDate: string;
  amountPaid: number;
}

export interface Membership {
  _id: string;
  member: string | Member;
  plan: MembershipPlan;
  startDate: string;
  expiryDate: string;
  originalPrice: number;
  discount: number;
  amountDue: number;
  amountPaid: number;
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';
  freezeHistory?: FreezeRecord[];
  renewalHistory?: RenewalRecord[];
  notes?: string;
  createdAt: string;
}

export interface Member {
  _id: string;
  memberId: string;
  user?: string;
  fullName: string;
  email: string;
  phone: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  dob?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'ARCHIVED' | 'PENDING';
  branch: Branch;
  assignedTrainer?: {
    _id: string;
    fullName: string;
    email: string;
  };
  fitnessGoals: string[];
  photoUrl: string;
  qrCodeToken: string;
  notes?: string;
  joinDate: string;
  isArchived: boolean;
  currentMembership?: Membership;
  paymentStatus?: 'PAID' | 'PENDING_PAYMENT' | 'NO_DUES';
  balanceDue?: number;
  totalDue?: number;
  totalPaid?: number;
  daysRemaining?: number;
  daysSinceExpiry?: number;
  expiryLabel?: string;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  createdAt: string;
}

export interface Attendance {
  _id: string;
  member: Member;
  branch: Branch;
  checkInTime: string;
  checkOutTime?: string;
  durationMinutes?: number | null;
  method: 'QR_CODE' | 'MANUAL';
  checkedInBy?: {
    _id: string;
    fullName: string;
  };
  notes?: string;
  createdAt: string;
}

export interface Payment {
  _id: string;
  receiptNumber: string;
  member: Member;
  membership?: Membership;
  amount: number;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'BANK_TRANSFER';
  transactionRef?: string;
  status: 'PAID' | 'PARTIAL' | 'REFUNDED';
  type: 'MEMBERSHIP' | 'RENEWAL' | 'PERSONAL_TRAINING' | 'DAY_PASS' | 'MERCHANDISE';
  balanceRemaining: number;
  notes?: string;
  recordedBy: {
    _id: string;
    fullName: string;
  };
  paymentDate: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  expiringMemberships: number;
  alreadyExpiredCount?: number;
  newMembersThisMonth: number;
  liveOccupancy: number;
  gymCapacity: number;
  occupancyPercentage: number;
  todayTotalCheckins: number;
  todayRevenue?: number;
  monthlyRevenue: number;
  totalRevenue: number;
  pendingDuesTotal?: number;
  pendingDuesCount?: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  expiringMemberships: Membership[];
  expiredMemberships?: Membership[];
  recentMembers?: any[];
  monthlyRevenueData: { month: string; revenue: number }[];
  recentActivity: any[];
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'EXPIRING_SOON' | 'EXPIRING_TODAY' | 'EXPIRED' | 'RENEWAL_SUCCESS' | 'PAYMENT_PENDING' | 'SYSTEM';
  member?: {
    _id: string;
    fullName: string;
    memberId: string;
    photoUrl?: string;
  };
  membership?: {
    _id: string;
    status: string;
    expiryDate: string;
  };
  read: boolean;
  dismissed: boolean;
  createdAt: string;
}

export interface FollowUpItem {
  _id: string;
  member: string;
  type: 'CALL' | 'SMS' | 'WHATSAPP' | 'IN_PERSON' | 'STAFF_NOTE';
  status: 'PENDING' | 'CONTACTED' | 'RENEWAL_COMPLETED' | 'CANCELLED';
  notes: string;
  followUpDate?: string;
  contactOutcome?: string;
  recordedBy: {
    _id: string;
    fullName: string;
    role?: string;
  };
  createdAt: string;
}

// ==========================================
// INVENTORY, POS & SUPPLIER TYPES
// ==========================================

export interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  description?: string;
  purchaseCost?: number; // Redacted for receptionists
  sellingPrice: number;
  currentStock: number;
  minStockThreshold: number;
  unit: string;
  supplier?: {
    _id: string;
    name: string;
    phone: string;
  };
  batchNumber?: string;
  expiryDate?: string;
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  product: string | Product;
  productName: string;
  sku: string;
  quantity: number;
  purchaseCost: number;
  lineTotal: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface Purchase {
  _id: string;
  invoiceNumber: string;
  supplier: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  purchaseDate: string;
  items: PurchaseItem[];
  overallTotal: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD';
  notes?: string;
  recordedBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt?: string;
}

export interface StockMovement {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    unit?: string;
    sellingPrice?: number;
  };
  movementType:
    | 'PURCHASE'
    | 'SALE'
    | 'RETURN'
    | 'DAMAGE'
    | 'EXPIRY'
    | 'ADJUSTMENT_ADD'
    | 'ADJUSTMENT_SUBTRACT';
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  referenceType?: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'MANUAL';
  referenceId?: string;
  reason: string;
  performedBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  performedByName?: string;
  createdAt: string;
}

export interface SaleItem {
  product: string | Product;
  name: string;
  sku: string;
  quantity: number;
  unitCost?: number;
  unitPrice: number;
  lineTotal: number;
  lineCostTotal?: number;
}

export interface InventorySale {
  _id: string;
  receiptNumber: string;
  customerMember?: {
    _id: string;
    fullName: string;
    memberId: string;
    phone?: string;
    email?: string;
  };
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  totalCost?: number; // Redacted for receptionists
  grossProfit?: number; // Redacted for receptionists
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING';
  paymentStatus: 'PAID' | 'REFUNDED' | 'CANCELLED';
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  cashier?: {
    _id: string;
    fullName: string;
    email?: string;
  };
  saleDate: string;
  cancellationReason?: string;
  cancelledAt?: string;
  refundedAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  restockedOnRefund?: boolean;
  createdAt?: string;
}

export interface InventoryDashboardStats {
  totalActiveProducts: number;
  totalStockUnits: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  todaySales: number;
  todayGrossProfit?: number;
  todaySalesCount: number;
  monthSales: number;
  monthGrossProfit?: number;
  monthSalesCount: number;
  inventoryValuation?: number;
  productsApproachingExpiry: number;
  lowStockList: {
    _id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStockThreshold: number;
    unit: string;
    sellingPrice: number;
  }[];
  expiringList: {
    _id: string;
    name: string;
    sku: string;
    currentStock: number;
    expiryDate: string;
    batchNumber?: string;
  }[];
}

export interface InventoryReportData {
  period: string;
  dateRange: { start: string; end: string };
  sales: {
    totalRevenue: number;
    totalCost?: number;
    grossProfit?: number;
    totalDiscount: number;
    salesCount: number;
  };
  stock: {
    totalActiveProducts: number;
    totalUnits: number;
    totalValuation?: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  productSales: {
    productId: string;
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
    cost?: number;
    profit?: number;
  }[];
  supplierBalances?: {
    _id: string;
    name: string;
    phone: string;
    totalPurchases: number;
    totalPaid: number;
    outstandingBalance: number;
  }[];
}

/* ==========================================================================
   Diet & Calorie Management Types
   ========================================================================== */
export type FoodCategory =
  | 'PROTEINS'
  | 'CARBOHYDRATES'
  | 'HEALTHY_FATS'
  | 'DAIRY'
  | 'VEGETABLES'
  | 'FRUITS'
  | 'SUPPLEMENTS'
  | 'SNACKS_OTHERS';

export interface FoodItem {
  _id: string;
  name: string;
  category: FoodCategory;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  source: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export type FitnessGoal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE' | 'ENDURANCE';

export type MealType =
  | 'BREAKFAST'
  | 'MORNING_SNACK'
  | 'LUNCH'
  | 'EVENING_SNACK'
  | 'DINNER';

export interface MealItem {
  _id?: string;
  foodItem?: string | FoodItem;
  foodName: string;
  servingUnit: string;
  servingSize: number;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  notes?: string;
}

export interface MealSchedule {
  _id?: string;
  mealType: MealType;
  name: string;
  time?: string;
  items: MealItem[];
  mealCalories: number;
  mealProtein: number;
  mealCarbs: number;
  mealFat: number;
  mealFiber?: number;
}

export interface DietPlan {
  _id: string;
  name: string;
  member: {
    _id: string;
    memberId: string;
    fullName: string;
    phone: string;
    email?: string;
    gender?: string;
    dob?: string;
    photoUrl?: string;
  };
  fitnessGoal: FitnessGoal;
  startDate: string;
  endDate?: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterIntakeLiters?: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'ARCHIVED';
  approvalStatus?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  version?: number;
  source?: 'AI_GENERATED' | 'MANUAL';
  shoppingList?: Array<{ item: string; quantity: string; category?: string }>;
  allergyWarnings?: string[];
  sevenDaySchedule?: Array<{
    day: string;
    dayCalories: number;
    dayProtein: number;
    dayCarbs: number;
    dayFat: number;
    meals: MealSchedule[];
  }>;
  meals: MealSchedule[];
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyFiber?: number;
  createdBy?: {
    _id: string;
    fullName: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface WeightProgress {
  _id: string;
  member: string | Member;
  date: string;
  weight: number;
  height?: number;
  bmi?: number;
  waist?: number;
  chest?: number;
  arms?: number;
  hips?: number;
  bodyFat?: number;
  notes?: string;
  recordedBy?: {
    _id: string;
    fullName: string;
  };
  createdAt?: string;
}

export interface CalorieCalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  waterIntakeLiters: number;
  calorieAdjustment: number;
  adjustmentDescription: string;
  formulaUsed: string;
  safetyNotice?: string;
  disclaimer: string;
  bmi?: number;
  bmiCategory?: string;
  bmiDescription?: string;
}

export interface DietDashboardData {
  kpi: {
    totalPlans: number;
    activePlans: number;
    weightLossPlans: number;
    muscleGainPlans: number;
    maintenancePlans: number;
    membersRequiringUpdateCount: number;
    totalFoodItems: number;
  };
  membersNeedingCheckIn: {
    _id: string;
    memberId: string;
    fullName: string;
    phone: string;
    photoUrl?: string;
  }[];
  recentPlans: DietPlan[];
}

export type DietaryPreference =
  | 'VEGETARIAN'
  | 'NON_VEGETARIAN'
  | 'EGGETARIAN'
  | 'VEGAN'
  | 'JAIN'
  | 'OTHER';

export type FitnessExperience = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type AvailableEquipment =
  | 'FULL_GYM'
  | 'DUMBBELLS_ONLY'
  | 'BODYWEIGHT_HOME'
  | 'RESISTANCE_BANDS';

export interface FitnessProfile {
  _id?: string;
  member: string | Member;
  age: number;
  gender: 'MALE' | 'FEMALE';
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg?: number;
  fitnessExperience: FitnessExperience;
  fitnessGoal: FitnessGoal | 'STRENGTH';
  activityLevel: string;
  preferredWorkoutTime?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  workoutDaysPerWeek: number;
  workoutDurationMins: number;
  availableEquipment: AvailableEquipment;
  exerciseLimitations?: string[];
  dietaryPreference: DietaryPreference;
  allergies?: string[];
  likedFoods?: string[];
  dislikedFoods?: string[];
  mealTimings?: string[];
  mealsPerDay: number;
  foodBudget?: 'BUDGET' | 'MODERATE' | 'PREMIUM';
  foodPreparationPreference?: 'HOME_COOKED' | 'MEAL_PREP' | 'QUICK_EASY';
  sleepDurationHours?: number;
  dailyStepsTarget?: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterIntakeLiters: number;
  bmi?: number;
  status: 'ACTIVE' | 'ARCHIVED';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutExercise {
  _id?: string;
  exerciseName: string;
  targetMuscle: string;
  equipment?: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  techniqueNotes?: string;
  alternatives?: string[];
  estimatedCaloriesBurned?: number;
}

export interface WorkoutDaySchedule {
  _id?: string;
  dayName: string;
  workoutTitle: string;
  isRestDay: boolean;
  targetMuscleGroups: string[];
  warmUp?: string;
  coolDown?: string;
  estimatedDurationMins: number;
  exercises: WorkoutExercise[];
  notes?: string;
}

export interface WorkoutPlan {
  _id: string;
  name: string;
  member: Member;
  fitnessGoal: string;
  experienceLevel: string;
  availableEquipment: string;
  daysPerWeek: number;
  startDate: string;
  endDate?: string;
  schedule: WorkoutDaySchedule[];
  approvalStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  version: number;
  source: 'AI_GENERATED' | 'MANUAL';
  approvedBy?: any;
  approvedAt?: string;
  rejectionReason?: string;
  limitationsConsidered?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PremiumEntitlement {
  _id: string;
  member: Member;
  planName: string;
  features: {
    personalizedDiet: boolean;
    personalizedWorkout: boolean;
    weeklyPdfReports: boolean;
    progressTracking: boolean;
    reminders: boolean;
  };
  startDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  notes?: string;
  createdAt?: string;
}

export interface PlanReview {
  _id: string;
  member: Member;
  weekNumber: number;
  reviewDate: string;
  startingWeightKg?: number;
  currentWeightKg?: number;
  weightDeltaKg?: number;
  adherencePercentage: number;
  complianceNotes?: string;
  suggestedCalorieDelta?: number;
  suggestedWorkoutNotes?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DISMISSED';
  reviewedBy?: any;
  reviewedAt?: string;
  createdAt?: string;
}

export interface SupplementItem {
  id: string;
  name: string;
  category: string;
  evidenceRating: 'STRONG' | 'MODERATE' | 'EMERGING';
  suitableFor: string[];
  primaryBenefit: string;
  typicalDosage: string;
  recommendedTiming: string;
  scientificNotes: string;
  safetyPrecautions: string[];
  isEssential: boolean;
}

export interface AiCoachStatus {
  isConfigured: boolean;
  provider: 'GEMINI' | 'OPENAI' | 'INTELLIGENT_LOCAL';
  modelName: string;
  message: string;
}



