import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.ts';
import { Transaction, ReturnSlipData } from '../types/index.ts';
import { SlipModal } from '../components/SlipModal.tsx';
import { formatDisplayDate } from '../../server/src/utils/dateHelper.ts';
import {
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type ReturnDeskMode = 'active' | 'overdue' | 'returned';

interface ReturnBookPageProps {
  onNavigateToFines: () => void;
  initialMode?: ReturnDeskMode;
  modeTrigger?: number;
}

export const ReturnBookPage: React.FC<ReturnBookPageProps> = ({
  onNavigateToFines,
  initialMode = 'active',
  modeTrigger = 0,
}) => {
  const [mode, setMode] = useState<ReturnDeskMode>(initialMode);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [returnedLoans, setReturnedLoans] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active slip modal & confirmation modal
  const [activeSlip, setActiveSlip] = useState<ReturnSlipData | null>(null);
  const [confirmLoan, setConfirmLoan] = useState<any | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => {
    if (modeTrigger > 0) {
      setMode(initialMode);
    }
  }, [initialMode, modeTrigger]);

  const fetchLoans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const [activeRes, returnedRes] = await Promise.all([
        api.get<any[]>(`/issues/active${qs}`),
        api.get<any[]>(`/returns/history${qs}`),
      ]);
      setActiveLoans(activeRes);
      setReturnedLoans(returnedRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load circulation records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [search]);

  const handleConfirmReturn = async () => {
    if (!confirmLoan) return;
    const loan = confirmLoan;
    setConfirmLoan(null);
    setReturningId(loan.id);
    setError(null);

    try {
      const res = await api.post<{ transaction: Transaction; fine?: any; slip: ReturnSlipData }>(
        `/returns/${loan.id}`
      );

      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      setActiveSlip(res.slip);

      if (res.fine) {
        setSuccessMsg(
          `Book returned. Accrued late fine of ₹${res.fine.amount} (${res.fine.daysLate} days late) recorded.`
        );
      } else {
        setSuccessMsg('Book returned on time. Available shelf stock incremented.');
      }

      fetchLoans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to process return');
    } finally {
      setReturningId(null);
    }
  };

  const overdueLoans = activeLoans.filter(l => l.isOverdue);
  const displayedActiveLoans = mode === 'overdue' ? overdueLoans : activeLoans;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Return Book Desk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Process book returns, review overdue loans, and inspect completed return history
          </p>
        </div>

        {/* Search loans */}
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Member, Title, or ISBN..."
            className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
        <div className="flex items-center bg-slate-100 p-1 rounded-full text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('active')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              mode === 'active'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Loans ({activeLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('overdue')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              mode === 'overdue'
                ? 'bg-rose-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overdue Only ({overdueLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('returned')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              mode === 'returned'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed Returns ({returnedLoans.length})
          </button>
        </div>

        <span className="text-xs text-slate-500 px-2">
          {mode === 'returned'
            ? `Showing ${returnedLoans.length} completed return(s)`
            : `Showing ${displayedActiveLoans.length} ${mode === 'overdue' ? 'overdue' : 'active'} loan(s)`}
        </span>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {successMsg.includes('fine') && (
            <button
              onClick={onNavigateToFines}
              className="underline text-emerald-900 hover:text-black font-bold cursor-pointer"
            >
              Collect Fine Now →
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          {mode === 'returned' ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Member ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Borrower</th>
                  <th className="py-3 px-4 whitespace-nowrap">ISBN</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4 whitespace-nowrap">Issue Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Due Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Returned On</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Timeliness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                      <span>Loading completed returns...</span>
                    </td>
                  </tr>
                ) : returnedLoans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      No completed book returns matching "{search}".
                    </td>
                  </tr>
                ) : (
                  returnedLoans.map(loan => (
                    <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200 inline-block whitespace-nowrap">
                          {loan.memberCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">{loan.memberName}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block whitespace-nowrap tabular-nums">
                          {loan.bookIsbn}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[200px] truncate" title={loan.bookTitle}>
                        {loan.bookTitle}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {formatDisplayDate(loan.issueDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {formatDisplayDate(loan.dueDate)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-700 whitespace-nowrap">
                        {formatDisplayDate(loan.returnDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {loan.daysLate > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {loan.daysLate}d late (₹{loan.lateFine})
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            On Time
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Member ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Borrower</th>
                  <th className="py-3 px-4 whitespace-nowrap">ISBN</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4 whitespace-nowrap">Issue Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Due Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Loan Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                      <span>Loading active transactions...</span>
                    </td>
                  </tr>
                ) : displayedActiveLoans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      {mode === 'overdue'
                        ? 'No overdue book loans right now.'
                        : `No active book loans matching "${search}".`}
                    </td>
                  </tr>
                ) : (
                  displayedActiveLoans.map(loan => (
                    <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200 inline-block whitespace-nowrap">
                          {loan.memberCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">{loan.memberName}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block whitespace-nowrap tabular-nums">
                          {loan.bookIsbn}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[190px] truncate" title={loan.bookTitle}>
                        {loan.bookTitle}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {formatDisplayDate(loan.issueDate)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={loan.isOverdue ? 'font-bold text-rose-600' : 'font-medium text-slate-700'}>
                          {formatDisplayDate(loan.dueDate)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {loan.isOverdue ? (
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Overdue ({loan.daysOverdue}d late)
                            </span>
                            <span className="block font-mono text-[11px] font-bold text-rose-600">
                              Fine: ₹{loan.estimatedFine}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Due in {loan.daysRemaining} days
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setConfirmLoan(loan)}
                          disabled={returningId === loan.id}
                          className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {returningId === loan.id ? 'Returning...' : 'Return'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirm Return Modal */}
      {confirmLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Confirm Book Return</h3>
              <button
                onClick={() => setConfirmLoan(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Record return for <strong className="text-slate-900">"{confirmLoan.bookTitle}"</strong> (
              <span className="font-mono whitespace-nowrap">{confirmLoan.bookIsbn}</span>) borrowed by{' '}
              <strong className="text-slate-900">{confirmLoan.memberName}</strong> ({confirmLoan.memberCode})?
            </p>
            {confirmLoan.isOverdue && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
                Overdue by {confirmLoan.daysOverdue} days — an unpaid fine of ₹{confirmLoan.estimatedFine} will be recorded.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmLoan(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip Modal */}
      <SlipModal slip={activeSlip} onClose={() => setActiveSlip(null)} />
    </div>
  );
};
