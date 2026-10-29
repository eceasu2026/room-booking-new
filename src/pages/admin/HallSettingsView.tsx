import React, { useState, useEffect } from 'react';
import {
  Sliders,
  AlertTriangle,
  Building2,
  Clock,
  Plus,
  Trash2,
  Save,
  Check,
  Calendar,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import type { Hall, HallClosure } from '../../types/index.ts';

export const HallSettingsView: React.FC = () => {
  const [hall, setHall] = useState<Hall | null>(null);
  const [closures, setClosures] = useState<HallClosure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable Hall Parameters
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(120);
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('20:00');
  const [minNoticeHours, setMinNoticeHours] = useState(2);
  const [maxDurationHours, setMaxDurationHours] = useState(8);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [advanceDays, setAdvanceDays] = useState(60);

  // Add Closure Modal
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [closureStart, setClosureStart] = useState('');
  const [closureEnd, setClosureEnd] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [closureConflictWarning, setClosureConflictWarning] = useState<any[]>([]);
  const [closureError, setClosureError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [hallRes, closuresRes] = await Promise.all([
        api.getHallSettings(),
        api.getClosures(),
      ]);
      const h = hallRes.hall;
      setHall(h);
      setName(h.name);
      setLocation(h.location);
      setCapacity(h.capacity);
      setOpeningTime(h.opening_time);
      setClosingTime(h.closing_time);
      setMinNoticeHours(h.min_notice_hours);
      setMaxDurationHours(h.max_duration_hours);
      setBufferMinutes(h.buffer_minutes);
      setAdvanceDays(h.advance_days_horizon);
      setClosures(closuresRes.closures);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.updateHallSettings({
        name,
        location,
        capacity: Number(capacity),
        opening_time: openingTime,
        closing_time: closingTime,
        min_notice_hours: Number(minNoticeHours),
        max_duration_hours: Number(maxDurationHours),
        buffer_minutes: Number(bufferMinutes),
        advance_days_horizon: Number(advanceDays),
      });
      setHall(res.hall);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    setClosureError(null);
    try {
      const startIso = new Date(closureStart).toISOString();
      const endIso = new Date(closureEnd).toISOString();
      const res = await api.addClosure({
        start_at: startIso,
        end_at: endIso,
        reason: closureReason.trim(),
      });

      if (res.conflicting_bookings && res.conflicting_bookings.length > 0) {
        setClosureConflictWarning(res.conflicting_bookings);
      } else {
        setIsClosureModalOpen(false);
        setClosureStart('');
        setClosureEnd('');
        setClosureReason('');
        await loadSettings();
      }
    } catch (err: any) {
      setClosureError(err.message || 'Failed to add closure.');
    }
  };

  const handleDeleteClosure = async (id: string) => {
    if (confirm('Are you sure you want to remove this hall closure?')) {
      await api.deleteClosure(id);
      await loadSettings();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Hall Settings & Maintenance Closures
        </h1>
        <p className="text-xs text-slate-500">
          Configure operating parameters, duration limits, and schedule emergency/maintenance closures.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900">Conference Hall Parameters</h2>
          </div>
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              <span>Settings Saved!</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hall Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Location</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Seating Capacity</label>
            <input
              type="number"
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Advance Booking Horizon (Days)
            </label>
            <input
              type="number"
              required
              value={advanceDays}
              onChange={(e) => setAdvanceDays(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Daily Opening Time</label>
            <input
              type="time"
              required
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Daily Closing Time</label>
              <span className="text-[10px] text-slate-400 font-medium">Use 00:00 or 23:59 for Midnight</span>
            </div>
            <input
              type="time"
              required
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Minimum Advance Notice (Hours)
            </label>
            <input
              type="number"
              required
              value={minNoticeHours}
              onChange={(e) => setMinNoticeHours(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transition / Buffer (Minutes)
            </label>
            <input
              type="number"
              required
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Closures Section */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Scheduled Hall Closures</h2>
            <p className="text-xs text-slate-500">Maintenance, campus examinations, holidays</p>
          </div>
          <button
            onClick={() => {
              setClosureConflictWarning([]);
              setClosureError(null);
              setIsClosureModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Closure</span>
          </button>
        </div>

        {closures.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No closures scheduled.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {closures.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-900">{c.reason}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {new Date(c.start_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} –{' '}
                    {new Date(c.end_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteClosure(c.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  title="Remove closure"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Closure Modal */}
      {isClosureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm">Schedule Hall Closure</h3>
            </div>

            <form onSubmit={handleAddClosure} className="p-6 space-y-4">
              {closureError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {closureError}
                </div>
              )}

              {closureConflictWarning.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
                  <p className="font-bold">⚠️ Warning: Existing Bookings Conflict with this Closure!</p>
                  <p className="text-[11px]">
                    The following confirmed booking(s) overlap with this scheduled closure:
                  </p>
                  <ul className="list-disc list-inside text-[11px]">
                    {closureConflictWarning.map((cb) => (
                      <li key={cb.id}>
                        {cb.event_title} ({cb.department_name})
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] font-semibold pt-1">
                    Please cancel or reschedule these bookings if proceeding.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsClosureModalOpen(false);
                      loadSettings();
                    }}
                    className="mt-2 text-xs font-bold text-blue-700 underline"
                  >
                    Acknowledge & Close
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Closure Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A/V System Upgrade / University Convocation"
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={closureStart}
                    onChange={(e) => setClosureStart(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={closureEnd}
                    onChange={(e) => setClosureEnd(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClosureModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs"
                >
                  Confirm Closure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
