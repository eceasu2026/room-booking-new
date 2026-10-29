import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const SetupWizard: React.FC = () => {
  const { completeSetup } = useAuth();
  const [step, setStep] = useState(1);

  // Form State
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminDisplayName, setAdminDisplayName] = useState('University Administrator');
  const [adminPassword, setAdminPassword] = useState('Admin@ASU2026');
  const [confirmPassword, setConfirmPassword] = useState('Admin@ASU2026');

  const [universityName, setUniversityName] = useState('Assam Skill University');
  const [hallName, setHallName] = useState('Central Conference Hall');
  const [hallCapacity, setHallCapacity] = useState(120);
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('20:00');
  const [minNoticeHours, setMinNoticeHours] = useState(2);
  const [maxDurationHours, setMaxDurationHours] = useState(8);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const timezone = 'Asia/Kolkata';

  // Confirmed Phase 1 choices
  const [departments, setDepartments] = useState([
    { name: 'Computer Science & Engineering', code: 'CSE' },
    { name: 'Mechanical Engineering', code: 'ME' },
    { name: 'Electrical Engineering', code: 'EE' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!adminUsername.trim() || adminUsername.length < 3) {
        setError('Admin username must be at least 3 characters.');
        return;
      }
      if (!adminPassword || adminPassword.length < 6) {
        setError('Admin password must be at least 6 characters.');
        return;
      }
      if (adminPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await completeSetup({
        admin_username: adminUsername.trim(),
        admin_display_name: adminDisplayName.trim(),
        admin_password: adminPassword,
        hall_name: hallName.trim(),
        hall_capacity: Number(hallCapacity),
        opening_time: openingTime,
        closing_time: closingTime,
        min_notice_hours: Number(minNoticeHours),
        buffer_minutes: Number(bufferMinutes),
        initial_departments: departments,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to initialize the system.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Background Graphic Accent */}
      <div className="w-full max-w-2xl bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="p-8 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-slate-700/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
                ASU
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Assam Skill University
                </h1>
                <p className="text-xs text-blue-200">
                  Conference Hall Reservation System — First-Run Setup Wizard
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-blue-300">Step {step} of 4</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="text-base font-semibold text-white">1. Create University Administrator</h2>
              </div>
              <p className="text-xs text-slate-400">
                Create the master administrative credentials. The administrator manages university departments, users, hall operating parameters, and audit reports.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Administrator Display Name
                  </label>
                  <input
                    type="text"
                    value={adminDisplayName}
                    onChange={(e) => setAdminDisplayName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Building2 className="w-5 h-5" />
                <h2 className="text-base font-semibold text-white">2. Conference Hall Specifications</h2>
              </div>
              <p className="text-xs text-slate-400">
                Configure primary venue parameters, seating capacity, and standard operating hours.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Institution Name
                  </label>
                  <input
                    type="text"
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Conference Hall Name
                  </label>
                  <input
                    type="text"
                    value={hallName}
                    onChange={(e) => setHallName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Hall Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    value={hallCapacity}
                    onChange={(e) => setHallCapacity(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    University Timezone
                  </label>
                  <input
                    type="text"
                    disabled
                    value={timezone}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 cursor-not-allowed font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Clock className="w-5 h-5" />
                <h2 className="text-base font-semibold text-white">3. Operating Hours & Booking Rules</h2>
              </div>
              <p className="text-xs text-slate-400">
                Define booking policies enforced during automatic slot confirmation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Daily Opening Time
                  </label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Daily Closing Time
                  </label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Minimum Advance Notice (Hours)
                  </label>
                  <input
                    type="number"
                    value={minNoticeHours}
                    onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Transition / Cleaning Buffer (Minutes)
                  </label>
                  <input
                    type="number"
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Users className="w-5 h-5" />
                <h2 className="text-base font-semibold text-white">4. Initial University Departments</h2>
              </div>
              <p className="text-xs text-slate-400">
                Seeding initial active departments and default coordinator test accounts for automatic booking:
              </p>

              <div className="space-y-2 pt-2">
                {departments.map((d, index) => (
                  <div
                    key={d.code}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs text-white">{d.name}</span>
                      <span className="ml-2 font-mono text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        {d.code}
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      User: {d.code.toLowerCase()}_user · Pass: Dept@123
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Automatic confirmation workflow is active: When slots are conflict-free, reservations are confirmed instantly!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-900/60 border-t border-slate-700 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Initializing ASU System...' : 'Finish Setup & Enter System'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
