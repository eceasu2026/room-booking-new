/**
 * Assam Skill University — Central Conference Hall Booking System
 * Main Application Root
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AppLayout, ActiveTab } from './components/layout/AppLayout.tsx';
import { SetupWizard } from './pages/setup/SetupWizard.tsx';
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { DashboardView } from './pages/dashboard/DashboardView.tsx';
import { BookHallView } from './pages/book/BookHallView.tsx';
import { CalendarView } from './pages/calendar/CalendarView.tsx';
import { MyBookingsView } from './pages/bookings/MyBookingsView.tsx';
import { NotificationsView } from './pages/notifications/NotificationsView.tsx';
import { DepartmentsView } from './pages/admin/DepartmentsView.tsx';
import { UsersView } from './pages/admin/UsersView.tsx';
import { HallSettingsView } from './pages/admin/HallSettingsView.tsx';
import { ReportsView } from './pages/admin/ReportsView.tsx';
import { AuditLogView } from './pages/admin/AuditLogView.tsx';
import { ConfirmationVoucherModal } from './components/common/ConfirmationVoucherModal.tsx';
import type { Booking } from './types/index.ts';

const MainContent: React.FC = () => {
  const { user, isLoading, isSetupRequired } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Pre-filled date/time when user clicks a slot on the calendar
  const [prefilledBookingDate, setPrefilledBookingDate] = useState<string | undefined>();
  const [prefilledBookingTime, setPrefilledBookingTime] = useState<string | undefined>();

  // Confirmation voucher modal
  const [activeVoucherBooking, setActiveVoucherBooking] = useState<Booking | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-lg mb-4 shadow-lg animate-pulse">
          ASU
        </div>
        <p className="text-sm font-semibold tracking-wide">Assam Skill University</p>
        <p className="text-xs text-blue-300 mt-1">Connecting to Conference Hall Reservation System...</p>
      </div>
    );
  }

  // 1. First-Run Setup Wizard
  if (isSetupRequired) {
    return <SetupWizard />;
  }

  // 2. Login Page
  if (!user) {
    return <LoginPage />;
  }

  const handleOpenVoucher = (booking: Booking) => {
    setActiveVoucherBooking(booking);
    setIsVoucherModalOpen(true);
  };

  const handleBookingCreated = (booking: Booking) => {
    setActiveVoucherBooking(booking);
    setIsVoucherModalOpen(true);
  };

  const handleSelectSlotFromCalendar = (dateStr: string, timeStr?: string) => {
    setPrefilledBookingDate(dateStr);
    setPrefilledBookingTime(timeStr);
    setActiveTab('book');
  };

  // 3. Authenticated App Layout
  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <DashboardView
          onNavigate={setActiveTab}
          onOpenBooking={handleOpenVoucher}
        />
      )}

      {activeTab === 'book' && (
        <BookHallView
          onBookingSuccess={handleBookingCreated}
          initialDate={prefilledBookingDate}
          initialStartTime={prefilledBookingTime}
        />
      )}

      {activeTab === 'calendar' && (
        <CalendarView
          onOpenBooking={handleOpenVoucher}
          onSelectSlotToBook={handleSelectSlotFromCalendar}
        />
      )}

      {activeTab === 'my-bookings' && (
        <MyBookingsView onOpenVoucher={handleOpenVoucher} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsView />
      )}

      {/* Administrator Protected Views */}
      {user.role === 'admin' && (
        <>
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'departments' && <DepartmentsView />}
          {activeTab === 'settings' && <HallSettingsView />}
          {activeTab === 'audit-log' && <AuditLogView />}
        </>
      )}

      {/* Confirmation & Printable Voucher Modal */}
      <ConfirmationVoucherModal
        booking={activeVoucherBooking}
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
      />
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
