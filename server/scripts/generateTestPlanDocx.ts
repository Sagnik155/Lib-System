import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from 'docx';

const NAVY = '1F4E79';
const ACCENT = '2E75B6';
const TEXT = '1E293B';
const MUTED = '475569';
const BORDER_COLOR = 'CBD5E1';
const CODE_BG = 'F1F5F9';
const ROW_ALT = 'F8FAFC';

function partTitle(text: string, pageBreakBefore = false): Paragraph {
  return new Paragraph({
    pageBreakBefore,
    spacing: { before: 280, after: 140 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 30,
        color: NAVY,
        font: 'Calibri',
      }),
    ],
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: ACCENT,
        font: 'Calibri',
      }),
    ],
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [
      new TextRun({
        text,
        bold: true,
        italics: true,
        size: 22,
        color: TEXT,
        font: 'Calibri',
      }),
    ],
  });
}

function bodyPara(text: string, options?: { boldPrefix?: string; italic?: boolean }): Paragraph {
  const runs: TextRun[] = [];
  if (options?.boldPrefix) {
    runs.push(
      new TextRun({
        text: options.boldPrefix,
        bold: true,
        size: 21,
        color: TEXT,
        font: 'Calibri',
      })
    );
  }
  runs.push(
    new TextRun({
      text,
      italics: options?.italic,
      size: 21,
      color: TEXT,
      font: 'Calibri',
    })
  );
  return new Paragraph({
    spacing: { before: 40, after: 100, line: 276 },
    children: runs,
  });
}

function bulletItem(boldPrefix: string, text: string): Paragraph {
  const runs: TextRun[] = [
    new TextRun({ text: '•  ', bold: true, size: 21, color: NAVY, font: 'Calibri' }),
  ];
  if (boldPrefix) {
    runs.push(new TextRun({ text: boldPrefix, bold: true, size: 21, color: TEXT, font: 'Calibri' }));
  }
  runs.push(new TextRun({ text, size: 21, color: TEXT, font: 'Calibri' }));
  return new Paragraph({
    indent: { left: 360, hanging: 180 },
    spacing: { before: 30, after: 70, line: 264 },
    children: runs,
  });
}

function numberedItem(num: number, boldPrefix: string, text: string): Paragraph {
  const runs: TextRun[] = [
    new TextRun({ text: `${num}.  `, bold: true, size: 21, color: NAVY, font: 'Calibri' }),
  ];
  if (boldPrefix) {
    runs.push(new TextRun({ text: boldPrefix, bold: true, size: 21, color: TEXT, font: 'Calibri' }));
  }
  runs.push(new TextRun({ text, size: 21, color: TEXT, font: 'Calibri' }));
  return new Paragraph({
    indent: { left: 360, hanging: 220 },
    spacing: { before: 30, after: 70, line: 264 },
    children: runs,
  });
}

function styledTable(headers: string[], rows: string[][], colWidths?: number[]): Table {
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h, idx) =>
        new TableCell({
          width: colWidths ? { size: colWidths[idx], type: WidthType.PERCENTAGE } : undefined,
          shading: { type: ShadingType.CLEAR, fill: NAVY },
          borders: cellBorders,
          margins: { top: 100, bottom: 100, left: 130, right: 130 },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  size: 20,
                  color: 'FFFFFF',
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        })
    ),
  });

  const bodyRows = rows.map(
    (r, rowIdx) =>
      new TableRow({
        children: r.map(
          (val, idx) =>
            new TableCell({
              width: colWidths ? { size: colWidths[idx], type: WidthType.PERCENTAGE } : undefined,
              shading:
                rowIdx % 2 === 1
                  ? { type: ShadingType.CLEAR, fill: ROW_ALT }
                  : undefined,
              borders: cellBorders,
              margins: { top: 90, bottom: 90, left: 130, right: 130 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0, line: 240 },
                  children: [
                    new TextRun({
                      text: val,
                      bold: idx === 0,
                      size: 19,
                      color: TEXT,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

function codeBlock(lines: string[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: CODE_BG },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
              left: { style: BorderStyle.SINGLE, size: 16, color: NAVY },
              right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
            },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: lines.map(
              line =>
                new Paragraph({
                  spacing: { before: 15, after: 15 },
                  children: [
                    new TextRun({
                      text: line,
                      size: 19,
                      color: '0F172A',
                      font: 'Consolas',
                    }),
                  ],
                })
            ),
          }),
        ],
      }),
    ],
  });
}

async function generate() {
  const doc = new Document({
    creator: 'Library Management System Team (CSE-AI, IEM)',
    title: 'Software Test Strategy and Test Plan — Library Management System',
    description:
      'Complete Software Test Strategy and Test Plan aligned with the Library Management System MERN + TypeScript + Vite PWA + MongoDB Atlas project.',
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          // Document Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 80 },
            children: [
              new TextRun({
                text: 'Software Test Strategy and Test Plan',
                bold: true,
                size: 38,
                color: NAVY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({
                text: 'Library Management System',
                italics: true,
                size: 26,
                color: ACCENT,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 240 },
            children: [
              new TextRun({
                text: 'Institute of Engineering and Management (IEM)  |  Department of CSE(AI)  |  Software Engineering & Project Management Lab',
                size: 19,
                color: MUTED,
                font: 'Calibri',
              }),
            ],
          }),

          // PART A
          partTitle('PART A — SOFTWARE TEST STRATEGY DOCUMENT'),

          sectionHeading('A.1 Introduction and Objectives'),
          bodyPara(
            'This document defines the testing strategy and detailed test plan for the Library Management System (built on the MERN + TypeScript + Vite PWA stack with MongoDB Atlas). The main objective is to ensure that the system enforces all library business rules accurately, protects inventory and fine records against concurrency or deletion errors, enforces role-based access control, and delivers a reliable experience for both librarians and students.'
          ),
          bodyPara(
            'Testing helps detect defects early, validate server-side business rules, verify multi-document MongoDB transactions, and ensure every in-scope module performs as expected prior to final release and demonstration.'
          ),

          sectionHeading('A.2 Scope'),
          bodyPara('The testing strategy covers the following implemented modules:'),
          numberedItem(
            1,
            'Authentication, Student Account Activation & Role-Based Access Control (RBAC): ',
            'Librarian login, student account activation against librarian-registered emails (/api/auth/activate), JWT verification, and role-based route protection.'
          ),
          numberedItem(
            2,
            'Book, Author, and Category Management: ',
            'CRUD operations, duplicate ISBN prevention (409 DUPLICATE_ISBN), stock validation (totalCopies >= issuedCount), and referential integrity delete guards.'
          ),
          numberedItem(
            3,
            'Member Management: ',
            'Librarian-managed member registration, profile and status updates (Active / Inactive), membership types, and deletion guards for active borrowers.'
          ),
          numberedItem(
            4,
            'Book Search, Availability & Offline PWA Catalogue Search: ',
            'Multi-filter search by title, author, category, or ISBN; earliest expected return date for zero-stock titles; and read-only offline catalogue search using Service Worker + IndexedDB.'
          ),
          numberedItem(
            5,
            'Book Issuing and Returning: ',
            'Eligibility validation, automatic 14-day India Standard Time (IST) due-date calculation, and atomic multi-document MongoDB ACID transactions for stock and loan updates.'
          ),
          numberedItem(
            6,
            'Fine Calculation and Payment Management: ',
            'Automatic ₹5/day overdue fine calculation on return, atomic full fine settlement (Unpaid → Paid), and prevention of double payments.'
          ),
          numberedItem(
            7,
            'Student Account (My Account): ',
            'Viewing active loans with overdue highlights, borrowing history, and personal fine status scoped strictly to the authenticated student JWT.'
          ),
          numberedItem(
            8,
            'Dashboard and Overdue Reports: ',
            'Real-time library KPIs, clickable KPI drill-down filters, overdue history, recent check-outs, and top books.'
          ),
          numberedItem(
            9,
            'Bulk Book Imports and Printable/PDF Slips: ',
            'Bulk .xlsx/.csv import (up to 1,000 rows per batch with duplicate skipping and auto-creation of missing authors/categories) plus printable & downloadable A5 PDF receipts for Issue, Return, and Fine Payment slips.'
          ),

          sectionHeading('A.3 Levels of Testing'),
          subHeading('A.3.1 Unit Testing'),
          bodyPara(
            'Individual functions, middleware, and service methods are tested in isolation to verify business logic without external side effects. Examples include IST date arithmetic and fine calculation (diffInDays, addDays), JWT authentication and RBAC middleware, stock validation, and referential integrity delete guards. Automated unit tests are written and run by the Developer via npm test (tsx --test server/tests/libraryRules.test.ts).'
          ),
          subHeading('A.3.2 Integration Testing'),
          bodyPara(
            'Integration testing verifies that modules communicate and exchange data accurately across architectural layers. A bottom-up approach is followed: (1) Mongoose schemas/models and db.ts atomic/transaction helpers, (2) backend domain services, (3) Express API routes with Helmet, CORS, rate limiting, and JWT/RBAC middleware, and (4) React + Vite PWA frontend integration with live MongoDB Atlas (library_db). Isolated in-memory collection stubs are used for deterministic automated tests, followed by full integration verification against MongoDB Atlas.'
          ),
          subHeading('A.3.3 System Testing'),
          bodyPara('The complete application is tested as a unified system against all project requirements, including:'),
          numberedItem(1, '', 'Verifying end-to-end book issue and return workflows, including printable and PDF slips.'),
          numberedItem(2, '', 'Verifying overdue fine calculation (₹5/day in IST), full fine settlement, and receipt reprinting.'),
          numberedItem(3, '', 'Testing authentication, student account activation, role-based access control (401/403), and student data isolation (/api/me/*).'),
          numberedItem(4, '', 'Verifying referential integrity delete guards, bulk Excel/CSV import, and offline PWA catalogue search.'),
          numberedItem(5, '', 'Checking API response times, security headers (Helmet, CORS, rate limits), and stability under concurrent operations.'),
          subHeading('A.3.4 Acceptance Testing'),
          bodyPara(
            'Acceptance testing is performed by the project team with feedback from representative users. One member acting as a Librarian verifies catalogue management, member registration, circulation desks, fine collection, slips, and dashboard reports; another member acting as a Student verifies account activation, catalogue search, offline mode, and My Account screens.'
          ),

          sectionHeading('A.4 Testing Techniques Used for Test-Case Design'),
          subHeading('A.4.1 Black-Box Techniques'),
          bulletItem('Equivalence Class Partitioning: ', 'Divides inputs into valid and invalid groups such as available copies (>= 1) vs. unavailable (0) or negative stock (< 0), and unique vs. duplicate ISBNs.'),
          bulletItem('Boundary Value Analysis: ', 'Tests exact thresholds including minimum available copies (0 vs. 1), borrowing limit (4 vs. 5 active books), 14-day due period (day 14 = ₹0 vs. day 15 = ₹5), and bulk import limit (1,000 rows).'),
          bulletItem('Decision Table Testing: ', 'Verifies book issuance across combinations of availability, active membership, unpaid fines, and active borrow count.'),
          bulletItem('State Transition Testing: ', 'Verifies lifecycle state transitions and duplicate-action blocking: Transaction (Issued → Returned; blocks ALREADY_RETURNED), Fine (Unpaid → Paid; blocks ALREADY_PAID), and Member (Active ↔ Inactive).'),
          subHeading('A.4.2 White-Box Techniques'),
          bulletItem('Statement Coverage: ', 'Ensures all critical statements in core service methods (issueBook, returnBook, payFine, deleteBook, deleteMember) are executed.'),
          bulletItem('Branch Coverage: ', 'Checks both true and false outcomes of every eligibility, stock, overdue, delete-guard, and RBAC condition.'),
          bulletItem('Path Coverage / Basis Path Testing: ', 'Tests every independent execution path through core eligibility logic using Control Flow Graph (CFG) cyclomatic complexity analysis.'),

          sectionHeading('A.5 Testing Types'),
          bulletItem('Functional Testing: ', 'Checks login, student activation, catalogue CRUD, bulk Excel/CSV import, member management, issuing, returning, searching, fine settlement, printable/PDF slips, and dashboard drill-downs.'),
          bulletItem('Regression Testing: ', 'Re-runs npm test (automated suite), npm run lint (tsc --noEmit), and npm run build after code updates or bug fixes.'),
          bulletItem('Performance Testing: ', 'Checks response times for indexed MongoDB Atlas searches, dashboard aggregations, and 1,000-row bulk catalogue imports.'),
          bulletItem('Security Testing: ', 'Verifies bcrypt password hashing (10 rounds), deny-by-default JWT auth (401), librarian RBAC (403), student data isolation (/api/me/*), Helmet headers, CORS, and API/auth rate limiting.'),
          bulletItem('Usability Testing: ', 'Confirms clear circulation workflows, inline validation errors, clean A5 printable/PDF slips, and responsive PWA behavior for librarians and students.'),

          sectionHeading('A.6 Debugging Approach'),
          bodyPara(
            'When a defect is identified, the development team inspects the relevant TypeScript source files, server logs, structured HTTP JSON error responses ({ error: { code, message, details } }), and MongoDB Atlas collections (library_db).'
          ),
          bulletItem('Brute Force: ', 'Inspecting Express/Mongoose logs, /api/health diagnostics, browser DevTools network responses, and structured AppError codes.'),
          bulletItem('Backtracking: ', 'Tracing execution backwards from React page → ApiClient → Express route → backend service → Mongoose database layer.'),
          bulletItem('Cause Elimination: ', 'Testing isolated hypotheses via automated tests and API requests to pinpoint the root cause.'),
          bodyPara(
            'After fixing any defect, all related automated tests (npm test), TypeScript checks (npm run lint), and end-to-end verification steps are re-executed to confirm resolution.'
          ),

          sectionHeading('A.7 Entry and Exit Criteria'),
          styledTable(
            ['Testing Level', 'Entry Criteria', 'Exit Criteria'],
            [
              ['Unit Testing', 'Individual service method, helper, or middleware is developed and compiles cleanly.', 'All planned unit test cases in npm test pass with zero failures.'],
              ['Integration Testing', 'Unit-tested models, services, routes, and database layer are ready.', 'Services, Mongoose models, API routes, and MongoDB Atlas communicate without errors.'],
              ['System Testing', 'All major frontend and backend modules are integrated and npm run build succeeds.', 'All end-to-end test cases (S01–S10) pass and all critical defects are resolved.'],
              ['Acceptance Testing', 'System testing is complete with zero open critical defects.', 'Librarian and Student workflows are verified and user/team approval is obtained.'],
            ],
            [22, 39, 39]
          ),

          sectionHeading('A.8 Roles and Responsibilities'),
          styledTable(
            ['Role', 'Responsibility'],
            [
              ['Developer', 'Implements frontend and backend modules, writes and executes automated unit tests (npm test), and resolves defects.'],
              ['Test Engineer', 'Designs black-box and white-box test cases, executes API/UI test suites, and documents defect reports.'],
              ['Test Lead', 'Coordinates testing phases, monitors entry/exit criteria, reviews coverage, and compiles the Test Summary Report.'],
              ['Client / End-User Rep.', 'Evaluates Librarian and Student workflows and provides feedback on completeness and usability of functionality.'],
            ],
            [28, 72]
          ),

          sectionHeading('A.9 Test Tools and Environment'),
          bulletItem('Frontend: ', 'React 19, TypeScript, Vite 8, Tailwind CSS v4, vite-plugin-pwa (Workbox Service Worker + IndexedDB).'),
          bulletItem('Backend: ', 'Node.js, Express.js, TypeScript (tsx), Helmet, CORS, express-rate-limit, jsonwebtoken, bcryptjs.'),
          bulletItem('Database: ', 'MongoDB Atlas (library_db, 7 collections: authors, categories, books, members, users, transactions, fines) via Mongoose over TLS with multi-document ACID transactions.'),
          bulletItem('Automated Testing: ', 'Node.js built-in test runner (node:test + node:assert/strict) run via npm test (server/tests/libraryRules.test.ts).'),
          bulletItem('Static Analysis & Build: ', 'TypeScript compiler (npm run lint → tsc --noEmit) and Vite production bundler (npm run build).'),
          bulletItem('API Testing & Source Control: ', 'Postman, curl / fetch scripts, Git, and GitHub.'),
          bulletItem('Testing Environment: ', 'Local server (http://localhost:3000) and Cloud Run preview connected to MongoDB Atlas populated with seeded demo records (npm run seed / npm run migrate-json).'),

          sectionHeading('A.10 Risk-Based Considerations'),
          bulletItem('Incorrect Inventory Updates / Race Conditions: ', 'Concurrent issue/return requests could corrupt availableCopies. Mitigated via multi-document MongoDB ACID transactions (db.withTransaction) and atomic conditional findOneAndUpdate guards.'),
          bulletItem('Referential Integrity Violations: ', 'MongoDB does not natively enforce foreign keys. Mitigated via service-layer delete guards (BOOK_HAS_ACTIVE_LOANS, ACTIVE_TRANSACTIONS_EXIST, AUTHOR_HAS_BOOKS, CATEGORY_HAS_BOOKS, COPIES_LESS_THAN_ISSUED) verified by automated tests.'),
          bulletItem('Incorrect Fine Calculation or Double Settlement: ', 'Timezone differences or repeat clicks could miscalculate overdue days or double-charge fines. Mitigated via Asia/Kolkata calendar-day math and atomic Unpaid → Paid settlement.'),
          bulletItem('Unauthorized Access & Data Leakage: ', 'Students attempting to invoke admin endpoints or view other students’ records. Mitigated via deny-by-default JWT auth, librarian roleMiddleware, JWT-scoped /api/me/* routes, Helmet, CORS, and rate limiting.'),

          // PART B
          partTitle('PART B — SOFTWARE TEST PLAN', true),

          sectionHeading('B.1 Test Plan Identifier'),
          bodyPara('TP-LMS-Issue-01', { italic: true }),

          sectionHeading('B.2 Objective'),
          bodyPara(
            'To verify that the Book Issue and Return module—together with its linked Fine Settlement, Referential Integrity, and RBAC protections—accurately handles book availability, member eligibility, borrowing limits, 14-day IST due dates, atomic MongoDB inventory updates, overdue fine calculations, and slip generation.'
          ),

          sectionHeading('B.3 Features to be Tested'),
          bulletItem('', 'Checking book existence and shelf availability (availableCopies > 0) before issuing.'),
          bulletItem('', 'Validating member existence, Active status, zero unpaid fines, and active borrow limit (< 5 books).'),
          bulletItem('', 'Automatic 14-day due-date calculation in India Standard Time (Asia/Kolkata).'),
          bulletItem('', 'Atomic multi-document MongoDB stock and transaction updates on issue and return.'),
          bulletItem('', 'Recording returns, blocking double returns, and automatically calculating overdue fines (₹5/day).'),
          bulletItem('', 'Recording full fine payments, blocking double payments, and generating printable/PDF slips.'),
          bulletItem('', 'Enforcing referential integrity delete guards and librarian-only RBAC on circulation endpoints.'),

          sectionHeading('B.4 Features Not to be Tested (Out of Scope)'),
          bulletItem('', 'Book reservations and loan renewals.'),
          bulletItem('', 'Partial fine payments and online payment gateways (only full counter fine settlement is supported).'),
          bulletItem('', 'Automated Email or SMS due-date notifications.'),
          bulletItem('', 'Offline book issue, return, or fine payment (offline PWA mode is read-only catalogue search only).'),

          sectionHeading('B.5 Business Rules / Feature Under Test'),
          bodyPara('A book can be issued only when all four conditions are satisfied:', { italic: true }),
          numberedItem(1, '', 'The book exists and at least one copy is available (availableCopies > 0; else NO_COPIES).'),
          numberedItem(2, '', 'The member exists and membership status is Active (else MEMBER_INACTIVE).'),
          numberedItem(3, '', 'The member has zero Unpaid fines (else UNPAID_FINE).'),
          numberedItem(4, '', 'The member currently holds fewer than 5 issued books (else LIMIT_REACHED).'),
          bodyPara('Additional Rules:', { italic: true }),
          bulletItem('', 'Multiple failures are aggregated and returned together under HTTP 400 ISSUE_BLOCKED (failureReasons).'),
          bulletItem('', 'The borrowing period is automatically set to 14 calendar days (LOAN_DAYS = 14, IST).'),
          bulletItem('', 'A fine of ₹5 per overdue day (FINE_RATE_PER_DAY = 5) is generated automatically when returnDate > dueDate.'),
          bulletItem('', 'Book availability is updated atomically inside a MongoDB ACID transaction on both issue and return.'),
          bulletItem('', 'Only authenticated users with role librarian can issue books, record returns, and collect fines (403 FORBIDDEN for students).'),

          sectionHeading('B.6 Black-Box Test Design — Equivalence Partitioning & Boundary Value Analysis'),
          bodyPara('Available book copies (availableCopies)', { boldPrefix: 'Input under test: ' }),
          styledTable(
            ['Class Type', 'Description', 'Representative Value(s)'],
            [
              ['Valid equivalence class', 'At least one copy is available on shelf (>= 1)', '5'],
              ['Invalid equivalence class', 'Zero copies available on shelf (0)', '0'],
              ['Invalid input', 'Negative copy count (< 0, blocked by schema/validation)', '-1'],
              ['Boundary — valid side', 'Minimum available copy allowing issue', '1'],
              ['Boundary — invalid side', 'Maximum unavailable count blocking issue', '0'],
            ],
            [28, 52, 20]
          ),
          new Paragraph({ spacing: { before: 120, after: 40 }, children: [] }),
          styledTable(
            ['TC ID', 'Description', 'Input (Available Copies)', 'Expected Output', 'Actual Output', 'Pass / Fail'],
            [
              ['TC-B01', 'Multiple copies available', '5', 'Issue allowed (HTTP 201)', 'Issue allowed (HTTP 201)', 'Pass'],
              ['TC-B02', 'Minimum available copy (valid boundary)', '1', 'Issue allowed; stock becomes 0', 'Issue allowed; stock becomes 0', 'Pass'],
              ['TC-B03', 'No copies present (invalid boundary)', '0', 'Rejected (400 ISSUE_BLOCKED, NO_COPIES)', 'Rejected (400 ISSUE_BLOCKED, NO_COPIES)', 'Pass'],
              ['TC-B04', 'Invalid negative stock input', '-1', 'Validation error (400 VALIDATION_ERROR)', 'Validation error (400 VALIDATION_ERROR)', 'Pass'],
              ['TC-B05', 'Stock decrement after successful issue', '5', 'availableCopies decreases atomically by 1 (to 4)', 'availableCopies decreased to 4', 'Pass'],
            ],
            [11, 22, 13, 22, 22, 10]
          ),

          sectionHeading('B.7 Black-Box Test Design — Decision Table Testing'),
          bodyPara('C1 = Is the book available? (availableCopies > 0)  |  C2 = Is the member active? (status === "Active")  |  C3 = Is the member eligible? (0 unpaid fines AND < 5 active books)', { boldPrefix: 'Conditions: ' }),
          bodyPara('Allow or Reject book issuing.', { boldPrefix: 'Action: ' }),
          styledTable(
            ['Rule', 'C1 (Available)', 'C2 (Active)', 'C3 (Eligible)', 'Action'],
            [
              ['R1', 'Yes', 'Yes', 'Yes', 'Allow'],
              ['R2', 'Yes', 'Yes', 'No', 'Reject (UNPAID_FINE / LIMIT_REACHED)'],
              ['R3', 'Yes', 'No', 'Yes', 'Reject (MEMBER_INACTIVE)'],
              ['R4', 'Yes', 'No', 'No', 'Reject (MEMBER_INACTIVE + eligibility reason)'],
              ['R5', 'No', 'Yes', 'Yes', 'Reject (NO_COPIES)'],
              ['R6', 'No', 'Yes', 'No', 'Reject (NO_COPIES + eligibility reason)'],
              ['R7', 'No', 'No', 'Yes', 'Reject (NO_COPIES, MEMBER_INACTIVE)'],
              ['R8', 'No', 'No', 'No', 'Reject (NO_COPIES, MEMBER_INACTIVE + eligibility reason)'],
            ],
            [10, 16, 15, 16, 43]
          ),
          new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: 'Decision Table Test Cases (D01 – D05):', bold: true, size: 20, color: NAVY, font: 'Calibri' })] }),
          styledTable(
            ['TC ID', 'Rule', 'C1', 'C2', 'C3', 'Expected Result', 'Status'],
            [
              ['D01', 'R1', 'Yes', 'Yes', 'Yes', 'Allowed — Book issued (HTTP 201), due date +14 days, stock -1', 'Pass'],
              ['D02', 'R2', 'Yes', 'Yes', 'No', 'Rejected (400 ISSUE_BLOCKED: UNPAID_FINE or LIMIT_REACHED)', 'Pass'],
              ['D03', 'R3', 'Yes', 'No', 'Yes', 'Rejected (400 ISSUE_BLOCKED: MEMBER_INACTIVE)', 'Pass'],
              ['D04', 'R5', 'No', 'Yes', 'Yes', 'Rejected (400 ISSUE_BLOCKED: NO_COPIES)', 'Pass'],
              ['D05', 'R8', 'No', 'No', 'No', 'Rejected (400 ISSUE_BLOCKED: all failing reasons returned together)', 'Pass'],
            ],
            [10, 9, 8, 8, 8, 47, 10]
          ),

          sectionHeading('B.8 White-Box Test Design — Basis Path Testing'),
          bodyPara(
            'canIssueBook(availableCopies, memberActive, memberEligible) — Core eligibility decision logic extracted from IssueReturnService.issueBook() (server/src/services/issueReturnService.ts).',
            { boldPrefix: 'Module under test: ' }
          ),
          codeBlock([
            'function canIssueBook(availableCopies: number, memberActive: boolean, memberEligible: boolean): boolean {',
            '  let result = false;              // Node 1',
            '  if (availableCopies > 0) {       // Node 2 (Decision 1)',
            '    if (memberActive) {            // Node 3 (Decision 2)',
            '      if (memberEligible) {        // Node 4 (Decision 3)',
            '        result = true;             // Node 5',
            '      }',
            '    }',
            '  }',
            '  return result;                   // Node 6',
            '}',
          ]),
          new Paragraph({ spacing: { before: 100, after: 40 }, children: [] }),
          bulletItem('Control Flow Graph Nodes (N = 6): ', '{1, 2, 3, 4, 5, 6}'),
          bulletItem('Control Flow Graph Edges (E = 8): ', '(1→2), (2→3), (2→6), (3→4), (3→6), (4→5), (4→6), (5→6)'),
          bulletItem('Cyclomatic Complexity V(G): ', 'E − N + 2 = 8 − 6 + 2 = 4  (equivalently: Decision Nodes + 1 = 3 + 1 = 4)'),
          bulletItem('Independent Basis Paths to Cover: ', '4 (P1, P2, P3, P4)'),
          styledTable(
            ['Path #', 'Path Description', 'Input Values (availableCopies, memberActive, memberEligible)', 'Expected Result'],
            [
              ['P1', '1 → 2 → 6', '0, true, true', 'false'],
              ['P2', '1 → 2 → 3 → 6', '2, false, true', 'false'],
              ['P3', '1 → 2 → 3 → 4 → 6', '2, true, false', 'false'],
              ['P4', '1 → 2 → 3 → 4 → 5 → 6', '2, true, true', 'true'],
            ],
            [12, 26, 44, 18]
          ),

          sectionHeading('B.9 Integration Test Cases'),
          bodyPara('Bottom-up', { boldPrefix: 'Integration strategy: ' }),
          numberedItem(1, 'Drivers: ', 'Automated Node test runner (npm test → server/tests/libraryRules.test.ts), Postman collections, and HTTP API verification scripts.'),
          numberedItem(2, 'Stubs: ', 'Lightweight in-memory MongoDB collection stubs with transactional rollback simulation during isolated automated service tests.'),
          numberedItem(3, 'Live Database Integration: ', 'MongoDB Atlas database (library_db, 7 collections via Mongoose over TLS) used during full API and end-to-end integration verification.'),
          styledTable(
            ['TC ID', 'Step', 'Description', 'Expected Result', 'Status'],
            [
              ['I01', 'Step 1', 'Integrate BookModel, MemberModel, AuthorModel, and CategoryModel with CatalogueService and IssueReturnService.', 'Accurate records are retrieved and referential integrity delete guards block unsafe deletions.', 'Pass'],
              ['I02', 'Step 2', 'Integrate IssueReturnService and FineService with MongoDB Atlas via Mongoose sessions (db.withTransaction).', 'Issue/return records, stock updates, and overdue fines commit atomically or roll back together.', 'Pass'],
              ['I03', 'Step 3', 'Integrate Express /api/* routes with Helmet, CORS, rate limiting, JWT/RBAC middleware, and services.', 'Valid calls return 200/201 JSON; unauthorized or invalid calls return structured 400/401/403/409 JSON.', 'Pass'],
              ['I04', 'Step 4', 'Integrate React + Vite PWA frontend (ApiClient, IndexedDB cache, SlipModal) with backend APIs.', 'Issue, return, fine payment, slips, dashboard KPIs, and offline search work seamlessly in browser.', 'Pass'],
              ['I05', 'Step 5', 'Execute complete Issue → Overdue Return → Fine Payment → Slip Print/PDF workflow.', 'Transaction statuses, 14-day IST due dates, ₹5/day fines, receipts, and inventory remain consistent in Atlas.', 'Pass'],
            ],
            [9, 10, 36, 36, 9]
          ),

          sectionHeading('B.10 System Test Cases (End-to-End, Black-Box)'),
          styledTable(
            ['TC ID', 'Scenario', 'Expected Result', 'Status'],
            [
              ['S01', 'Issue an available book to an active, eligible student (0 unpaid fines, < 5 books).', 'Book is issued (HTTP 201), due date is +14 days (IST), availableCopies decreases by 1, and Issue Slip opens for Print/PDF.', 'Pass'],
              ['S02', 'Attempt to issue a book with 0 available copies.', 'System rejects request (400 ISSUE_BLOCKED, NO_COPIES) and displays clear feedback.', 'Pass'],
              ['S03', 'Attempt to issue a book to an Inactive member.', 'System rejects request (400 ISSUE_BLOCKED, MEMBER_INACTIVE) and blocks issuance.', 'Pass'],
              ['S04', 'Attempt to issue a book when member holds 5 active books or has an unpaid fine.', 'System rejects request (400 ISSUE_BLOCKED, LIMIT_REACHED / UNPAID_FINE) showing all blocking reasons.', 'Pass'],
              ['S05', 'Return an issued book on or before its due date.', 'Return is recorded (status: Returned), availableCopies increases by 1, no fine is created, and Return Slip opens.', 'Pass'],
              ['S06', 'Return an issued book after its due date (e.g., 4 days late).', 'Return is recorded, stock increases by 1, and an Unpaid fine of ₹20 (4 × ₹5/day) is generated automatically.', 'Pass'],
              ['S07', 'Record full payment of an unpaid fine by a librarian.', 'Fine transitions atomically from Unpaid → Paid, double payment is blocked (ALREADY_PAID), and Payment Receipt opens (with Reprint).', 'Pass'],
              ['S08', 'Attempt to access librarian-only routes using a student JWT or no token.', 'System denies access with 401 UNAUTHORIZED or 403 FORBIDDEN; students can only access /api/me/books and /api/me/fines.', 'Pass'],
              ['S09', 'Attempt to delete an issued book, an active borrower, or a referenced author/category.', 'System blocks deletion (BOOK_HAS_ACTIVE_LOANS, ACTIVE_TRANSACTIONS_EXIST, AUTHOR_HAS_BOOKS, CATEGORY_HAS_BOOKS).', 'Pass'],
              ['S10', 'Disconnect network after loading the catalogue and search books on Catalogue page.', 'Service Worker + IndexedDB fallback serves cached catalogue in read-only Offline Mode with an amber offline banner.', 'Pass'],
            ],
            [9, 36, 46, 9]
          ),

          sectionHeading('B.11 Test Deliverables'),
          numberedItem(1, 'Software Test Strategy and Test Plan: ', 'Defines testing scope, strategy, techniques, risks, and test cases (Software_Test_Strategy_and_Test_Plan_LMS.docx & TEST_STRATEGY_AND_PLAN.md).'),
          numberedItem(2, 'Automated Test Suite: ', 'Executable test file (server/tests/libraryRules.test.ts via npm test) covering referential integrity, transactional issue/return/fine rules, and JWT/RBAC enforcement.'),
          numberedItem(3, 'Test Execution Results: ', 'Pass/fail output from npm test (9/9 passing), npm run lint (tsc --noEmit), npm run build, and live MongoDB Atlas smoke verification.'),
          numberedItem(4, 'Defect Reports: ', 'Documents discovered defects, severity, reproduction steps, root cause, and resolution status.'),
          numberedItem(5, 'Test Summary Report: ', 'Summarizes test coverage, pass rates, resolved defects, and overall release readiness.'),

          sectionHeading('B.12 Suspension and Resumption Criteria'),
          subHeading('Test Suspension Criteria'),
          bulletItem('', 'Critical defects prevent core workflows (authentication, circulation, or catalogue loading) from operating.'),
          bulletItem('', 'The Express/Vite server crashes or becomes unreachable on port 3000.'),
          bulletItem('', 'Book issue or return transactions produce inconsistent availableCopies inventory counts.'),
          bulletItem('', 'MongoDB Atlas connectivity (MONGODB_URI / Network Access / TLS) fails during execution.'),
          bulletItem('', 'TypeScript linting (npm run lint) or production build (npm run build) fails.'),
          subHeading('Test Resumption Criteria'),
          bulletItem('', 'All identified critical defects have been resolved and verified.'),
          bulletItem('', 'npm run lint, npm run build, and npm test pass with zero errors.'),
          bulletItem('', '/api/health confirms live MongoDB Atlas via Mongoose (library_db) connectivity.'),
          bulletItem('', 'The test environment is stable and ready for regression re-execution.'),

          sectionHeading('B.13 Approval'),
          styledTable(
            ['Name', 'Role', 'Signature', 'Date'],
            [
              ['Sagnik Sinha (CSE(AI), Roll No - 18)', 'Developer / Test Lead', '', ''],
              ['Soham Bhowmick (CSE(AI), Roll No - 25)', 'Developer / Test Engineer', '', ''],
              ['Satwik Biswas (CSE(AI), Roll No - 20)', 'Test Engineer', '', ''],
              ['Soumit Manna (CSE(AI), Roll No - 21)', 'Client / End-User Rep.', '', ''],
            ],
            [38, 28, 20, 14]
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve(process.cwd(), 'Software_Test_Strategy_and_Test_Plan_LMS.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Generated Word document: ${outPath} (${buffer.length} bytes)`);
}

generate().catch(err => {
  console.error('Failed to generate DOCX:', err);
  process.exit(1);
});
