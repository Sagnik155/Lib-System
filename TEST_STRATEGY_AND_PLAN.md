# Software Test Strategy and Test Plan
**Project:** Library Management System  
**Department:** CSE(AI) — Software Engineering and Project Management Lab  
**Institution:** Institute of Engineering and Management (IEM)

---

# PART A — SOFTWARE TEST STRATEGY DOCUMENT

## A.1 Introduction and Objectives
This document defines the testing strategy and detailed test plan for the **Library Management System** (built on the MERN + TypeScript + Vite PWA stack with MongoDB Atlas). The main objective is to verify that the system enforces all library business rules accurately, protects inventory and financial records against concurrency or deletion errors, maintains role-based access control, and delivers a reliable experience for both librarians and students.

Testing helps detect defects early, validate server-side business rules, verify multi-document database transactions, and ensure every in-scope module performs as expected prior to release and demonstration.

---

## A.2 Scope
The testing strategy covers the following implemented modules:

1. **Authentication, Student Account Activation & Role-Based Access Control (RBAC):** Librarian login, student account activation against librarian-registered emails (`/api/auth/activate`), JWT token verification, and role-based route protection.
2. **Book, Author, and Category Management:** CRUD operations, duplicate ISBN prevention (`409 DUPLICATE_ISBN`), stock validation (`totalCopies >= issuedCount`), and referential integrity delete guards.
3. **Member Management:** Librarian-managed member registration, profile/status updates (`Active` / `Inactive`), membership types, and deletion guards for members with active loans.
4. **Book Search, Availability & Offline PWA Catalogue Search:** Multi-filter search by title, author, category, or ISBN; earliest expected return date for zero-stock titles; and read-only offline catalogue search using Service Worker + IndexedDB.
5. **Book Issuing and Returning:** Eligibility validation, automatic 14-day India Standard Time (IST) due-date calculation, and atomic multi-document MongoDB ACID transactions for stock and loan updates.
6. **Fine Calculation and Payment Management:** Automatic `₹5/day` overdue fine calculation on return, atomic full fine settlement (`Unpaid` → `Paid`), and prevention of double payments.
7. **Student Account (`My Account`):** Viewing active loans with overdue highlights, borrowing history, and personal fine status (strictly scoped to the authenticated student's JWT `memberId`).
8. **Dashboard and Overdue Reports:** Real-time library KPIs, clickable KPI drill-down filters, overdue history, recent check-outs, and top books.
9. **Bulk Book Imports and Printable/PDF Slips:** Bulk `.xlsx`/`.csv` import (up to 1,000 rows per batch with duplicate skipping and auto-creation of missing authors/categories) plus printable & downloadable A5 PDF receipts for Issue, Return, and Fine Payment slips (including receipt reprinting).

---

## A.3 Levels of Testing

### A.3.1 Unit Testing
Individual functions, middleware, and service methods are tested in isolation to verify business logic without external side effects.  
**Examples:** IST date arithmetic and overdue fine math (`diffInDays`, `addDays`), JWT authentication (`authMiddleware`) and role enforcement (`roleMiddleware`), input/stock validation, and referential integrity delete guards.  
Unit tests are written and executed by the Developer during development using Node.js's built-in test runner (`npm test` → `tsx --test server/tests/libraryRules.test.ts`).

### A.3.2 Integration Testing
Integration testing verifies that modules interact and exchange data accurately across layer boundaries.  
A **bottom-up approach** is followed:
1. Mongoose schemas/models (`BookModel`, `MemberModel`, `TransactionModel`, `FineModel`, `AuthorModel`, `CategoryModel`, `UserModel`) and `db.ts` transaction/atomic helpers.
2. Backend domain services (`CatalogueService`, `MemberService`, `IssueReturnService`, `FineService`, `SearchService`, `DashboardService`, `AuthService`).
3. Express API routes, security middleware (`helmet`, `cors`, `express-rate-limit`, `authMiddleware`, `roleMiddleware`), and centralized error handler (`errorHandler`).
4. React + Vite PWA frontend integration with live REST APIs and MongoDB Atlas (`library_db`).

Isolated in-memory collection stubs are used for deterministic automated service tests, followed by live integration testing against MongoDB Atlas.

### A.3.3 System Testing
The complete end-to-end application is tested as a unified system against all functional and non-functional requirements. This includes:
1. Verifying complete book issue and return workflows (including slip printing and PDF generation).
2. Verifying overdue fine calculation (`₹5/day` in IST), full fine settlement, and receipt reprinting.
3. Testing authentication, student activation, role-based access control (`401`/`403`), and student data isolation (`/api/me/*`).
4. Verifying referential integrity delete protections, bulk Excel/CSV imports, and offline PWA catalogue search.
5. Checking API response times, security headers (`helmet`, `cors`, rate limits), and stability under concurrent operations.

### A.3.4 Acceptance Testing
Acceptance testing is performed by the project team with feedback from representative end users. One team member acting as a **Librarian** verifies catalogue management, member registration, circulation desks, fine collection, slips, and dashboard reports; another member acting as a **Student** verifies account activation, catalogue search, offline search, and personal `My Account` views, recommending refinements based on usability and accuracy.

---

## A.4 Testing Techniques Used for Test-Case Design

### A.4.1 Black-Box Techniques
- **Equivalence Class Partitioning:** Divides inputs into valid and invalid partitions, such as available copies (`>= 1`) vs. unavailable (`0`) or negative stock (`< 0`), and valid vs. duplicate ISBNs.
- **Boundary Value Analysis:** Tests exact boundary thresholds including minimum available copies (`0` vs. `1`), maximum borrowing limit (`4` vs. `5` active books), `14`-day loan due date (day `14` = `₹0` fine, day `15` = `₹5` fine), and bulk import row limit (`1,000` rows).
- **Decision Table Testing:** Evaluates combinations of book availability, member status, unpaid fines, and active borrow count to determine whether book issuance is allowed or blocked with exact `failureReasons`.
- **State Transition Testing:** Verifies valid lifecycle transitions and rejection of invalid repeats—Transaction (`Issued` → `Returned`; blocks double return with `ALREADY_RETURNED`), Fine (`Unpaid` → `Paid`; blocks double payment with `ALREADY_PAID`), and Member (`Active` ↔ `Inactive`).

### A.4.2 White-Box Techniques
- **Statement Coverage:** Ensures all critical statements in service methods (`issueBook`, `returnBook`, `payFine`, `deleteBook`, `deleteMember`) are executed.
- **Branch Coverage:** Verifies both `true` and `false` outcomes of every guard condition (stock check, active status check, unpaid fine check, borrow limit check, role check, and overdue check).
- **Path Coverage / Basis Path Testing:** Tests every independent execution path through core eligibility and fine-calculation functions using Control Flow Graph (CFG) cyclomatic complexity analysis.

---

## A.5 Testing Types
- **Functional Testing:** Validates login, student activation, catalogue CRUD, bulk Excel/CSV import, member management, issue/return circulation, fine calculation/payment, printable/PDF slips, dashboard drill-downs, and offline search.
- **Regression Testing:** Re-executes the automated test suite (`npm test`), TypeScript static checks (`npm run lint`), and production build (`npm run build`) after every code change or bug fix.
- **Performance Testing:** Verifies responsive catalogue search, dashboard aggregation, bulk import up to 1,000 rows, and MongoDB Atlas indexed queries (`id`, `isbn`, `memberCode`, `email`, `{ memberId, status }`, `{ bookId, status }`).
- **Security Testing:** Verifies bcrypt password hashing (10 salt rounds), deny-by-default JWT authentication (`401`), librarian RBAC enforcement (`403`), student data isolation (`/api/me/*`), Helmet HTTP headers, CORS origin filtering, and API/auth rate limiting (`429`).
- **Usability Testing:** Confirms clear workflows, readable tabular data, inline validation feedback, printable A5 slips without page chrome, and responsive PWA usability for both librarians and students.

---

## A.6 Debugging Approach
When a defect is detected, the team inspects the relevant TypeScript source code, server console logs, HTTP JSON error envelopes (`{ error: { code, message, details } }`), and live MongoDB Atlas documents (`library_db`).

The following structured debugging strategies are applied:
- **Brute Force:** Inspecting Express/Mongoose logs, `/api/health` diagnostics, browser DevTools network responses, and structured `AppError` codes.
- **Backtracking:** Tracing execution backward from the failing UI component (`src/pages/*`) → `ApiClient` (`src/utils/api.ts`) → Express route (`server/src/routes/api.ts`) → service method (`server/src/services/*`) → database layer (`server/src/config/db.ts`).
- **Cause Elimination:** Formulating hypotheses and running targeted automated or API test inputs to isolate the exact root cause.

After fixing a defect, all related automated tests (`npm test`), static type checks (`npm run lint`), and manual verification steps are re-executed to confirm resolution without regression.

---

## A.7 Entry and Exit Criteria

| Testing Level | Entry Criteria | Exit Criteria |
|---|---|---|
| **Unit Testing** | Individual service method, helper, or middleware is implemented and passes `tsc --noEmit`. | All planned unit tests in `npm test` pass with zero failures. |
| **Integration Testing** | Unit-tested models, services, routes, and database layer are ready. | Services, Mongoose models, API routes, and MongoDB Atlas communicate cleanly with zero integration errors. |
| **System Testing** | All major frontend and backend modules are integrated and deployed to the test environment (`npm run build` succeeds). | All end-to-end test cases (`S01–S10`) pass and all critical/high-severity defects are resolved. |
| **Acceptance Testing** | System testing is complete with zero open critical defects. | Librarian and Student workflows are verified against project objectives and team/user approval is obtained. |

---

## A.8 Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Developer** | Implements frontend/backend modules, writes and runs automated unit tests (`npm test`), and fixes reported defects. |
| **Test Engineer** | Designs black-box and white-box test cases, executes API/UI test suites, and documents defect reports. |
| **Test Lead** | Coordinates testing phases, tracks entry/exit criteria, reviews coverage, and prepares the Test Summary Report. |
| **Client / End-User Rep.** | Evaluates Librarian and Student workflows from an end-user perspective and provides feedback on completeness and usability of functionality. |

---

## A.9 Test Tools and Environment
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, `vite-plugin-pwa` (Workbox Service Worker + IndexedDB).
- **Backend:** Node.js, Express.js, TypeScript (`tsx`), Helmet, CORS, `express-rate-limit`, JWT (`jsonwebtoken`), `bcryptjs`.
- **Database:** MongoDB Atlas (`library_db` with 7 collections: `authors`, `categories`, `books`, `members`, `users`, `transactions`, `fines`) connected via **Mongoose over TLS** with multi-document ACID transactions.
- **Automated Testing:** Node.js built-in test runner (`node:test` + `node:assert/strict`) executed via `npm test` (`tsx --test server/tests/libraryRules.test.ts`).
- **Static Analysis & Build Verification:** TypeScript compiler (`npm run lint` → `tsc --noEmit`) and Vite production bundler (`npm run build`).
- **API Testing:** Postman and `curl` / Node `fetch` verification scripts.
- **Code Management:** Git and GitHub.
- **Testing Environment:** Local development server (`http://localhost:3000`) and Cloud Run preview environment connected to MongoDB Atlas populated with seeded sample library records (`npm run seed` / `npm run migrate-json`).

---

## A.10 Risk-Based Considerations
- **Incorrect Inventory Updates / Race Conditions:** Issuing the last copy concurrently or failing midway between stock update and loan creation could corrupt `availableCopies`. Mitigated by wrapping issue and return writes in **multi-document MongoDB ACID transactions (`db.withTransaction`)** with atomic conditional `findOneAndUpdate` guards (`availableCopies > 0` and `availableCopies < totalCopies`), and prioritized for thorough testing.
- **Referential Integrity Violations:** MongoDB does not natively enforce relational foreign keys, creating a risk of deleting books with active loans, members with unreturned books, or authors/categories still referenced by titles. Mitigated by service-layer guards (`BOOK_HAS_ACTIVE_LOANS`, `ACTIVE_TRANSACTIONS_EXIST`, `AUTHOR_HAS_BOOKS`, `CATEGORY_HAS_BOOKS`, `COPIES_LESS_THAN_ISSUED`) covered by automated tests.
- **Incorrect Fine Calculation or Double Settlement:** Timezone drift or duplicate payment clicks could miscalculate overdue days or double-charge students. Mitigated by `Asia/Kolkata` calendar-day date math (`dateHelper.ts`) and atomic conditional payment updates (`status: 'Unpaid'` → `'Paid'`).
- **Unauthorized Access & Data Leakage:** Students attempting to call librarian endpoints or query another student's records. Mitigated by deny-by-default `authMiddleware`, `roleMiddleware(['librarian'])`, JWT-derived `req.user.memberId` scoping on `/api/me/*`, Helmet headers, CORS, and rate limiting.

---

# PART B — SOFTWARE TEST PLAN

## B.1 Test Plan Identifier
`TP-LMS-Issue-01`

## B.2 Objective
To verify that the **Book Issue and Return** module (along with its linked Fine Settlement, Referential Integrity, and RBAC checks) accurately enforces book availability, member eligibility, borrowing limits, 14-day IST due dates, atomic MongoDB inventory updates, overdue fine calculations, and slip generation.

## B.3 Features to be Tested
- Checking book existence and shelf copy availability (`availableCopies > 0`) before issuing.
- Validating member existence, active membership status, zero unpaid fines, and active borrowing limit (`< 5` books).
- Automatic 14-day due-date calculation in IST (`Asia/Kolkata`).
- Atomic multi-document stock and transaction updates on issue and return (`db.withTransaction`).
- Recording returns, preventing duplicate returns, and automatically calculating overdue fines (`₹5/day`).
- Recording full fine payments (`Unpaid` → `Paid`), preventing double payments, and generating printable/PDF Issue, Return, and Payment slips.
- Enforcing referential integrity delete guards and librarian-only RBAC on circulation endpoints.

## B.4 Features Not to be Tested (Out of Scope)
- Book reservations and loan renewals.
- Partial fine payments and online payment gateways (only full counter fine settlement is supported).
- Automated Email or SMS due-date notifications.
- Offline book issuing, returning, or fine payment (offline PWA mode is restricted to read-only catalogue search).

## B.5 Business Rules / Feature Under Test
A book can be issued **only when all of the following conditions hold**:
1. The book exists and has at least one available copy (`availableCopies > 0`, otherwise `NO_COPIES`).
2. The member exists and has membership status `'Active'` (otherwise `MEMBER_INACTIVE`).
3. The member has zero `'Unpaid'` fines (otherwise `UNPAID_FINE`).
4. The member currently holds fewer than `5` active (`'Issued'`) books (otherwise `LIMIT_REACHED`).

**Additional Rules:**
- If multiple checks fail simultaneously, the API returns HTTP `400 ISSUE_BLOCKED` listing all applicable `failureReasons`.
- The borrowing period is automatically set to **14 calendar days** (`LOAN_DAYS = 14`, IST).
- A late fine of **₹5 per overdue day** (`FINE_RATE_PER_DAY = 5`) is generated automatically when `returnDate > dueDate`.
- Book `availableCopies` is decremented on issue and incremented on return atomically inside a MongoDB transaction (`0 <= availableCopies <= totalCopies`).
- Only authenticated users with role `'librarian'` can issue books, process returns, and collect fines (`403 FORBIDDEN` for students).

---

## B.6 Black-Box Test Design — Equivalence Partitioning & Boundary Value Analysis
**Input under test:** Available book copies (`availableCopies`)

| Class Type | Description | Representative Value(s) |
|---|---|---|
| Valid equivalence class | At least one copy is available on shelf (`>= 1`) | `5` |
| Invalid equivalence class | Zero copies available on shelf (`0`) | `0` |
| Invalid input | Negative copy count (`< 0`, blocked by schema/validation) | `-1` |
| Boundary — valid side | Minimum available copy allowing issue | `1` |
| Boundary — invalid side | Maximum unavailable count blocking issue | `0` |

**Boundary & Equivalence Test Cases (`TC-B01` – `TC-B05`):**

| TC ID | Description | Input (Available Copies) | Expected Output | Actual Output | Pass / Fail |
|---|---|---|---|---|---|
| `TC-B01` | Multiple copies available | `5` | Issue request allowed (`HTTP 201`) | Issue request allowed (`HTTP 201`) | Pass |
| `TC-B02` | Minimum available copy (valid boundary) | `1` | Issue request allowed; stock becomes `0` | Issue request allowed; stock becomes `0` | Pass |
| `TC-B03` | No copies present (invalid boundary) | `0` | Request rejected (`400 ISSUE_BLOCKED`, `NO_COPIES`) | Request rejected (`400 ISSUE_BLOCKED`, `NO_COPIES`) | Pass |
| `TC-B04` | Invalid negative stock input | `-1` | Validation error (`400 VALIDATION_ERROR`) | Validation error (`400 VALIDATION_ERROR`) | Pass |
| `TC-B05` | Stock decrement after successful issue | `5` | `availableCopies` decreases atomically by `1` (to `4`) | `availableCopies` decreased to `4` | Pass |

---

## B.7 Black-Box Test Design — Decision Table Testing
**Conditions:**
- `C1` = Is the book available? (`availableCopies > 0`)
- `C2` = Is the member active? (`member.status === 'Active'`)
- `C3` = Is the member eligible? (`unpaidFineCount === 0` AND `currentIssuedCount < 5`)

**Action:** Allow or Reject book issuing.

| Rule | C1 (Book Available) | C2 (Member Active) | C3 (Member Eligible) | Action |
|---|---|---|---|---|
| **R1** | Yes | Yes | Yes | **Allow** |
| **R2** | Yes | Yes | No | **Reject** (`UNPAID_FINE` / `LIMIT_REACHED`) |
| **R3** | Yes | No | Yes | **Reject** (`MEMBER_INACTIVE`) |
| **R4** | Yes | No | No | **Reject** (`MEMBER_INACTIVE` + eligibility reason) |
| **R5** | No | Yes | Yes | **Reject** (`NO_COPIES`) |
| **R6** | No | Yes | No | **Reject** (`NO_COPIES` + eligibility reason) |
| **R7** | No | No | Yes | **Reject** (`NO_COPIES`, `MEMBER_INACTIVE`) |
| **R8** | No | No | No | **Reject** (`NO_COPIES`, `MEMBER_INACTIVE` + eligibility reason) |

**Decision Table Test Cases (`D01` – `D05`):**

| TC ID | Rule Covered | C1 | C2 | C3 | Expected Result | Status |
|---|---|---|---|---|---|---|
| `D01` | R1 | Yes | Yes | Yes | Allowed — Book issued (`HTTP 201`), due date set `+14` days, stock `-1` | Pass |
| `D02` | R2 | Yes | Yes | No | Rejected (`400 ISSUE_BLOCKED`: `UNPAID_FINE` or `LIMIT_REACHED`) | Pass |
| `D03` | R3 | Yes | No | Yes | Rejected (`400 ISSUE_BLOCKED`: `MEMBER_INACTIVE`) | Pass |
| `D04` | R5 | No | Yes | Yes | Rejected (`400 ISSUE_BLOCKED`: `NO_COPIES`) | Pass |
| `D05` | R8 | No | No | No | Rejected (`400 ISSUE_BLOCKED`: all failing reasons returned together) | Pass |

---

## B.8 White-Box Test Design — Basis Path Testing
**Module under test:** `canIssueBook(availableCopies, memberActive, memberEligible)` — Core eligibility decision logic extracted from `IssueReturnService.issueBook()` (`server/src/services/issueReturnService.ts`), which determines whether a circulation issue request is permitted.

```ts
function canIssueBook(
  availableCopies: number,
  memberActive: boolean,
  memberEligible: boolean
): boolean {
  let result = false;              // Node 1
  if (availableCopies > 0) {       // Node 2 (Decision 1)
    if (memberActive) {            // Node 3 (Decision 2)
      if (memberEligible) {        // Node 4 (Decision 3)
        result = true;             // Node 5
      }
    }
  }
  return result;                   // Node 6
}
```

**Control Flow Graph & Cyclomatic Complexity:**
- **Nodes (`N = 6`):** `{1, 2, 3, 4, 5, 6}`
- **Edges (`E = 8`):** `(1→2), (2→3), (2→6), (3→4), (3→6), (4→5), (4→6), (5→6)`
- **Cyclomatic Complexity:** `V(G) = E − N + 2 = 8 − 6 + 2 = 4` (equivalently: `Decision Nodes + 1 = 3 + 1 = 4`)
- **Number of independent basis paths to cover:** `4`

| Path # | Path Description | Input Values (`availableCopies, memberActive, memberEligible`) | Expected Result |
|---|---|---|---|
| **P1** | `1 → 2 → 6` | `0, true, true` | `false` |
| **P2** | `1 → 2 → 3 → 6` | `2, false, true` | `false` |
| **P3** | `1 → 2 → 3 → 4 → 6` | `2, true, false` | `false` |
| **P4** | `1 → 2 → 3 → 4 → 5 → 6` | `2, true, true` | `true` |

---

## B.9 Integration Test Cases
**Integration strategy:** Bottom-up

**Drivers and Stubs Used:**
1. **Drivers:** Automated Node test runner scripts (`npm test` → `server/tests/libraryRules.test.ts`), Postman collections, and `fetch`/`curl` HTTP API test scripts calling backend services and REST endpoints.
2. **Stubs:** Lightweight in-memory MongoDB collection stubs with transactional rollback simulation during isolated automated service tests (`npm test`).
3. **Live Database Integration:** Actual MongoDB Atlas database (`library_db`, 7 collections via Mongoose over TLS) used during full API and end-to-end integration verification.

| TC ID | Integration Step | Description | Expected Result | Status |
|---|---|---|---|---|
| `I01` | Step 1 | Integrate `BookModel`, `MemberModel`, `AuthorModel`, and `CategoryModel` with `CatalogueService` and `IssueReturnService`. | Accurate book, member, author, and category records are retrieved and referential integrity delete guards function properly. | Pass |
| `I02` | Step 2 | Integrate `IssueReturnService` and `FineService` with MongoDB Atlas via Mongoose sessions (`db.withTransaction`). | Issue/return records, stock decrements/increments, and overdue fines commit atomically or roll back together. | Pass |
| `I03` | Step 3 | Integrate Express API routes (`/api/*`) with security middleware (`helmet`, `cors`, `rateLimit`, `authMiddleware`, `roleMiddleware`) and services. | Valid requests return `200`/`201` JSON; unauthorized/invalid requests return structured `400`/`401`/`403`/`409` JSON envelopes. | Pass |
| `I04` | Step 4 | Integrate React + Vite PWA frontend (`ApiClient`, IndexedDB cache, `SlipModal`) with backend APIs. | Book issue, return, fine payment, slips, dashboard KPIs, and offline search work seamlessly in the browser. | Pass |
| `I05` | Step 5 | Execute complete end-to-end Issue → Overdue Return → Fine Payment → Slip Print/PDF workflow. | Transaction statuses, 14-day IST due dates, `₹5/day` fines, payment receipts, and inventory counts remain 100% consistent in Atlas. | Pass |

---

## B.10 System Test Cases (End-to-End, Black-Box)

| TC ID | Scenario | Expected Result | Status |
|---|---|---|---|
| `S01` | Issue an available book to an active, eligible student (`0` unpaid fines, `< 5` books). | Book is issued (`HTTP 201`), due date is set to `+14` days (IST), `availableCopies` decreases by `1`, and Issue Slip opens for Print / Save PDF. | Pass |
| `S02` | Attempt to issue a book with `0` available copies. | System rejects request (`400 ISSUE_BLOCKED`, `NO_COPIES`) and displays clear inline feedback. | Pass |
| `S03` | Attempt to issue a book to an `Inactive` member. | System rejects request (`400 ISSUE_BLOCKED`, `MEMBER_INACTIVE`) and prevents issuance. | Pass |
| `S04` | Attempt to issue a book when the member already holds `5` active books or has an unpaid fine. | System rejects request (`400 ISSUE_BLOCKED`, `LIMIT_REACHED` / `UNPAID_FINE`) and shows blocking reasons. | Pass |
| `S05` | Return an issued book on or before its due date. | Return is recorded (`status: 'Returned'`), `availableCopies` increases by `1`, no fine is generated, and Return Slip opens. | Pass |
| `S06` | Return an issued book after its due date (e.g., `4` days late). | Return is recorded, `availableCopies` increases by `1`, and an `Unpaid` fine of `₹20` (`4 × ₹5/day`) is generated automatically. | Pass |
| `S07` | Record full payment of an unpaid fine by a librarian. | Fine transitions atomically from `Unpaid` → `Paid`, double payment is blocked (`ALREADY_PAID`), and a printable/PDF Payment Receipt is generated (with Reprint support). | Pass |
| `S08` | Attempt to call librarian-only endpoints (issue, return, add/delete book, pay fine) using a student JWT or no token. | System denies access with `HTTP 401 UNAUTHORIZED` (no token) or `HTTP 403 FORBIDDEN` (student role); student can only read `/api/me/books` and `/api/me/fines`. | Pass |
| `S09` | Attempt to delete a book with active loans, a member with active loans, or an author/category referenced by books. | System blocks deletion (`BOOK_HAS_ACTIVE_LOANS`, `ACTIVE_TRANSACTIONS_EXIST`, `AUTHOR_HAS_BOOKS`, `CATEGORY_HAS_BOOKS`) to preserve referential integrity. | Pass |
| `S10` | Disconnect internet after loading the catalogue and search books on the Catalogue page. | Service Worker + IndexedDB fallback serves cached catalogue data in read-only Offline Mode with an amber offline banner. | Pass |

---

## B.11 Test Deliverables
The following documents and verification artifacts are maintained throughout testing:
1. **Software Test Strategy and Test Plan (`TEST_STRATEGY_AND_PLAN.md`):** Defines testing scope, levels, design techniques, risks, and test cases.
2. **Automated Test Suite (`server/tests/libraryRules.test.ts`):** Executable test suite (`npm test`) covering referential integrity delete guards, transactional issue/return/fine rules, and JWT/RBAC security enforcement.
3. **Test Execution Results:** Pass/fail output from `npm test` (9/9 passing), `npm run lint` (`tsc --noEmit`), `npm run build`, and live MongoDB Atlas smoke verification.
4. **Defect Reports:** Records discovered defects, severity, reproduction steps, root cause, and verification status.
5. **Test Summary Report:** Summarizes test execution coverage, pass rates, resolved defects, and overall release readiness.

---

## B.12 Suspension and Resumption Criteria

**Test Suspension Criteria:**  
Testing is temporarily suspended if any of the following occur:
- Critical defects block core modules (authentication, issue/return circulation, or catalogue loading).
- The application server crashes or becomes unreachable on port `3000`.
- Book issue or return transactions produce inconsistent `availableCopies` stock counts.
- MongoDB Atlas connectivity (`MONGODB_URI` / Network Access / TLS) fails, preventing reliable test execution.
- Build or TypeScript compilation (`npm run build` / `npm run lint`) fails.

**Test Resumption Criteria:**  
Testing resumes once:
- All identified critical/blocking defects are fixed and verified locally.
- `npm run lint`, `npm run build`, and `npm test` pass cleanly.
- `/api/health` confirms `MongoDB Atlas via Mongoose (library_db)` connectivity.
- The test environment is stable and ready for re-testing affected modules.

---

## B.13 Approval

| Name | Role | Signature | Date |
|---|---|---|---|
| Sagnik Sinha (CSE(AI), Roll No - 18) | Developer / Test Lead | | |
| Soham Bhowmick (CSE(AI), Roll No - 25) | Developer / Test Engineer | | |
| Satwik Biswas (CSE(AI), Roll No - 20) | Test Engineer | | |
| Soumit Manna (CSE(AI), Roll No - 21) | Client / End-User Rep. | | |
