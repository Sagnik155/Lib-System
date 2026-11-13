export interface Author {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  authorId: string;
  categoryId: string;
  publisher: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
  updatedAt: string;
  // Hydrated fields for client responses
  authorName?: string;
  categoryName?: string;
  earliestExpectedReturnDate?: string | null;
}

export interface Member {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  membershipType: string;
  status: 'Active' | 'Inactive';
  userId?: string;
  createdAt: string;
  updatedAt: string;
  // Computed stats for display
  activeLoansCount?: number;
  unpaidFinesTotal?: number;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'librarian' | 'student';
  memberId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  bookId: string;
  memberId: string;
  issuedBy: string; // librarian user id
  issueDate: string; // YYYY-MM-DD (India time)
  dueDate: string; // YYYY-MM-DD (India time)
  returnDate?: string; // YYYY-MM-DD
  status: 'Issued' | 'Returned';
  createdAt: string;
  updatedAt: string;
  // Hydrated fields
  bookTitle?: string;
  bookIsbn?: string;
  memberCode?: string;
  memberName?: string;
}

export interface Fine {
  id: string;
  transactionId: string;
  memberId: string;
  daysLate: number;
  amount: number;
  status: 'Unpaid' | 'Paid';
  generatedOn: string; // YYYY-MM-DD
  paidOn?: string; // YYYY-MM-DD
  collectedBy?: string; // librarian user id
  createdAt: string;
  updatedAt: string;
  // Hydrated fields
  memberCode?: string;
  memberName?: string;
  bookTitle?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'librarian' | 'student';
  memberId?: string;
}

export interface IssueSlipData {
  transactionId: string;
  slipType: 'ISSUE';
  slipDate: string;
  memberCode: string;
  memberName: string;
  bookTitle: string;
  bookIsbn: string;
  issueDate: string;
  dueDate: string;
  issuedBy: string;
}

export interface ReturnSlipData {
  transactionId: string;
  slipType: 'RETURN';
  slipDate: string;
  memberCode: string;
  memberName: string;
  bookTitle: string;
  bookIsbn: string;
  issueDate: string;
  dueDate: string;
  returnDate: string;
  daysLate: number;
  fineAmount: number;
  fineStatus?: 'Unpaid' | 'None';
}

export interface PaymentSlipData {
  fineId: string;
  transactionId: string;
  slipType: 'PAYMENT';
  slipDate: string;
  memberCode: string;
  memberName: string;
  bookTitle: string;
  amountPaid: number;
  paymentDate: string;
  collectedBy: string;
}
