// FitCore — Sagar Fitness Gym Simple Vanilla Auth Helper
const Auth = {
  getToken() {
    return localStorage.getItem('fitcore_token');
  },

  getUser() {
    try {
      const u = localStorage.getItem('fitcore_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  isAdmin() {
    const user = this.getUser();
    return user && (user.role === 'SUPER_ADMIN' || user.role === 'GYM_ADMIN');
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.replace('/login.html');
      return false;
    }
    return true;
  },

  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      showToast('Access restricted to administrators only', 'error');
      window.location.replace('/members.html');
      return false;
    }
    return true;
  },

  logout() {
    localStorage.removeItem('fitcore_token');
    localStorage.removeItem('fitcore_user');
    window.location.replace('/login.html');
  },
};

