// FitCore Vanilla JS API Client
const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('fitcore_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('fitcore_token', token);
    } else {
      localStorage.removeItem('fitcore_token');
    }
  },

  getUser() {
    try {
      const u = localStorage.getItem('fitcore_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('fitcore_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('fitcore_user');
    }
  },

  logout() {
    localStorage.removeItem('fitcore_token');
    localStorage.removeItem('fitcore_user');
    window.location.href = '/login';
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, config);
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 && !window.location.pathname.includes('/login')) {
          this.logout();
          return;
        }
        throw new Error(json.message || `Request failed with status ${res.status}`);
      }

      return json.data !== undefined ? json.data : json;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};

// Global formatters and helpers
function formatINR(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

function formatDateIN(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function showToast(title, message = '', type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-amber-600';

  toast.className = `${bg} text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all duration-300 transform translate-y-2 opacity-0 z-50`;
  toast.innerHTML = `
    <div>
      <div class="font-bold text-xs uppercase tracking-wider">${title}</div>
      ${message ? `<div class="text-xs text-white/90 font-normal mt-0.5">${message}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

