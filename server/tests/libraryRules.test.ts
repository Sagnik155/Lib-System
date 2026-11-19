import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/config/db.ts';
import { CatalogueService } from '../src/services/catalogueService.ts';
import { MemberService } from '../src/services/memberService.ts';
import { IssueReturnService } from '../src/services/issueReturnService.ts';
import { FineService } from '../src/services/fineService.ts';
import { authMiddleware, roleMiddleware, generateToken } from '../src/middleware/auth.ts';
import { diffInDays, addDays, getTodayIndiaString } from '../src/utils/dateHelper.ts';
import { FINE_RATE_PER_DAY, LOAN_DAYS } from '../src/utils/constants.ts';

/**
 * Automated Service & Security Test Suite
 * Verifies referential integrity delete guards, multi-document issue/return
 * transactions, fine math, and JWT/RBAC security gate enforcement.
 */

type Doc = Record<string, any>;

function matchesFilter(doc: Doc, filter: Doc): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(cond)) {
      if (!cond.some(sub => matchesFilter(doc, sub))) return false;
      continue;
    }
    if (key === '$expr' && cond && typeof cond === 'object' && '$lt' in cond) {
      const [left, right] = cond.$lt;
      const lv = typeof left === 'string' && left.startsWith('$') ? doc[left.slice(1)] : left;
      const rv = typeof right === 'string' && right.startsWith('$') ? doc[right.slice(1)] : right;
      if (!(lv < rv)) return false;
      continue;
    }
    const val = doc[key];
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$regex' in cond) {
        const re = new RegExp(cond.$regex, cond.$options || '');
        if (typeof val !== 'string' || !re.test(val)) return false;
      } else if ('$gt' in cond) {
        if (!(val > cond.$gt)) return false;
      } else if ('$ne' in cond) {
        if (val === cond.$ne) return false;
      } else if ('$in' in cond && Array.isArray(cond.$in)) {
        if (!cond.$in.includes(val)) return false;
      }
    } else if (val !== cond) {
      return false;
    }
  }
  return true;
}

function createMemoryCollection(rows: Doc[]) {
  return {
    async findOne(filter: Doc) {
      const found = rows.find(r => matchesFilter(r, filter));
      return found ? { ...found } : null;
    },
    find(filter: Doc = {}) {
      return {
        async toArray() {
          return rows.filter(r => matchesFilter(r, filter)).map(r => ({ ...r }));
        },
      };
    },
    async countDocuments(filter: Doc = {}) {
      return rows.filter(r => matchesFilter(r, filter)).length;
    },
    async insertOne(doc: Doc) {
      rows.push({ ...doc });
      return { acknowledged: true };
    },
    async insertMany(docs: Doc[]) {
      for (const d of docs) rows.push({ ...d });
      return { acknowledged: true };
    },
    async updateOne(filter: Doc, update: Doc) {
      const idx = rows.findIndex(r => matchesFilter(r, filter));
      if (idx === -1) return { modifiedCount: 0 };
      if (update.$set) Object.assign(rows[idx], update.$set);
      if (update.$inc) {
        for (const [k, delta] of Object.entries(update.$inc)) {
          rows[idx][k] = (rows[idx][k] || 0) + Number(delta);
        }
      }
      return { modifiedCount: 1 };
    },
    async findOneAndUpdate(filter: Doc, update: Doc) {
      const idx = rows.findIndex(r => matchesFilter(r, filter));
      if (idx === -1) return null;
      if (update.$set) Object.assign(rows[idx], update.$set);
      if (update.$inc) {
        for (const [k, delta] of Object.entries(update.$inc)) {
          rows[idx][k] = (rows[idx][k] || 0) + Number(delta);
        }
      }
      return { ...rows[idx] };
    },
    async deleteOne(filter: Doc) {
      const idx = rows.findIndex(r => matchesFilter(r, filter));
      if (idx === -1) return { deletedCount: 0 };
      rows.splice(idx, 1);
      return { deletedCount: 1 };
    },
    async deleteMany(filter: Doc = {}) {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (matchesFilter(rows[i], filter)) rows.splice(i, 1);
      }
      return { deletedCount: before - rows.length };
    },
  };
}

let store: Record<string, Doc[]>;

function installTestDatabase() {
  const now = new Date().toISOString();
  const today = getTodayIndiaString();

  store = {
    authors: [
      { id: 'auth_1', name: 'George Orwell', createdAt: now, updatedAt: now },
      { id: 'auth_unused', name: 'Unused Author', createdAt: now, updatedAt: now },
    ],
    categories: [
      { id: 'cat_1', name: 'Fiction', createdAt: now, updatedAt: now },
      { id: 'cat_unused', name: 'Unused Category', createdAt: now, updatedAt: now },
    ],
    books: [
      {
        id: 'bk_1',
        isbn: '978-0-452-28423-4',
        title: '1984',
        authorId: 'auth_1',
        categoryId: 'cat_1',
        publisher: 'Penguin',
        totalCopies: 3,
        availableCopies: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bk_zero',
        isbn: '978-0-000-00000-0',
        title: 'Out of Stock Book',
        authorId: 'auth_1',
        categoryId: 'cat_1',
        publisher: 'Test Press',
        totalCopies: 1,
        availableCopies: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    members: [
      {
        id: 'mem_active',
        memberCode: 'M001',
        fullName: 'Aarav Sharma',
        email: 'aarav@college.edu',
        phone: '9876543210',
        membershipType: 'Student',
        status: 'Active',
        joinedOn: today,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mem_inactive',
        memberCode: 'M002',
        fullName: 'Inactive Student',
        email: 'inactive@college.edu',
        phone: '9876543211',
        membershipType: 'Student',
        status: 'Inactive',
        joinedOn: today,
        createdAt: now,
        updatedAt: now,
      },
    ],
    users: [],
    transactions: [
      {
        id: 'txn_active_1',
        bookId: 'bk_1',
        memberId: 'mem_active',
        issuedBy: 'usr_lib_1',
        issueDate: addDays(today, -18),
        dueDate: addDays(today, -4), // 4 days overdue
        status: 'Issued',
        createdAt: now,
        updatedAt: now,
      },
    ],
    fines: [],
  };

  for (const name of Object.keys(store)) {
    Object.defineProperty(db, name, {
      configurable: true,
      get: () => createMemoryCollection(store[name]),
    });
  }

  // Simulate transactional rollback semantics on failure
  (db as any).withTransaction = async <T>(fn: (session: any) => Promise<T>): Promise<T> => {
    const snapshot = JSON.parse(JSON.stringify(store));
    try {
      return await fn({ id: 'mock_session' });
    } catch (err) {
      store = snapshot;
      throw err;
    }
  };
}

describe('Referential Integrity & Delete Protection', () => {
  beforeEach(() => installTestDatabase());

  test('blocks deleting a book that has active issued loans', async () => {
    await assert.rejects(
      () => CatalogueService.deleteBook('bk_1'),
      (err: any) => err.code === 'BOOK_HAS_ACTIVE_LOANS' && err.statusCode === 400
    );
  });

  test('blocks reducing totalCopies below currently issued count', async () => {
    await assert.rejects(
      () => CatalogueService.updateBook('bk_1', { totalCopies: 0 }),
      (err: any) => err.code === 'VALIDATION_ERROR' || err.code === 'COPIES_LESS_THAN_ISSUED'
    );
    // Book bk_zero has 1 total, 0 available (1 issued) -> updating bk_1 with 2 issued fails if total < 2
    store.books[0].availableCopies = 1; // 2 issued out of 3
    await assert.rejects(
      () => CatalogueService.updateBook('bk_1', { totalCopies: 1 }),
      (err: any) => err.code === 'COPIES_LESS_THAN_ISSUED' && err.statusCode === 400
    );
  });

  test('blocks deleting an author or category still referenced by books', async () => {
    await assert.rejects(
      () => CatalogueService.deleteAuthor('auth_1'),
      (err: any) => err.code === 'AUTHOR_HAS_BOOKS' && err.statusCode === 400
    );
    await assert.rejects(
      () => CatalogueService.deleteCategory('cat_1'),
      (err: any) => err.code === 'CATEGORY_HAS_BOOKS' && err.statusCode === 400
    );

    // Unused author & category can be deleted cleanly
    await CatalogueService.deleteAuthor('auth_unused');
    await CatalogueService.deleteCategory('cat_unused');
    assert.equal(store.authors.length, 1);
    assert.equal(store.categories.length, 1);
  });

  test('blocks deleting a member who still has active issued books', async () => {
    await assert.rejects(
      () => MemberService.deleteMember('mem_active'),
      (err: any) => err.code === 'ACTIVE_TRANSACTIONS_EXIST' && err.statusCode === 400
    );
  });
});

describe('Transactional Issue, Return & Fine Settlement Rules', () => {
  beforeEach(() => installTestDatabase());

  test('blocks issue when member is inactive or book has zero available copies', async () => {
    await assert.rejects(
      () => IssueReturnService.issueBook('bk_zero', 'mem_inactive', 'usr_lib_1'),
      (err: any) =>
        err.code === 'ISSUE_BLOCKED' &&
        err.details?.failureReasons?.includes('NO_COPIES') &&
        err.details?.failureReasons?.includes('MEMBER_INACTIVE')
    );
  });

  test('issues a book atomically with +14 day due date and decrements stock', async () => {
    const beforeCopies = store.books[0].availableCopies;
    const { transaction, slip } = await IssueReturnService.issueBook('bk_1', 'mem_active', 'usr_lib_1');

    assert.equal(store.books[0].availableCopies, beforeCopies - 1);
    assert.equal(transaction.status, 'Issued');
    assert.equal(diffInDays(transaction.dueDate, transaction.issueDate), LOAN_DAYS);
    assert.equal(slip.slipType, 'ISSUE');
  });

  test('returns an overdue loan atomically, restocks copy, creates ₹5/day fine, and blocks double return', async () => {
    const beforeCopies = store.books[0].availableCopies;
    const { transaction, fine, slip } = await IssueReturnService.returnBook('txn_active_1', 'usr_lib_1');

    assert.equal(transaction.status, 'Returned');
    assert.equal(store.books[0].availableCopies, beforeCopies + 1);
    assert.ok(fine, 'Expected overdue fine to be created');
    assert.equal(fine.daysLate, 4);
    assert.equal(fine.amount, 4 * FINE_RATE_PER_DAY);
    assert.equal(fine.status, 'Unpaid');
    assert.equal(slip.fineAmount, 4 * FINE_RATE_PER_DAY);

    // Double return must fail
    await assert.rejects(
      () => IssueReturnService.returnBook('txn_active_1', 'usr_lib_1'),
      (err: any) => err.code === 'ALREADY_RETURNED'
    );

    // Member with unpaid fine cannot borrow until fine is paid
    await assert.rejects(
      () => IssueReturnService.issueBook('bk_1', 'mem_active', 'usr_lib_1'),
      (err: any) => err.code === 'ISSUE_BLOCKED' && err.details?.failureReasons?.includes('UNPAID_FINE')
    );

    // Pay fine atomically and block double payment
    const payment = await FineService.payFine(fine.id, 'librarian@college.edu');
    assert.equal(payment.fine.status, 'Paid');
    await assert.rejects(
      () => FineService.payFine(fine.id, 'librarian@college.edu'),
      (err: any) => err.code === 'ALREADY_PAID'
    );
  });
});

function createMockRes() {
  const result: { statusCode: number; body: any } = { statusCode: 200, body: null };
  const res: any = {
    status(code: number) {
      result.statusCode = code;
      return res;
    },
    json(payload: any) {
      result.body = payload;
      return res;
    },
  };
  return { res, result };
}

describe('Security Gate: JWT Authentication & RBAC Middleware', () => {
  test('denies unauthenticated requests by default with 401 UNAUTHORIZED', () => {
    const req: any = { headers: {} };
    const { res, result } = createMockRes();
    let nextCalled = false;
    authMiddleware(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(result.statusCode, 401);
    assert.equal(result.body?.error?.code, 'UNAUTHORIZED');
  });

  test('blocks student tokens from librarian-only routes with 403 FORBIDDEN', () => {
    const studentToken = generateToken({
      userId: 'usr_stu_1',
      email: 'student@college.edu',
      role: 'student',
      memberId: 'mem_1',
    });

    const req: any = { headers: { authorization: `Bearer ${studentToken}` } };
    const { res: authRes } = createMockRes();
    let authPassed = false;
    authMiddleware(req, authRes, () => {
      authPassed = true;
    });
    assert.equal(authPassed, true);
    assert.equal(req.user.role, 'student');

    const { res: rbacRes, result: rbacResult } = createMockRes();
    let rbacPassed = false;
    roleMiddleware(['librarian'])(req, rbacRes, () => {
      rbacPassed = true;
    });
    assert.equal(rbacPassed, false);
    assert.equal(rbacResult.statusCode, 403);
    assert.equal(rbacResult.body?.error?.code, 'FORBIDDEN');
  });
});
