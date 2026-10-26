import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginPage } from './pages/LoginPage';
import { Member, Membership, Payment } from './types';

// Code-split pages for an ultra-fast, smooth initial load
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const MembersPage = lazy(() =>
  import('./pages/MembersPage').then((m) => ({ default: m.MembersPage }))
);
const PlansPage = lazy(() =>
  import('./pages/PlansPage').then((m) => ({ default: m.PlansPage }))
);
const AttendancePage = lazy(() =>
  import('./pages/AttendancePage').then((m) => ({ default: m.AttendancePage }))
);
const BillingPage = lazy(() =>
  import('./pages/BillingPage').then((m) => ({ default: m.BillingPage }))
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const AuditLogsPage = lazy(() =>
  import('./pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage }))
);
const AiCoachPage = lazy(() =>
  import('./pages/AiCoachPage').then((m) => ({ default: m.AiCoachPage }))
);

// Code-split heavy modals
const RegisterMemberModal = lazy(() =>
  import('./components/modals/RegisterMemberModal').then((m) => ({ default: m.RegisterMemberModal }))
);
const MemberProfileModal = lazy(() =>
  import('./components/modals/MemberProfileModal').then((m) => ({ default: m.MemberProfileModal }))
);
const RenewModal = lazy(() =>
  import('./components/modals/RenewModal').then((m) => ({ default: m.RenewModal }))
);
const FreezeModal = lazy(() =>
  import('./components/modals/FreezeModal').then((m) => ({ default: m.FreezeModal }))
);
const MemberCardModal = lazy(() =>
  import('./components/modals/MemberCardModal').then((m) => ({ default: m.MemberCardModal }))
);
const ReceiptModal = lazy(() =>
  import('./components/modals/ReceiptModal').then((m) => ({ default: m.ReceiptModal }))
);
const CollectDueModal = lazy(() =>
  import('./components/modals/CollectDueModal').then((m) => ({ default: m.CollectDueModal }))
);

// Smooth Route Fallback Skeleton
const RouteSuspenseFallback: React.FC = () => (
  <div className="w-full py-16 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150">
    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-2xs">
      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
    <span className="text-xs text-slate-400 font-semibold tracking-wide">
      Loading view...
    </span>
  </div>
);

export const App: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedRenewSub, setSelectedRenewSub] = useState<Membership | null>(null);
  const [selectedFreezeSub, setSelectedFreezeSub] = useState<Membership | null>(null);
  const [selectedCardMember, setSelectedCardMember] = useState<Member | null>(null);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [selectedCollectDueItem, setSelectedCollectDueItem] = useState<any | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] text-[#202124] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Loading Sagar Fitness Gym...
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
    <div className="h-screen w-screen bg-[#F7F8FA] text-[#202124] flex overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        mobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        onOpenRegister={() => setIsRegisterOpen(true)}
      />

      {/* Main Content Area (Scrolls independently while Sidebar remains locked) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F7F8FA] h-screen overflow-y-auto overflow-x-hidden">
        <Navbar
          onToggleSidebar={() => setIsMobileNavOpen((prev) => !prev)}
          onSelectMember={(memberId) => setSelectedProfileId(memberId)}
          onRenewMember={(membership) => setSelectedRenewSub(membership)}
          onOpenRegister={() => setIsRegisterOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-8 max-w-7xl w-full mx-auto pb-28 lg:pb-16 min-w-0 overflow-x-hidden">
          <Suspense fallback={<RouteSuspenseFallback />}>
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    onOpenRegister={() => setIsRegisterOpen(true)}
                    onSelectMember={(memberId) => setSelectedProfileId(memberId)}
                    onRenewMember={(membership) => setSelectedRenewSub(membership)}
                    onOpenCollectDue={(item) => setSelectedCollectDueItem(item)}
                    onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
                  />
                }
              />
              <Route
                path="/members"
                element={
                  <MembersPage
                    onOpenRegister={() => setIsRegisterOpen(true)}
                    onOpenCollectDue={(item) => setSelectedCollectDueItem(item)}
                    onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
                  />
                }
              />
              <Route
                path="/plans"
                element={
                  user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN' ? (
                    <PlansPage />
                  ) : (
                    <Navigate to="/members" replace />
                  )
                }
              />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route
                path="/payments"
                element={
                  <BillingPage
                    onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
                    onOpenCollectDue={(item) => setSelectedCollectDueItem(item)}
                  />
                }
              />
              <Route
                path="/billing"
                element={
                  <BillingPage
                    onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
                    onOpenCollectDue={(item) => setSelectedCollectDueItem(item)}
                  />
                }
              />
              <Route
                path="/reports"
                element={
                  <ReportsPage
                    onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
                    onRenewMember={(membership) => setSelectedRenewSub(membership)}
                    onSelectMember={(memberId) => setSelectedProfileId(memberId)}
                  />
                }
              />
              <Route path="/pos" element={<Navigate to="/" replace />} />
              <Route path="/inventory/pos" element={<Navigate to="/" replace />} />
              <Route path="/inventory" element={<Navigate to="/" replace />} />
              <Route
                path="/ai-coach"
                element={
                  user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN' ? (
                    <AiCoachPage />
                  ) : (
                    <Navigate to="/members" replace />
                  )
                }
              />
              <Route path="/diet" element={<Navigate to="/ai-coach" replace />} />
              <Route
                path="/settings"
                element={
                  user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN' ? (
                    <SettingsPage />
                  ) : (
                    <Navigate to="/members" replace />
                  )
                }
              />
              <Route
                path="/audit-logs"
                element={
                  user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN' ? (
                    <AuditLogsPage />
                  ) : (
                    <Navigate to="/members" replace />
                  )
                }
              />
              <Route
                path="/branches"
                element={
                  <Navigate
                    to={user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_ADMIN' ? '/settings' : '/members'}
                    replace
                  />
                }
              />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        {/* Mobile Bottom Navigation (Persistent, Safe-Area Padded) */}
        <MobileBottomNav
          onToggleSidebar={() => setIsMobileNavOpen((prev) => !prev)}
          isSidebarOpen={isMobileNavOpen}
        />
      </div>

      {/* Global Modals - Lazy loaded on demand */}
      <Suspense fallback={null}>
        {isRegisterOpen && (
          <RegisterMemberModal
            isOpen={isRegisterOpen}
            onClose={() => setIsRegisterOpen(false)}
            onSuccess={(newMember) => {
              if (newMember?._id) {
                setSelectedProfileId(newMember._id);
              }
            }}
            onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
          />
        )}

        {selectedProfileId && (
          <MemberProfileModal
            memberId={selectedProfileId}
            isOpen={Boolean(selectedProfileId)}
            onClose={() => setSelectedProfileId(null)}
            onOpenCardModal={(m) => setSelectedCardMember(m)}
            onOpenRenewModal={(sub) => setSelectedRenewSub(sub)}
            onOpenFreezeModal={(sub) => setSelectedFreezeSub(sub)}
            onOpenCollectDue={(item) => setSelectedCollectDueItem(item)}
            onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
          />
        )}

        {selectedRenewSub && (
          <RenewModal
            membership={selectedRenewSub}
            isOpen={Boolean(selectedRenewSub)}
            onClose={() => setSelectedRenewSub(null)}
            onSuccess={() => {}}
            onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
          />
        )}

        {selectedFreezeSub && (
          <FreezeModal
            membership={selectedFreezeSub}
            isOpen={Boolean(selectedFreezeSub)}
            onClose={() => setSelectedFreezeSub(null)}
            onSuccess={() => {}}
          />
        )}

        {selectedCardMember && (
          <MemberCardModal
            member={selectedCardMember}
            isOpen={Boolean(selectedCardMember)}
            onClose={() => setSelectedCardMember(null)}
          />
        )}

        {selectedReceiptPayment && (
          <ReceiptModal
            payment={selectedReceiptPayment}
            isOpen={Boolean(selectedReceiptPayment)}
            onClose={() => setSelectedReceiptPayment(null)}
          />
        )}

        {selectedCollectDueItem && (
          <CollectDueModal
            dueItem={selectedCollectDueItem}
            isOpen={Boolean(selectedCollectDueItem)}
            onClose={() => setSelectedCollectDueItem(null)}
            onSuccess={(payment) => {
              setSelectedReceiptPayment(payment);
            }}
          />
        )}
      </Suspense>
    </div>
  );
};
