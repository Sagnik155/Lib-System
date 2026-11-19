import mongoose, { ClientSession } from 'mongoose';
import { Author, Category, Book, Member, User, Transaction, Fine } from '../models/types.ts';
import { mongooseModels } from '../models/mongooseModels.ts';

type Db = mongoose.mongo.Db;
type Collection<T extends mongoose.mongo.BSON.Document = mongoose.mongo.BSON.Document> =
  mongoose.mongo.Collection<T>;

/**
 * MongoDB Atlas database layer powered by Mongoose over TLS.
 * Provides typed collection access, 7 Mongoose models, unique/query indexes,
 * atomic conditional updates, and multi-document ACID transaction sessions.
 */

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function exactCaseInsensitive(value: string): { $regex: string; $options: string } {
  return { $regex: `^${escapeRegex(value)}$`, $options: 'i' };
}

function resolveDbNameFromUri(uri: string): string | undefined {
  try {
    const parsed = new URL(uri);
    const pathName = parsed.pathname.replace(/^\//, '').trim();
    if (!pathName || pathName === 'test') {
      return 'library_db';
    }
    return pathName;
  } catch {
    return 'library_db';
  }
}

class MongoDatabase {
  public readonly models = mongooseModels;

  public async connect(): Promise<void> {
    if (this.isConnected()) return;

    const uri = (process.env.MONGODB_URI || process.env.MONGO_URI)?.trim();
    if (
      !uri ||
      uri.includes('<username>') ||
      uri.includes('<password>') ||
      uri.includes('cluster0.example.mongodb.net')
    ) {
      throw new Error(
        'MONGODB_URI is still missing or set to an example placeholder (cluster0.example.mongodb.net). Paste your real MongoDB Atlas connection string from Atlas -> Connect -> Drivers.'
      );
    }

    const dbName = resolveDbNameFromUri(uri);

    try {
      await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: 10000,
      });

      const nativeDb = this.getDb();
      await nativeDb.command({ ping: 1 });
      await this.ensureIndexes();
      console.log(`🍃 Connected to MongoDB Atlas via Mongoose over TLS (database: "${nativeDb.databaseName}")`);
    } catch (error) {
      await mongoose.disconnect().catch(() => undefined);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  public isConnected(): boolean {
    return mongoose.connection.readyState === 1 && Boolean(mongoose.connection.db);
  }

  public getDatabaseName(): string {
    return mongoose.connection.db?.databaseName || 'disconnected';
  }

  private getDb(): Db {
    if (!this.isConnected() || !mongoose.connection.db) {
      throw new Error('MongoDB is not connected. Call connectDb() before accessing collections.');
    }
    return mongoose.connection.db as unknown as Db;
  }

  private async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.models.Author.createIndexes(),
      this.models.Category.createIndexes(),
      this.models.Book.createIndexes(),
      this.models.Member.createIndexes(),
      this.models.User.createIndexes(),
      this.models.Transaction.createIndexes(),
      this.models.Fine.createIndexes(),
    ]);
  }

  /**
   * Run a multi-document ACID MongoDB transaction using a Mongoose ClientSession.
   * Ensures stock updates and loan/fine writes commit together or roll back completely.
   */
  public async withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  public get authors(): Collection<Author> {
    return this.getDb().collection<Author>('authors');
  }

  public get categories(): Collection<Category> {
    return this.getDb().collection<Category>('categories');
  }

  public get books(): Collection<Book> {
    return this.getDb().collection<Book>('books');
  }

  public get members(): Collection<Member> {
    return this.getDb().collection<Member>('members');
  }

  public get users(): Collection<User> {
    return this.getDb().collection<User>('users');
  }

  public get transactions(): Collection<Transaction> {
    return this.getDb().collection<Transaction>('transactions');
  }

  public get fines(): Collection<Fine> {
    return this.getDb().collection<Fine>('fines');
  }

  public async resetAll(): Promise<void> {
    await Promise.all([
      this.authors.deleteMany({}),
      this.categories.deleteMany({}),
      this.books.deleteMany({}),
      this.members.deleteMany({}),
      this.users.deleteMany({}),
      this.transactions.deleteMany({}),
      this.fines.deleteMany({}),
    ]);
  }

  /**
   * Atomic conditional stock decrement for book issue.
   * Decreases availableCopies only if availableCopies > 0.
   */
  public async atomicIssueCopy(bookId: string, session?: ClientSession): Promise<boolean> {
    const result = await this.books.findOneAndUpdate(
      { id: bookId, availableCopies: { $gt: 0 } },
      {
        $inc: { availableCopies: -1 },
        $set: { updatedAt: new Date().toISOString() },
      },
      { returnDocument: 'after', projection: { _id: 0 }, ...(session ? { session } : {}) }
    );
    return result !== null;
  }

  /**
   * Atomic conditional stock increment for book return.
   * Increases availableCopies only if availableCopies < totalCopies.
   */
  public async atomicReturnCopy(bookId: string, session?: ClientSession): Promise<boolean> {
    const result = await this.books.findOneAndUpdate(
      {
        id: bookId,
        $expr: { $lt: ['$availableCopies', '$totalCopies'] },
      },
      {
        $inc: { availableCopies: 1 },
        $set: { updatedAt: new Date().toISOString() },
      },
      { returnDocument: 'after', projection: { _id: 0 }, ...(session ? { session } : {}) }
    );
    return result !== null;
  }

  /**
   * Atomic conditional payment update.
   * Updates only if fine status is currently 'Unpaid'.
   */
  public async atomicPayFine(
    fineId: string,
    paidOn: string,
    collectedBy: string,
    session?: ClientSession
  ): Promise<Fine | null> {
    const updated = await this.fines.findOneAndUpdate(
      { id: fineId, status: 'Unpaid' },
      {
        $set: {
          status: 'Paid',
          paidOn,
          collectedBy,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after', projection: { _id: 0 }, ...(session ? { session } : {}) }
    );
    return updated as Fine | null;
  }
}

export const db = new MongoDatabase();

export async function connectDb(): Promise<void> {
  await db.connect();
}

export async function closeDb(): Promise<void> {
  await db.close();
}
