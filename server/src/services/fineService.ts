import { db } from '../config/db.ts';
import { Fine, PaymentSlipData } from '../models/types.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { getTodayIndiaString } from '../utils/dateHelper.ts';

export class FineService {
  public static getFines(status?: 'Unpaid' | 'Paid'): any[] {
    let list = db.fines;
    if (status) {
      list = list.filter(f => f.status === status);
    }

    return list.map(f => {
      const member = db.members.find(m => m.id === f.memberId);
      const transaction = db.transactions.find(t => t.id === f.transactionId);
      const book = transaction ? db.books.find(b => b.id === transaction.bookId) : null;

      return {
        ...f,
        memberCode: member?.memberCode || 'N/A',
        memberName: member?.fullName || 'N/A',
        memberEmail: member?.email || 'N/A',
        bookTitle: book?.title || transaction?.bookTitle || 'Unknown Book',
        bookIsbn: book?.isbn || transaction?.bookIsbn || 'N/A',
      };
    });
  }

  /**
   * Pay fine in full
   */
  public static payFine(fineId: string, librarianUserId: string): {
    fine: Fine;
    slip: PaymentSlipData;
  } {
    const today = getTodayIndiaString();
    
    // Atomic update: only update where status is Unpaid
    const updatedFine = db.atomicPayFine(fineId, today, librarianUserId);
    if (!updatedFine) {
      const fine = db.fines.find(f => f.id === fineId);
      if (!fine) {
        throw new AppError('Fine record not found', 404, 'FINE_NOT_FOUND');
      }
      throw new AppError('Fine has already been marked as Paid', 400, 'ALREADY_PAID');
    }

    const member = db.members.find(m => m.id === updatedFine.memberId);
    const transaction = db.transactions.find(t => t.id === updatedFine.transactionId);
    const book = transaction ? db.books.find(b => b.id === transaction.bookId) : null;

    // Generate Payment Slip
    const slip: PaymentSlipData = {
      fineId: updatedFine.id,
      transactionId: updatedFine.transactionId,
      slipType: 'PAYMENT',
      slipDate: today,
      memberCode: member?.memberCode || 'N/A',
      memberName: member?.fullName || 'N/A',
      bookTitle: book?.title || transaction?.bookTitle || 'Unknown Title',
      amountPaid: updatedFine.amount,
      paymentDate: today,
      collectedBy: librarianUserId,
    };

    return { fine: updatedFine, slip };
  }
}
