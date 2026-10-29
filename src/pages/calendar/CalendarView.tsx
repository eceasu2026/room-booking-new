import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusChip } from '../../components/common/StatusChip.tsx';
import type { Booking, Department, HallClosure } from '../../types/index.ts';

type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

interface CalendarViewProps {
  onOpenBooking: (booking: Booking) => void;
  onSelectSlotToBook: (dateStr: string, timeStr?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenBooking,
  onSelectSlotToBook,
}) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [closures, setClosures] = useState<HallClosure[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('CONFIRMED');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, closuresRes, deptsRes] = await Promise.all([
        api.listBookings({ status: 'ALL' }),
        api.getClosures(),
        api.getDepartments(),
      ]);
      setBookings(bookingsRes.bookings);
      setClosures(closuresRes.closures);
      setDepartments(deptsRes.departments);
    } catch {
      // handled
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (selectedDeptId !== 'ALL' && b.department_id !== selectedDeptId) return false;
    if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;
    return true;
  });

  // Month grid calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const titleHeader = currentDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-white text-slate-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {titleHeader}
          </h1>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['month', 'week', 'day', 'list'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                  viewMode === mode
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="CONFIRMED">Confirmed Slots</option>
            <option value="ALL">All Statuses</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. MONTH VIEW                                                  */}
      {/* ============================================================== */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Weekday Names */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 py-2.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[500px]">
            {/* Empty offset days for start of month */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50/50 p-2 min-h-[90px]" />
            ))}

            {/* Actual Days of the Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              // Find bookings on this date
              const dayBookings = filteredBookings.filter((b) => b.start_at.startsWith(dateStr));
              // Find closures overlapping this date
              const dayClosures = closures.filter(
                (c) => dateStr >= c.start_at.split('T')[0] && dateStr <= c.end_at.split('T')[0]
              );

              return (
                <div
                  key={dateStr}
                  className={`p-2 min-h-[90px] flex flex-col justify-between group transition-colors hover:bg-slate-50/80 ${
                    isToday ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-blue-700 text-white' : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <button
                      onClick={() => onSelectSlotToBook(dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-opacity"
                      title="Book this date"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Booking pills in day cell */}
                  <div className="mt-1 space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                    {dayClosures.map((c) => (
                      <div
                        key={c.id}
                        className="p-1 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 truncate"
                        title={`Closure: ${c.reason}`}
                      >
                        ⚠️ Closure: {c.reason}
                      </div>
                    ))}

                    {dayBookings.map((b) => {
                      const startTimeStr = new Date(b.start_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isConfirmed = b.status === 'CONFIRMED';

                      return (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBooking(b);
                          }}
                          className={`p-1 rounded text-[10px] font-medium border truncate cursor-pointer transition-all ${
                            isConfirmed
                              ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900'
                              : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 line-through'
                          }`}
                          title={`${startTimeStr} - ${b.event_title} (${b.department_code})`}
                        >
                          <span className="font-mono font-bold">{startTimeStr}</span> {b.event_title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. WEEK VIEW                                                   */}
      {/* ============================================================== */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 overflow-x-auto">
          <div className="min-w-[700px] grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              // compute day of the active week
              const active = new Date(currentDate);
              const dayOfWeek = active.getDay();
              active.setDate(active.getDate() - dayOfWeek + dayIdx);
              const dateStr = active.toISOString().split('T')[0];
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              const dayBookings = filteredBookings.filter((b) => b.start_at.startsWith(dateStr));

              return (
                <div key={dateStr} className="border border-slate-200 rounded-xl p-3 flex flex-col min-h-[350px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase">
                        {active.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </p>
                      <p className={`text-sm font-mono font-bold ${isToday ? 'text-blue-700' : 'text-slate-900'}`}>
                        {active.getDate()}
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectSlotToBook(dateStr)}
                      className="p-1 rounded-md text-blue-700 hover:bg-blue-50"
                      title="Book this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-2 flex-1 overflow-y-auto">
                    {dayBookings.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center pt-8">
                        No events
                      </p>
                    ) : (
                      dayBookings.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => onOpenBooking(b)}
                          className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50/60 border border-slate-200 cursor-pointer text-xs space-y-1 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-700">
                              {new Date(b.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                              {b.department_code}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900 line-clamp-2">{b.event_title}</p>
                          <p className="text-[10px] text-slate-500">{b.organizer_name}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DAY TIMELINE VIEW                                           */}
      {/* ============================================================== */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {currentDate.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <p className="text-xs text-slate-500">Hourly Timeline Schedule · Central Conference Hall</p>
            </div>
            <button
              onClick={() => onSelectSlotToBook(currentDate.toISOString().split('T')[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Book Slot</span>
            </button>
          </div>

          <div className="space-y-2">
            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => {
              const hourStr = `${String(hour).padStart(2, '0')}:00`;
              const dayStr = currentDate.toISOString().split('T')[0];

              // Check if any booking falls in this hour
              const matchingBookings = filteredBookings.filter((b) => {
                if (!b.start_at.startsWith(dayStr)) return false;
                const sHour = new Date(b.start_at).getHours();
                const eHour = new Date(b.end_at).getHours();
                return hour >= sHour && hour <= eHour;
              });

              return (
                <div key={hour} className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-16 font-mono text-xs font-bold text-slate-500 shrink-0 pt-1">
                    {hourStr}
                  </div>

                  <div className="flex-1">
                    {matchingBookings.length === 0 ? (
                      <div
                        onClick={() => onSelectSlotToBook(dayStr, hourStr)}
                        className="h-8 rounded-lg border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 flex items-center px-3 text-[11px] text-slate-400 cursor-pointer transition-colors"
                      >
                        Available — Click to reserve slot
                      </div>
                    ) : (
                      matchingBookings.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => onOpenBooking(b)}
                          className="p-3 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100/80 transition-colors mb-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-blue-950">{b.event_title}</span>
                            <StatusChip status={b.status} />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                            <span>{b.department_name}</span>
                            <span aria-hidden="true">·</span>
                            <span>Organizer: {b.organizer_name}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">
                              {new Date(b.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                              {new Date(b.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. LIST / AGENDA VIEW                                          */}
      {/* ============================================================== */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Upcoming Reservations Agenda</h2>
            <span className="text-xs text-slate-500 font-mono">Total {filteredBookings.length} records</span>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No bookings matching selected filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onOpenBooking(b)}
                  className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-center font-mono shrink-0">
                      <p className="text-[10px] text-slate-500 uppercase">
                        {new Date(b.start_at).toLocaleDateString([], { month: 'short' })}
                      </p>
                      <p className="text-base font-bold text-slate-900 leading-tight">
                        {new Date(b.start_at).getDate()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900">{b.event_title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span className="font-semibold text-blue-700">{b.department_name}</span>
                        <span aria-hidden="true">·</span>
                        <span>{b.organizer_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">
                          {new Date(b.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {new Date(b.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400">{b.booking_code}</span>
                    <StatusChip status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
