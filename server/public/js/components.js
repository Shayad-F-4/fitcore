// FitCore — Sagar Fitness Gym Shared Components (Sidebar, Navbar, Mobile Nav)
document.addEventListener('DOMContentLoaded', () => {
  // If we are on login.html, do not inject dashboard navigation
  if (window.location.pathname.includes('login')) {
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Auth guard for all app pages
  if (!Auth.requireAuth()) return;

  const currentPath = window.location.pathname;
  const user = Auth.getUser() || { fullName: 'Staff User', role: 'RECEPTIONIST' };
  const isAdmin = Auth.isAdmin();

  // 1. Render Left Sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = `
      <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 select-none hidden lg:flex">
        <!-- Gym Brand Header -->
        <div class="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <a href="/index.html" class="flex items-center gap-3">
            <img src="/logo.webp" alt="Sagar Fitness Gym" class="h-9 w-auto object-contain" onerror="this.src='/logo.png'">
          </a>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <a href="/index.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentPath === '/' || currentPath === '/index.html'
              ? 'border-l-4 border-l-blue-600 bg-blue-50/80 text-blue-700 font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <i data-lucide="layout-dashboard" class="w-4 h-4 text-blue-600"></i>
            <span>Dashboard</span>
          </a>

          <a href="/members.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentPath.includes('members')
              ? 'border-l-4 border-l-emerald-600 bg-emerald-50/80 text-emerald-800 font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <i data-lucide="users" class="w-4 h-4 text-emerald-600"></i>
            <span>Members</span>
          </a>

          ${
            isAdmin
              ? `
          <a href="/plans.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentPath.includes('plans')
              ? 'border-l-4 border-l-purple-600 bg-purple-50/80 text-purple-800 font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <i data-lucide="credit-card" class="w-4 h-4 text-purple-600"></i>
            <span>Membership Plans</span>
          </a>
          `
              : ''
          }

          <a href="/billing.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentPath.includes('billing')
              ? 'border-l-4 border-l-rose-600 bg-rose-50/80 text-rose-800 font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <i data-lucide="receipt" class="w-4 h-4 text-rose-600"></i>
            <span>Billing</span>
          </a>

          ${
            isAdmin
              ? `
          <a href="/settings.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentPath.includes('settings')
              ? 'border-l-4 border-l-indigo-600 bg-indigo-50/80 text-indigo-800 font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <i data-lucide="settings" class="w-4 h-4 text-indigo-600"></i>
            <span>Settings</span>
          </a>
          `
              : ''
          }
        </nav>

        <!-- Sidebar Footer Staff Profile -->
        <div class="p-3 border-t border-slate-200">
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ${user.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div class="truncate">
                <p class="text-xs font-bold text-slate-900 truncate">${user.fullName || 'Staff User'}</p>
                <p class="text-[10px] text-slate-500 font-medium">${user.role === 'SUPER_ADMIN' ? 'Gym Owner' : user.role === 'GYM_ADMIN' ? 'Manager' : 'Front Desk'}</p>
              </div>
            </div>
            <button onclick="Auth.logout()" title="Logout" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200 transition-colors">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </aside>
    `;
  }

  // 2. Render Top Navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    const todayStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    navbarContainer.innerHTML = `
      <header class="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between select-none">
        <!-- Left: Mobile Brand / Page Title -->
        <div class="flex items-center gap-3">
          <a href="/index.html" class="lg:hidden flex items-center">
            <img src="/logo.webp" alt="Sagar Fitness Gym" class="h-8 w-auto object-contain" onerror="this.src='/logo.png'">
          </a>
          <div class="hidden sm:block">
            <h1 class="text-sm font-bold text-slate-800" id="navbar-page-title">Sagar Fitness Gym</h1>
            <p class="text-[11px] text-slate-500 font-medium">Pathardi, Maharashtra</p>
          </div>
        </div>

        <!-- Right: Date & Logout -->
        <div class="flex items-center gap-4">
          <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${todayStr}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-700 hidden sm:inline">${user.fullName || 'User'}</span>
            <button onclick="Auth.logout()" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  // 3. Render Mobile Bottom Nav
  const mobileNavContainer = document.getElementById('mobile-nav-container');
  if (mobileNavContainer) {
    mobileNavContainer.innerHTML = `
      <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 pt-1 pb-2 flex items-center justify-around select-none">
        <a href="/index.html" class="flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${
          currentPath === '/' || currentPath === '/index.html' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="layout-dashboard" class="w-5 h-5 mb-0.5"></i>
          <span>Home</span>
        </a>

        <a href="/members.html" class="flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${
          currentPath.includes('members') ? 'text-emerald-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="users" class="w-5 h-5 mb-0.5"></i>
          <span>Members</span>
        </a>

        <a href="/billing.html" class="flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${
          currentPath.includes('billing') ? 'text-rose-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="receipt" class="w-5 h-5 mb-0.5"></i>
          <span>Billing</span>
        </a>

        ${
          isAdmin
            ? `
        <a href="/settings.html" class="flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${
          currentPath.includes('settings') ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="settings" class="w-5 h-5 mb-0.5"></i>
          <span>Settings</span>
        </a>
        `
            : ''
        }
      </nav>
    `;
  }

  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }
});
