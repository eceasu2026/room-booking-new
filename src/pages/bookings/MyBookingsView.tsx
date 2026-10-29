import React, { useState, useEffect } from 'react';
import {
  BookmarkCheck,
  Search,
  Filter,
  Calendar,
  Clock,
  Printer,
  Trash2,
  Building2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusChip } from '../../components/common/StatusChip.tsx';
import { CancellationModal } from '../../components/common/CancellationModal.tsx';
import type { Booking } from '../../types/index.ts';

interface MyBookingsViewProps {
  onOpenVoucher: (booking: Booking) => void;
}

type TabFilter = 'ALL' | 'UPCOMING' | 'PAST' | 'CANCELLED';

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({ onOpenVoucher }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      // Department users see their department bookings; admins see all
      const res = await api.listBookings({
        mine_only: user?.role !== 'admin',
      });
      setBookings(res.bookings);
    } catch {
      // handled
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCancellation = async (reason: string) => {
    if (!cancellingBooking) return;
    await api.cancelBooking(cancellingBooking.id, reason);
    await loadBookings();
  };

  // Filter logic
  const now = Date.now();
  const filteredBookings = bookings.filter((b) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        b.booking_code.toLowerCase().includes(q) ||
        b.event_title.toLowerCase().includes(q) ||
        b.organizer_name.toLowerCase().includes(q) ||
        b.purpose.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Tab filter
    if (activeTab === 'CANCELLED') return b.status === 'CANCELLED';
    if (activeTab === 'UPCOMING') {
      return b.status === 'CONFIRMED' && new Date(b.end_at).getTime() >= now;
    }
    if (activeTab === 'PAST') {
      return b.status === 'CONFIRMED' && new Date(b.end_at).getTime() < now;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Title & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {user?.role === 'admin' ? 'University Conference Reservations' : 'My Department Bookings'}
          </h1>
          <p className="text-xs text-slate-500">
            {user?.role === 'admin'
              ? 'Manage and audit all reservations across campus departments.'
              : `Review active and past reservations for Department of ${user?.department_name || 'Assam Skill University'}.`}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search booking code, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl max-w-md">
        {(['ALL', 'UPCOMING', 'PAST', 'CANCELLED'] as TabFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Bookings Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <BookmarkCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No reservations found</p>
            <p className="text-[11px] text-slate-400">
              There are no bookings matching the selected criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBookings.map((b) => {
              const startDate = new Date(b.start_at);
              const endDate = new Date(b.end_at);
              const isPast = endDate.getTime() < now;
              const isEligibleToCancel =
                b.status === 'CONFIRMED' &&
                !isPast &&
                (user?.role === 'admin' || user?.department_id === b.department_id);

              return (
                <div
                  key={b.id}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {b.booking_code}
                      </span>
                      <StatusChip status={b.status} />
                      <span className="text-xs font-semibold text-slate-600">
                        {b.department_name} ({b.department_code})
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{b.event_title}</h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {startDate.toLocaleDateString('en-IN', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <span>· Organizer: {b.organizer_name}</span>
                      <span>· {b.participant_count} Attendees</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1 italic">{b.purpose}</p>

                    {b.status === 'CANCELLED' && b.cancellation_reason && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800">
                        <span className="font-semibold">Cancellation Reason:</span> {b.cancellation_reason}
                        {b.cancelled_by_name && <span> (by {b.cancelled_by_name})</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                    <button
                      onClick={() => onOpenVoucher(b)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="View & Print Official Voucher"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print Voucher</span>
                    </button>

                    {isEligibleToCancel && (
                      <button
                        onClick={() => setCancellingBooking(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                        title="Cancel this reservation"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        booking={cancellingBooking}
        isOpen={Boolean(cancellingBooking)}
        onClose={() => setCancellingBooking(null)}
        onConfirm={handleConfirmCancellation}
      />
    </div>
  );
};
