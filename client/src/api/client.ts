const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
    const res = await fetch(`${API_BASE}/auth/staff`, {
      headers: getHeaders(false),
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
    return handleResponse<any>(res);
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
  async getPlans(activeOnly = false) {
    return cachedGet<any[]>(`${API_BASE}/plans?activeOnly=${activeOnly}`, 5000);
  },

  async createPlan(data: any) {
    const res = await fetch(`${API_BASE}/plans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async togglePlanStatus(id: string) {
    const res = await fetch(`${API_BASE}/plans/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async updatePlan(id: string, data: any) {
    const res = await fetch(`${API_BASE}/plans/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deletePlan(id: string) {
    const res = await fetch(`${API_BASE}/plans/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Members
  async getMembers(params: { page?: number; limit?: number; search?: string; status?: string; branch?: string; plan?: string; isArchived?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.branch) query.set('branch', params.branch);
    if (params.plan) query.set('plan', params.plan);
    if (params.isArchived) query.set('isArchived', 'true');

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

  async getMemberStats(branchId?: string) {
    const res = await fetch(`${API_BASE}/members/stats${branchId ? `?branchId=${branchId}` : ''}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async registerMember(data: any) {
    const res = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateMember(id: string, data: any) {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async archiveMember(id: string) {
    const res = await fetch(`${API_BASE}/members/${id}/archive`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async deleteMember(id: string) {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async restoreMember(id: string) {
    const res = await fetch(`${API_BASE}/members/${id}/restore`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Memberships
  async getExpiringMemberships(days = 7) {
    const res = await fetch(`${API_BASE}/memberships/expiring?days=${days}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any[]>(res);
  },

  async assignMembership(data: { memberId: string; planId: string; startDate?: string; discount?: number; paymentMethod?: string }) {
    const res = await fetch(`${API_BASE}/memberships/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async renewMembership(id: string, data: { durationDays?: number; amountPaid?: number; paymentMethod?: string; newPlanId?: string }) {
    const res = await fetch(`${API_BASE}/memberships/${id}/renew`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
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
    const res = await fetch(`${API_BASE}/memberships/${id}/thaw`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Attendance
  async getLiveOccupancy(branchId?: string) {
    const res = await fetch(`${API_BASE}/attendance/live${branchId ? `?branchId=${branchId}` : ''}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{ count: number; occupants: any[] }>(res);
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
    const res = await fetch(`${API_BASE}/attendance/stats${branchId ? `?branchId=${branchId}` : ''}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async checkIn(data: { identifier: string; method?: 'QR_CODE' | 'MANUAL'; branchId?: string }) {
    const res = await fetch(`${API_BASE}/attendance/check-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async checkOut(attendanceId: string) {
    const res = await fetch(`${API_BASE}/attendance/check-out/${attendanceId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
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
    const res = await fetch(`${API_BASE}/payments/stats`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  async recordPayment(data: any) {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
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
    const res = await fetch(`${API_BASE}/payments/dues`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      duesCount: number;
      totalDuesAmount: number;
      memberships: any[];
    }>(res);
  },

  async collectDue(data: {
    membershipId: string;
    amountPaid: number;
    paymentMethod: string;
    notes?: string;
    transactionRef?: string;
  }) {
    const res = await fetch(`${API_BASE}/payments/collect-due`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Dashboard
  async getDashboardStats(branchId?: string) {
    const res = await fetch(`${API_BASE}/dashboard/stats${branchId ? `?branchId=${branchId}` : ''}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
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
    const res = await fetch(`${API_BASE}/memberships/expiration-center?filter=${filter}`, {
      headers: getHeaders(false),
    });
    return handleResponse<{
      summary: {
        expiringIn7Days: number;
        expiringToday: number;
        alreadyExpired: number;
        renewalsThisMonth: number;
      };
      members: any[];
    }>(res);
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

  // Database Backup & Recovery
  async getBackups() {
    const res = await fetch(`${API_BASE}/backup`, {
      headers: getHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async createBackup() {
    const res = await fetch(`${API_BASE}/backup/create`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async restoreBackup(filename: string) {
    const res = await fetch(`${API_BASE}/backup/restore/${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async deleteBackup(filename: string) {
    const res = await fetch(`${API_BASE}/backup/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  getBackupDownloadUrl(filename: string) {
    return `${API_BASE}/backup/download/${encodeURIComponent(filename)}`;
  },
};
