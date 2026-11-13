import { db } from '../config/db.ts';
import { Transaction, Fine, IssueSlipData, ReturnSlipData } from '../models/types.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { LOAN_DAYS, FINE_RATE_PER_DAY, MAX_BORROW_LIMIT, ISSUE_ERROR_CODES } from '../utils/constants.ts';
import { getTodayIndiaString, addDays, diffInDays } from '../utils/dateHelper.ts';

export class IssueReturnService {
  /**
   * Issue a book
   */
  public static issueBook(bookIdentifier: string, memberIdentifier: string, librarianUserId: string): {
    transaction: Transaction;
    slip: IssueSlipData;
  } {
    if (!bookIdentifier || !memberIdentifier) {
      throw new AppError('Book ID/ISBN and Member Code/ID are required', 400, 'VALIDATION_ERROR');
    }

    const cleanBookId = bookIdentifier.trim();
    const cleanMemberId = memberIdentifier.trim();

    const book = db.books.find(
      b => b.id === cleanBookId || b.isbn.toLowerCase() === cleanBookId.toLowerCase()
    );
    const member = db.members.find(
      m => m.id === cleanMemberId || m.memberCode.toLowerCase() === cleanMemberId.toLowerCase()
    );

    const failureReasons: string[] = [];

    if (!book) {
      failureReasons.push(ISSUE_ERROR_CODES.BOOK_NOT_FOUND);
    }
    if (!member) {
      failureReasons.push(ISSUE_ERROR_CODES.MEMBER_NOT_FOUND);
    }

    // If both exist, evaluate all issue blocking rules
    if (book && member) {
      // 1. Stock check
      if (book.availableCopies <= 0) {
        failureReasons.push(ISSUE_ERROR_CODES.NO_COPIES);
      }

      // 2. Member status check
      if (member.status !== 'Active') {
        failureReasons.push(ISSUE_ERROR_CODES.MEMBER_INACTIVE);
      }

      // 3. Unpaid fine check
      const hasUnpaidFine = db.fines.some(
        f => f.memberId === member.id && f.status === 'Unpaid'
      );
      if (hasUnpaidFine) {
        failureReasons.push(ISSUE_ERROR_CODES.UNPAID_FINE);
      }

      // 4. Maximum borrow limit check (5 books)
      const currentIssuedCount = db.transactions.filter(
        t => t.memberId === member.id && t.status === 'Issued'
      ).length;
      if (currentIssuedCount >= MAX_BORROW_LIMIT) {
        failureReasons.push(ISSUE_ERROR_CODES.LIMIT_REACHED);
      }
    }

    // If any failure reasons apply, return all of them in the error response
    if (failureReasons.length > 0) {
      throw new AppError(
        `Cannot issue book: ${failureReasons.join(', ')}`,
        400,
        'ISSUE_BLOCKED',
        { failureReasons }
      );
    }

    // Atomic stock decrement
    const stockDecremented = db.atomicIssueCopy(book!.id);
    if (!stockDecremented) {
      throw new AppError(
        'Concurrent access: No available copies remaining for this book',
        409,
        ISSUE_ERROR_CODES.NO_COPIES,
        { failureReasons: [ISSUE_ERROR_CODES.NO_COPIES] }
      );
    }

    // Dates in India Standard Time
    const today = getTodayIndiaString();
    const dueDate = addDays(today, LOAN_DAYS);
    const now = new Date().toISOString();

    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookId: book!.id,
      memberId: member!.id,
      issuedBy: librarianUserId,
      issueDate: today,
      dueDate: dueDate,
      status: 'Issued',
      createdAt: now,
      updatedAt: now,
      bookTitle: book!.title,
      bookIsbn: book!.isbn,
      memberCode: member!.memberCode,
      memberName: member!.fullName,
    };

    db.transactions.push(transaction);
    db.save();

    // Generate Issue Slip
    const slip: IssueSlipData = {
      transactionId: transaction.id,
      slipType: 'ISSUE',
      slipDate: today,
      memberCode: member!.memberCode,
      memberName: member!.fullName,
      bookTitle: book!.title,
      bookIsbn: book!.isbn,
      issueDate: today,
      dueDate: dueDate,
      issuedBy: librarianUserId,
    };

    return { transaction, slip };
  }

  /**
   * Return a book
   */
  public static returnBook(transactionId: string, librarianUserId: string): {
    transaction: Transaction;
    fine?: Fine;
    slip: ReturnSlipData;
  } {
    const transaction = db.transactions.find(t => t.id === transactionId);
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    // Only a transaction with status Issued can be returned
    if (transaction.status === 'Returned') {
      throw new AppError('This book has already been returned', 400, 'ALREADY_RETURNED');
    }

    const today = getTodayIndiaString();
    const now = new Date().toISOString();

    // Atomic conditional stock increment
    db.atomicReturnCopy(transaction.bookId);

    transaction.status = 'Returned';
    transaction.returnDate = today;
    transaction.updatedAt = now;

    // Fine calculation: days late * ₹5 with no cap
    const daysLate = Math.max(0, diffInDays(today, transaction.dueDate));
    let fineRecord: Fine | undefined;

    if (daysLate > 0) {
      const fineAmount = daysLate * FINE_RATE_PER_DAY;
      fineRecord = {
        id: `fine_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transactionId: transaction.id,
        memberId: transaction.memberId,
        daysLate,
        amount: fineAmount,
        status: 'Unpaid',
        generatedOn: today,
        createdAt: now,
        updatedAt: now,
      };
      db.fines.push(fineRecord);
    }

    db.save();

    const book = db.books.find(b => b.id === transaction.bookId);
    const member = db.members.find(m => m.id === transaction.memberId);

    // Generate Return Slip
    const slip: ReturnSlipData = {
      transactionId: transaction.id,
      slipType: 'RETURN',
      slipDate: today,
      memberCode: member?.memberCode || 'N/A',
      memberName: member?.fullName || 'N/A',
      bookTitle: book?.title || transaction.bookTitle || 'Unknown Title',
      bookIsbn: book?.isbn || transaction.bookIsbn || 'N/A',
      issueDate: transaction.issueDate,
      dueDate: transaction.dueDate,
      returnDate: today,
      daysLate,
      fineAmount: fineRecord ? fineRecord.amount : 0,
      fineStatus: fineRecord ? 'Unpaid' : 'None',
    };

    return { transaction, fine: fineRecord, slip };
  }

  /**
   * Get all active (issued) loans with live overdue calculation
   */
  public static getActiveLoans(search?: string): any[] {
    const today = getTodayIndiaString();
    let loans = db.transactions.filter(t => t.status === 'Issued');

    const mapped = loans.map(t => {
      const book = db.books.find(b => b.id === t.bookId);
      const member = db.members.find(m => m.id === t.memberId);
      const author = book ? db.authors.find(a => a.id === book.authorId) : null;
      const daysRemaining = diffInDays(t.dueDate, today);
      const isOverdue = daysRemaining < 0;
      const daysOverdue = isOverdue ? Math.abs(daysRemaining) : 0;
      const estimatedFine = daysOverdue * FINE_RATE_PER_DAY;

      return {
        ...t,
        bookTitle: book?.title || 'Unknown',
        bookIsbn: book?.isbn || 'Unknown',
        authorName: author?.name || 'Unknown',
        memberCode: member?.memberCode || 'Unknown',
        memberName: member?.fullName || 'Unknown',
        daysRemaining,
        isOverdue,
        daysOverdue,
        estimatedFine,
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      return mapped.filter(
        l =>
          l.bookTitle.toLowerCase().includes(q) ||
          l.bookIsbn.toLowerCase().includes(q) ||
          l.memberCode.toLowerCase().includes(q) ||
          l.memberName.toLowerCase().includes(q)
      );
    }

    return mapped;
  }

  /**
   * Get all completed (returned) loan transactions sorted newest-first
   */
  public static getReturnedLoans(search?: string): any[] {
    const loans = db.transactions.filter(t => t.status === 'Returned');

    const mapped = loans
      .map(t => {
        const book = db.books.find(b => b.id === t.bookId);
        const member = db.members.find(m => m.id === t.memberId);
        const author = book ? db.authors.find(a => a.id === book.authorId) : null;
        const effectiveReturnDate = t.returnDate || t.dueDate;
        const daysLate = Math.max(0, diffInDays(effectiveReturnDate, t.dueDate));

        return {
          ...t,
          bookTitle: book?.title || t.bookTitle || 'Unknown',
          bookIsbn: book?.isbn || t.bookIsbn || 'Unknown',
          authorName: author?.name || 'Unknown',
          memberCode: member?.memberCode || t.memberCode || 'Unknown',
          memberName: member?.fullName || t.memberName || 'Unknown',
          daysLate,
          lateFine: daysLate * FINE_RATE_PER_DAY,
        };
      })
      .sort((a, b) => {
        const dateCmp = (b.returnDate || '').localeCompare(a.returnDate || '');
        if (dateCmp !== 0) return dateCmp;
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      return mapped.filter(
        l =>
          l.bookTitle.toLowerCase().includes(q) ||
          l.bookIsbn.toLowerCase().includes(q) ||
          l.memberCode.toLowerCase().includes(q) ||
          l.memberName.toLowerCase().includes(q)
      );
    }

    return mapped;
  }
}
