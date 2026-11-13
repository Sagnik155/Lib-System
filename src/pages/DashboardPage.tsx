import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.ts';
import { formatDisplayDate } from '../../server/src/utils/dateHelper.ts';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { NavTab } from '../components/Sidebar.tsx';
import { ReturnDeskMode } from './ReturnBookPage.tsx';

export interface DashboardNavPreset {
  availability?: 'all' | 'available' | 'unavailable';
  returnMode?: ReturnDeskMode;
  memberStatus?: 'all' | 'Active' | 'Inactive';
  fineTab?: 'Unpaid' | 'Paid';
}

interface DashboardPageProps {
  onNavigateTo: (tab: NavTab, preset?: DashboardNavPreset) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTo }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-medium">Loading library analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800">
        <p className="font-semibold">Unable to load dashboard data</p>
        <p className="text-xs text-red-600 mt-1">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { kpis, overdueList, recentCheckouts, topBooks } = data;

  const kpiCards = [
    {
      label: 'Borrowed Books',
      value: kpis.borrowedBooks,
      valueClass: 'text-slate-900',
      subtext: 'Active loans',
      actionHint: 'View active loans',
      onClick: () => onNavigateTo('return', { returnMode: 'active' }),
    },
    {
      label: 'Returned Books',
      value: kpis.returnedBooks,
      valueClass: 'text-slate-900',
      subtext: 'Completed',
      actionHint: 'View return log',
      onClick: () => onNavigateTo('return', { returnMode: 'returned' }),
    },
    {
      label: 'Overdue Books',
      value: kpis.overdueBooks,
      valueClass: 'text-amber-600',
      subtext: 'Action needed',
      subtextClass: 'text-red-500 font-medium',
      actionHint: 'Filter overdue',
      onClick: () => onNavigateTo('return', { returnMode: 'overdue' }),
    },
    {
      label: 'Zero-Stock Titles',
      value: kpis.missingBooks,
      valueClass: 'text-slate-900',
      subtext: '0 copies available',
      actionHint: 'View out-of-stock',
      onClick: () => onNavigateTo('catalogue', { availability: 'unavailable' }),
    },
    {
      label: 'Total Stock',
      value: kpis.totalCopies,
      valueClass: 'text-slate-900',
      subtext: `${kpis.totalTitles} titles`,
      actionHint: 'Browse catalogue',
      onClick: () => onNavigateTo('catalogue', { availability: 'all' }),
    },
    {
      label: 'Available on Shelves',
      value: kpis.availableCopies,
      valueClass: 'text-emerald-600',
      subtext: 'Ready to issue',
      actionHint: 'View available',
      onClick: () => onNavigateTo('catalogue', { availability: 'available' }),
    },
    {
      label: 'Registered Members',
      value: kpis.totalMembers,
      valueClass: 'text-slate-900',
      subtext: `${kpis.activeMembers} active`,
      subtextClass: 'text-emerald-700 font-medium',
      actionHint: 'Manage members',
      onClick: () => onNavigateTo('members', { memberStatus: 'all' }),
    },
    {
      label: 'Pending Fines',
      value: `₹${kpis.pendingFees}`,
      valueClass: 'text-rose-600 font-mono',
      subtext: 'Uncollected',
      actionHint: 'Collect unpaid',
      onClick: () => onNavigateTo('fines', { fineTab: 'Unpaid' }),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Library Overview</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select any metric block below to open its filtered management view
        </p>
      </div>

      {/* Interactive Drill-Down KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className="group text-left bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all duration-150 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-slate-500 font-medium group-hover:text-slate-800 transition-colors">
                {card.label}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-3xl font-extrabold tabular-nums ${card.valueClass}`}>{card.value}</span>
              <span className={`text-xs ${card.subtextClass || 'text-slate-400'}`}>{card.subtext}</span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 opacity-80 group-hover:opacity-100 transition-opacity">
              {card.actionHint}
            </div>
          </button>
        ))}
      </div>

      {/* Middle Row: Full-Width Overdue History Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Overdue History</h3>
            <p className="text-[11px] text-slate-400">Active loans exceeding the 14-day borrowing period (₹5/day)</p>
          </div>
          <button
            onClick={() => onNavigateTo('return', { returnMode: 'overdue' })}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
          >
            Process Return →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2.5 pr-4 whitespace-nowrap">Member</th>
                <th className="pb-2.5 pr-4 whitespace-nowrap">ISBN</th>
                <th className="pb-2.5 pr-4">Book Title</th>
                <th className="pb-2.5 pr-4 whitespace-nowrap">Due Date</th>
                <th className="pb-2.5 pr-4 whitespace-nowrap">Days Late</th>
                <th className="pb-2.5 text-right whitespace-nowrap">Accrued Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {overdueList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No overdue books right now. All active loans are within their due dates.
                  </td>
                </tr>
              ) : (
                overdueList.map((item: any) => (
                  <tr key={item.transactionId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 mr-2">
                        {item.memberCode}
                      </span>
                      <span className="font-medium text-slate-800">{item.memberName}</span>
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block whitespace-nowrap tabular-nums">
                        {item.bookIsbn}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{item.bookTitle}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                        {formatDisplayDate(item.dueDate)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 font-medium whitespace-nowrap tabular-nums">
                      {item.daysLate} days
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-rose-600 text-xs whitespace-nowrap tabular-nums">
                      ₹{item.fineAmount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Recent Check-outs & Top Books Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Check-outs */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Check-outs</h3>
              <p className="text-[11px] text-slate-400">Latest circulation log across campus</p>
            </div>
            <button
              onClick={() => onNavigateTo('issue')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              View Circulation Desk →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Member Code</th>
                  <th className="pb-2">ISBN</th>
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Borrower</th>
                  <th className="pb-2">Issued</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentCheckouts.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        {t.memberCode}
                      </span>
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block whitespace-nowrap">
                        {t.isbn}
                      </span>
                    </td>
                    <td className="py-2.5 max-w-[160px] truncate font-medium text-slate-900" title={t.title}>
                      {t.title}
                    </td>
                    <td className="py-2.5 font-medium text-slate-700 whitespace-nowrap">{t.member}</td>
                    <td className="py-2.5 text-slate-500 whitespace-nowrap">{formatDisplayDate(t.issuedDate)}</td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'Issued'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Books / New Arrivals widget */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Top Books</h3>
            <span className="text-xs font-medium text-slate-400">Popular titles</span>
          </div>

          <div className="space-y-3">
            {topBooks.map((b: any) => (
              <div
                key={b.id}
                className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-1">{b.title}</h4>
                    <p className="text-[11px] text-slate-500">{b.author}</p>
                  </div>
                  {b.available ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      Available ({b.availableCopies})
                    </span>
                  ) : (
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      Loaned Out
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
