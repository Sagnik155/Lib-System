import { db } from '../config/db.ts';
import { Book } from '../models/types.ts';

export class SearchService {
  public static async search(
    query?: string,
    categoryId?: string,
    availability?: 'all' | 'available' | 'unavailable'
  ): Promise<Book[]> {
    const q = query?.trim().toLowerCase() || '';

    const [books, authors, categories, activeTransactions] = await Promise.all([
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
      db.authors.find({}, { projection: { _id: 0 } }).toArray(),
      db.categories.find({}, { projection: { _id: 0 } }).toArray(),
      db.transactions.find({ status: 'Issued' }, { projection: { _id: 0 } }).toArray(),
    ]);

    const authorMap = new Map(authors.map(a => [a.id, a.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    let results: Book[] = books.map(b => {
      let earliestExpectedReturnDate: string | null = null;
      if (b.availableCopies === 0) {
        const bookActive = activeTransactions.filter(t => t.bookId === b.id);
        if (bookActive.length > 0) {
          const sortedDueDates = bookActive
            .map(t => t.dueDate)
            .sort((d1, d2) => d1.localeCompare(d2));
          earliestExpectedReturnDate = sortedDueDates[0] || null;
        }
      }

      return {
        ...b,
        authorName: authorMap.get(b.authorId) || 'Unknown Author',
        categoryName: categoryMap.get(b.categoryId) || 'Uncategorized',
        earliestExpectedReturnDate,
      };
    });

    if (q) {
      results = results.filter(
        b =>
          b.title.toLowerCase().includes(q) ||
          (b.authorName && b.authorName.toLowerCase().includes(q)) ||
          (b.categoryName && b.categoryName.toLowerCase().includes(q)) ||
          b.isbn.toLowerCase().includes(q)
      );
    }

    if (categoryId && categoryId !== 'all') {
      results = results.filter(b => b.categoryId === categoryId);
    }

    if (availability === 'available') {
      results = results.filter(b => b.availableCopies > 0);
    } else if (availability === 'unavailable') {
      results = results.filter(b => b.availableCopies === 0);
    }

    return results;
  }
}
