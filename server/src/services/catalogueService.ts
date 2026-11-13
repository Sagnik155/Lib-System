import { db } from '../config/db.ts';
import { Book, Author, Category } from '../models/types.ts';
import { AppError } from '../middleware/errorHandler.ts';

export class CatalogueService {
  // ===================== AUTHORS =====================
  public static getAllAuthors(): Author[] {
    return [...db.authors].sort((a, b) => a.name.localeCompare(b.name));
  }

  public static createAuthor(name: string): Author {
    if (!name || !name.trim()) {
      throw new AppError('Author name is required', 400, 'VALIDATION_ERROR');
    }
    const trimmed = name.trim();
    const existing = db.authors.find(a => a.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const now = new Date().toISOString();
    const author: Author = {
      id: `auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    db.authors.push(author);
    db.save();
    return author;
  }

  public static deleteAuthor(id: string): void {
    const hasBooks = db.books.some(b => b.authorId === id);
    if (hasBooks) {
      throw new AppError('Cannot delete an author who still has books in the catalogue', 400, 'AUTHOR_HAS_BOOKS');
    }
    const idx = db.authors.findIndex(a => a.id === id);
    if (idx === -1) throw new AppError('Author not found', 404, 'NOT_FOUND');
    db.authors.splice(idx, 1);
    db.save();
  }

  // ===================== CATEGORIES =====================
  public static getAllCategories(): Category[] {
    return [...db.categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  public static createCategory(name: string): Category {
    if (!name || !name.trim()) {
      throw new AppError('Category name is required', 400, 'VALIDATION_ERROR');
    }
    const trimmed = name.trim();
    const existing = db.categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const now = new Date().toISOString();
    const category: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    db.categories.push(category);
    db.save();
    return category;
  }

  public static deleteCategory(id: string): void {
    const hasBooks = db.books.some(b => b.categoryId === id);
    if (hasBooks) {
      throw new AppError('Cannot delete a category that still has books in the catalogue', 400, 'CATEGORY_HAS_BOOKS');
    }
    const idx = db.categories.findIndex(c => c.id === id);
    if (idx === -1) throw new AppError('Category not found', 404, 'NOT_FOUND');
    db.categories.splice(idx, 1);
    db.save();
  }

  // ===================== BOOKS =====================
  public static getAllBooks(): Book[] {
    return db.books.map(b => {
      const author = db.authors.find(a => a.id === b.authorId);
      const category = db.categories.find(c => c.id === b.categoryId);
      return {
        ...b,
        authorName: author?.name || 'Unknown Author',
        categoryName: category?.name || 'Uncategorized',
      };
    });
  }

  public static getBookById(id: string): Book {
    const book = db.books.find(b => b.id === id || b.isbn === id);
    if (!book) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');

    const author = db.authors.find(a => a.id === book.authorId);
    const category = db.categories.find(c => c.id === book.categoryId);
    return {
      ...book,
      authorName: author?.name || 'Unknown Author',
      categoryName: category?.name || 'Uncategorized',
    };
  }

  public static createBook(data: {
    isbn: string;
    title: string;
    authorId?: string;
    authorName?: string;
    categoryId?: string;
    categoryName?: string;
    publisher?: string;
    totalCopies: number;
  }): Book {
    if (!data.isbn || !data.title || data.totalCopies === undefined) {
      throw new AppError('ISBN, title, and totalCopies are required', 400, 'VALIDATION_ERROR');
    }

    const cleanIsbn = String(data.isbn).trim();
    const duplicateBook = db.books.find(b => b.isbn.toLowerCase() === cleanIsbn.toLowerCase());
    if (duplicateBook) {
      const existingAuthor = db.authors.find(a => a.id === duplicateBook.authorId);
      const existingCategory = db.categories.find(c => c.id === duplicateBook.categoryId);
      throw new AppError(
        `Invalid ISBN: "${cleanIsbn}" is already assigned to "${duplicateBook.title}".`,
        409,
        'DUPLICATE_ISBN',
        {
          existingBook: {
            ...duplicateBook,
            authorName: existingAuthor?.name || 'Unknown Author',
            categoryName: existingCategory?.name || 'Uncategorized',
          },
        }
      );
    }

    // Resolve or create author
    let authorId = data.authorId;
    if (!authorId && data.authorName) {
      const auth = this.createAuthor(data.authorName);
      authorId = auth.id;
    }
    if (!authorId) throw new AppError('Author is required', 400, 'VALIDATION_ERROR');

    // Resolve or create category
    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      const cat = this.createCategory(data.categoryName);
      categoryId = cat.id;
    }
    if (!categoryId) throw new AppError('Category is required', 400, 'VALIDATION_ERROR');

    const total = Math.max(0, Math.floor(Number(data.totalCopies)));
    const now = new Date().toISOString();

    const newBook: Book = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      isbn: cleanIsbn,
      title: data.title.trim(),
      authorId,
      categoryId,
      publisher: data.publisher?.trim() || 'University Press',
      totalCopies: total,
      availableCopies: total,
      createdAt: now,
      updatedAt: now,
    };

    db.books.push(newBook);
    db.save();

    const author = db.authors.find(a => a.id === authorId);
    const category = db.categories.find(c => c.id === categoryId);
    return {
      ...newBook,
      authorName: author?.name,
      categoryName: category?.name,
    };
  }

  public static updateBook(
    id: string,
    data: {
      isbn?: string;
      title?: string;
      authorId?: string;
      authorName?: string;
      categoryId?: string;
      categoryName?: string;
      publisher?: string;
      totalCopies?: number;
    }
  ): Book {
    const book = db.books.find(b => b.id === id);
    if (!book) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');

    if (data.isbn !== undefined) {
      const cleanIsbn = String(data.isbn).trim();
      if (!cleanIsbn) {
        throw new AppError('ISBN cannot be empty', 400, 'VALIDATION_ERROR');
      }
      const conflict = db.books.find(
        b => b.id !== id && b.isbn.toLowerCase() === cleanIsbn.toLowerCase()
      );
      if (conflict) {
        const conflictAuthor = db.authors.find(a => a.id === conflict.authorId);
        const conflictCategory = db.categories.find(c => c.id === conflict.categoryId);
        throw new AppError(
          `Invalid ISBN: "${cleanIsbn}" is already assigned to "${conflict.title}".`,
          409,
          'DUPLICATE_ISBN',
          {
            existingBook: {
              ...conflict,
              authorName: conflictAuthor?.name || 'Unknown Author',
              categoryName: conflictCategory?.name || 'Uncategorized',
            },
          }
        );
      }
      book.isbn = cleanIsbn;
    }

    if (data.totalCopies !== undefined) {
      const newTotal = Math.max(0, Math.floor(Number(data.totalCopies)));
      const currentlyIssued = book.totalCopies - book.availableCopies;
      
      // Total copies cannot be set lower than the number of copies currently issued
      if (newTotal < currentlyIssued) {
        throw new AppError(
          `Cannot reduce total copies below ${currentlyIssued} (copies currently issued)`,
          400,
          'COPIES_LESS_THAN_ISSUED'
        );
      }
      book.availableCopies = newTotal - currentlyIssued;
      book.totalCopies = newTotal;
    }

    if (data.title) book.title = data.title.trim();
    if (data.authorId) {
      book.authorId = data.authorId;
    } else if (data.authorName && data.authorName.trim()) {
      book.authorId = this.createAuthor(data.authorName).id;
    }
    if (data.categoryId) {
      book.categoryId = data.categoryId;
    } else if (data.categoryName && data.categoryName.trim()) {
      book.categoryId = this.createCategory(data.categoryName).id;
    }
    if (data.publisher !== undefined) book.publisher = data.publisher.trim() || 'University Press';

    book.updatedAt = new Date().toISOString();
    db.save();

    return this.getBookById(book.id);
  }

  public static deleteBook(id: string): void {
    // A book with any active (unreturned) transaction cannot be deleted
    const hasActiveTransactions = db.transactions.some(
      t => t.bookId === id && t.status === 'Issued'
    );
    if (hasActiveTransactions) {
      throw new AppError(
        'Cannot delete a book with active loans. Return all copies first.',
        400,
        'BOOK_HAS_ACTIVE_LOANS'
      );
    }

    const idx = db.books.findIndex(b => b.id === id);
    if (idx === -1) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    db.books.splice(idx, 1);
    db.save();
  }

  /**
   * Bulk import books:
   * Re-validates every row, imports valid rows with availableCopies = totalCopies,
   * skips and reports duplicate/invalid rows, never overwrites an existing book,
   * creates missing authors and categories, up to 1,000 rows.
   */
  public static bulkImport(rows: Array<{
    isbn?: string | number;
    title?: string;
    author?: string;
    category?: string;
    publisher?: string;
    total_copies?: number | string;
  }>) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('No rows provided for import', 400, 'EMPTY_IMPORT');
    }

    if (rows.length > 1000) {
      throw new AppError('File exceeds maximum limit of 1,000 rows per import', 400, 'LIMIT_EXCEEDED');
    }

    const imported: Book[] = [];
    const skipped: Array<{ row: number; isbn: string; reason: string }> = [];

    // Track seen ISBNs in this batch
    const batchSeenIsbns = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const r = rows[i];
      const rawIsbn = String(r.isbn ?? '').trim();
      const rawTitle = String(r.title ?? '').trim();
      const rawAuthor = String(r.author ?? '').trim();
      const rawCategory = String(r.category ?? '').trim();
      const rawPublisher = String(r.publisher ?? 'Standard Press').trim();
      const copiesNum = parseInt(String(r.total_copies ?? 1), 10);

      if (!rawIsbn || !rawTitle || !rawAuthor || !rawCategory || isNaN(copiesNum) || copiesNum < 1) {
        skipped.push({
          row: rowNum,
          isbn: rawIsbn || 'N/A',
          reason: 'Missing required field or invalid copy count (min 1)',
        });
        continue;
      }

      if (batchSeenIsbns.has(rawIsbn.toLowerCase())) {
        skipped.push({
          row: rowNum,
          isbn: rawIsbn,
          reason: 'Duplicate ISBN within import file',
        });
        continue;
      }

      if (db.books.some(b => b.isbn.toLowerCase() === rawIsbn.toLowerCase())) {
        skipped.push({
          row: rowNum,
          isbn: rawIsbn,
          reason: 'Book with this ISBN already exists in library catalogue',
        });
        continue;
      }

      batchSeenIsbns.add(rawIsbn.toLowerCase());

      // Auto-create author & category if needed
      let author = db.authors.find(a => a.name.toLowerCase() === rawAuthor.toLowerCase());
      if (!author) author = this.createAuthor(rawAuthor);

      let category = db.categories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());
      if (!category) category = this.createCategory(rawCategory);

      const now = new Date().toISOString();
      const newBook: Book = {
        id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isbn: rawIsbn,
        title: rawTitle,
        authorId: author.id,
        categoryId: category.id,
        publisher: rawPublisher,
        totalCopies: copiesNum,
        availableCopies: copiesNum,
        createdAt: now,
        updatedAt: now,
        authorName: author.name,
        categoryName: category.name,
      };

      db.books.push(newBook);
      imported.push(newBook);
    }

    db.save();

    return {
      totalRows: rows.length,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skippedDetails: skipped,
      importedBooks: imported,
    };
  }
}
