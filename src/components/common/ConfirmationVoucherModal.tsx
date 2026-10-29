import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Printer, X, CheckCircle, Calendar, Clock, Building2, User, Phone, Users, ShieldCheck } from 'lucide-react';
import type { Booking } from '../../types/index.ts';

interface ConfirmationVoucherModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  triggerConfetti?: boolean;
}

export const ConfirmationVoucherModal: React.FC<ConfirmationVoucherModalProps> = ({
  booking,
  isOpen,
  onClose,
  triggerConfetti = true,
}) => {
  useEffect(() => {
    if (isOpen && triggerConfetti) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#1E3A8A', '#2563EB', '#10B981', '#F59E0B'],
        });
      } catch {
        // canvas-confetti fallback
      }
    }
  }, [isOpen, triggerConfetti]);

  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const startDate = new Date(booking.start_at);
  const endDate = new Date(booking.end_at);

  const formattedDate = startDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedStartTime = startDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const formattedEndTime = endDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print-card">
        {/* Header Action Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800">Automatic Reservation Confirmed</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Printable Voucher Content */}
        <div className="p-8">
          {/* Institutional Letterhead Header */}
          <div className="text-center pb-6 border-b border-slate-200">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-900 text-white font-bold text-lg mb-2 shadow-sm">
              ASU
            </div>
            <h1 className="text-xl font-bold tracking-tight text-blue-950 uppercase">
              Assam Skill University
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-0.5">
              Central Conference Hall Reservation Voucher
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>CONFIRMED & RESERVED AUTOMATICALLY</span>
            </div>
          </div>

          {/* Booking Code Callout */}
          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Official Booking Code</p>
              <p className="text-2xl font-mono font-bold text-slate-900 tracking-wider">
                {booking.booking_code}
              </p>
            </div>
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <p className="text-xs text-slate-500 font-medium">Issue Timestamp (IST)</p>
              <p className="text-xs font-mono text-slate-700">
                {new Date(booking.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          </div>

          {/* Core Booking Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Building2 className="w-4 h-4 text-blue-700" />
                <span>Department</span>
              </div>
              <p className="font-semibold text-slate-900">{booking.department_name || 'Assam Skill University'}</p>
              <p className="text-xs text-slate-500">Dept Code: {booking.department_code || 'ASU'}</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Calendar className="w-4 h-4 text-blue-700" />
                <span>Reservation Date</span>
              </div>
              <p className="font-semibold text-slate-900">{formattedDate}</p>
              <p className="text-xs text-slate-500">Timezone: Asia/Kolkata (IST)</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Clock className="w-4 h-4 text-blue-700" />
                <span>Scheduled Time & Duration</span>
              </div>
              <p className="font-semibold text-slate-900">
                {formattedStartTime} – {formattedEndTime}
              </p>
              <p className="text-xs font-mono text-slate-500">Duration: {booking.duration_minutes || 0} minutes</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Users className="w-4 h-4 text-blue-700" />
                <span>Expected Attendees</span>
              </div>
              <p className="font-semibold text-slate-900">{booking.participant_count} Participants</p>
              <p className="text-xs text-slate-500">Capacity: 120 seats</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-white md:col-span-2">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <User className="w-4 h-4 text-blue-700" />
                <span>Event Title & Purpose</span>
              </div>
              <p className="font-semibold text-slate-900 text-base">{booking.event_title}</p>
              <p className="text-slate-600 mt-1 text-xs">{booking.purpose}</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <User className="w-4 h-4 text-blue-700" />
                <span>Organizer Details</span>
              </div>
              <p className="font-semibold text-slate-900">{booking.organizer_name}</p>
              <p className="text-xs text-slate-500">Department Coordinator</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Phone className="w-4 h-4 text-blue-700" />
                <span>Contact Number</span>
              </div>
              <p className="font-mono font-semibold text-slate-900">{booking.contact_number}</p>
              <p className="text-xs text-slate-500">Campus Extension / Mobile</p>
            </div>

            {booking.remarks && (
              <div className="p-3.5 rounded-lg border border-slate-100 bg-white md:col-span-2">
                <p className="text-xs text-slate-500 font-medium mb-1">Special Arrangements / Remarks</p>
                <p className="text-xs text-slate-700 italic">{booking.remarks}</p>
              </div>
            )}
          </div>

          {/* Standard Facilities Note */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              <p className="font-medium text-slate-700">Facilities Booked:</p>
              <p>Dual HD Projectors · Video Conferencing · Podium Microphones · Central HVAC</p>
            </div>
            <div className="text-right sm:text-right">
              <p className="text-[11px] text-slate-400">Computer Generated Voucher</p>
              <p className="text-[11px] font-mono text-slate-400">Hall ID: hall-main</p>
            </div>
          </div>
        </div>

        {/* Footer (No print) */}
        <div className="no-print px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors"
          >
            Print Voucher
          </button>
        </div>
      </div>
    </div>
  );
};
