import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { PlansPage } from './pages/PlansPage';
import { AttendancePage } from './pages/AttendancePage';
import { BillingPage } from './pages/BillingPage';
import { BranchesPage } from './pages/BranchesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { QuickCheckInModal } from './components/modals/QuickCheckInModal';
import { RegisterMemberModal } from './components/modals/RegisterMemberModal';

export const App: React.FC = () => {
  const { user, token, loading, activeBranch } = useAuth();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [liveOccupancyCount, setLiveOccupancyCount] = useState(0);

  const refreshOccupancy = async () => {
    try {
      const res = await api.getLiveOccupancy(activeBranch?._id);
      setLiveOccupancyCount(res.count || 0);
    } catch {
      // Ignore if offline
    }
  };

  useEffect(() => {
    if (token) {
      refreshOccupancy();
      const interval = setInterval(refreshOccupancy, 12000);
      return () => clearInterval(interval);
    }
  }, [token, activeBranch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B0A] text-[#F5F7F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-glow-sm" />
          <span className="font-mono text-xs text-text-dim uppercase tracking-widest">
            FitCore Initializing...
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#080B0A] text-[#F5F7F5] flex overflow-x-hidden selection:bg-[#B7FF3C] selection:text-[#080B0A]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080B0A] relative">
        <Navbar
          onOpenCheckIn={() => setIsCheckInOpen(true)}
          liveOccupancyCount={liveOccupancyCount}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-16">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  onOpenCheckIn={() => setIsCheckInOpen(true)}
                  onOpenRegister={() => setIsRegisterOpen(true)}
                />
              }
            />
            <Route
              path="/members"
              element={
                <MembersPage
                  onOpenRegister={() => setIsRegisterOpen(true)}
                  onOpenCheckIn={() => setIsCheckInOpen(true)}
                />
              }
            />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/audit" element={<AuditLogsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals accessible anywhere */}
      <QuickCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onCheckInSuccess={refreshOccupancy}
      />

      <RegisterMemberModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={() => {
          refreshOccupancy();
        }}
      />
    </div>
  );
};
