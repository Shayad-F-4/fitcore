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

