import { db } from '../config/db.ts';
import { Fine, PaymentSlipData } from '../models/types.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { getTodayIndiaString } from '../utils/dateHelper.ts';

export class FineService {
  public static async getFines(status?: 'Unpaid' | 'Paid'): Promise<any[]> {
    const query = status ? { status } : {};
    const [fines, members, transactions, books] = await Promise.all([
      db.fines.find(query, { projection: { _id: 0 } }).toArray(),
      db.members.find({}, { projection: { _id: 0 } }).toArray(),
      db.transactions.find({}, { projection: { _id: 0 } }).toArray(),
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const memberMap = new Map(members.map(m => [m.id, m]));
    const txnMap = new Map(transactions.map(t => [t.id, t]));
    const bookMap = new Map(books.map(b => [b.id, b]));

    return fines.map(f => {
      const member = memberMap.get(f.memberId);
      const transaction = txnMap.get(f.transactionId);
      const book = transaction ? bookMap.get(transaction.bookId) : undefined;

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
  public static async payFine(
    fineId: string,
    librarianUserId: string
  ): Promise<{
    fine: Fine;
    slip: PaymentSlipData;
  }> {
    const today = getTodayIndiaString();

    const updatedFine = await db.atomicPayFine(fineId, today, librarianUserId);
    if (!updatedFine) {
      const existing = await db.fines.findOne({ id: fineId }, { projection: { _id: 0 } });
      if (!existing) {
        throw new AppError('Fine record not found', 404, 'FINE_NOT_FOUND');
      }
      throw new AppError('Fine has already been marked as Paid', 400, 'ALREADY_PAID');
    }

    const [member, transaction] = await Promise.all([
      db.members.findOne({ id: updatedFine.memberId }, { projection: { _id: 0 } }),
      db.transactions.findOne({ id: updatedFine.transactionId }, { projection: { _id: 0 } }),
    ]);

    const book = transaction
      ? await db.books.findOne({ id: transaction.bookId }, { projection: { _id: 0 } })
      : null;

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
