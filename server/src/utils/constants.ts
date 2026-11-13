/**
 * Business Rule constants for Library Management System
 */
export const LOAN_DAYS = 14; // 14 days loan period
export const FINE_RATE_PER_DAY = 5; // ₹5 per day late, no cap
export const MAX_BORROW_LIMIT = 5; // Maximum 5 books per member

export const ISSUE_ERROR_CODES = {
  BOOK_NOT_FOUND: 'BOOK_NOT_FOUND',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  NO_COPIES: 'NO_COPIES',
  MEMBER_INACTIVE: 'MEMBER_INACTIVE',
  UNPAID_FINE: 'UNPAID_FINE',
  LIMIT_REACHED: 'LIMIT_REACHED',
} as const;

export const CURRENCY_SYMBOL = '₹';
