import React, { useState } from 'react';
import { Building2, Lock, User, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    }
  };

  const fillQuickAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Banner */}
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            ASU
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">
              Assam Skill University
            </h1>
            <p className="text-[11px] text-slate-400">
              Central Conference Hall Reservation Portal
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Institutional Secure Access</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-8">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-900/60 border border-blue-700 text-blue-300 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Sign In to Your Account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Department Coordinators & University Administration
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. cse_user or admin"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Login Test Presets for Instant Evaluation */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider text-center">
              Quick Test Sign-In Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickAccount('admin', 'Admin@ASU2026')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-left transition-colors"
              >
                <p className="font-semibold text-blue-400">Administrator</p>
                <p className="text-[10px] text-slate-400 font-mono">admin</p>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('cse_user', 'Dept@123')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-left transition-colors"
              >
                <p className="font-semibold text-emerald-400">CSE Department</p>
                <p className="text-[10px] text-slate-400 font-mono">cse_user</p>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('me_user', 'Dept@123')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-left transition-colors"
              >
                <p className="font-semibold text-amber-400">Mech. Eng. Dept</p>
                <p className="text-[10px] text-slate-400 font-mono">me_user</p>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('ee_user', 'Dept@123')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-left transition-colors"
              >
                <p className="font-semibold text-purple-400">Electrical Dept</p>
                <p className="text-[10px] text-slate-400 font-mono">ee_user</p>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Assam Skill University · Central Administrative Portal · Timezone: Asia/Kolkata
        </p>
      </main>

      <footer className="text-center text-xs text-slate-500 py-2">
        ASU Conference Hall Reservation System · Multi-Department Instant Confirmation
      </footer>
    </div>
  );
};
