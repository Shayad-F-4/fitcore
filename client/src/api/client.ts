const API_BASE = import.meta.env.VITE_API_URL || '/api';
const LIVE_BACKEND_URL = 'https://sagar-fitness-backend.onrender.com';

export const getMediaUrl = (path?: string): string => {
  if (!path) return '';
  const trimmed = path.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (API_BASE.startsWith('http')) {
    try {
      const parsed = new URL(API_BASE);
      return `${parsed.origin}${cleanPath}`;
    } catch {
      // Fall through below
    }
  }

  // If in browser and not on localhost/127.0.0.1 (e.g. on Vercel deployment), point to Render backend
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    return `${LIVE_BACKEND_URL}${cleanPath}`;
  }

  return cleanPath;
};

const getHeaders = (hasBody = true): HeadersInit => {
  const token = localStorage.getItem('fitcore_token');
  const headers: HeadersInit = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async <T>(res: Response): Promise<T> => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = json.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return json.data !== undefined ? json.data : json;
};

// High-performance request deduplication & memory caching pipeline
const inFlightRequests = new Map<string, Promise<any>>();
const memoryCache = new Map<string, { data: any; expiry: number }>();

export const clearApiCache = () => {
  memoryCache.clear();
  inFlightRequests.clear();
};

if (typeof window !== 'undefined') {
  window.addEventListener('fitcore:data-changed', () => {
    clearApiCache();
  });
}

const cachedGet = async <T>(url: string, ttlMs = 4000): Promise<T> => {
  const cached = memoryCache.get(url);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }

  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url, { headers: getHeaders(false) });
      const data = await handleResponse<T>(res);
      memoryCache.set(url, { data, expiry: Date.now() + ttlMs });
      return data;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, promise);
  return promise;
};

export const api = {
  // Auth
  async login(credentials: { email?: string; identifier?: string; password: string }) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email: credentials.email || credentials.identifier,
        identifier: credentials.identifier || credentials.email,
        password: credentials.password,
      }),
    });
    return handleResponse<{ token: string; user: any }>(res);
  },

  async register(data: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ token: string; user: any }>(res);
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string; resetToken?: string }>(res);
  },

  async resetPassword(token: string, newPassword: string) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token, otp: token, newPassword }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(false),
    });
    return handleResponse<{ user: any }>(res);
  },

  async getStaff() {
    const res = await fetch(`${API_BASE}/auth/staff?_t=${Date.now()}`, {
      headers: {
        ...getHeaders(false),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    return handleResponse<any[]>(res);
  },

  async updateProfile(data: { fullName?: string; phone?: string; avatarUrl?: string }) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateStaff(id: string, data: any) {
    const res = await fetch(`${API_BASE}/auth/staff/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteStaff(id: string) {
    const res = await fetch(`${API_BASE}/auth/staff/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    clearApiCache();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'STAFF_DELETED', id } }));
    }
    return result;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Branches
  async getBranches() {
    return cachedGet<any[]>(`${API_BASE}/branches`, 10000);
  },

  // Membership Plans
  async getPlans(activeOnly = false, bypassCache = false) {
    if (bypassCache) {
      const res = await fetch(`${API_BASE}/plans?activeOnly=${activeOnly}`, {
        headers: getHeaders(false),
      });
      return handleResponse<any[]>(res);
    }
    return cachedGet<any[]>(`${API_BASE}/plans?activeOnly=${activeOnly}`, 5000);
  },

  async createPlan(data: any) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/plans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PLAN_CREATED', plan: result } }));
    return result;
  },

  async togglePlanStatus(id: string) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/plans/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PLAN_STATUS_TOGGLED', plan: result } }));
    return result;
  },

  async updatePlan(id: string, data: any) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/plans/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PLAN_UPDATED', plan: result } }));
    return result;
  },

  async deletePlan(id: string) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/plans/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PLAN_DELETED', id } }));
    return result;
  },

  // Members
  async getMembers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    branch?: string;
    plan?: string;
    isArchived?: boolean;
    tab?: string;
    gender?: string;
    paymentStatus?: string;
    joiningDate?: string;
    expiryPeriod?: string;
    sortBy?: string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.branch) query.set('branch', params.branch);
    if (params.plan) query.set('plan', params.plan);
    if (params.isArchived) query.set('isArchived', 'true');
    if (params.tab) query.set('tab', params.tab);
    if (params.gender) query.set('gender', params.gender);
    if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
    if (params.joiningDate) query.set('joiningDate', params.joiningDate);
    if (params.expiryPeriod) query.set('expiryPeriod', params.expiryPeriod);
    if (params.sortBy) query.set('sortBy', params.sortBy);

    const res = await fetch(`${API_BASE}/members?${query.toString()}`, {
      headers: getHeaders(false),
    });
    const json = await res.json();
    return {
      data: json.data || [],
      pagination: json.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 },
    };
  },

  async getMemberById(id: string) {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getMemberByQR(qrToken: string) {
    const res = await fetch(`${API_BASE}/members/by-qr/${qrToken}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getMemberStats(branchId?: string, bypassCache = false) {
    const url = `${API_BASE}/members/stats${branchId ? `?branchId=${branchId}` : ''}`;
    if (bypassCache) {
      const res = await fetch(url, { headers: getHeaders(false) });
      return handleResponse<any>(res);
    }
    return cachedGet<any>(url, 3500);
  },

  async registerMember(data: any) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBER_REGISTERED', member: result } }));
    return result;
  },

  async updateMember(id: string, data: any) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBER_UPDATED', member: result } }));
    return result;
  },

  async archiveMember(id: string) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/members/${id}/archive`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBER_ARCHIVED', id } }));
    return result;
  },

  async deleteMember(id: string) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBER_DELETED', id } }));
    return result;
  },

  async restoreMember(id: string) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/members/${id}/restore`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBER_RESTORED', id } }));
    return result;
  },

  // Memberships
  async getExpiringMemberships(days = 7) {
    return cachedGet<any[]>(`${API_BASE}/memberships/expiring?days=${days}`, 5000);
  },

  async assignMembership(data: { memberId: string; planId: string; startDate?: string; discount?: number; paymentMethod?: string }) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/memberships/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBERSHIP_ASSIGNED', membership: result } }));
    return result;
  },

  async renewMembership(id: string, data: { durationDays?: number; amountPaid?: number; paymentMethod?: string; newPlanId?: string }) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/memberships/${id}/renew`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBERSHIP_RENEWED', membership: result } }));
    return result;
  },

  async freezeMembership(id: string, data: { fromDate: string; toDate: string; reason: string }) {
    const res = await fetch(`${API_BASE}/memberships/${id}/freeze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async thawMembership(id: string) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/memberships/${id}/thaw`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'MEMBERSHIP_THAWED', id } }));
    return result;
  },

  // Attendance
  async getLiveOccupancy(branchId?: string) {
    return cachedGet<{ count: number; occupants: any[] }>(
      `${API_BASE}/attendance/live${branchId ? `?branchId=${branchId}` : ''}`,
      3000
    );
  },

  async getTodayAttendance(branchId?: string, date?: string) {
    const query = new URLSearchParams();
    if (branchId) query.set('branchId', branchId);
    if (date) query.set('date', date);

    const res = await fetch(`${API_BASE}/attendance/today?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any[]>(res);
  },

  async getAttendanceStats(branchId?: string) {
    return cachedGet<any>(
      `${API_BASE}/attendance/stats${branchId ? `?branchId=${branchId}` : ''}`,
      5000
    );
  },

  async checkIn(data: { identifier: string; method?: 'QR_CODE' | 'MANUAL'; branchId?: string }) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/attendance/check-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'CHECK_IN', result } }));
    return result;
  },

  async checkOut(attendanceId: string) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/attendance/check-out/${attendanceId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'CHECK_OUT', attendanceId } }));
    return result;
  },

  // Payments & Billing
  async getPayments(params: { page?: number; limit?: number; method?: string; type?: string; status?: string; startDate?: string; endDate?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.method) query.set('method', params.method);
    if (params.type) query.set('type', params.type);
    if (params.status) query.set('status', params.status);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/payments?${query.toString()}`, {
      headers: getHeaders(false),
    });
    const json = await res.json();
    return {
      data: json.data || [],
      pagination: json.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 },
    };
  },

  async getPaymentStats() {
    return cachedGet<any>(`${API_BASE}/payments/stats`, 3500);
  },

  async recordPayment(data: any) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PAYMENT_RECORDED', payment: result } }));
    return result;
  },

  async getReceipt(paymentId: string) {
    const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getDailySettlement(date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${API_BASE}/payments/daily-settlement${query}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      date: string;
      transactionCount: number;
      overallTotal: number;
      cashTotal: number;
      upiTotal: number;
      cardTotal: number;
      bankTotal: number;
      payments: any[];
    }>(res);
  },

  async getPendingDues() {
    return cachedGet<{
      duesCount: number;
      totalDuesAmount: number;
      memberships: any[];
    }>(`${API_BASE}/payments/dues`, 3500);
  },

  async collectDue(data: {
    membershipId: string;
    amountPaid: number;
    paymentMethod: string;
    notes?: string;
    transactionRef?: string;
  }) {
    clearApiCache();
    const res = await fetch(`${API_BASE}/payments/collect-due`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'DUE_COLLECTED', membershipId: data.membershipId, payment: result } }));
    return result;
  },

  // Dashboard
  async getDashboardStats(branchId?: string, bypassCache = false) {
    const url = `${API_BASE}/dashboard/stats${branchId ? `?branchId=${branchId}` : ''}`;
    if (bypassCache) {
      const res = await fetch(url, { headers: getHeaders(false) });
      return handleResponse<any>(res);
    }
    return cachedGet<any>(url, 3500);
  },

  // Photo Upload
  async uploadPhoto(imageBase64: string, filename?: string) {
    const res = await fetch(`${API_BASE}/upload/photo`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ imageBase64, filename }),
    });
    return handleResponse<{ url: string; size: number; filename: string }>(res);
  },

  // Member ID Generator
  async getNextMemberId() {
    const res = await fetch(`${API_BASE}/members/next-id`, {
      headers: getHeaders(false),
    });
    return handleResponse<{ nextId: string }>(res);
  },

  // Expiration Center
  async getExpirationCenter(filter = 'ALL') {
    return cachedGet<{
      summary: {
        expiringIn7Days: number;
        expiringToday: number;
        alreadyExpired: number;
        renewalsThisMonth: number;
      };
      members: any[];
    }>(`${API_BASE}/memberships/expiration-center?filter=${filter}`, 4000);
  },

  // Notifications
  async getNotifications(limit = 25) {
    const res = await fetch(`${API_BASE}/notifications?limit=${limit}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{ notifications: any[]; unreadCount: number }>(res);
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async dismissNotification(id: string) {
    const res = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async syncExpirations() {
    const res = await fetch(`${API_BASE}/notifications/sync-expirations`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Follow-ups
  async getMemberFollowUps(memberId: string) {
    const res = await fetch(`${API_BASE}/members/${memberId}/follow-ups`, {
      headers: getHeaders(false),
    });
    return handleResponse<any[]>(res);
  },

  async addMemberFollowUp(memberId: string, data: any) {
    const res = await fetch(`${API_BASE}/members/${memberId}/follow-ups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Get Member Profile
  async getMember(id: string) {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  // Audit Logs
  async getAuditLogs(
    pageOrParams?: number | { page?: number; limit?: number; action?: string; userRole?: string },
    limitArg = 50
  ) {
    let page = 1;
    let limit = 50;
    let action = '';
    let userRole = '';

    if (typeof pageOrParams === 'number') {
      page = pageOrParams;
      limit = limitArg;
    } else if (pageOrParams && typeof pageOrParams === 'object') {
      page = pageOrParams.page || 1;
      limit = pageOrParams.limit || 50;
      action = pageOrParams.action || '';
      userRole = pageOrParams.userRole || '';
    }

    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (action && action !== 'ALL') query.append('action', action);
    if (userRole && userRole !== 'ALL') query.append('userRole', userRole);

    const res = await fetch(`${API_BASE}/audit-logs?${query.toString()}`, {
      headers: getHeaders(false),
    });
    const json = await res.json();
    return {
      data: json.data || [],
      pagination: json.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 },
    };
  },

  // Gym Settings & Business Profile
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async updateSettings(data: any) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async testWhatsApp(testPhone: string) {
    const res = await fetch(`${API_BASE}/settings/test-whatsapp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ testPhone }),
    });
    return handleResponse<any>(res);
  },

  // Membership Expiry & WhatsApp Automation
  async getGroupedExpiry() {
    const res = await fetch(`${API_BASE}/expiry/grouped`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      summary: {
        in2DaysCount: number;
        in4To5DaysCount: number;
        expiredCount: number;
      };
      expiringIn2Days: any[];
      expiringIn4To5Days: any[];
      expired: any[];
      whatsappConfigured: boolean;
    }>(res);
  },

  async logManualReminder(data: {
    membershipId?: string;
    memberId: string;
    recipientPhone: string;
    recipientName: string;
    message?: string;
  }) {
    const res = await fetch(`${API_BASE}/expiry/manual-reminder`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async runReminderSchedulerNow() {
    const res = await fetch(`${API_BASE}/expiry/run-scheduler-now`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async getNotificationLogs(page = 1, status = 'ALL') {
    const query = new URLSearchParams({ page: String(page) });
    if (status && status !== 'ALL') query.append('status', status);

    const res = await fetch(`${API_BASE}/expiry/notification-logs?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      logs: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(res);
  },

  // ==========================================
  // INVENTORY & POS API METHODS
  // ==========================================

  async getInventoryDashboard() {
    const res = await fetch(`${API_BASE}/inventory/dashboard`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getProducts(params?: Record<string, string>) {
    const query = new URLSearchParams(params || {});
    const res = await fetch(`${API_BASE}/inventory/products?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      products: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(res);
  },

  async getProduct(id: string) {
    const res = await fetch(`${API_BASE}/inventory/products/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async createProduct(data: any) {
    const res = await fetch(`${API_BASE}/inventory/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PRODUCT_CREATED', product: result } }));
    return result;
  },

  async updateProduct(id: string, data: any) {
    const res = await fetch(`${API_BASE}/inventory/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PRODUCT_UPDATED', product: result } }));
    return result;
  },

  async deleteProduct(id: string) {
    const res = await fetch(`${API_BASE}/inventory/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PRODUCT_DELETED', id } }));
    return result;
  },

  async adjustStock(data: { productId: string; movementType: string; quantity: number; reason: string }) {
    const res = await fetch(`${API_BASE}/inventory/stock/adjust`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'STOCK_ADJUSTED', result } }));
    return result;
  },

  async getStockMovements(params?: Record<string, string>) {
    const query = new URLSearchParams(params || {});
    const res = await fetch(`${API_BASE}/inventory/stock/movements?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      movements: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(res);
  },

  async getSuppliers() {
    const res = await fetch(`${API_BASE}/inventory/suppliers`, {
      headers: getHeaders(false),
    });
    return handleResponse<any[]>(res);
  },

  async getSupplier(id: string) {
    const res = await fetch(`${API_BASE}/inventory/suppliers/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async createSupplier(data: any) {
    const res = await fetch(`${API_BASE}/inventory/suppliers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'SUPPLIER_CREATED', supplier: result } }));
    return result;
  },

  async updateSupplier(id: string, data: any) {
    const res = await fetch(`${API_BASE}/inventory/suppliers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'SUPPLIER_UPDATED', supplier: result } }));
    return result;
  },

  async getPurchases(params?: Record<string, string>) {
    const query = new URLSearchParams(params || {});
    const res = await fetch(`${API_BASE}/inventory/purchases?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      purchases: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(res);
  },

  async getPurchase(id: string) {
    const res = await fetch(`${API_BASE}/inventory/purchases/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async createPurchase(data: any) {
    const res = await fetch(`${API_BASE}/inventory/purchases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PURCHASE_CREATED', purchase: result } }));
    return result;
  },

  async createInventorySale(data: any) {
    const res = await fetch(`${API_BASE}/inventory/sales`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'INVENTORY_SALE', sale: result } }));
    return result;
  },

  async getInventorySales(params?: Record<string, string>) {
    const query = new URLSearchParams(params || {});
    const res = await fetch(`${API_BASE}/inventory/sales?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      sales: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(res);
  },

  async getInventorySale(id: string) {
    const res = await fetch(`${API_BASE}/inventory/sales/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async cancelInventorySale(id: string, reason: string) {
    const res = await fetch(`${API_BASE}/inventory/sales/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'SALE_CANCELLED', id } }));
    return result;
  },

  async refundInventorySale(id: string, data: { reason: string; restock?: boolean }) {
    const res = await fetch(`${API_BASE}/inventory/sales/${id}/refund`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'SALE_REFUNDED', id } }));
    return result;
  },

  async getInventoryReports(params?: Record<string, string>) {
    const query = new URLSearchParams(params || {});
    const res = await fetch(`${API_BASE}/inventory/reports?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async downloadInventoryCsv(params: { type: string; period?: string; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams(params as any);
    const res = await fetch(`${API_BASE}/inventory/reports/export?${query.toString()}`, {
      headers: getHeaders(false),
    });
    if (!res.ok) throw new Error('Failed to download CSV export');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${params.type}-${params.period || 'custom'}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /* ==========================================================================
     Diet & Calorie Management API
     ========================================================================== */
  async getDietDashboard() {
    const res = await fetch(`${API_BASE}/diet/dashboard`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async calculateCalories(data: {
    age: number;
    gender: 'MALE' | 'FEMALE';
    heightCm: number;
    weightKg: number;
    activityLevel: string;
    fitnessGoal: string;
  }) {
    const res = await fetch(`${API_BASE}/diet/calculate-calories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async getFoods(params?: Record<string, string>) {
    const query = new URLSearchParams(params || {});
    const res = await fetch(`${API_BASE}/diet/foods?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async createFood(data: any) {
    const res = await fetch(`${API_BASE}/diet/foods`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'FOOD_CREATED' } }));
    return result;
  },

  async updateFood(id: string, data: any) {
    const res = await fetch(`${API_BASE}/diet/foods/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'FOOD_UPDATED', id } }));
    return result;
  },

  async deleteFood(id: string) {
    const res = await fetch(`${API_BASE}/diet/foods/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'FOOD_DELETED', id } }));
    return result;
  },

  async getDietPlans(params?: Record<string, string>) {
    const query = new URLSearchParams(params || {});
    const res = await fetch(`${API_BASE}/diet/plans?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async createDietPlan(data: any) {
    const res = await fetch(`${API_BASE}/diet/plans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'DIET_PLAN_CREATED' } }));
    return result;
  },

  async getDietPlan(id: string) {
    const res = await fetch(`${API_BASE}/diet/plans/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async updateDietPlan(id: string, data: any) {
    const res = await fetch(`${API_BASE}/diet/plans/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'DIET_PLAN_UPDATED', id } }));
    return result;
  },

  async duplicateDietPlan(id: string, data?: { targetMemberId?: string; newPlanName?: string }) {
    const res = await fetch(`${API_BASE}/diet/plans/${id}/duplicate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data || {}),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'DIET_PLAN_DUPLICATED', id } }));
    return result;
  },

  async getMemberDietProfile(memberId: string) {
    const res = await fetch(`${API_BASE}/diet/members/${memberId}/profile`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getMemberProgress(memberId: string) {
    const res = await fetch(`${API_BASE}/diet/members/${memberId}/progress`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async recordMemberProgress(memberId: string, data: any) {
    const res = await fetch(`${API_BASE}/diet/members/${memberId}/progress`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PROGRESS_RECORDED', memberId } }));
    return result;
  },

  async deleteMemberProgress(progressId: string) {
    const res = await fetch(`${API_BASE}/diet/progress/${progressId}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PROGRESS_DELETED', progressId } }));
    return result;
  },

  async getDietPlanPrintData(id: string) {
    const res = await fetch(`${API_BASE}/diet/plans/${id}/print`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  // ================= AI FITNESS COACH MODULE =================
  async getAiCoachStatus() {
    const res = await fetch(`${API_BASE}/ai-coach/status`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getAiCoachDashboard() {
    const res = await fetch(`${API_BASE}/ai-coach/dashboard`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getFitnessProfiles(page = 1, limit = 20) {
    const res = await fetch(`${API_BASE}/ai-coach/profiles?page=${page}&limit=${limit}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getMemberFitnessProfile(memberId: string) {
    const res = await fetch(`${API_BASE}/ai-coach/profiles/member/${memberId}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async saveFitnessProfile(data: any) {
    const res = await fetch(`${API_BASE}/ai-coach/profiles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'FITNESS_PROFILE_SAVED' } }));
    return result;
  },

  async generateAiDietPlan(memberId: string) {
    const res = await fetch(`${API_BASE}/ai-coach/generate/diet`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ memberId }),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'AI_DIET_PLAN_GENERATED', memberId } }));
    return result;
  },

  async generateAiWorkoutPlan(memberId: string) {
    const res = await fetch(`${API_BASE}/ai-coach/generate/workout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ memberId }),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'AI_WORKOUT_PLAN_GENERATED', memberId } }));
    return result;
  },

  async getWorkoutPlans(params?: { memberId?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.memberId) query.set('memberId', params.memberId);
    if (params?.status) query.set('status', params.status);
    const res = await fetch(`${API_BASE}/ai-coach/workouts?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getWorkoutPlan(id: string) {
    const res = await fetch(`${API_BASE}/ai-coach/workouts/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async createWorkoutPlan(data: any) {
    const res = await fetch(`${API_BASE}/ai-coach/workouts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'WORKOUT_PLAN_CREATED' } }));
    return result;
  },

  async updateWorkoutPlan(id: string, data: any) {
    const res = await fetch(`${API_BASE}/ai-coach/workouts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'WORKOUT_PLAN_UPDATED', id } }));
    return result;
  },

  async deleteWorkoutPlan(id: string) {
    const res = await fetch(`${API_BASE}/ai-coach/workouts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'WORKOUT_PLAN_DELETED', id } }));
    return result;
  },

  async getPendingPlanApprovals() {
    const res = await fetch(`${API_BASE}/ai-coach/approvals/pending`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async approveDietPlan(id: string) {
    const res = await fetch(`${API_BASE}/ai-coach/diet-plans/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PLAN_APPROVED', id } }));
    return result;
  },

  async rejectDietPlan(id: string, reason?: string) {
    const res = await fetch(`${API_BASE}/ai-coach/diet-plans/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'PLAN_REJECTED', id } }));
    return result;
  },

  async approveWorkoutPlan(id: string) {
    const res = await fetch(`${API_BASE}/ai-coach/workouts/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'WORKOUT_APPROVED', id } }));
    return result;
  },

  async rejectWorkoutPlan(id: string, reason?: string) {
    const res = await fetch(`${API_BASE}/ai-coach/workouts/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'WORKOUT_REJECTED', id } }));
    return result;
  },

  async getWeeklyCalendar(memberId: string) {
    const res = await fetch(`${API_BASE}/ai-coach/calendar/member/${memberId}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getPremiumEntitlements() {
    const res = await fetch(`${API_BASE}/ai-coach/entitlements`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async createPremiumEntitlement(data: any) {
    const res = await fetch(`${API_BASE}/ai-coach/entitlements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'ENTITLEMENT_CREATED' } }));
    return result;
  },

  async deletePremiumEntitlement(id: string) {
    const res = await fetch(`${API_BASE}/ai-coach/entitlements/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'ENTITLEMENT_DELETED', id } }));
    return result;
  },

  async getPlanReviews() {
    const res = await fetch(`${API_BASE}/ai-coach/reviews`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async generateWeeklyReview(memberId: string) {
    const res = await fetch(`${API_BASE}/ai-coach/reviews/generate/${memberId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'REVIEW_GENERATED', memberId } }));
    return result;
  },

  async actionPlanReview(id: string, action: 'APPROVE' | 'DISMISS') {
    const res = await fetch(`${API_BASE}/ai-coach/reviews/${id}/action`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ action }),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'REVIEW_ACTIONED', id } }));
    return result;
  },

  async getEducationalSupplements() {
    const res = await fetch(`${API_BASE}/ai-coach/supplements`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getFitnessNotifications() {
    const res = await fetch(`${API_BASE}/ai-coach/notifications`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async updateNotificationOptIn(data: any) {
    const res = await fetch(`${API_BASE}/ai-coach/notifications/opt-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async sendManualNotification(data: any) {
    const res = await fetch(`${API_BASE}/ai-coach/notifications/send-manual`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async getFitnessCoachSettings() {
    const res = await fetch(`${API_BASE}/ai-coach/settings`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async getMlModelStatus() {
    const res = await fetch(`${API_BASE}/ai-coach/ml/status`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async predictMlPlan(data: any) {
    const res = await fetch(`${API_BASE}/ai-coach/ml/predict`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async retrainMlModel() {
    const res = await fetch(`${API_BASE}/ai-coach/ml/retrain`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await handleResponse<any>(res);
    window.dispatchEvent(new CustomEvent('fitcore:data-changed', { detail: { action: 'ML_MODEL_RETRAINED' } }));
    return result;
  },
};


