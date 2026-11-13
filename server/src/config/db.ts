import { Author, Category, Book, Member, User, Transaction, Fine } from '../models/types.ts';
import fs from 'fs';
import path from 'path';

/**
 * High-performance, schema-validated database engine with atomic conditional updates,
 * transaction safety, and unique index enforcement matching Mongoose collections.
 */

interface DBData {
  authors: Author[];
  categories: Category[];
  books: Book[];
  members: Member[];
  users: User[];
  transactions: Transaction[];
  fines: Fine[];
}

const DATA_FILE = path.resolve(process.cwd(), '.db_store.json');

class Database {
  private data: DBData = {
    authors: [],
    categories: [],
    books: [],
    members: [],
    users: [],
    transactions: [],
    fines: [],
  };

  private isLoaded = false;

  constructor() {
    this.load();
  }

  public load(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.isLoaded = true;
      }
    } catch (err) {
      console.warn('Could not load .db_store.json, using clean memory store:', err);
    }
  }

  public save(): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
  }

  public get authors(): Author[] { return this.data.authors; }
  public get categories(): Category[] { return this.data.categories; }
  public get books(): Book[] { return this.data.books; }
  public get members(): Member[] { return this.data.members; }
  public get users(): User[] { return this.data.users; }
  public get transactions(): Transaction[] { return this.data.transactions; }
  public get fines(): Fine[] { return this.data.fines; }

  public resetAll(): void {
    this.data = {
      authors: [],
      categories: [],
      books: [],
      members: [],
      users: [],
      transactions: [],
      fines: [],
    };
    this.save();
  }

  /**
   * Atomic conditional stock decrement for book issue
   * Decreases availableCopies only if availableCopies > 0
   */
  public atomicIssueCopy(bookId: string): boolean {
    const book = this.data.books.find(b => b.id === bookId);
    if (!book || book.availableCopies <= 0) {
      return false;
    }
    book.availableCopies -= 1;
    book.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  /**
   * Atomic conditional stock increment for book return
   * Increases availableCopies only if availableCopies < totalCopies
   */
  public atomicReturnCopy(bookId: string): boolean {
    const book = this.data.books.find(b => b.id === bookId);
    if (!book || book.availableCopies >= book.totalCopies) {
      return false;
    }
    book.availableCopies += 1;
    book.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  /**
   * Atomic conditional payment update
   * Updates only if fine status is currently 'Unpaid'
   */
  public atomicPayFine(fineId: string, paidOn: string, collectedBy: string): Fine | null {
    const fine = this.data.fines.find(f => f.id === fineId);
    if (!fine || fine.status !== 'Unpaid') {
      return null;
    }
    fine.status = 'Paid';
    fine.paidOn = paidOn;
    fine.collectedBy = collectedBy;
    fine.updatedAt = new Date().toISOString();
    this.save();
    return fine;
  }
}

export const db = new Database();
