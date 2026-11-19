import { db, exactCaseInsensitive } from '../config/db.ts';
import { Book, Author, Category } from '../models/types.ts';
import { AppError } from '../middleware/errorHandler.ts';

export class CatalogueService {
  // ===================== AUTHORS =====================
  public static async getAllAuthors(): Promise<Author[]> {
    return db.authors
      .find({}, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray();
  }

  public static async createAuthor(name: string): Promise<Author> {
    if (!name || !name.trim()) {
      throw new AppError('Author name is required', 400, 'VALIDATION_ERROR');
    }
    const trimmed = name.trim();
    const existing = await db.authors.findOne(
      { name: exactCaseInsensitive(trimmed) },
      { projection: { _id: 0 } }
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const author: Author = {
      id: `auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    await db.authors.insertOne({ ...author });
    return author;
  }

  public static async deleteAuthor(id: string): Promise<void> {
    const booksCount = await db.books.countDocuments({ authorId: id });
    if (booksCount > 0) {
      throw new AppError(
        'Cannot delete an author who still has books in the catalogue',
        400,
        'AUTHOR_HAS_BOOKS'
      );
    }
    const res = await db.authors.deleteOne({ id });
    if (res.deletedCount === 0) {
      throw new AppError('Author not found', 404, 'NOT_FOUND');
    }
  }

  // ===================== CATEGORIES =====================
  public static async getAllCategories(): Promise<Category[]> {
    return db.categories
      .find({}, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray();
  }

  public static async createCategory(name: string): Promise<Category> {
    if (!name || !name.trim()) {
      throw new AppError('Category name is required', 400, 'VALIDATION_ERROR');
    }
    const trimmed = name.trim();
    const existing = await db.categories.findOne(
      { name: exactCaseInsensitive(trimmed) },
      { projection: { _id: 0 } }
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const category: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    await db.categories.insertOne({ ...category });
    return category;
  }

  public static async deleteCategory(id: string): Promise<void> {
    const booksCount = await db.books.countDocuments({ categoryId: id });
    if (booksCount > 0) {
      throw new AppError(
        'Cannot delete a category that still has books in the catalogue',
        400,
        'CATEGORY_HAS_BOOKS'
      );
    }
    const res = await db.categories.deleteOne({ id });
    if (res.deletedCount === 0) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }
  }

  // ===================== BOOKS =====================
  public static async getAllBooks(): Promise<Book[]> {
    const [books, authors, categories] = await Promise.all([
      db.books.find({}, { projection: { _id: 0 } }).toArray(),
      db.authors.find({}, { projection: { _id: 0 } }).toArray(),
      db.categories.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const authorMap = new Map(authors.map(a => [a.id, a.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    return books.map(b => ({
      ...b,
      authorName: authorMap.get(b.authorId) || 'Unknown Author',
      categoryName: categoryMap.get(b.categoryId) || 'Uncategorized',
    }));
  }

  public static async getBookById(id: string): Promise<Book> {
    const book = await db.books.findOne(
      { $or: [{ id }, { isbn: exactCaseInsensitive(id) }] },
      { projection: { _id: 0 } }
    );
    if (!book) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');

    const [author, category] = await Promise.all([
      db.authors.findOne({ id: book.authorId }, { projection: { _id: 0 } }),
      db.categories.findOne({ id: book.categoryId }, { projection: { _id: 0 } }),
    ]);

    return {
      ...book,
      authorName: author?.name || 'Unknown Author',
      categoryName: category?.name || 'Uncategorized',
    };
  }

  public static async createBook(data: {
    isbn: string;
    title: string;
    authorId?: string;
    authorName?: string;
    categoryId?: string;
    categoryName?: string;
    publisher?: string;
    totalCopies: number;
  }): Promise<Book> {
    if (!data.isbn || !data.title || data.totalCopies === undefined) {
      throw new AppError('ISBN, title, and totalCopies are required', 400, 'VALIDATION_ERROR');
    }

    const cleanIsbn = String(data.isbn).trim();
    const duplicateBook = await db.books.findOne(
      { isbn: exactCaseInsensitive(cleanIsbn) },
      { projection: { _id: 0 } }
    );
    if (duplicateBook) {
      const [existingAuthor, existingCategory] = await Promise.all([
        db.authors.findOne({ id: duplicateBook.authorId }, { projection: { _id: 0 } }),
        db.categories.findOne({ id: duplicateBook.categoryId }, { projection: { _id: 0 } }),
      ]);
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

    let authorId = data.authorId;
    if (!authorId && data.authorName) {
      const auth = await this.createAuthor(data.authorName);
      authorId = auth.id;
    }
    if (!authorId) throw new AppError('Author is required', 400, 'VALIDATION_ERROR');

    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      const cat = await this.createCategory(data.categoryName);
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

    await db.books.insertOne({ ...newBook });

    const [author, category] = await Promise.all([
      db.authors.findOne({ id: authorId }, { projection: { _id: 0 } }),
      db.categories.findOne({ id: categoryId }, { projection: { _id: 0 } }),
    ]);

    return {
      ...newBook,
      authorName: author?.name,
      categoryName: category?.name,
    };
  }

  public static async updateBook(
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
  ): Promise<Book> {
    const book = await db.books.findOne({ id }, { projection: { _id: 0 } });
    if (!book) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');

    const updates: Partial<Book> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.isbn !== undefined) {
      const cleanIsbn = String(data.isbn).trim();
      if (!cleanIsbn) {
        throw new AppError('ISBN cannot be empty', 400, 'VALIDATION_ERROR');
      }
      const conflict = await db.books.findOne(
        { id: { $ne: id }, isbn: exactCaseInsensitive(cleanIsbn) },
        { projection: { _id: 0 } }
      );
      if (conflict) {
        const [conflictAuthor, conflictCategory] = await Promise.all([
          db.authors.findOne({ id: conflict.authorId }, { projection: { _id: 0 } }),
          db.categories.findOne({ id: conflict.categoryId }, { projection: { _id: 0 } }),
        ]);
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
      updates.isbn = cleanIsbn;
    }

    if (data.totalCopies !== undefined) {
      const newTotal = Math.max(0, Math.floor(Number(data.totalCopies)));
      const currentlyIssued = book.totalCopies - book.availableCopies;

      if (newTotal < currentlyIssued) {
        throw new AppError(
          `Cannot reduce total copies below ${currentlyIssued} (copies currently issued)`,
          400,
          'COPIES_LESS_THAN_ISSUED'
        );
      }
      updates.availableCopies = newTotal - currentlyIssued;
      updates.totalCopies = newTotal;
    }

    if (data.title) updates.title = data.title.trim();
    if (data.authorId) {
      updates.authorId = data.authorId;
    } else if (data.authorName && data.authorName.trim()) {
      updates.authorId = (await this.createAuthor(data.authorName)).id;
    }
    if (data.categoryId) {
      updates.categoryId = data.categoryId;
    } else if (data.categoryName && data.categoryName.trim()) {
      updates.categoryId = (await this.createCategory(data.categoryName)).id;
    }
    if (data.publisher !== undefined) {
      updates.publisher = data.publisher.trim() || 'University Press';
    }

    await db.books.updateOne({ id }, { $set: updates });
    return this.getBookById(id);
  }

  public static async deleteBook(id: string): Promise<void> {
    const activeLoansCount = await db.transactions.countDocuments({
      bookId: id,
      status: 'Issued',
    });
    if (activeLoansCount > 0) {
      throw new AppError(
        'Cannot delete a book with active loans. Return all copies first.',
        400,
        'BOOK_HAS_ACTIVE_LOANS'
      );
    }

    const res = await db.books.deleteOne({ id });
    if (res.deletedCount === 0) {
      throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }
  }

  /**
   * Bulk import books:
   * Re-validates every row, imports valid rows with availableCopies = totalCopies,
   * skips and reports duplicate/invalid rows, never overwrites an existing book,
   * creates missing authors and categories, up to 1,000 rows.
   */
  public static async bulkImport(
    rows: Array<{
      isbn?: string | number;
      title?: string;
      author?: string;
      category?: string;
      publisher?: string;
      total_copies?: number | string;
    }>
  ) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('No rows provided for import', 400, 'EMPTY_IMPORT');
    }

    if (rows.length > 1000) {
      throw new AppError('File exceeds maximum limit of 1,000 rows per import', 400, 'LIMIT_EXCEEDED');
    }

    const [existingBooks, existingAuthors, existingCategories] = await Promise.all([
      db.books.find({}, { projection: { _id: 0, isbn: 1 } }).toArray(),
      db.authors.find({}, { projection: { _id: 0 } }).toArray(),
      db.categories.find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const existingIsbns = new Set(existingBooks.map(b => b.isbn.toLowerCase()));
    const authorByName = new Map<string, Author>(existingAuthors.map(a => [a.name.toLowerCase(), a]));
    const categoryByName = new Map<string, Category>(existingCategories.map(c => [c.name.toLowerCase(), c]));

    const imported: Book[] = [];
    const booksToInsert: Book[] = [];
    const skipped: Array<{ row: number; isbn: string; reason: string }> = [];
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

      const lowerIsbn = rawIsbn.toLowerCase();
      if (batchSeenIsbns.has(lowerIsbn)) {
        skipped.push({
          row: rowNum,
          isbn: rawIsbn,
          reason: 'Duplicate ISBN within import file',
        });
        continue;
      }

      if (existingIsbns.has(lowerIsbn)) {
        skipped.push({
          row: rowNum,
          isbn: rawIsbn,
          reason: 'Book with this ISBN already exists in library catalogue',
        });
        continue;
      }

      batchSeenIsbns.add(lowerIsbn);

      let author = authorByName.get(rawAuthor.toLowerCase());
      if (!author) {
        author = await this.createAuthor(rawAuthor);
        authorByName.set(author.name.toLowerCase(), author);
      }

      let category = categoryByName.get(rawCategory.toLowerCase());
      if (!category) {
        category = await this.createCategory(rawCategory);
        categoryByName.set(category.name.toLowerCase(), category);
      }

      const now = new Date().toISOString();
      const newBook: Book = {
        id: `bk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        isbn: rawIsbn,
        title: rawTitle,
        authorId: author.id,
        categoryId: category.id,
        publisher: rawPublisher,
        totalCopies: copiesNum,
        availableCopies: copiesNum,
        createdAt: now,
        updatedAt: now,
      };

      booksToInsert.push(newBook);
      imported.push({
        ...newBook,
        authorName: author.name,
        categoryName: category.name,
      });
    }

    if (booksToInsert.length > 0) {
      await db.books.insertMany(booksToInsert.map(b => ({ ...b })));
    }

    return {
      totalRows: rows.length,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skippedDetails: skipped,
      importedBooks: imported,
    };
  }
}
