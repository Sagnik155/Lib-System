import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { formatDisplayDate } from '../../server/src/utils/dateHelper.ts';
import {
  Clock,
  History,
  RefreshCw,
  BookmarkCheck,
  Coins,
  BookOpen,
} from 'lucide-react';

type AccountTab = 'loans' | 'fines' | 'history';

export const StudentAccountPage: React.FC = () => {
  const { user } = useAuth();
  const [booksData, setBooksData] = useState<{ currentIssued: any[]; history: any[] }>({
    currentIssued: [],
    history: [],
  });
  const [fines, setFines] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<AccountTab>('loans');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [booksRes, finesRes] = await Promise.all([
        api.get('/me/books'),
        api.get('/me/fines'),
      ]);
      setBooksData(booksRes);
      setFines(finesRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load your account records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-medium">Loading your student account records...</p>
      </div>
    );
  }

  const overdueCount = booksData.currentIssued.filter(item => item.isOverdue).length;
  const unpaidFines = fines.filter(f => f.status === 'Unpaid');
  const totalUnpaid = unpaidFines.reduce((sum, f) => sum + f.amount, 0);

  const displayName = user?.member?.fullName || user?.email || 'Student';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
  const memberStatus = user?.member?.status || 'Active';

  return (
    <div className="space-y-6">
      {/* Crisp White Profile Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-base flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700">Student Library Account</p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">{displayName}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="font-mono font-semibold text-slate-700">
                {user?.member?.memberCode || 'STUDENT'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{user?.email}</span>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col sm:items-end justify-between gap-1 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span className="text-xs font-medium text-slate-500">Membership Status</span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              memberStatus === 'Active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {memberStatus}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* 3-Card Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
          <div className="text-xs font-medium text-slate-500 mb-2">Active Loans</div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {booksData.currentIssued.length} <span className="text-base font-semibold text-slate-400">/ 5</span>
            </span>
            <span className="text-xs text-slate-400">Borrowing quota</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
          <div className="text-xs font-medium text-slate-500 mb-2">Overdue Books</div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-3xl font-extrabold tabular-nums ${
                overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {overdueCount}
            </span>
            <span className={`text-xs font-medium ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {overdueCount > 0 ? 'Return promptly' : 'All loans on time'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
          <div className="text-xs font-medium text-slate-500 mb-2">Unpaid Fines</div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-3xl font-extrabold font-mono tabular-nums ${
                totalUnpaid > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              ₹{totalUnpaid}
            </span>
            <span className="text-xs text-slate-400">
              {unpaidFines.length > 0 ? `${unpaidFines.length} pending` : 'No pending dues'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabbed Sections Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('loans')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'loans'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Active Loans ({booksData.currentIssued.length})
            </button>

            <button
              onClick={() => setActiveSection('fines')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'fines'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Fines ({fines.length})
            </button>

            <button
              onClick={() => setActiveSection('history')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'history'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Borrowing History ({booksData.history.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Standard loan period: 14 days • Late fee: ₹5/day
          </span>
        </div>

        <div className="p-5">
          {/* Tab 1: Active Loans */}
          {activeSection === 'loans' && (
            <div>
              {booksData.currentIssued.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <BookmarkCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No books currently borrowed</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Browse the library catalogue to find available books.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {booksData.currentIssued.map(item => (
                    <div
                      key={item.id}
                      className={`rounded-2xl p-5 border space-y-3 transition-all ${
                        item.isOverdue ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {item.bookTitle}
                        </h4>
                        {item.isOverdue ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                            OVERDUE
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            On Time
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block whitespace-nowrap tabular-nums">
                          ISBN: {item.bookIsbn}
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 pt-2 border-t border-slate-200/70">
                        <div className="flex justify-between text-slate-600">
                          <span>Issued Date</span>
                          <span className="font-medium text-slate-800">{formatDisplayDate(item.issueDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Due Date</span>
                          <span
                            className={`font-semibold ${
                              item.isOverdue ? 'text-rose-600 font-mono font-bold' : 'text-slate-900'
                            }`}
                          >
                            {formatDisplayDate(item.dueDate)}
                          </span>
                        </div>
                      </div>

                      {item.isOverdue ? (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center justify-between text-rose-800">
                          <span className="font-medium">Late by {item.daysOverdue} days</span>
                          <span className="font-mono font-bold">Fine: ₹{item.accruedFine}</span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs flex items-center gap-1.5 text-slate-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Due in {item.daysRemaining} days</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Fines */}
          {activeSection === 'fines' && (
            <div>
              {fines.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Coins className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No fine records</p>
                  <p className="text-xs text-slate-400 mt-1">You have a clean borrowing record with zero fines.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-2.5 pr-4">Book Title</th>
                        <th className="pb-2.5 pr-4 whitespace-nowrap">Days Late</th>
                        <th className="pb-2.5 pr-4 whitespace-nowrap">Fine Amount</th>
                        <th className="pb-2.5 pr-4 whitespace-nowrap">Status</th>
                        <th className="pb-2.5 whitespace-nowrap">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fines.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-3 pr-4 font-semibold text-slate-900">{f.bookTitle}</td>
                          <td className="py-3 pr-4 text-slate-600 whitespace-nowrap tabular-nums">{f.daysLate} days</td>
                          <td className="py-3 pr-4 font-mono font-bold text-slate-800 whitespace-nowrap tabular-nums">
                            ₹{f.amount}
                          </td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                f.status === 'Unpaid'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {f.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 whitespace-nowrap">
                            {f.status === 'Paid'
                              ? `Paid ${formatDisplayDate(f.paidOn)}`
                              : formatDisplayDate(f.generatedOn)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Borrowing History */}
          {activeSection === 'history' && (
            <div>
              {booksData.history.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No returned books yet</p>
                  <p className="text-xs text-slate-400 mt-1">Completed loans will appear here once returned.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-2.5 pr-4 whitespace-nowrap">ISBN</th>
                        <th className="pb-2.5 pr-4">Book Title</th>
                        <th className="pb-2.5 pr-4 whitespace-nowrap">Author</th>
                        <th className="pb-2.5 pr-4 whitespace-nowrap">Issued</th>
                        <th className="pb-2.5 whitespace-nowrap">Returned On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {booksData.history.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-semibold inline-block whitespace-nowrap tabular-nums">
                              {item.bookIsbn}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-slate-900">{item.bookTitle}</td>
                          <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{item.authorName}</td>
                          <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                            {formatDisplayDate(item.issueDate)}
                          </td>
                          <td className="py-3 font-semibold text-emerald-700 whitespace-nowrap">
                            {formatDisplayDate(item.returnDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
