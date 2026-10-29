import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  CalendarPlus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusChip } from '../../components/common/StatusChip.tsx';
import type { Booking, Hall } from '../../types/index.ts';

interface DashboardViewProps {
  onNavigate: (tab: any) => void;
  onOpenBooking: (booking: Booking) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenBooking }) => {
  const { user } = useAuth();
  const [hall, setHall] = useState<Hall | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [hallRes, bookingsRes, usageRes] = await Promise.all([
        api.getHallSettings(),
        api.listBookings({ status: 'CONFIRMED' }),
        user?.role === 'admin' ? api.getUsageReport() : Promise.resolve(null),
      ]);

      setHall(hallRes.hall);
      const allConfirmed = bookingsRes.bookings;

      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];

      // Filter today's bookings
      const today = allConfirmed.filter((b) => b.start_at.startsWith(todayDateStr));
      setTodayBookings(today);

      // Filter upcoming (future start time)
      const upcoming = allConfirmed
        .filter((b) => new Date(b.end_at).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
      setUpcomingBookings(upcoming);

      setReport(usageRes);
    } catch {
      // handled
    } finally {
      setIsLoading(false);
    }
  };

  // Determine current hall status right now
  const nowMs = Date.now();
  const currentActiveEvent = todayBookings.find((b) => {
    const s = new Date(b.start_at).getTime();
    const e = new Date(b.end_at).getTime();
    return nowMs >= s && nowMs <= e;
  });

  const nextBooking = upcomingBookings.find((b) => new Date(b.start_at).getTime() > nowMs);

  return (
    <div className="space-y-6">
      {/* Institutional Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white shadow-md relative overflow-hidden border border-blue-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/80 border border-blue-700 text-xs font-semibold text-blue-200 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Assam Skill University · Central Reservation Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Welcome back, {user?.display_name}
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            {user?.role === 'admin'
              ? 'Institutional administration dashboard. Manage cross-department bookings, hall parameters, and audit reports.'
              : `Department of ${user?.department_name || 'Academics'}. Check availability and book the Central Conference Hall with instant automatic confirmation.`}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('book')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Book Conference Hall</span>
            </button>
            <button
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>View Full Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hall Status Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Current Hall Status</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                currentActiveEvent ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            <span className="text-base font-bold text-slate-900">
              {currentActiveEvent ? 'In Session' : 'Available Now'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">
            {currentActiveEvent
              ? `Ongoing: ${currentActiveEvent.event_title}`
              : `Next: ${nextBooking ? nextBooking.event_title : 'No further bookings today'}`}
          </p>
        </div>

        {/* Today's Bookings */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Today's Confirmed Slots</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">{todayBookings.length}</p>
          <p className="text-[11px] text-slate-500 mt-2">
            {todayBookings.length > 0 ? 'Events scheduled for today' : 'No reservations for today'}
          </p>
        </div>

        {/* Upcoming Reservations */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Upcoming Reservations</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">{upcomingBookings.length}</p>
          <p className="text-[11px] text-slate-500 mt-2">Future scheduled bookings</p>
        </div>

        {/* Venue Capacity */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Conference Venue</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-bold text-slate-900 truncate">{hall?.name || 'Central Hall'}</p>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Capacity: {hall?.capacity || 120} Seats · A/V Ready
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Schedule & Upcoming Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Daily Schedule */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Today's Hall Schedule</h2>
                <p className="text-xs text-slate-500">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Full Schedule</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayBookings.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">
                  No reservations scheduled for today.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  The Central Conference Hall is fully available.
                </p>
                <button
                  onClick={() => onNavigate('book')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Reserve a slot today</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBookings.map((b) => {
                  const s = new Date(b.start_at);
                  const e = new Date(b.end_at);
                  const isCurrent = nowMs >= s.getTime() && nowMs <= e.getTime();

                  return (
                    <div
                      key={b.id}
                      onClick={() => onOpenBooking(b)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-300/50'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="text-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0 font-mono">
                            <span className="text-[11px] font-bold text-slate-800 block">
                              {s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              {e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-900">
                                {b.event_title}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                  IN SESSION
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                              <span>{b.department_name}</span>
                              <span aria-hidden="true">·</span>
                              <span>Organizer: {b.organizer_name}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{b.booking_code}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <StatusChip status={b.status} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Bookings List */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Next Upcoming Reservations</h2>
                <p className="text-xs text-slate-500">Confirmed upcoming campus conferences</p>
              </div>
              <button
                onClick={() => onNavigate('my-bookings')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingBookings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No upcoming bookings found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingBookings.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onOpenBooking(b)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{b.event_title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{b.department_code || b.department_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">
                          {new Date(b.start_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                          ({new Date(b.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400">{b.booking_code}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Hall Features & Policy Summary */}
        <div className="space-y-6">
          {/* Automatic Confirmation Policy Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Booking Policy
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Assam Skill University uses <strong>strict automatic instant confirmation</strong>. When you submit an available timeslot, the reservation is confirmed and registered immediately without manual approval delays.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Operating Hours:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {hall?.opening_time || '08:00'} – {hall?.closing_time || '20:00'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Min Notice Period:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {hall?.min_notice_hours || 2} Hours
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Max Duration:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {hall?.max_duration_hours || 8} Hours
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cleanup Buffer:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {hall?.buffer_minutes || 15} Mins
                </span>
              </div>
            </div>
          </div>

          {/* Hall Facilities Badge List */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Hall Facilities Included
            </h3>
            <div className="space-y-2">
              {(hall?.facilities || [
                'HD Projector & Dual Screens',
                'Video Conferencing Suite',
                'Wireless Podium Microphones',
                'Central HVAC Climate Control',
                'High-Speed Campus Wi-Fi 6',
              ]).map((facility) => (
                <div key={facility} className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>{facility}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Support / Contact Card */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xs">
            <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">
              Need Assistance?
            </h3>
            <p className="text-xs text-slate-300">
              For emergency booking overrides or AV technician support, contact Central University Administration.
            </p>
            <p className="text-xs font-mono text-blue-400 mt-2">
              Email: eceasu2026@gmail.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
