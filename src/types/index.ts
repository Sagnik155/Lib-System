export interface User {
  id: string;
  email: string;
  role: 'librarian' | 'student';
  memberId?: string;
  member?: Member | null;
}

export interface Author {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
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
  authorName?: string;
  categoryName?: string;
  earliestExpectedReturnDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  activeLoansCount?: number;
  unpaidFinesTotal?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  bookId: string;
  memberId: string;
  issuedBy: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'Issued' | 'Returned';
  bookTitle?: string;
  bookIsbn?: string;
  authorName?: string;
  memberCode?: string;
  memberName?: string;
  daysRemaining?: number;
  isOverdue?: boolean;
  daysOverdue?: number;
  estimatedFine?: number;
  createdAt?: string;
}

export interface Fine {
  id: string;
  transactionId: string;
  memberId: string;
  daysLate: number;
  amount: number;
  status: 'Unpaid' | 'Paid';
  generatedOn: string;
  paidOn?: string;
  collectedBy?: string;
  memberCode?: string;
  memberName?: string;
  memberEmail?: string;
  bookTitle?: string;
  bookIsbn?: string;
  createdAt?: string;
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

export type SlipData = IssueSlipData | ReturnSlipData | PaymentSlipData;
