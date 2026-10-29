import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  User,
  Phone,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { Department, Hall, AvailabilityCheckResponse, Booking } from '../../types/index.ts';

interface BookHallViewProps {
  onBookingSuccess: (booking: Booking) => void;
  initialDate?: string;
  initialStartTime?: string;
}

export const BookHallView: React.FC<BookHallViewProps> = ({
  onBookingSuccess,
  initialDate,
  initialStartTime,
}) => {
  const { user } = useAuth();
  const [hall, setHall] = useState<Hall | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Calculate default date (tomorrow or initialDate)
  const defaultDateStr = () => {
    if (initialDate) return initialDate;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const [bookingDate, setBookingDate] = useState(defaultDateStr());
  const [startTime, setStartTime] = useState(initialStartTime || '10:00');
  const [endTime, setEndTime] = useState('12:00');

  // Department (locked for department_user, selectable for admin)
  const [selectedDeptId, setSelectedDeptId] = useState(user?.department_id || '');

  // Form Fields
  const [eventTitle, setEventTitle] = useState('');
  const [organizerName, setOrganizerName] = useState(user?.display_name || '');
  const [contactNumber, setContactNumber] = useState('+91 98765 43210');
  const [purpose, setPurpose] = useState('');
  const [participantCount, setParticipantCount] = useState<number>(60);
  const [remarks, setRemarks] = useState('');

  // Availability Check State
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<AvailabilityCheckResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    try {
      const [hallRes, deptsRes] = await Promise.all([
        api.getHallSettings(),
        api.getDepartments(),
      ]);
      setHall(hallRes.hall);
      setDepartments(deptsRes.departments);
      if (user?.role === 'admin' && deptsRes.departments.length > 0 && !selectedDeptId) {
        setSelectedDeptId(deptsRes.departments[0].id);
      }
    } catch {
      // handled
    }
  };

  // Compute ISO timestamps anchored to university timezone (Asia/Kolkata, UTC+05:30)
  const getStartAtIso = () => {
    return new Date(`${bookingDate}T${startTime}:00+05:30`).toISOString();
  };

  const getEndAtIso = () => {
    return new Date(`${bookingDate}T${endTime}:00+05:30`).toISOString();
  };

  // Calculate duration in minutes and hours
  const calculateDuration = () => {
    try {
      const s = new Date(`${bookingDate}T${startTime}:00`).getTime();
      const e = new Date(`${bookingDate}T${endTime}:00`).getTime();
      if (isNaN(s) || isNaN(e) || e <= s) return null;
      const mins = Math.round((e - s) / (60 * 1000));
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return { mins, formatted: hours > 0 ? `${hours}h ${remainingMins > 0 ? `${remainingMins}m` : ''}` : `${mins}m` };
    } catch {
      return null;
    }
  };

  const duration = calculateDuration();

  // Reset availability status whenever date or times change
  const handleTimeChange = (type: 'date' | 'start' | 'end', val: string) => {
    if (type === 'date') setBookingDate(val);
    if (type === 'start') setStartTime(val);
    if (type === 'end') setEndTime(val);
    setAvailabilityResult(null);
    setAvailabilityError(null);
    setSubmitError(null);
  };

  const handleCheckAvailability = async () => {
    if (!bookingDate || !startTime || !endTime) {
      setAvailabilityError('Please select booking date, start time, and end time.');
      return;
    }

    setIsCheckingAvailability(true);
    setAvailabilityError(null);
    setAvailabilityResult(null);

    try {
      const startIso = getStartAtIso();
      const endIso = getEndAtIso();
      const res = await api.checkAvailability(startIso, endIso);
      setAvailabilityResult(res);
    } catch (err: any) {
      setAvailabilityError(err.message || 'Error verifying slot availability.');
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!eventTitle.trim()) {
      setSubmitError('Event title is required.');
      return;
    }
    if (!organizerName.trim()) {
      setSubmitError('Organizer name is required.');
      return;
    }
    if (!purpose.trim()) {
      setSubmitError('Purpose of booking is required.');
      return;
    }
    if (!participantCount || participantCount < 1) {
      setSubmitError('Please specify valid expected participant count.');
      return;
    }

    setIsSubmitting(true);
    try {
      const startIso = getStartAtIso();
      const endIso = getEndAtIso();

      const res = await api.createBooking({
        department_id: user?.role === 'admin' ? selectedDeptId : user?.department_id || undefined,
        event_title: eventTitle.trim(),
        organizer_name: organizerName.trim(),
        contact_number: contactNumber.trim(),
        purpose: purpose.trim(),
        participant_count: Number(participantCount),
        start_at: startIso,
        end_at: endIso,
        remarks: remarks.trim() || undefined,
      });

      // Launch voucher modal via parent callback
      onBookingSuccess(res.booking);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to confirm booking due to slot conflict.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Central Conference Hall Reservation</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Book Conference Hall
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Reserve conference facilities with instant automatic slot confirmation. Select your preferred date and time interval below.
        </p>
      </div>

      <form onSubmit={handleSubmitBooking} className="space-y-6">
        {/* Section 1: Date & Time Interval */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">1. Date & Time Selection</h2>
            </div>
            {duration && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Duration: {duration.formatted}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Booking Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={bookingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleTimeChange('date', e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => handleTimeChange('start', e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => handleTimeChange('end', e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          {/* Availability Check Action & Feedback */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCheckAvailability}
              disabled={isCheckingAvailability}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors active:scale-95 disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isCheckingAvailability ? 'Checking Availability...' : 'Check Slot Availability'}</span>
            </button>

            <span className="text-[11px] text-slate-500">
              Permitted operating hours: {hall?.opening_time || '08:00'} – {hall?.closing_time || '20:00'} (IST)
            </span>
          </div>

          {/* Availability Status Banner */}
          {availabilityResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                availabilityResult.is_available
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {availabilityResult.is_available ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{availabilityResult.message}</p>
                {availabilityResult.conflicts.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {availabilityResult.conflicts.map((c, i) => (
                      <li key={i}>
                        {c.title} ({new Date(c.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(c.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {availabilityError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{availabilityError}</span>
            </div>
          )}
        </div>

        {/* Section 2: Department & Event Details */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900">2. Department & Event Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department field: locked for department user */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                University Department
              </label>
              {user?.role === 'admin' ? (
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={`${user?.department_name || 'Academic Department'} (${user?.department_code || 'ASU'})`}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed font-medium"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g. National Symposium on Skill Education 2026"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Organizer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. Dr. A. K. Sharma"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Participants (Max {hall?.capacity || 120}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={hall?.capacity || 120}
                value={participantCount}
                onChange={(e) => setParticipantCount(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purpose of Reservation <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Guest Lecture, Department Meeting, Workshop"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Special Arrangements or Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., Need 3 wireless mics and podium setup, live streaming arrangement..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submission Error Banner */}
        {submitError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Action Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Automatic Confirmation Enabled</span>
            </p>
            <p className="text-xs text-blue-200 mt-0.5">
              Upon clicking confirm, the slot is committed to the university database and your official confirmation voucher is generated immediately.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            <span>{isSubmitting ? 'Confirming Reservation...' : 'Confirm & Book Conference Hall'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
