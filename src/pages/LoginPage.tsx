import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { KeyRound, ChevronDown, Copy, Check, AlertCircle, CheckCircle } from 'lucide-react';

interface DemoAccount {
  id: string;
  label: string;
  roleDetail: string;
  email: string;
  password: string;
}

const SEEDED_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'librarian',
    label: 'College Librarian',
    roleDetail: 'Admin',
    email: 'librarian@college.edu',
    password: 'password123',
  },
  {
    id: 'student-aarav',
    label: 'Aarav Sharma',
    roleDetail: 'Student · Active loan & fine',
    email: 'aarav.sharma@college.edu',
    password: 'password123',
  },
  {
    id: 'student-diya',
    label: 'Diya Patel',
    roleDetail: 'Student · Overdue loan',
    email: 'diya.patel@college.edu',
    password: 'password123',
  },
];

export const LoginPage: React.FC = () => {
  const { login, activateStudent } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'activate'>('signin');
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCredentialsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCredentialsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCopy = async (key: string, value: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(prev => (prev === key ? null : prev));
      }, 1500);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 relative flex flex-col justify-center items-center p-4 pt-16 sm:pt-4">
      {/* Top-Right Demo Credentials Dropdown */}
      <div ref={dropdownRef} className="absolute top-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setIsCredentialsOpen(prev => !prev)}
          aria-expanded={isCredentialsOpen}
          className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs text-xs font-semibold text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 whitespace-nowrap"
        >
          <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Demo Credentials</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              isCredentialsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isCredentialsOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Seeded Login Credentials</span>
              <span className="text-[11px] text-slate-500">Copy to sign in</span>
            </div>

            <div className="divide-y divide-slate-100">
              {SEEDED_DEMO_ACCOUNTS.map(account => (
                <div key={account.id} className="p-3.5 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{account.label}</span>
                    <span className="text-[11px] font-medium text-slate-500">{account.roleDetail}</span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5">
                      <div className="min-w-0">
                        <span className="text-slate-400 mr-1.5">ID:</span>
                        <span className="font-mono text-slate-800 truncate">{account.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${account.id}-email`, account.email)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === `${account.id}-email` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5">
                      <div className="min-w-0">
                        <span className="text-slate-400 mr-1.5">Pass:</span>
                        <span className="font-mono tabular-nums text-slate-800">{account.password}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${account.id}-pass`, account.password)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === `${account.id}-pass` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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

        </div>
      </div>
    </div>
  );
};
