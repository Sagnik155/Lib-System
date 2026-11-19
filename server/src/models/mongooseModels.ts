import mongoose, { Schema, Model } from 'mongoose';
import { Author, Category, Book, Member, User, Transaction, Fine } from './types.ts';

/**
 * Mongoose Schemas & Models for all 7 MongoDB Atlas collections:
 * authors, categories, books, members, users, transactions, fines
 */

const authorSchema = new Schema<Author>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'authors', versionKey: false }
);

const categorySchema = new Schema<Category>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'categories', versionKey: false }
);

const bookSchema = new Schema<Book>(
  {
    id: { type: String, required: true, unique: true, index: true },
    isbn: { type: String, required: true, unique: true, index: true, trim: true },
    title: { type: String, required: true, trim: true },
    authorId: { type: String, required: true, index: true },
    categoryId: { type: String, required: true, index: true },
    publisher: { type: String, required: true, trim: true },
    totalCopies: { type: Number, required: true, min: 1 },
    availableCopies: { type: Number, required: true, min: 0 },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'books', versionKey: false }
);

const memberSchema = new Schema<Member>(
  {
    id: { type: String, required: true, unique: true, index: true },
    memberCode: { type: String, required: true, unique: true, index: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, trim: true },
    phone: { type: String, required: true, trim: true },
    membershipType: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], required: true },
    userId: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'members', versionKey: false }
);

const userSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['librarian', 'student'], required: true },
    memberId: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'users', versionKey: false }
);

const transactionSchema = new Schema<Transaction>(
  {
    id: { type: String, required: true, unique: true, index: true },
    bookId: { type: String, required: true },
    memberId: { type: String, required: true },
    issuedBy: { type: String, required: true },
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    returnDate: { type: String },
    status: { type: String, enum: ['Issued', 'Returned'], required: true },
    bookTitle: { type: String },
    bookIsbn: { type: String },
    memberCode: { type: String },
    memberName: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'transactions', versionKey: false }
);
transactionSchema.index({ memberId: 1, status: 1 });
transactionSchema.index({ bookId: 1, status: 1 });

const fineSchema = new Schema<Fine>(
  {
    id: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, required: true, index: true },
    memberId: { type: String, required: true },
    daysLate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Unpaid', 'Paid'], required: true },
    generatedOn: { type: String, required: true },
    paidOn: { type: String },
    collectedBy: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'fines', versionKey: false }
);
fineSchema.index({ memberId: 1, status: 1 });

export const AuthorModel: Model<Author> =
  (mongoose.models.Author as Model<Author>) || mongoose.model<Author>('Author', authorSchema);

export const CategoryModel: Model<Category> =
  (mongoose.models.Category as Model<Category>) || mongoose.model<Category>('Category', categorySchema);

export const BookModel: Model<Book> =
  (mongoose.models.Book as Model<Book>) || mongoose.model<Book>('Book', bookSchema);

export const MemberModel: Model<Member> =
  (mongoose.models.Member as Model<Member>) || mongoose.model<Member>('Member', memberSchema);

export const UserModel: Model<User> =
  (mongoose.models.User as Model<User>) || mongoose.model<User>('User', userSchema);

export const TransactionModel: Model<Transaction> =
  (mongoose.models.Transaction as Model<Transaction>) ||
  mongoose.model<Transaction>('Transaction', transactionSchema);

export const FineModel: Model<Fine> =
  (mongoose.models.Fine as Model<Fine>) || mongoose.model<Fine>('Fine', fineSchema);

export const mongooseModels = {
  Author: AuthorModel,
  Category: CategoryModel,
  Book: BookModel,
  Member: MemberModel,
  User: UserModel,
  Transaction: TransactionModel,
  Fine: FineModel,
};
