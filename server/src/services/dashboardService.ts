import { db } from '../config/db.ts';
import { getTodayIndiaString, diffInDays } from '../utils/dateHelper.ts';
import { FINE_RATE_PER_DAY } from '../utils/constants.ts';

export class DashboardService {
  public static async getDashboardStats() {
    const today = getTodayIndiaString();

    const [books, authors, members, transactions, fines] = await Promise.all([
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
      db.authors.find({}, { projection: { _id: 0 } }).toArray(),
      db.members.find({}, { projection: { _id: 0 } }).toArray(),
      db.transactions.find({}, { projection: { _id: 0 } }).toArray(),
      db.fines.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const bookMap = new Map(books.map(b => [b.id, b]));
    const authorMap = new Map(authors.map(a => [a.id, a]));
    const memberMap = new Map(members.map(m => [m.id, m]));

    const totalTitles = books.length;
    const totalCopies = books.reduce((acc, b) => acc + b.totalCopies, 0);
    const availableCopies = books.reduce((acc, b) => acc + b.availableCopies, 0);

    const activeLoans = transactions.filter(t => t.status === 'Issued');
    const returnedLoans = transactions.filter(t => t.status === 'Returned');

    const overdueLoans = activeLoans.filter(t => diffInDays(t.dueDate, today) < 0);
    const missingOutOfStock = books.filter(b => b.availableCopies === 0).length;

    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'Active').length;

    const unpaidFines = fines.filter(f => f.status === 'Unpaid');
    const pendingFeesTotal = unpaidFines.reduce((sum, f) => sum + f.amount, 0);

    const overdueList = overdueLoans.map(t => {
      const book = bookMap.get(t.bookId);
      const member = memberMap.get(t.memberId);
      const daysLate = Math.abs(diffInDays(t.dueDate, today));
      const fineAmount = daysLate * FINE_RATE_PER_DAY;

      return {
        transactionId: t.id,
        memberCode: member?.memberCode || 'N/A',
        memberName: member?.fullName || 'N/A',
        bookTitle: book?.title || t.bookTitle || 'Unknown Title',
        bookIsbn: book?.isbn || t.bookIsbn || 'N/A',
        dueDate: t.dueDate,
        daysLate,
        fineAmount,
      };
    });

    const recentCheckouts = [...transactions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map(t => {
        const book = bookMap.get(t.bookId);
        const member = memberMap.get(t.memberId);
        const author = book ? authorMap.get(book.authorId) : undefined;

        return {
          id: t.id,
          isbn: book?.isbn || t.bookIsbn || 'N/A',
          title: book?.title || t.bookTitle || 'Unknown Title',
          author: author?.name || 'Unknown Author',
          member: member?.fullName || 'Unknown Member',
          memberCode: member?.memberCode || 'N/A',
          issuedDate: t.issueDate,
          dueDate: t.dueDate,
          returnDate: t.returnDate || '—',
          status: t.status,
        };
      });

    const topBooks = books.slice(0, 5).map(b => {
      const author = authorMap.get(b.authorId);
      return {
        id: b.id,
        title: b.title,
        author: author?.name || 'Unknown',
        available: b.availableCopies > 0,
        availableCopies: b.availableCopies,
        totalCopies: b.totalCopies,
      };
    });

    return {
      kpis: {
        totalTitles,
        totalCopies,
        availableCopies,
        borrowedBooks: activeLoans.length,
        returnedBooks: returnedLoans.length,
        overdueBooks: overdueLoans.length,
        missingBooks: missingOutOfStock,
        totalMembers,
        activeMembers,
        pendingFees: pendingFeesTotal,
      },
      overdueList,
      recentCheckouts,
      topBooks,
    };
  }

  public static async getOverdueReport() {
    const today = getTodayIndiaString();
    const [activeLoans, books, members] = await Promise.all([
      db.transactions.find({ status: 'Issued' }, { projection: { _id: 0 } }).toArray(),
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
      db.members.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const bookMap = new Map(books.map(b => [b.id, b]));
    const memberMap = new Map(members.map(m => [m.id, m]));
    const overdueLoans = activeLoans.filter(t => diffInDays(t.dueDate, today) < 0);

    return overdueLoans.map(t => {
      const book = bookMap.get(t.bookId);
      const member = memberMap.get(t.memberId);
      const daysLate = Math.abs(diffInDays(t.dueDate, today));
      const fineAmount = daysLate * FINE_RATE_PER_DAY;

      return {
        transactionId: t.id,
        memberId: t.memberId,
        memberCode: member?.memberCode || 'N/A',
        memberName: member?.fullName || 'N/A',
        memberEmail: member?.email || 'N/A',
        memberPhone: member?.phone || 'N/A',
        bookTitle: book?.title || t.bookTitle || 'Unknown Title',
        bookIsbn: book?.isbn || t.bookIsbn || 'N/A',
        issueDate: t.issueDate,
        dueDate: t.dueDate,
        daysLate,
        calculatedFine: fineAmount,
      };
    });
  }

  public static async getStudentBooks(memberId: string) {
    const today = getTodayIndiaString();
    const [memberTransactions, books, authors] = await Promise.all([
      db.transactions.find({ memberId }, { projection: { _id: 0 } }).toArray(),
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
      db.authors.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const bookMap = new Map(books.map(b => [b.id, b]));
    const authorMap = new Map(authors.map(a => [a.id, a]));

    const currentIssued = memberTransactions
      .filter(t => t.status === 'Issued')
      .map(t => {
        const book = bookMap.get(t.bookId);
        const author = book ? authorMap.get(book.authorId) : undefined;
        const daysRemaining = diffInDays(t.dueDate, today);
        const isOverdue = daysRemaining < 0;
        const daysOverdue = isOverdue ? Math.abs(daysRemaining) : 0;
        const accruedFine = daysOverdue * FINE_RATE_PER_DAY;

        return {
          ...t,
          bookTitle: book?.title || t.bookTitle || 'Unknown Title',
          bookIsbn: book?.isbn || t.bookIsbn || 'N/A',
          authorName: author?.name || 'Unknown Author',
          daysRemaining,
          isOverdue,
          daysOverdue,
          accruedFine,
        };
      });

    const history = memberTransactions
      .filter(t => t.status === 'Returned')
      .map(t => {
        const book = bookMap.get(t.bookId);
        const author = book ? authorMap.get(book.authorId) : undefined;
        return {
          ...t,
          bookTitle: book?.title || t.bookTitle || 'Unknown Title',
          bookIsbn: book?.isbn || t.bookIsbn || 'N/A',
          authorName: author?.name || 'Unknown Author',
        };
      });

    return { currentIssued, history };
  }

  public static async getStudentFines(memberId: string) {
    const [fines, transactions, books] = await Promise.all([
      db.fines.find({ memberId }, { projection: { _id: 0 } }).toArray(),
      db.transactions.find({ memberId }, { projection: { _id: 0 } }).toArray(),
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const txnMap = new Map(transactions.map(t => [t.id, t]));
    const bookMap = new Map(books.map(b => [b.id, b]));

    return fines.map(f => {
      const transaction = txnMap.get(f.transactionId);
      const book = transaction ? bookMap.get(transaction.bookId) : undefined;

      return {
        ...f,
        bookTitle: book?.title || transaction?.bookTitle || 'Unknown Title',
        bookIsbn: book?.isbn || transaction?.bookIsbn || 'N/A',
      };
    });
  }
}
