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
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
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
  createdAt: string;
}

export interface Attendance {
  _id: string;
  member: Member;
  branch: Branch;
  checkInTime: string;
  checkOutTime?: string;
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
  newMembersThisMonth: number;
  liveOccupancy: number;
  gymCapacity: number;
  occupancyPercentage: number;
  todayTotalCheckins: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  expiringMemberships: Membership[];
  monthlyRevenueData: { month: string; revenue: number }[];
  recentActivity: any[];
}
