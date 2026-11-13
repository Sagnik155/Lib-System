import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { BookOpen, KeyRound, UserCheck, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, activateStudent, quickLoginAs } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'activate'>('signin');

  // Sign in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Activation fields
  const [activateEmail, setActivateEmail] = useState('');
  const [activatePassword, setActivatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activatePassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (activatePassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await activateStudent(activateEmail, activatePassword);
      setSuccessMsg('Account activated successfully! Logging you in...');
    } catch (err: any) {
      setError(err.message || 'Activation failed. Please contact librarian.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-slate-900 text-white p-7 text-center relative border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-white">Library Management System</h1>
          <p className="text-xs text-slate-400 mt-1">Official University Library & Member Portal</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('signin');
              setError(null);
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('activate');
              setError(null);
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              activeTab === 'activate'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Activate Student Account
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="librarian@college.edu or student@college.edu"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Signing In...' : 'Sign In to Portal'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleActivate} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] leading-relaxed">
                Enter your institutional email registered with the librarian. Your account will be verified and linked automatically.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registered Student Email *</label>
                <input
                  type="email"
                  required
                  value={activateEmail}
                  onChange={e => setActivateEmail(e.target.value)}
                  placeholder="e.g. aarav.sharma@college.edu"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Choose Password (Min 6 chars) *</label>
                <input
                  type="password"
                  required
                  value={activatePassword}
                  onChange={e => setActivatePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Activating...' : 'Activate My Student Account'}
              </button>
            </form>
          )}

          {/* Quick Demo Logins for Viva */}
          <div className="mt-6 pt-5 border-t border-slate-200/80">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-2.5">
              Quick 1-Click Viva Demo Accounts
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => quickLoginAs('librarian@college.edu')}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-800 text-xs block">👨‍💼 College Librarian</span>
                  <span className="text-[10px] text-slate-400">librarian@college.edu (password123)</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('aarav.sharma@college.edu')}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-800 text-xs block">🎓 Student: Aarav Sharma</span>
                  <span className="text-[10px] text-slate-400">aarav.sharma@college.edu (has active loan & unpaid fine)</span>
                </div>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                  Student
                </span>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('diya.patel@college.edu')}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-800 text-xs block">🎓 Student: Diya Patel</span>
                  <span className="text-[10px] text-slate-400">diya.patel@college.edu (has overdue loan)</span>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                  Overdue
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
