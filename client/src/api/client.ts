const API_BASE = '/api';

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

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials),
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

  async demoLogin(role: string) {
    const res = await fetch(`${API_BASE}/auth/demo-login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ role }),
    });
    return handleResponse<{ token: string; user: any }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(false),
    });
    return handleResponse<{ user: any }>(res);
  },

  // Branches
  async getBranches() {
    const res = await fetch(`${API_BASE}/branches`, {
      headers: getHeaders(false),
    });
    return handleResponse<any[]>(res);
  },

  // Membership Plans
  async getPlans(activeOnly = false) {
    const res = await fetch(`${API_BASE}/plans?activeOnly=${activeOnly}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any[]>(res);
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

  // Members
  async getMembers(params: { page?: number; limit?: number; search?: string; status?: string; branch?: string; isArchived?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.branch) query.set('branch', params.branch);
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

  async getTodayAttendance(branchId?: string) {
    const res = await fetch(`${API_BASE}/attendance/today${branchId ? `?branchId=${branchId}` : ''}`, {
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
  async getPayments(params: { page?: number; limit?: number; method?: string; type?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.method) query.set('method', params.method);
    if (params.type) query.set('type', params.type);

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

  // Dashboard
  async getDashboardStats(branchId?: string) {
    const res = await fetch(`${API_BASE}/dashboard/stats${branchId ? `?branchId=${branchId}` : ''}`, {
      headers: getHeaders(false),
    });
    return handleResponse<any>(res);
  },

  // Audit Logs
  async getAuditLogs(page = 1, limit = 20) {
    const res = await fetch(`${API_BASE}/audit-logs?page=${page}&limit=${limit}`, {
      headers: getHeaders(false),
    });
    const json = await res.json();
    return {
      data: json.data || [],
      pagination: json.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },
};
