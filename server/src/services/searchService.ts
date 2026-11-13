import { db } from '../config/db.ts';
import { Book } from '../models/types.ts';

export class SearchService {
  public static search(query?: string, categoryId?: string, availability?: 'all' | 'available' | 'unavailable'): Book[] {
    const q = query?.trim().toLowerCase() || '';

    // Join books with authors & categories
    let results: Book[] = db.books.map(b => {
      const author = db.authors.find(a => a.id === b.authorId);
      const category = db.categories.find(c => c.id === b.categoryId);

      // If book has 0 available copies, calculate earliest expected return date
      let earliestExpectedReturnDate: string | null = null;
      if (b.availableCopies === 0) {
        const activeTransactions = db.transactions.filter(
          t => t.bookId === b.id && t.status === 'Issued'
        );
        if (activeTransactions.length > 0) {
          // Sort ascending by dueDate
          const sortedDueDates = activeTransactions
            .map(t => t.dueDate)
            .sort((d1, d2) => d1.localeCompare(d2));
          earliestExpectedReturnDate = sortedDueDates[0] || null;
        }
      }

      return {
        ...b,
        authorName: author?.name || 'Unknown Author',
        categoryName: category?.name || 'Uncategorized',
        earliestExpectedReturnDate,
      };
    });

    // Partial text match across title, author name, category name, and ISBN
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
