// FitCore — Sagar Fitness Gym Simple Vanilla API Helper
const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('fitcore_token');
  },

  getHeaders(isJSON = true) {
    const headers = {};
    if (isJSON) headers['Content-Type'] = 'application/json';
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  async request(endpoint, options = {}) {
    const isJSON = !(options.body instanceof FormData);
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(isJSON),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('fitcore_token');
          localStorage.removeItem('fitcore_user');
          if (!window.location.pathname.includes('login')) {
            window.location.href = '/login.html';
          }
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data.data !== undefined ? data.data : data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // HTTP Shortcuts
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  del(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // Auth Endpoints
  login(identifier, password) {
    return this.post('/auth/login', { identifier, password });
  },

  forgotPassword(email) {
    return this.post('/auth/forgot-password', { email });
  },

  resetPassword(token, newPassword) {
    return this.post('/auth/reset-password', { token, otp: token, newPassword });
  },

  getMe() {
    return this.get('/auth/me');
  },

  changePassword(currentPassword, newPassword) {
    return this.post('/auth/change-password', { currentPassword, newPassword });
  },

  // Staff Management
  getStaff() {
    return this.get('/auth/staff');
  },

  registerStaff(data) {
    return this.post('/auth/register', data);
  },

  deleteStaff(id) {
    return this.del(`/auth/staff/${id}`);
  },

  // Dashboard Endpoints
  getDashboardStats() {
    return this.get('/dashboard/stats');
  },

  getRecentPayments() {
    return this.get('/dashboard/recent-payments');
  },

  getExpiringMembers(days = 7) {
    return this.get(`/expiry/upcoming?days=${days}`);
  },

  // Members Endpoints
  getMembers(search = '', status = '', page = 1, limit = 50) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    params.append('page', page);
    params.append('limit', limit);
    return this.get(`/members?${params.toString()}`);
  },

  getMember(id) {
    return this.get(`/members/${id}`);
  },

  createMember(data) {
    return this.post('/members', data);
  },

  updateMember(id, data) {
    return this.put(`/members/${id}`, data);
  },

  deleteMember(id) {
    return this.del(`/members/${id}`);
  },

  // Memberships & Renewals
  renewMembership(data) {
    return this.post('/memberships/renew', data);
  },

  freezeMembership(data) {
    return this.post('/memberships/freeze', data);
  },

  unfreezeMembership(id) {
    return this.post(`/memberships/${id}/unfreeze`, {});
  },

  // Plans Endpoints
  getPlans() {
    return this.get('/plans');
  },

  createPlan(data) {
    return this.post('/plans', data);
  },

  updatePlan(id, data) {
    return this.put(`/plans/${id}`, data);
  },

  deletePlan(id) {
    return this.del(`/plans/${id}`);
  },

  // Billing & Payments
  getPayments(page = 1, limit = 50) {
    return this.get(`/payments?page=${page}&limit=${limit}`);
  },

  collectDue(data) {
    return this.post('/payments/collect-due', data);
  },

  // Settings
  getSettings() {
    return this.get('/settings');
  },

  updateSettings(data) {
    return this.put('/settings', data);
  },
};

// UI Formatting Helpers
function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateIN(dateVal) {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('fitcore-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'fitcore-toast';
  toast.className = `fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all duration-300 transform translate-y-0 ${
    type === 'success'
      ? 'bg-emerald-600 text-white'
      : type === 'error'
      ? 'bg-rose-600 text-white'
      : 'bg-amber-500 text-white'
  }`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="ml-2 hover:opacity-75">✕</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
