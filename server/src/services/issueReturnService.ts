import { db, exactCaseInsensitive } from '../config/db.ts';
import { Transaction, Fine, IssueSlipData, ReturnSlipData } from '../models/types.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { LOAN_DAYS, FINE_RATE_PER_DAY, MAX_BORROW_LIMIT, ISSUE_ERROR_CODES } from '../utils/constants.ts';
import { getTodayIndiaString, addDays, diffInDays } from '../utils/dateHelper.ts';

export class IssueReturnService {
  /**
   * Issue a book
   */
  public static async issueBook(
    bookIdentifier: string,
    memberIdentifier: string,
    librarianUserId: string
  ): Promise<{
    transaction: Transaction;
    slip: IssueSlipData;
  }> {
    if (!bookIdentifier || !memberIdentifier) {
      throw new AppError('Book ID/ISBN and Member Code/ID are required', 400, 'VALIDATION_ERROR');
    }

    const cleanBookId = bookIdentifier.trim();
    const cleanMemberId = memberIdentifier.trim();

    const [book, member] = await Promise.all([
      db.books.findOne(
        { $or: [{ id: cleanBookId }, { isbn: exactCaseInsensitive(cleanBookId) }] },
        { projection: { _id: 0 } }
      ),
      db.members.findOne(
        { $or: [{ id: cleanMemberId }, { memberCode: exactCaseInsensitive(cleanMemberId) }] },
        { projection: { _id: 0 } }
      ),
    ]);

    const failureReasons: string[] = [];

    if (!book) {
      failureReasons.push(ISSUE_ERROR_CODES.BOOK_NOT_FOUND);
    }
    if (!member) {
      failureReasons.push(ISSUE_ERROR_CODES.MEMBER_NOT_FOUND);
    }

    if (book && member) {
      if (book.availableCopies <= 0) {
        failureReasons.push(ISSUE_ERROR_CODES.NO_COPIES);
      }

      if (member.status !== 'Active') {
        failureReasons.push(ISSUE_ERROR_CODES.MEMBER_INACTIVE);
      }

      const [unpaidFineCount, currentIssuedCount] = await Promise.all([
        db.fines.countDocuments({ memberId: member.id, status: 'Unpaid' }),
        db.transactions.countDocuments({ memberId: member.id, status: 'Issued' }),
      ]);

      if (unpaidFineCount > 0) {
        failureReasons.push(ISSUE_ERROR_CODES.UNPAID_FINE);
      }

      if (currentIssuedCount >= MAX_BORROW_LIMIT) {
        failureReasons.push(ISSUE_ERROR_CODES.LIMIT_REACHED);
      }
    }

    if (failureReasons.length > 0) {
      throw new AppError(
        `Cannot issue book: ${failureReasons.join(', ')}`,
        400,
        'ISSUE_BLOCKED',
        { failureReasons }
      );
    }

    const today = getTodayIndiaString();
    const dueDate = addDays(today, LOAN_DAYS);
    const now = new Date().toISOString();

    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookId: book!.id,
      memberId: member!.id,
      issuedBy: librarianUserId,
      issueDate: today,
      dueDate,
      status: 'Issued',
      createdAt: now,
      updatedAt: now,
      bookTitle: book!.title,
      bookIsbn: book!.isbn,
      memberCode: member!.memberCode,
      memberName: member!.fullName,
    };

    // Multi-document MongoDB ACID transaction: decrement stock and record loan atomically
    await db.withTransaction(async session => {
      const stockDecremented = await db.atomicIssueCopy(book!.id, session);
      if (!stockDecremented) {
        throw new AppError(
          'Concurrent access: No available copies remaining for this book',
          409,
          ISSUE_ERROR_CODES.NO_COPIES,
          { failureReasons: [ISSUE_ERROR_CODES.NO_COPIES] }
        );
      }

      await db.transactions.insertOne({ ...transaction }, { session });
    });

    const slip: IssueSlipData = {
      transactionId: transaction.id,
      slipType: 'ISSUE',
      slipDate: today,
      memberCode: member!.memberCode,
      memberName: member!.fullName,
      bookTitle: book!.title,
      bookIsbn: book!.isbn,
      issueDate: today,
      dueDate,
      issuedBy: librarianUserId,
    };

    return { transaction, slip };
  }

  /**
   * Return a book
   */
  public static async returnBook(
    transactionId: string,
    _librarianUserId: string
  ): Promise<{
    transaction: Transaction;
    fine?: Fine;
    slip: ReturnSlipData;
  }> {
    const existing = await db.transactions.findOne(
      { id: transactionId },
      { projection: { _id: 0 } }
    );
    if (!existing) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    if (existing.status === 'Returned') {
      throw new AppError('This book has already been returned', 400, 'ALREADY_RETURNED');
    }

    const today = getTodayIndiaString();
    const now = new Date().toISOString();
    const daysLate = Math.max(0, diffInDays(today, existing.dueDate));

    let fineRecord: Fine | undefined;
    if (daysLate > 0) {
      fineRecord = {
        id: `fine_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transactionId: existing.id,
        memberId: existing.memberId,
        daysLate,
        amount: daysLate * FINE_RATE_PER_DAY,
        status: 'Unpaid',
        generatedOn: today,
        createdAt: now,
        updatedAt: now,
      };
    }

    // Multi-document MongoDB ACID transaction: mark returned, restock copy, and record fine atomically
    const updatedTransaction = await db.withTransaction(async session => {
      const transitioned = await db.transactions.findOneAndUpdate(
        { id: existing.id, status: 'Issued' },
        { $set: { status: 'Returned', returnDate: today, updatedAt: now } },
        { returnDocument: 'after', projection: { _id: 0 }, session }
      );

      if (!transitioned) {
        throw new AppError('This book has already been returned', 400, 'ALREADY_RETURNED');
      }

      await db.atomicReturnCopy(existing.bookId, session);

      if (fineRecord) {
        await db.fines.insertOne({ ...fineRecord }, { session });
      }

      return transitioned as Transaction;
    });

    const [book, member] = await Promise.all([
      db.books.findOne({ id: existing.bookId }, { projection: { _id: 0 } }),
      db.members.findOne({ id: existing.memberId }, { projection: { _id: 0 } }),
    ]);

    const slip: ReturnSlipData = {
      transactionId: existing.id,
      slipType: 'RETURN',
      slipDate: today,
      memberCode: member?.memberCode || 'N/A',
      memberName: member?.fullName || 'N/A',
      bookTitle: book?.title || existing.bookTitle || 'Unknown Title',
      bookIsbn: book?.isbn || existing.bookIsbn || 'N/A',
      issueDate: existing.issueDate,
      dueDate: existing.dueDate,
      returnDate: today,
      daysLate,
      fineAmount: fineRecord ? fineRecord.amount : 0,
      fineStatus: fineRecord ? 'Unpaid' : 'None',
    };

    return { transaction: updatedTransaction, fine: fineRecord, slip };
  }

  /**
   * Get all active (issued) loans with live overdue calculation
   */
  public static async getActiveLoans(search?: string): Promise<any[]> {
    const today = getTodayIndiaString();
    const [loans, books, members, authors] = await Promise.all([
      db.transactions.find({ status: 'Issued' }, { projection: { _id: 0 } }).toArray(),
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
      db.members.find({}, { projection: { _id: 0 } }).toArray(),
      db.authors.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const bookMap = new Map(books.map(b => [b.id, b]));
    const memberMap = new Map(members.map(m => [m.id, m]));
    const authorMap = new Map(authors.map(a => [a.id, a]));

    const mapped = loans.map(t => {
      const book = bookMap.get(t.bookId);
      const member = memberMap.get(t.memberId);
      const author = book ? authorMap.get(book.authorId) : undefined;
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
  public static async getReturnedLoans(search?: string): Promise<any[]> {
    const [loans, books, members, authors] = await Promise.all([
      db.transactions.find({ status: 'Returned' }, { projection: { _id: 0 } }).toArray(),
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
      db.members.find({}, { projection: { _id: 0 } }).toArray(),
      db.authors.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const bookMap = new Map(books.map(b => [b.id, b]));
    const memberMap = new Map(members.map(m => [m.id, m]));
    const authorMap = new Map(authors.map(a => [a.id, a]));

    const mapped = loans
      .map(t => {
        const book = bookMap.get(t.bookId);
        const member = memberMap.get(t.memberId);
        const author = book ? authorMap.get(book.authorId) : undefined;
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
