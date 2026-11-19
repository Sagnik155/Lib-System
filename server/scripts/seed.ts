import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb, closeDb, db } from '../src/config/db.ts';
import { Author, Category, Book, Member, User, Transaction, Fine } from '../src/models/types.ts';
import { getTodayIndiaString, addDays } from '../src/utils/dateHelper.ts';

export async function runSeed() {
  console.log('🌱 Starting MongoDB Atlas database seed with demo data...');

  if (!db.isConnected()) {
    await connectDb();
  }

  await db.resetAll();
  const now = new Date().toISOString();
  const today = getTodayIndiaString();

  // 1. Authors
  const authorNames = [
    'J.K. Rowling',
    'George Orwell',
    'Jane Austen',
    'Leo Tolstoy',
    'F. Scott Fitzgerald',
    'Virginia Woolf',
    'Ernest Hemingway',
    'Gabriel García Márquez',
    'Harper Lee',
    'Charles Dickens',
    'Arthur Conan Doyle',
    'Agatha Christie',
  ];

  const authors: Author[] = authorNames.map((name, i) => ({
    id: `auth_${i + 1}`,
    name,
    createdAt: now,
    updatedAt: now,
  }));

  // 2. Categories
  const categoryNames = [
    'Computer Science',
    'Classic Literature',
    'Dystopian Fiction',
    'Science & Engineering',
    'Mystery & Crime',
    'History & Philosophy',
    'Economics & Management',
  ];

  const categories: Category[] = categoryNames.map((name, i) => ({
    id: `cat_${i + 1}`,
    name,
    createdAt: now,
    updatedAt: now,
  }));

  // 3. Books (30 titles, including 1 with 0 available copies)
  const rawBooksData = [
    { isbn: '978-0-14-103613-7', title: '1984', authorIdx: 1, catIdx: 2, publisher: 'Secker & Warburg', total: 6, avail: 4 },
    { isbn: '978-0-14-103614-4', title: 'Animal Farm', authorIdx: 1, catIdx: 2, publisher: 'Penguin Classics', total: 5, avail: 5 },
    { isbn: '978-0-14-143951-8', title: 'Pride and Prejudice', authorIdx: 2, catIdx: 1, publisher: 'T. Egerton', total: 4, avail: 3 },
    { isbn: '978-0-14-143958-7', title: 'Emma', authorIdx: 2, catIdx: 1, publisher: 'John Murray', total: 3, avail: 3 },
    { isbn: '978-0-14-044913-6', title: 'War and Peace', authorIdx: 3, catIdx: 1, publisher: 'The Russian Messenger', total: 4, avail: 4 },
    { isbn: '978-0-14-303500-8', title: 'Anna Karenina', authorIdx: 3, catIdx: 1, publisher: 'The Russian Messenger', total: 4, avail: 2 },
    { isbn: '978-0-7432-7356-5', title: 'The Great Gatsby', authorIdx: 4, catIdx: 1, publisher: "Charles Scribner's Sons", total: 8, avail: 6 },
    { isbn: '978-0-15-690739-2', title: 'To the Lighthouse', authorIdx: 5, catIdx: 1, publisher: 'Hogarth Press', total: 3, avail: 3 },
    { isbn: '978-0-15-662870-9', title: 'Mrs Dalloway', authorIdx: 5, catIdx: 1, publisher: 'Hogarth Press', total: 3, avail: 3 },
    { isbn: '978-0-684-80122-3', title: 'The Old Man and the Sea', authorIdx: 6, catIdx: 1, publisher: "Charles Scribner's Sons", total: 5, avail: 5 },
    { isbn: '978-0-06-088328-7', title: 'One Hundred Years of Solitude', authorIdx: 7, catIdx: 1, publisher: 'Editorial Sudamericana', total: 5, avail: 4 },
    { isbn: '978-0-06-092979-4', title: 'To Kill a Mockingbird', authorIdx: 8, catIdx: 1, publisher: 'J. B. Lippincott & Co.', total: 6, avail: 4 },
    { isbn: '978-0-14-143960-0', title: 'Great Expectations', authorIdx: 9, catIdx: 1, publisher: 'Chapman & Hall', total: 4, avail: 4 },
    { isbn: '978-0-14-143967-9', title: 'A Tale of Two Cities', authorIdx: 9, catIdx: 5, publisher: 'Chapman & Hall', total: 5, avail: 4 },
    { isbn: '978-0-14-043908-3', title: 'The Adventures of Sherlock Holmes', authorIdx: 10, catIdx: 4, publisher: 'George Newnes', total: 7, avail: 5 },
    { isbn: '978-0-00-711931-8', title: 'And Then There Were None', authorIdx: 11, catIdx: 4, publisher: 'Collins Crime Club', total: 6, avail: 5 },
    { isbn: '978-0-00-711932-5', title: 'Murder on the Orient Express', authorIdx: 11, catIdx: 4, publisher: 'Collins Crime Club', total: 5, avail: 4 },
    { isbn: '978-0-439-06487-3', title: "Harry Potter and the Sorcerer's Stone", authorIdx: 0, catIdx: 1, publisher: 'Scholastic Press', total: 8, avail: 7 },
    { isbn: '978-0-439-06486-6', title: 'Harry Potter and the Chamber of Secrets', authorIdx: 0, catIdx: 1, publisher: 'Scholastic Press', total: 6, avail: 5 },
    { isbn: '978-0-13-110362-7', title: 'The C Programming Language', authorIdx: 1, catIdx: 0, publisher: 'Prentice Hall', total: 4, avail: 3 },
    { isbn: '978-0-262-03384-8', title: 'Introduction to Algorithms (CLRS)', authorIdx: 3, catIdx: 0, publisher: 'MIT Press', total: 5, avail: 3 },
    { isbn: '978-0-13-235088-4', title: 'Clean Code: Agile Software Craftsmanship', authorIdx: 4, catIdx: 0, publisher: 'Prentice Hall', total: 6, avail: 5 },
    { isbn: '978-0-201-61622-4', title: 'The Pragmatic Programmer', authorIdx: 5, catIdx: 0, publisher: 'Addison-Wesley', total: 5, avail: 3 },
    { isbn: '978-0-596-51774-8', title: 'JavaScript: The Good Parts', authorIdx: 6, catIdx: 0, publisher: "O'Reilly Media", total: 4, avail: 2 },
    { isbn: '978-0-13-468599-1', title: 'Effective Java', authorIdx: 7, catIdx: 0, publisher: 'Addison-Wesley', total: 5, avail: 4 },
    { isbn: '978-1-491-95029-6', title: 'Designing Data-Intensive Applications', authorIdx: 8, catIdx: 0, publisher: "O'Reilly Media", total: 4, avail: 2 },
    { isbn: '978-0-321-12521-7', title: 'Domain-Driven Design', authorIdx: 9, catIdx: 0, publisher: 'Addison-Wesley', total: 3, avail: 2 },
    { isbn: '978-0-06-231609-7', title: 'Sapiens: A Brief History of Humankind', authorIdx: 7, catIdx: 5, publisher: 'Harper', total: 6, avail: 5 },
    { isbn: '978-0-385-48001-7', title: 'The Wealth of Nations', authorIdx: 9, catIdx: 6, publisher: 'W. Strahan', total: 4, avail: 4 },
    { isbn: '978-0-13-449416-6', title: 'Clean Architecture: A Craftsman’s Guide', authorIdx: 4, catIdx: 0, publisher: 'Prentice Hall', total: 2, avail: 0 },
  ];

  const books: Book[] = rawBooksData.map((b, i) => ({
    id: `bk_${i + 1}`,
    isbn: b.isbn,
    title: b.title,
    authorId: authors[b.authorIdx]?.id || authors[0].id,
    categoryId: categories[b.catIdx]?.id || categories[0].id,
    publisher: b.publisher,
    totalCopies: b.total,
    availableCopies: b.avail,
    createdAt: now,
    updatedAt: now,
  }));

  // 4. Members
  const membersData = [
    { code: 'M001', name: 'Aarav Sharma', email: 'aarav.sharma@college.edu', phone: '+91 98765 43210', status: 'Active' },
    { code: 'M002', name: 'Diya Patel', email: 'diya.patel@college.edu', phone: '+91 98765 43211', status: 'Active' },
    { code: 'M003', name: 'Rohan Gupta', email: 'rohan.gupta@college.edu', phone: '+91 98765 43212', status: 'Active' },
    { code: 'M004', name: 'Ananya Verma', email: 'ananya.verma@college.edu', phone: '+91 98765 43213', status: 'Active' },
    { code: 'M005', name: 'Kabir Mehta', email: 'kabir.mehta@college.edu', phone: '+91 98765 43214', status: 'Inactive' },
    { code: 'M006', name: 'Ishaan Nair', email: 'ishaan.nair@college.edu', phone: '+91 98765 43215', status: 'Active' },
    { code: 'M007', name: 'Meera Iyer', email: 'meera.iyer@college.edu', phone: '+91 98765 43216', status: 'Active' },
    { code: 'M008', name: 'Aditya Rao', email: 'aditya.rao@college.edu', phone: '+91 98765 43217', status: 'Active' },
    { code: 'M009', name: 'Pooja Reddy', email: 'pooja.reddy@college.edu', phone: '+91 98765 43218', status: 'Active' },
    { code: 'M010', name: 'Siddharth Joshi', email: 'siddharth.joshi@college.edu', phone: '+91 98765 43219', status: 'Active' },
  ];

  const members: Member[] = membersData.map((m, i) => ({
    id: `mem_${i + 1}`,
    memberCode: m.code,
    fullName: m.name,
    email: m.email,
    phone: m.phone,
    membershipType: 'Student',
    status: m.status as 'Active' | 'Inactive',
    createdAt: now,
    updatedAt: now,
  }));

  // 5. Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const librarianUser: User = {
    id: 'usr_librarian_1',
    email: 'librarian@college.edu',
    passwordHash,
    role: 'librarian',
    createdAt: now,
    updatedAt: now,
  };

  const student1User: User = {
    id: 'usr_student_1',
    email: 'aarav.sharma@college.edu',
    passwordHash,
    role: 'student',
    memberId: members[0].id,
    createdAt: now,
    updatedAt: now,
  };
  members[0].userId = student1User.id;

  const student2User: User = {
    id: 'usr_student_2',
    email: 'diya.patel@college.edu',
    passwordHash,
    role: 'student',
    memberId: members[1].id,
    createdAt: now,
    updatedAt: now,
  };
  members[1].userId = student2User.id;

  const users: User[] = [librarianUser, student1User, student2User];

  // 6. Transactions
  const zeroCopyBook = books[books.length - 1];
  const transactions: Transaction[] = [
    {
      id: 'txn_101',
      bookId: zeroCopyBook.id,
      memberId: members[0].id,
      issuedBy: librarianUser.id,
      issueDate: addDays(today, -10),
      dueDate: addDays(today, 4),
      status: 'Issued',
      createdAt: now,
      updatedAt: now,
      bookTitle: zeroCopyBook.title,
      bookIsbn: zeroCopyBook.isbn,
      memberCode: members[0].memberCode,
      memberName: members[0].fullName,
    },
    {
      id: 'txn_102',
      bookId: zeroCopyBook.id,
      memberId: members[1].id,
      issuedBy: librarianUser.id,
      issueDate: addDays(today, -12),
      dueDate: addDays(today, 2),
      status: 'Issued',
      createdAt: now,
      updatedAt: now,
      bookTitle: zeroCopyBook.title,
      bookIsbn: zeroCopyBook.isbn,
      memberCode: members[1].memberCode,
      memberName: members[1].fullName,
    },
    {
      id: 'txn_103',
      bookId: books[0].id,
      memberId: members[1].id,
      issuedBy: librarianUser.id,
      issueDate: addDays(today, -19),
      dueDate: addDays(today, -5),
      status: 'Issued',
      createdAt: now,
      updatedAt: now,
      bookTitle: books[0].title,
      bookIsbn: books[0].isbn,
      memberCode: members[1].memberCode,
      memberName: members[1].fullName,
    },
    {
      id: 'txn_104',
      bookId: books[2].id,
      memberId: members[3].id,
      issuedBy: librarianUser.id,
      issueDate: addDays(today, -17),
      dueDate: addDays(today, -3),
      status: 'Issued',
      createdAt: now,
      updatedAt: now,
      bookTitle: books[2].title,
      bookIsbn: books[2].isbn,
      memberCode: members[3].memberCode,
      memberName: members[3].fullName,
    },
  ];

  const rohanBooks = [books[5], books[6], books[10], books[14], books[15]];
  rohanBooks.forEach((b, idx) => {
    transactions.push({
      id: `txn_rohan_${idx + 1}`,
      bookId: b.id,
      memberId: members[2].id,
      issuedBy: librarianUser.id,
      issueDate: addDays(today, -4),
      dueDate: addDays(today, 10),
      status: 'Issued',
      createdAt: now,
      updatedAt: now,
      bookTitle: b.title,
      bookIsbn: b.isbn,
      memberCode: members[2].memberCode,
      memberName: members[2].fullName,
    });
  });

  const txPast: Transaction = {
    id: 'txn_past_1',
    bookId: books[11].id,
    memberId: members[0].id,
    issuedBy: librarianUser.id,
    issueDate: addDays(today, -30),
    dueDate: addDays(today, -16),
    returnDate: addDays(today, -12),
    status: 'Returned',
    createdAt: now,
    updatedAt: now,
    bookTitle: books[11].title,
    bookIsbn: books[11].isbn,
    memberCode: members[0].memberCode,
    memberName: members[0].fullName,
  };
  transactions.push(txPast);

  // 7. Fines
  const fines: Fine[] = [
    {
      id: 'fine_1',
      transactionId: txPast.id,
      memberId: members[0].id,
      daysLate: 4,
      amount: 20,
      status: 'Unpaid',
      generatedOn: addDays(today, -12),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'fine_2',
      transactionId: 'txn_past_old',
      memberId: members[1].id,
      daysLate: 3,
      amount: 15,
      status: 'Paid',
      generatedOn: addDays(today, -14),
      paidOn: addDays(today, -7),
      collectedBy: librarianUser.id,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await Promise.all([
    db.authors.insertMany(authors.map(a => ({ ...a }))),
    db.categories.insertMany(categories.map(c => ({ ...c }))),
    db.books.insertMany(books.map(b => ({ ...b }))),
    db.members.insertMany(members.map(m => ({ ...m }))),
    db.users.insertMany(users.map(u => ({ ...u }))),
    db.transactions.insertMany(transactions.map(t => ({ ...t }))),
    db.fines.insertMany(fines.map(f => ({ ...f }))),
  ]);

  console.log('✅ MongoDB Atlas seeded successfully with 30 books, 10 members, loans, and demo users:');
  console.log('   Librarian: librarian@college.edu / password123');
  console.log('   Student 1: aarav.sharma@college.edu / password123 (1 active loan, 1 history, 1 unpaid fine ₹20)');
  console.log('   Student 2: diya.patel@college.edu / password123 (2 active loans, 1 overdue, 1 paid fine)');
  console.log('   Student 3 (M003): rohan.gupta@college.edu (5 active loans - borrow limit)');
  console.log('   Member 5 (M005): kabir.mehta@college.edu (Inactive)');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  connectDb()
    .then(() => runSeed())
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch(async err => {
      console.error('Seed failed:', err);
      await closeDb();
      process.exit(1);
    });
}
