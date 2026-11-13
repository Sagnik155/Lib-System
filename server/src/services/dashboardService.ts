import { db } from '../config/db.ts';
import { getTodayIndiaString, diffInDays } from '../utils/dateHelper.ts';
import { FINE_RATE_PER_DAY } from '../utils/constants.ts';

export class DashboardService {
  public static getDashboardStats() {
    const today = getTodayIndiaString();

    const totalTitles = db.books.length;
    const totalCopies = db.books.reduce((acc, b) => acc + b.totalCopies, 0);
    const availableCopies = db.books.reduce((acc, b) => acc + b.availableCopies, 0);
    
    const activeLoans = db.transactions.filter(t => t.status === 'Issued');
    const returnedLoans = db.transactions.filter(t => t.status === 'Returned');
    
    const overdueLoans = activeLoans.filter(t => diffInDays(t.dueDate, today) < 0);
    const missingOutOfStock = db.books.filter(b => b.availableCopies === 0).length;

    const totalMembers = db.members.length;
    const activeMembers = db.members.filter(m => m.status === 'Active').length;

    const unpaidFines = db.fines.filter(f => f.status === 'Unpaid');
    const pendingFeesTotal = unpaidFines.reduce((sum, f) => sum + f.amount, 0);

    // Overdue list with member and book info
    const overdueList = overdueLoans.map(t => {
      const book = db.books.find(b => b.id === t.bookId);
      const member = db.members.find(m => m.id === t.memberId);
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

    // Recent check-outs (last 10)
    const recentCheckouts = [...db.transactions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map(t => {
        const book = db.books.find(b => b.id === t.bookId);
        const member = db.members.find(m => m.id === t.memberId);
        const author = book ? db.authors.find(a => a.id === book.authorId) : null;

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

    // Top books / new arrivals
    const topBooks = db.books.slice(0, 5).map(b => {
      const author = db.authors.find(a => a.id === b.authorId);
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

  public static getOverdueReport() {
    const today = getTodayIndiaString();
    const activeLoans = db.transactions.filter(t => t.status === 'Issued');
    const overdueLoans = activeLoans.filter(t => diffInDays(t.dueDate, today) < 0);

    return overdueLoans.map(t => {
      const book = db.books.find(b => b.id === t.bookId);
      const member = db.members.find(m => m.id === t.memberId);
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

  public static getStudentBooks(memberId: string) {
    const today = getTodayIndiaString();
    const memberTransactions = db.transactions.filter(t => t.memberId === memberId);

    const currentIssued = memberTransactions
      .filter(t => t.status === 'Issued')
      .map(t => {
        const book = db.books.find(b => b.id === t.bookId);
        const author = book ? db.authors.find(a => a.id === book.authorId) : null;
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
        const book = db.books.find(b => b.id === t.bookId);
        const author = book ? db.authors.find(a => a.id === book.authorId) : null;
        return {
          ...t,
          bookTitle: book?.title || t.bookTitle || 'Unknown Title',
          bookIsbn: book?.isbn || t.bookIsbn || 'N/A',
          authorName: author?.name || 'Unknown Author',
        };
      });

    return { currentIssued, history };
  }

  public static getStudentFines(memberId: string) {
    const fines = db.fines.filter(f => f.memberId === memberId);

    return fines.map(f => {
      const transaction = db.transactions.find(t => t.id === f.transactionId);
      const book = transaction ? db.books.find(b => b.id === transaction.bookId) : null;

      return {
        ...f,
        bookTitle: book?.title || transaction?.bookTitle || 'Unknown Title',
        bookIsbn: book?.isbn || transaction?.bookIsbn || 'N/A',
      };
    });
  }
}
