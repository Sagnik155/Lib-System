import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.ts';
import { Book, Member, IssueSlipData } from '../types/index.ts';
import { SlipModal } from '../components/SlipModal.tsx';
import {
  BookPlus,
  Search,
  User,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const IssueBookPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Selection
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Search queries for selectors
  const [bookQuery, setBookQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Generated Slip
  const [activeSlip, setActiveSlip] = useState<IssueSlipData | null>(null);

  useEffect(() => {
    // Load initial lists
    Promise.all([
      api.get<Book[]>('/books'),
      api.get<Member[]>('/members'),
    ])
      .then(([b, m]) => {
        setBooks(b);
        setMembers(m);
      })
      .catch(err => {
        setGeneralError('Failed to load books and members. Please retry.');
      });
  }, []);

  // Filter lists based on input queries
  const filteredBooks = books.filter(
    b =>
      b.title.toLowerCase().includes(bookQuery.toLowerCase()) ||
      b.isbn.toLowerCase().includes(bookQuery.toLowerCase())
  );

  const filteredMembers = members.filter(
    m =>
      m.fullName.toLowerCase().includes(memberQuery.toLowerCase()) ||
      m.memberCode.toLowerCase().includes(memberQuery.toLowerCase())
  );

  // Live evaluation of borrowing eligibility rules
  const blockingReasons: string[] = [];
  if (selectedBook) {
    if (selectedBook.availableCopies <= 0) {
      blockingReasons.push('NO_COPIES: Book has 0 available copies on shelf');
    }
  }
  if (selectedMember) {
    if (selectedMember.status !== 'Active') {
      blockingReasons.push('MEMBER_INACTIVE: Member membership is currently Inactive');
    }
    if ((selectedMember.unpaidFinesTotal || 0) > 0) {
      blockingReasons.push(`UNPAID_FINE: Member has outstanding fine balance of ₹${selectedMember.unpaidFinesTotal}`);
    }
    if ((selectedMember.activeLoansCount || 0) >= 5) {
      blockingReasons.push('LIMIT_REACHED: Member has reached the maximum quota of 5 active book loans');
    }
  }

  const isEligible = selectedBook && selectedMember && blockingReasons.length === 0;

  const handleConfirmIssue = async () => {
    if (!selectedBook || !selectedMember || !isEligible) return;

    setIsSubmitting(true);
    setErrorDetails([]);
    setGeneralError(null);

    try {
      const res = await api.post<{ transaction: any; slip: IssueSlipData }>('/issues', {
        bookId: selectedBook.id,
        memberCode: selectedMember.memberCode,
      });

      // Launch celebration confetti
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

      setActiveSlip(res.slip);

      // Refresh data
      const [updatedBooks, updatedMembers] = await Promise.all([
        api.get<Book[]>('/books'),
        api.get<Member[]>('/members'),
      ]);
      setBooks(updatedBooks);
      setMembers(updatedMembers);

      // Reset selection
      setSelectedBook(null);
      setSelectedMember(null);
      setBookQuery('');
      setMemberQuery('');
    } catch (err: any) {
      if (err.details?.failureReasons) {
        setErrorDetails(err.details.failureReasons);
      } else {
        setGeneralError(err.message || 'Book issuance failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Issue Book Desk</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select book and member to verify real-time loan eligibility and issue
        </p>
      </div>

      {generalError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {errorDetails.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
          <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-red-600" />
            Issue Blocked:
          </p>
          <ul className="list-disc pl-5 text-xs text-red-700 space-y-0.5">
            {errorDetails.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Two Column Layout: Step 1 (Book) & Step 2 (Member) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Book Selection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Select Book</h3>
            </div>
            {selectedBook && (
              <button
                onClick={() => setSelectedBook(null)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Change Book
              </button>
            )}
          </div>

          {!selectedBook ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bookQuery}
                  onChange={e => setBookQuery(e.target.value)}
                  placeholder="Search book by Title or ISBN..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {filteredBooks.slice(0, 8).map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBook(b)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs line-clamp-1">{b.title}</p>
                      <p className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5 whitespace-nowrap">
                        {b.isbn}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {b.availableCopies > 0 ? (
                        <span className="text-emerald-700 bg-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {b.availableCopies} avail
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          0 copies
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{selectedBook.title}</h4>
                  <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 mt-1 inline-block whitespace-nowrap">
                    {selectedBook.isbn}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    selectedBook.availableCopies > 0
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {selectedBook.availableCopies} / {selectedBook.totalCopies} Available
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Author: <span className="font-semibold text-slate-800">{selectedBook.authorName || 'Standard Author'}</span>
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Member Selection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Select Student Member</h3>
            </div>
            {selectedMember && (
              <button
                onClick={() => setSelectedMember(null)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Change Member
              </button>
            )}
          </div>

          {!selectedMember ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberQuery}
                  onChange={e => setMemberQuery(e.target.value)}
                  placeholder="Search member by Name or Code (M001)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {filteredMembers.slice(0, 8).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {m.memberCode}
                        </span>
                        <p className="font-bold text-slate-900 text-xs">{m.fullName}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{m.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedMember.fullName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedMember.memberCode}
                    </span>
                    <span className="text-xs text-slate-500">{selectedMember.email}</span>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    selectedMember.status === 'Active' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {selectedMember.status}
                </span>
              </div>

              {/* Status pills for borrow quota and fine balance */}
              <div className="flex items-center gap-3 pt-2 text-xs border-t border-emerald-200/60">
                <span className="text-slate-600">
                  Active Loans:{' '}
                  <strong className={selectedMember.activeLoansCount! >= 5 ? 'text-rose-600' : 'text-slate-800'}>
                    {selectedMember.activeLoansCount || 0} / 5
                  </strong>
                </span>
                <span className="text-slate-600">
                  Unpaid Fines:{' '}
                  <strong className={selectedMember.unpaidFinesTotal! > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    ₹{selectedMember.unpaidFinesTotal || 0}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification & Confirm Card */}
      {selectedBook && selectedMember && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 animate-in fade-in">
          <h3 className="font-bold text-slate-900 text-sm">Circulation Eligibility Checklist</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Rule 1 */}
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                selectedBook.availableCopies > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800 font-bold'
              }`}
            >
              {selectedBook.availableCopies > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>Copies on shelf (&gt;0)</span>
            </div>

            {/* Rule 2 */}
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                selectedMember.status === 'Active'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800 font-bold'
              }`}
            >
              {selectedMember.status === 'Active' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>Member status Active</span>
            </div>

            {/* Rule 3 */}
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                (selectedMember.unpaidFinesTotal || 0) === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800 font-bold'
              }`}
            >
              {(selectedMember.unpaidFinesTotal || 0) === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>No Unpaid Fines (₹0)</span>
            </div>

            {/* Rule 4 */}
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                (selectedMember.activeLoansCount || 0) < 5
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800 font-bold'
              }`}
            >
              {(selectedMember.activeLoansCount || 0) < 5 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>Under Limit (&lt;5 issued)</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Loan duration will be automatically set to <strong className="text-slate-800">14 calendar days</strong>.
            </div>

            <button
              onClick={handleConfirmIssue}
              disabled={!isEligible || isSubmitting}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                isEligible
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <BookPlus className="w-4 h-4" />
              {isSubmitting ? 'Recording Issue...' : 'Confirm Book Issue & Generate Slip'}
            </button>
          </div>
        </div>
      )}

      {/* Slip Modal */}
      <SlipModal slip={activeSlip} onClose={() => setActiveSlip(null)} />
    </div>
  );
};
