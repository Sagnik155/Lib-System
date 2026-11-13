import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.ts';
import { Fine, PaymentSlipData } from '../types/index.ts';
import { SlipModal } from '../components/SlipModal.tsx';
import { formatDisplayDate } from '../../server/src/utils/dateHelper.ts';
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Printer,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FinesPageProps {
  initialTab?: 'Unpaid' | 'Paid';
  tabTrigger?: number;
}

export const FinesPage: React.FC<FinesPageProps> = ({
  initialTab = 'Unpaid',
  tabTrigger = 0,
}) => {
  const [allFines, setAllFines] = useState<Fine[]>([]);
  const [selectedTab, setSelectedTab] = useState<'Unpaid' | 'Paid'>(initialTab);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active slip modal & payment confirmation modal
  const [activeSlip, setActiveSlip] = useState<PaymentSlipData | null>(null);
  const [confirmFine, setConfirmFine] = useState<Fine | null>(null);
  const [payingFineId, setPayingFineId] = useState<string | null>(null);

  const fetchFines = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<Fine[]>('/fines');
      setAllFines(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load fine records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tabTrigger > 0) {
      setSelectedTab(initialTab);
    }
  }, [initialTab, tabTrigger]);

  useEffect(() => {
    fetchFines();
  }, []);

  const handleConfirmPayFine = async () => {
    if (!confirmFine) return;
    const fine = confirmFine;
    setConfirmFine(null);
    setPayingFineId(fine.id);
    setError(null);

    try {
      const res = await api.post<{ fine: Fine; slip: PaymentSlipData }>(`/fines/${fine.id}/pay`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

      setActiveSlip(res.slip);
      setSuccessMsg(`Payment of ₹${fine.amount} recorded successfully. Receipt generated.`);
      fetchFines();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setPayingFineId(null);
    }
  };

  const handleReprintReceipt = (fine: Fine) => {
    const slip: PaymentSlipData = {
      fineId: fine.id,
      transactionId: fine.transactionId,
      slipType: 'PAYMENT',
      slipDate: fine.paidOn || fine.generatedOn,
      memberCode: fine.memberCode || 'N/A',
      memberName: fine.memberName || 'N/A',
      bookTitle: fine.bookTitle || 'Library Book',
      amountPaid: fine.amount,
      paymentDate: fine.paidOn || fine.generatedOn,
      collectedBy: fine.collectedBy || 'Librarian',
    };
    setActiveSlip(slip);
  };

  const unpaidFines = allFines.filter(f => f.status === 'Unpaid');
  const paidFines = allFines.filter(f => f.status === 'Paid');

  const totalUnpaidAmount = unpaidFines.reduce((sum, f) => sum + f.amount, 0);
  const totalCollectedAmount = paidFines.reduce((sum, f) => sum + f.amount, 0);

  const tabFines = selectedTab === 'Unpaid' ? unpaidFines : paidFines;
  const filteredFines = tabFines.filter(
    f =>
      (f.memberCode && f.memberCode.toLowerCase().includes(search.toLowerCase())) ||
      (f.memberName && f.memberName.toLowerCase().includes(search.toLowerCase())) ||
      (f.bookTitle && f.bookTitle.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Fines & Receipts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Collect full fine payments, review cleared dues, and print or download receipts
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-full text-xs font-semibold">
          <button
            onClick={() => setSelectedTab('Unpaid')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              selectedTab === 'Unpaid'
                ? 'bg-rose-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unpaid Fines ({unpaidFines.length})
          </button>
          <button
            onClick={() => setSelectedTab('Paid')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              selectedTab === 'Paid'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cleared / Paid History ({paidFines.length})
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-baseline justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Outstanding Unpaid Balance</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{unpaidFines.length} pending fine record(s)</p>
          </div>
          <span className="text-3xl font-extrabold font-mono text-rose-600 tabular-nums">₹{totalUnpaidAmount}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-baseline justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Collected Fines</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{paidFines.length} cleared payment(s)</p>
          </div>
          <span className="text-3xl font-extrabold font-mono text-emerald-700 tabular-nums">₹{totalCollectedAmount}</span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Member Code, Name, or Book Title..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredFines.length} {selectedTab.toLowerCase()} record(s)
        </span>
      </div>

      {/* Fines Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-5 whitespace-nowrap">Member Code</th>
                <th className="py-3 px-5 whitespace-nowrap">Borrower</th>
                <th className="py-3 px-5">Book Title</th>
                <th className="py-3 px-5 whitespace-nowrap">Days Late</th>
                <th className="py-3 px-5 whitespace-nowrap">Fine Amount</th>
                <th className="py-3 px-5 whitespace-nowrap">Generated Date</th>
                {selectedTab === 'Paid' && <th className="py-3 px-5 whitespace-nowrap">Paid Date</th>}
                <th className="py-3 px-5 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={selectedTab === 'Paid' ? 8 : 7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading fines...</span>
                  </td>
                </tr>
              ) : filteredFines.length === 0 ? (
                <tr>
                  <td colSpan={selectedTab === 'Paid' ? 8 : 7} className="py-12 text-center text-slate-400 font-medium">
                    No {selectedTab.toLowerCase()} fines found.
                  </td>
                </tr>
              ) : (
                filteredFines.map(fine => (
                  <tr key={fine.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                        {fine.memberCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">{fine.memberName}</td>
                    <td className="py-3.5 px-5 font-bold text-slate-800 max-w-[200px] truncate" title={fine.bookTitle}>
                      {fine.bookTitle}
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-600 whitespace-nowrap tabular-nums">
                      {fine.daysLate} days
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded tabular-nums ${
                          fine.status === 'Unpaid'
                            ? 'text-rose-700 bg-rose-50 border border-rose-200'
                            : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        ₹{fine.amount}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-medium whitespace-nowrap">
                      {formatDisplayDate(fine.generatedOn)}
                    </td>
                    {selectedTab === 'Paid' && (
                      <td className="py-3.5 px-5 font-medium text-emerald-700 whitespace-nowrap">
                        {formatDisplayDate(fine.paidOn)}
                      </td>
                    )}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      {fine.status === 'Unpaid' ? (
                        <button
                          onClick={() => setConfirmFine(fine)}
                          disabled={payingFineId === fine.id}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {payingFineId === fine.id ? 'Processing...' : 'Mark as Paid (Full)'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReprintReceipt(fine)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-700" />
                          Reprint Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Fine Payment Modal */}
      {confirmFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Confirm Fine Payment</h3>
              <button
                onClick={() => setConfirmFine(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Collect full fine payment of <strong className="font-mono text-slate-900">₹{confirmFine.amount}</strong> from{' '}
              <strong className="text-slate-900">{confirmFine.memberName}</strong> ({confirmFine.memberCode}) for{' '}
              <strong className="text-slate-900">"{confirmFine.bookTitle}"</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmFine(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayFine}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Confirm Payment
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
