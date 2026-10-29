import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarPlus,
  Calendar,
  BookmarkCheck,
  Bell,
  FileBarChart,
  Users,
  Building2,
  Sliders,
  History,
  LogOut,
  Menu,
  X,
  KeyRound,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ChangePasswordModal } from '../common/ChangePasswordModal.tsx';
import type { InAppNotification } from '../../types/index.ts';

export type ActiveTab =
  | 'dashboard'
  | 'book'
  | 'calendar'
  | 'my-bookings'
  | 'notifications'
  | 'reports'
  | 'users'
  | 'departments'
  | 'settings'
  | 'audit-log';

interface AppLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ activeTab, onTabChange, children }) => {
  const { user, logout, unreadCount, notifications, markNotificationRead, markAllNotificationsRead } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Update live clock in Asia/Kolkata
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = user?.role === 'admin';

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<any>; adminOnly?: boolean; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'book', label: 'Book Hall', icon: CalendarPlus },
    { id: 'calendar', label: 'Booking Calendar', icon: Calendar },
    { id: 'my-bookings', label: 'My Bookings', icon: BookmarkCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    // Admin section
    { id: 'reports', label: 'Booking Reports', icon: FileBarChart, adminOnly: true },
    { id: 'users', label: 'User Management', icon: Users, adminOnly: true },
    { id: 'departments', label: 'Departments', icon: Building2, adminOnly: true },
    { id: 'settings', label: 'Hall Settings', icon: Sliders, adminOnly: true },
    { id: 'audit-log', label: 'Audit Log', icon: History, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const handleNavClick = (id: ActiveTab) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      {/* ============================================================== */}
      {/* DESKTOP SIDEBAR / DRAWER                                       */}
      {/* ============================================================== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 select-none">
        {/* Brand Lockup */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
              ASU
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase leading-tight">
                Assam Skill University
              </h1>
              <p className="text-[11px] text-blue-300 font-medium">Conference Hall Booking</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{user?.display_name}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {isAdmin ? 'University Administrator' : user?.department_name || 'Department User'}
            </p>
          </div>
          <span
            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
              isAdmin
                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                : 'bg-blue-950 text-blue-300 border border-blue-800'
            }`}
          >
            {isAdmin ? 'Admin' : user?.department_code || 'Dept'}
          </span>
        </div>

        {/* Primary Action Button */}
        <div className="px-4 pb-2">
          <button
            onClick={() => handleNavClick('book')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Book Conference Hall</span>
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isFirstAdmin = item.adminOnly && !filteredNavItems[idx - 1]?.adminOnly;

            return (
              <React.Fragment key={item.id}>
                {isFirstAdmin && (
                  <div className="pt-4 pb-1 px-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Administration
                    </p>
                  </div>
                )}
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN VIEWPORT & TOP APP BAR                                    */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          {/* Left: Mobile hamburger & breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <span className="text-xs text-slate-400 hidden sm:inline">Assam Skill University / </span>
              <span className="text-sm font-bold text-slate-900 capitalize">
                {activeTab.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Right: Clock, Auto-Confirmation Status, Notifications, Profile */}
          <div className="flex items-center gap-3">
            {/* Live IST Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentTimeStr || 'IST'}</span>
            </div>

            {/* Instant Confirmation Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xl:inline">Automatic Confirmation:</span>
              <span className="font-semibold">Active</span>
            </div>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await markAllNotificationsRead();
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.is_read) markNotificationRead(n.id);
                          }}
                          className={`p-3 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                            !n.is_read ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-800">{n.title}</p>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
                    <button
                      onClick={() => {
                        setNotifDropdownOpen(false);
                        handleNavClick('notifications');
                      }}
                      className="text-xs text-blue-600 font-medium hover:underline"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-800 text-white font-bold text-xs flex items-center justify-center">
                {user?.display_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {user?.display_name}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {user?.role === 'admin' ? 'Administrator' : user?.department_code || 'User'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 text-white border-b border-slate-800 p-4 space-y-1">
            <button
              onClick={() => handleNavClick('book')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mb-3 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-md"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Book Conference Hall</span>
            </button>

            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <button onClick={() => setIsPasswordModalOpen(true)} className="text-slate-400 hover:text-white">
                Change Password
              </button>
              <button onClick={logout} className="text-rose-400 font-semibold">
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen || user?.must_change_password === 1}
        isMandatory={user?.must_change_password === 1}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
