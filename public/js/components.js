// FitCore — Sagar Fitness Gym Shared Components (Sidebar, Navbar, Mobile Nav, Global Search)
document.addEventListener('DOMContentLoaded', () => {
  // If we are on login.html, do not inject app navigation
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
      <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 select-none hidden lg:flex shadow-xs">
        <!-- Gym Brand Header -->
        <div class="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <a href="/index.html" class="flex items-center gap-3">
            <picture>
              <source srcset="/logo.webp" type="image/webp">
              <img src="/logo.png" alt="Sagar Fitness Gym" class="h-9 w-auto object-contain" width="160" height="36">
            </picture>
          </a>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <a href="/index.html" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentPath === '/' || currentPath === '/index.html'
              ? 'border-l-4 border-l-blue-600 bg-blue-50/80 text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <div class="w-7 h-7 rounded-lg ${currentPath === '/' || currentPath === '/index.html' ? 'bg-blue-100 text-blue-600' : 'text-slate-500'} flex items-center justify-center">
              <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
            </div>
            <span>Dashboard</span>
          </a>

          <a href="/members.html" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentPath.includes('members')
              ? 'border-l-4 border-l-emerald-600 bg-emerald-50/80 text-emerald-800 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <div class="w-7 h-7 rounded-lg ${currentPath.includes('members') ? 'bg-emerald-100 text-emerald-600' : 'text-slate-500'} flex items-center justify-center">
              <i data-lucide="users" class="w-4 h-4"></i>
            </div>
            <span>Members</span>
          </a>

          <a href="/attendance.html" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentPath.includes('attendance')
              ? 'border-l-4 border-l-cyan-600 bg-cyan-50/80 text-cyan-800 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <div class="w-7 h-7 rounded-lg ${currentPath.includes('attendance') ? 'bg-cyan-100 text-cyan-600' : 'text-slate-500'} flex items-center justify-center">
              <i data-lucide="clipboard-check" class="w-4 h-4"></i>
            </div>
            <span>Attendance</span>
          </a>

          ${
            isAdmin
              ? `
          <a href="/plans.html" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentPath.includes('plans')
              ? 'border-l-4 border-l-purple-600 bg-purple-50/80 text-purple-800 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <div class="w-7 h-7 rounded-lg ${currentPath.includes('plans') ? 'bg-purple-100 text-purple-600' : 'text-slate-500'} flex items-center justify-center">
              <i data-lucide="credit-card" class="w-4 h-4"></i>
            </div>
            <span>Membership Plans</span>
          </a>
          `
              : ''
          }

          <a href="/billing.html" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentPath.includes('billing')
              ? 'border-l-4 border-l-rose-600 bg-rose-50/80 text-rose-800 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <div class="w-7 h-7 rounded-lg ${currentPath.includes('billing') ? 'bg-rose-100 text-rose-600' : 'text-slate-500'} flex items-center justify-center">
              <i data-lucide="receipt" class="w-4 h-4"></i>
            </div>
            <span>Billing</span>
          </a>

          ${
            isAdmin
              ? `
          <a href="/settings.html" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentPath.includes('settings')
              ? 'border-l-4 border-l-indigo-600 bg-indigo-50/80 text-indigo-800 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">
            <div class="w-7 h-7 rounded-lg ${currentPath.includes('settings') ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500'} flex items-center justify-center">
              <i data-lucide="settings" class="w-4 h-4"></i>
            </div>
            <span>Settings</span>
          </a>
          `
              : ''
          }
        </nav>

        <!-- Sidebar Staff Profile Card -->
        <div class="p-3 border-t border-slate-200">
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                ${user.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div class="truncate">
                <p class="text-xs font-bold text-slate-900 truncate">${user.fullName || 'Staff User'}</p>
                <p class="text-[10px] text-slate-500 font-semibold">${user.role === 'SUPER_ADMIN' ? 'Owner / Admin' : user.role === 'GYM_ADMIN' ? 'Manager' : 'Front Desk'}</p>
              </div>
            </div>
            <button onclick="Auth.logout()" title="Logout" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </aside>
    `;
  }

  // 2. Render Top Navbar with Global Search & Dropdown Preview
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    const todayStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    navbarContainer.innerHTML = `
      <header class="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between select-none relative z-30">
        <!-- Left: Mobile Brand & Global Search Bar -->
        <div class="flex items-center gap-4 flex-1 max-w-2xl">
          <a href="/index.html" class="lg:hidden flex items-center shrink-0">
            <img src="/logo.webp" alt="Sagar Fitness Gym" class="h-8 w-auto object-contain" onerror="this.src='/logo.png'">
          </a>

          <!-- Global Instant Member Search Bar -->
          <div class="relative w-full max-w-xl hidden sm:block">
            <div class="relative flex items-center">
              <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none"></i>
              <input
                type="text"
                id="global-search-input"
                oninput="handleGlobalSearch(event)"
                onfocus="handleGlobalSearch(event)"
                placeholder="Search athlete by name, phone or member ID..."
                autocomplete="off"
                class="w-full h-11 pl-11 pr-4 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 font-medium shadow-2xs transition-all"
              >
            </div>

            <!-- Global Search Dropdown Results -->
            <div id="global-search-dropdown" class="hidden absolute left-0 right-0 top-13 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto z-50 divide-y divide-slate-100">
            </div>
          </div>
        </div>

        <!-- Right: Live Date, Notification & User -->
        <div class="flex items-center gap-3">
          <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${todayStr}</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="hidden sm:flex flex-col text-right">
              <span class="text-xs font-bold text-slate-800 leading-tight">${user.fullName || 'User'}</span>
              <span class="text-[10px] text-slate-400 font-medium">${user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'GYM_ADMIN' ? 'Gym Manager' : 'Receptionist'}</span>
            </div>
            <button onclick="Auth.logout()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
    `;

    // Click outside to close global search dropdown
    document.addEventListener('click', (e) => {
      const searchBox = document.getElementById('global-search-input');
      const dropdown = document.getElementById('global-search-dropdown');
      if (dropdown && searchBox && !searchBox.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // 3. Render Mobile Bottom Navigation
  const mobileNavContainer = document.getElementById('mobile-nav-container');
  if (mobileNavContainer) {
    mobileNavContainer.innerHTML = `
      <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl px-2 pt-1 pb-2 flex items-center justify-around select-none">
        <a href="/index.html" class="flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${
          currentPath === '/' || currentPath === '/index.html' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="layout-dashboard" class="w-5 h-5 mb-0.5"></i>
          <span>Home</span>
        </a>

        <a href="/members.html" class="flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold ${
          currentPath.includes('members') ? 'text-emerald-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="users" class="w-5 h-5 mb-0.5"></i>
          <span>Members</span>
        </a>

        <a href="/attendance.html" class="flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold ${
          currentPath.includes('attendance') ? 'text-cyan-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="clipboard-check" class="w-5 h-5 mb-0.5"></i>
          <span>Attendance</span>
        </a>

        ${
          isAdmin
            ? `
        <a href="/plans.html" class="flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold ${
          currentPath.includes('plans') ? 'text-purple-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="credit-card" class="w-5 h-5 mb-0.5"></i>
          <span>Plans</span>
        </a>
        `
            : ''
        }

        <a href="/billing.html" class="flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold ${
          currentPath.includes('billing') ? 'text-rose-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }">
          <i data-lucide="receipt" class="w-5 h-5 mb-0.5"></i>
          <span>Billing</span>
        </a>

        ${
          isAdmin
            ? `
        <a href="/settings.html" class="flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold ${
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

// Global Search Handler with Debounce
let globalSearchTimer = null;
async function handleGlobalSearch(e) {
  const query = e.target.value.trim();
  const dropdown = document.getElementById('global-search-dropdown');
  if (!dropdown) return;

  if (query.length < 2) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  clearTimeout(globalSearchTimer);
  globalSearchTimer = setTimeout(async () => {
    try {
      const res = await API.getMembers(query, 'ALL', 1, 8);
      const members = Array.isArray(res) ? res : (res.members || []);

      if (members.length === 0) {
        dropdown.innerHTML = `<div class="p-3 text-center text-xs text-slate-400">No athlete found for "${query}"</div>`;
        dropdown.classList.remove('hidden');
        return;
      }

      dropdown.innerHTML = members.map(m => `
        <div onclick="selectGlobalMember('${m._id}')" class="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
              ${m.fullName ? m.fullName[0].toUpperCase() : 'M'}
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900">${m.fullName}</p>
              <p class="text-[10px] text-slate-500 font-mono">${m.phone || 'No Phone'} • <span class="text-blue-600">${m.memberId || ''}</span></p>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${
            m.status === 'ACTIVE' ? 'badge-active' : m.status === 'EXPIRING' ? 'badge-expiring' : 'badge-expired'
          }">${m.status || 'ACTIVE'}</span>
        </div>
      `).join('');
      dropdown.classList.remove('hidden');
    } catch {
      dropdown.classList.add('hidden');
    }
  }, 250);
}

function selectGlobalMember(memberId) {
  const dropdown = document.getElementById('global-search-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  // If on members.html, view profile directly, else navigate to members.html?view=id
  if (window.location.pathname.includes('members') && typeof viewMemberProfile === 'function') {
    viewMemberProfile(memberId);
  } else {
    window.location.href = `/members.html?view=${memberId}`;
  }
}
