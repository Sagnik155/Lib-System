# Library Management System

A full-stack college **Library Management System** engineered with **React 19**, **Vite**, **Tailwind CSS v4**, **Node.js**, and **Express**. Designed around strict server-enforced business rules, role-based access control (RBAC), India Standard Time (`Asia/Kolkata`) calendar-day fine calculation, offline-resilient catalogue lookup, and standalone print/PDF circulation receipts.

---

## Table of Contents

1. [Executive Overview & Design Philosophy](#1-executive-overview--design-philosophy)
2. [What We Built (Feature Inventory)](#2-what-we-built-feature-inventory)
3. [How We Built It (System Architecture & Engineering Mechanics)](#3-how-we-built-it-system-architecture--engineering-mechanics)
4. [REST API & Business Rules Reference](#4-rest-api--business-rules-reference)
5. [Offline Mode & Deployment Troubleshooting](#5-offline-mode--deployment-troubleshooting)
6. [Engineering Shortcomings & Architectural Trade-Offs](#6-engineering-shortcomings--architectural-trade-offs)
7. [Demo Accounts & Local Setup](#7-demo-accounts--local-setup)

---

## 1. Executive Overview & Design Philosophy

College circulation desks require deterministic enforcement of borrowing quotas, stock integrity, overdue penalties, and auditable receipts without forcing librarians to reconcile spreadsheets manually. At the same time, students need transparent self-service visibility into shelf stock, expected return dates, active due-date countdowns, and fine balances.

### Core Personas & Access Separation

| Persona | Primary Responsibilities | Access Scope |
| :--- | :--- | :--- |
| **Librarian** | Analytics monitoring, member registration, catalogue curation & bulk Excel/CSV import, issue/return processing, fine collection, slip/receipt generation | Full administrative access across all circulation, member, fine, and reporting endpoints |
| **Student** | Account activation via institutional email, catalogue search & zero-stock return tracking, personal loan & fine self-service | Read-only catalogue access plus strictly token-scoped access to personal loans and fines (`/api/me/*`) |

### Engineering Principles

* **Server-Authoritative Policy Enforcement:** Borrowing limits (`5` books), loan durations (`14` days), fine rates (`₹5/day`), and RBAC checks are evaluated exclusively on the backend—never trusted to client UI state.
* **Deny-by-Default Security Boundary:** Every endpoint after `/api/auth/login` and `/api/auth/activate` requires a verified JWT (`authMiddleware`), and administrative endpoints enforce `roleMiddleware(['librarian'])`.
* **Timezone-Safe Calendar Arithmetic:** Due dates and overdue penalties operate on whole `YYYY-MM-DD` calendar dates anchored to India Standard Time (`Asia/Kolkata`), eliminating UTC midnight off-by-one bugs.
* **Zero-Dependency Runtime Footprint:** Persists relational entities to a local JSON store (`.db_store.json`) with auto-seeding on startup so the entire application boots cleanly in a single command without external database provisioning.

---

## 2. What We Built (Feature Inventory)

### Librarian Workspace

* **Interactive Overview Dashboard (`/dashboard`):**
  * **8 Clickable Drill-Down KPI Cards:** `Borrowed Books`, `Returned Books`, `Overdue Books`, `Zero-Stock Titles`, `Total Stock`, `Available on Shelves`, `Registered Members`, and `Pending Fines`—each navigating directly to a pre-filtered operational view (e.g., clicking `Overdue Books` opens the Return Desk pre-filtered to `Overdue Only`; clicking `Pending Fines` opens the Unpaid Fines queue).
  * **Full-Width Overdue History Table:** Real-time breakdown of active overdue loans showing member code, single-line ISBN, title, due date, days late, and live accrued fine (`₹5/day`) with a one-click jump to `Process Return`.
  * **Recent Check-outs & Top Books:** Live circulation feed and shelf-availability snapshot.
* **Books & Catalogue Management (`/catalogue`):**
  * Full CRUD for titles with automatic author and category resolution/creation.
  * **Duplicate ISBN Conflict Workflow:** Attempting to create or update a book with an existing ISBN returns HTTP `409 DUPLICATE_ISBN` along with the conflicting record's metadata, enabling an in-modal **Edit Existing Book** transition instead of silent overwrites or lost form context.
  * **Guardrails on Copy Counts & Deletion:** Prevents reducing `totalCopies` below the number of currently issued copies (`COPIES_LESS_THAN_ISSUED`) and blocks deleting books with active loans (`BOOK_HAS_ACTIVE_LOANS`), as well as authors/categories still referenced by books.
  * **Bulk Excel/CSV Import:** Client-side spreadsheet parsing via SheetJS (`xlsx`) with downloadable `.xlsx` template, up to `1,000` rows per batch, row-by-row server validation, duplicate-ISBN skipping, and detailed import/skip reporting.
* **Members Directory (`/members`):**
  * Register, edit, activate/deactivate (`Active` / `Inactive`), search, and filter members (`All`, `Active`, `Inactive`).
  * Automatic sequential member code generation (`M001`, `M002`, ...) when omitted, live hydration of active loans count and unpaid fine totals, and deletion protection when active loans exist.
* **Issue Book Desk (`/issue`):**
  * Search/select available books and registered members, preview eligibility, and execute loan creation.
  * Evaluates **all** blocking conditions simultaneously and returns structured failure codes (`NO_COPIES`, `MEMBER_INACTIVE`, `UNPAID_FINE`, `LIMIT_REACHED`).
* **Return Book Desk (`/return`):**
  * Three dedicated operational modes: **Active Loans**, **Overdue Only**, and **Completed Returns** (newest-first return log via `/api/returns/history`).
  * Live overdue day and estimated fine calculation before return confirmation; automatically generates an `Unpaid` fine record on late return.
* **Fines & Receipts (`/fines`):**
  * Summary balance cards, `Unpaid` and `Paid` queue tabs, atomic full-settlement collection (`POST /api/fines/:id/pay`), and a **Reprint Receipt** button on every settled fine.
* **Printable Slips & PDF Receipts (`SlipModal`):**
  * Official slips for **Issue**, **Return**, and **Fine Payment** transactions.
  * **Print Slip** isolates clean receipt HTML inside a hidden `<iframe srcDoc>` (avoiding popup blockers and main-app chrome pollution).
  * **Save PDF** generates a structured, multi-field A5 PDF receipt via `jsPDF`.

### Student Self-Service Portal

* **Account Activation (`LoginPage`):** Pre-registered students activate their portal credentials using their institutional email (strictly assigned `role: 'student'` server-side).
* **Catalogue Search (`CataloguePage`):** Multi-attribute partial matching across title, author, category, and ISBN, availability filtering, and dynamic **Earliest Expected Return Date** calculation for zero-stock books.
* **My Account (`StudentAccountPage`):**
  * Crisp white profile header with emerald monogram, member code, email, and membership status badge.
  * **3-Card Summary Strip:** Active borrowing quota (`X / 5`), overdue count, and unpaid fine balance.
  * **Tabbed Records View:** Dedicated tabs for **Active Loans** (with due-date countdowns and accrued fine callouts), **Fines**, and **Borrowing History**.

---

## 3. How We Built It (System Architecture & Engineering Mechanics)

### High-Level Architecture

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                         Browser Client (React 19 SPA)                     │
│  ┌──────────────┐   ┌───────────────────────┐   ┌──────────────────────┐  │
│  │ AuthContext  │   │ Role-Scoped Views     │   │ Documents & Caching  │  │
│  │ (JWT Bearer) │──▶│ - Dashboard & Desks   │──▶│ - Hidden <iframe     │  │
│  └──────────────┘   │ - Catalogue & Members │   │   srcDoc> Print      │  │
│         │           │ - Student My Account  │   │ - jsPDF A5 Export    │  │
│         │           └───────────────────────┘   │ - IndexedDB Cache    │  │
│         │                                       └──────────┬───────────┘  │
└─────────┼──────────────────────────────────────────────────┼──────────────┘
          │ HTTP JSON + Authorization: Bearer <token>        │ Offline Read
          ▼                                                  │ Fallback
┌─────────┴──────────────────────────────────────────────────┴──────────────┐
│               Single-Port Express Server + Vite Middleware                │
│  ┌──────────────────────┐   ┌─────────────────────┐   ┌────────────────┐  │
│  │ Security & Routing   │──▶│ Domain Services     │──▶│ JSON Store     │  │
│  │ - JWT Auth Guard     │   │ - Catalogue & Search│   │ (.db_store.json│  │
│  │ - Role Middleware    │   │ - Issue/Return/Fine │   │  + Atomic Ops) │  │
│  │ - Member Scoping     │   │ - IST Date Engine   │   │ - Auto-Seed    │  │
│  └──────────────────────┘   └─────────────────────┘   └────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Mechanisms

#### 1. Single-Port Full-Stack Runtime (`server.ts`)
* In **development**, `server.ts` creates an `http.Server`, mounts Express `/api` routes first, and attaches **Vite in `middlewareMode`** with HMR bound to the same HTTP server (avoiding secondary WebSocket port collisions, or disabling HMR when `DISABLE_HMR=true`).
* In **production** (`NODE_ENV=production`), Express serves the compiled static bundle from `dist/` with SPA fallback routing.
* CLI flag parsing (`--port`, `--host`) takes precedence over environment variables so managed runtimes (e.g., `--port 3000 --host 0.0.0.0`) bind reliably.
* On startup, if `db.books` or `db.users` is empty, `runSeed()` populates 30 books, 10 members, active/overdue/returned transactions, fines, and demo credentials automatically.

#### 2. Authentication, RBAC & Data Isolation
* Passwords are salted and hashed with `bcryptjs` (cost factor `10`).
* Login and activation issue HMAC-signed JWTs (`jsonwebtoken`, default `7d` expiry) containing `{ userId, email, role, memberId }`.
* **Server-Side Student Scoping:** `/api/me/books` and `/api/me/fines` ignore query/body member parameters and read exclusively from `req.user.memberId` decoded from the verified JWT, preventing horizontal privilege escalation (IDOR).
* **Error Normalization:** `AppError` and `errorHandler` serialize all backend failures into `{ error: { code, message, details? } }`, allowing the UI to render contextual banners (such as `DUPLICATE_ISBN` conflict cards or `ISSUE_BLOCKED` reason pills).

#### 3. Circulation Lifecycle & Atomic State Transitions

```text
[Issue Request] ─▶ Check Book + Member + Stock>0 + Active + 0 Unpaid Fines + <5 Loans
                        │ (all pass)
                        ▼
               atomicIssueCopy(bookId) ─▶ availableCopies - 1 ─▶ Transaction (Issued, +14d IST)
                                                                       │
[Return Request] ◀─────────────────────────────────────────────────────┘
       │
       ▼
atomicReturnCopy(bookId) ─▶ availableCopies + 1 ─▶ Transaction (Returned)
       │
       ├─ daysLate == 0 ─▶ Return Slip (₹0 fine)
       └─ daysLate > 0  ─▶ Create Fine (daysLate * ₹5, Unpaid) ─▶ Return Slip
                                 │
                                 ▼
                       atomicPayFine(fineId) ─▶ Paid ─▶ Payment Receipt (Reprintable)
```

* `db.atomicIssueCopy`, `db.atomicReturnCopy`, and `db.atomicPayFine` enforce conditional bounds (`availableCopies > 0`, `availableCopies < totalCopies`, `status === 'Unpaid'`) synchronously before calling `db.save()`, preventing negative stock, over-stocking, or double fine settlement within the Node process.

#### 4. IST (`Asia/Kolkata`) Calendar-Day Date Engine
* `getTodayIndiaString()` formats the current instant via `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })` to produce a canonical `YYYY-MM-DD` string.
* `addDays()` and `diffInDays()` perform pure `Date.UTC(year, month - 1, day)` arithmetic across whole calendar days, ensuring fine calculations never fluctuate based on the server host's local timezone or time-of-day.

#### 5. Receipt Rendering & Spreadsheet Pipeline
* **Print Isolation:** Instead of invoking `window.print()` on the main SPA document (which captures navigation sidebars and breaks in sandboxed iframes), `SlipModal` renders self-contained HTML into a hidden `<iframe srcDoc>` and prints only that frame's `contentWindow`.
* **PDF Export:** Uses `jsPDF` (A5 portrait) with wrapped title layout and sanitized filenames (`Library_<TYPE>_Slip_<REF>.pdf`).
* **Bulk Import:** Parses `.xlsx`/`.csv` files in-browser using `xlsx`, previews rows, and submits structured JSON to `POST /api/books/import`, where the server re-validates every row, skips duplicates without overwriting existing titles, and auto-creates missing authors/categories.

---

## 4. REST API & Business Rules Reference

### Business Policy Constants

| Policy Rule | Configured Value | Enforcement Location |
| :--- | :--- | :--- |
| Standard Loan Duration | `14` calendar days (`Asia/Kolkata`) | `IssueReturnService.issueBook` |
| Late Fine Rate | `₹5` per calendar day late (uncapped) | `IssueReturnService.returnBook` / `getActiveLoans` |
| Concurrent Borrow Limit | Maximum `5` active (`Issued`) loans per member | `IssueReturnService.issueBook` |
| Fine Settlement Rule | Full payment only (`Unpaid` → `Paid` once) | `FineService.payFine` / `db.atomicPayFine` |
| Bulk Import Batch Cap | Maximum `1,000` rows per upload | `CatalogueService.bulkImport` |

### Issue Blocking Codes (`400 ISSUE_BLOCKED`)

When issuing fails, `POST /api/issues` returns all applicable reasons in `error.details.failureReasons`:

| Error Code | Trigger Condition |
| :--- | :--- |
| `BOOK_NOT_FOUND` | Book ID or ISBN does not match any catalogue record |
| `MEMBER_NOT_FOUND` | Member ID or Member Code does not exist |
| `NO_COPIES` | `book.availableCopies <= 0` (also `409` on race condition) |
| `MEMBER_INACTIVE` | `member.status !== 'Active'` |
| `UNPAID_FINE` | Member has one or more fines with `status === 'Unpaid'` |
| `LIMIT_REACHED` | Member already holds `>= 5` active `Issued` transactions |

### REST API Endpoints (`/api`)

#### Public & Session Routes

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health check and ISO timestamp |
| `POST` | `/api/auth/login` | Public | Authenticate email/password, return JWT + user/member profile |
| `POST` | `/api/auth/activate` | Public | Activate pre-registered student email with password (min 6 chars) |
| `GET` | `/api/auth/me` | Any Auth | Return current authenticated user and linked member profile |

#### Catalogue & Student Self-Service Routes (Any Authenticated User)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/books` | Any Auth | List all books hydrated with author & category names |
| `GET` | `/api/books/:id` | Any Auth | Fetch single book by internal ID or ISBN |
| `GET` | `/api/authors` | Any Auth | List all authors sorted alphabetically |
| `GET` | `/api/categories` | Any Auth | List all categories sorted alphabetically |
| `GET` | `/api/search` | Any Auth | Search by `q`, `category`, `availability` + zero-stock earliest return date |
| `GET` | `/api/me/books` | Student (Token-Scoped) | Current issued loans (with countdown/overdue) + return history |
| `GET` | `/api/me/fines` | Student (Token-Scoped) | Personal paid and unpaid fine records |

#### Librarian-Only Administration & Circulation Routes (`role: 'librarian'`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` / `GET /:id` | `/api/members` | List/search members (with active loan & unpaid fine totals) or get by ID/code |
| `POST` / `PUT` / `DELETE` | `/api/members` | Create, update status/details, or delete member (blocked if active loans exist) |
| `POST` / `PUT` / `DELETE` | `/api/books` | Create/update book (enforces unique ISBN & copy floor) or delete (blocked if loaned) |
| `POST` | `/api/books/import` | Bulk import up to 1,000 rows (`isbn`, `title`, `author`, `category`, `publisher`, `total_copies`) |
| `POST` / `DELETE` | `/api/authors`, `/api/categories` | Create or delete metadata (deletion blocked if referenced by books) |
| `GET` | `/api/issues/active` | List active loans with live IST overdue days and estimated fines |
| `POST` | `/api/issues` | Issue book (`bookId`, `memberCode`) and return `transaction` + `ISSUE` slip |
| `POST` | `/api/returns/:transactionId` | Return book, restock copy, generate late fine if applicable, return `RETURN` slip |
| `GET` | `/api/returns/history` | List completed returns sorted newest-first with late day/fine summary |
| `GET` | `/api/fines` | List fines optionally filtered by `status=Unpaid\|Paid` |
| `POST` | `/api/fines/:id/pay` | Settle fine in full and return `PAYMENT` receipt payload |
| `GET` | `/api/dashboard` | Live KPI totals, overdue history, recent check-outs, and top books |
| `GET` | `/api/reports/overdue` | Full overdue loans breakdown |

---

## 5. Offline Mode & Deployment Troubleshooting

### How Offline Catalogue Support Works

```text
[Online Search] ─▶ GET /api/search ─▶ Success ─▶ saveCatalogueToCache(books) ─▶ IndexedDB ("LibraryAppCatalogueCache")
                                         │
                                  Network Error
                                         ▼
                          getCatalogueFromCache() ─▶ Render cached books + Amber "Offline Mode" Banner

[Logout] ─▶ clearOfflineCache() ─▶ Clears IndexedDB store & localStorage sync timestamp
```

* **Storage Engine:** Browser IndexedDB (`LibraryAppCatalogueCache`, store `catalogue`, keyPath `id`) plus `localStorage` key `last_synced_timestamp`.
* **How to Test Offline Search:**
  1. Log in and open **Books & Catalogue** while online so the catalogue populates IndexedDB.
  2. Open browser DevTools → **Network** tab → switch throttling to **Offline**.
  3. Trigger a search or filter change in **Books & Catalogue**. The app catches the `NETWORK_ERROR`, falls back to IndexedDB, and displays the amber `"Offline Mode: Displaying catalogue from local browser cache."` banner.
  4. **Important Constraint:** Do **not** refresh the entire browser tab while offline; offline support is **in-session read fallback only** (see [Shortcoming #3](#3-offline-mode-is-in-session--read-only)).

### Common Setup & Runtime Troubleshooting

| Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| Server fails to start with `EADDRINUSE` on `8080` or `24678` | Environment `PORT` or standalone Vite HMR port conflict | Pass explicit port/host (`tsx server.ts --port 3000 --host 0.0.0.0`) or set `DISABLE_HMR=true` |
| Empty catalogue / login fails on fresh clone | `.db_store.json` missing or corrupted | Run `npm run seed` (or delete `.db_store.json` and restart `npm run dev` to trigger auto-seed) |
| Need an additional Librarian login | Librarian role cannot be self-registered in UI | Run `npm run create-librarian -- <email> <password>` |
| Frontend deployed separately from API cannot reach `/api` | Default `VITE_API_BASE_URL="/api"` assumes same-origin server | Set `VITE_API_BASE_URL=https://<api-host>/api` and add CORS middleware on the Express server |
| Bulk import rejects spreadsheet or skips rows | Missing headers or duplicate ISBNs | Download the sample template from the Import modal; required columns: `isbn`, `title`, `author`, `category`, `total_copies` |

---

## 6. Engineering Shortcomings & Architectural Trade-Offs

For academic and engineering evaluation, this section documents the genuine limitations of the current implementation alongside the architectural trade-offs that produced them.

### 1. Flat-File JSON Persistence & Single-Process Concurrency
* **Current State:** Although `.env.example` includes a template `MONGODB_URI`, the active backend persists all collections inside a single local `.db_store.json` file via synchronous `fs.writeFileSync`.
* **Shortcomings:**
  * **Crash Durability Risk:** Overwriting `.db_store.json` directly in-place (without atomic temp-file write + rename or a write-ahead log) risks file truncation if the Node process crashes mid-write.
  * **No Multi-Instance Scaling:** Atomic helpers (`atomicIssueCopy`, `atomicReturnCopy`, `atomicPayFine`) are only safe inside a single Node.js event loop; running multiple server replicas or horizontal workers would cause lost updates and race conditions.
  * **Write Amplification:** Every single book issue, return, or fine payment serializes and rewrites the entire database JSON synchronously on the main thread, blocking the event loop at larger dataset sizes.
* **Trade-Off:** Chosen for zero-configuration portability and instant local/container startup without provisioning MongoDB or PostgreSQL.

### 2. Authentication & Security Boundaries
* **Current State:** JWTs are signed with `process.env.JWT_SECRET` falling back to a hardcoded string (`library-mgmt-secret-jwt-key-2026`), stored client-side in `localStorage`, and the Sidebar exposes a **Demo Switcher** calling `quickLoginAs(email)` with `'password123'`.
* **Shortcomings:**
  * **XSS Exposure & No Revocation:** Storing JWTs in `localStorage` makes tokens readable to any injected script (unlike `HttpOnly; SameSite=Strict` cookies), and stateless JWTs cannot be server-revoked before their `7d` expiration on logout or password change.
  * **Unverified Student Activation:** `POST /api/auth/activate` verifies only that the email exists in `db.members` without sending an email OTP or verification link—allowing someone who knows an unactivated student's email address to claim that account first.
  * **Demo Switcher & Default Secret Risk:** Leaving the hardcoded secret fallback or one-click Demo Switcher active in a non-demo deployment would compromise administrative access; additionally, no rate limiting (`express-rate-limit`) or Helmet CSP headers are enabled on `/api/auth/*`.
* **Trade-Off:** Prioritized frictionless evaluator walkthroughs and rapid demo role-switching over production identity verification.

### 3. Offline Mode Is In-Session & Read-Only
* **Current State:** `CataloguePage` caches the result of the latest `/api/search` call into IndexedDB (`LibraryAppCatalogueCache`) and reads it back on network failure.
* **Shortcomings:**
  * **No Service Worker / App Shell Cache:** Reloading the browser while offline fails to load the SPA bundle, and `AuthContext` clears the JWT token (`api.setToken(null)`) if `/api/auth/me` encounters a network error on startup—logging the user out if they refresh offline.
  * **Filtered Overwrite Bug Risk:** Because `fetchCatalogue()` calls `saveCatalogueToCache(booksData)` whenever `navigator.onLine && booksData.length > 0`, performing a narrow filtered search while online overwrites the cached snapshot with only those filtered results rather than keeping a full catalogue mirror.
  * **No Client-Side Filtering During Offline Fallback & No Mutation Queue:** When falling back to IndexedDB, `CataloguePage` returns `getCatalogueFromCache()` directly without re-applying the local search/category filter over the cached array, and librarians cannot queue offline issues/returns for background sync.
* **Trade-Off:** Kept offline support lightweight (single IndexedDB store, zero Service Worker cache-invalidation complexity) for brief Wi-Fi drops during active catalogue browsing.

### 4. Title-Level Stock Counters vs. Physical Accession Tracking
* **Current State:** Each `Book` record tracks aggregate `totalCopies` and `availableCopies` integers tied to one `isbn`.
* **Shortcomings:**
  * **No Per-Copy Barcode / Accession ID:** The system knows *how many* copies of a title are issued, not *which physical copy* a student holds—preventing tracking of copy condition (damaged/lost), shelf/rack locations, or multi-edition holdings under distinct accession numbers.
  * **No Hold / Reservation Queue:** Zero-stock books display `earliestExpectedReturnDate`, but students cannot place a reservation hold to claim the next returned copy.
  * **Uniform Policy Rules:** Loan period (`14` days), borrow limit (`5` books), and late fee (`₹5/day`) are hardcoded constants rather than configurable per membership tier (e.g., Faculty vs. Undergraduate) or adjustable by librarians (no renewals, partial fine payments, or fee waivers).
* **Trade-Off:** Simplified the domain model to seven flat collections (`authors`, `categories`, `books`, `members`, `users`, `transactions`, `fines`) so circulation workflows remain fast and unambiguous.

### 5. In-Memory Query Execution & Payload Limits
* **Current State:** Service methods scan entire arrays in memory (`db.books.map(...)`, `db.transactions.filter(...)`) and return unpaginated JSON arrays.
* **Shortcomings:**
  * **No Server Pagination or Indexing:** Latency and response payload sizes scale linearly (`O(N)`) with total books, members, and historical transactions (`getReturnedLoans`, `getFines`, `getDashboardStats`).
  * **Repeated Client-Server Coupling:** `src/pages/CataloguePage.tsx` and other frontend views import `formatDisplayDate` directly from `server/src/utils/dateHelper.ts` rather than a shared `shared/` module, and `.env.example` lists unused placeholders (`GEMINI_API_KEY`, `MONGODB_URI`, `CLIENT_ORIGIN`) without corresponding runtime wiring or CORS middleware for split-origin deployments.
* **Trade-Off:** Rapid feature iteration inside a monorepo layout without maintaining separate API pagination DTOs or shared workspace packages.

### 6. Testing, Observability & Audit Trail Gaps
* **Current State:** Verified through TypeScript compilation (`tsc --noEmit`), Vite production builds, and live HTTP smoke checks.
* **Shortcomings:**
  * **No Automated Test Suite:** No unit tests for fine/date edge cases, integration tests for concurrent `issueBook`/`returnBook` flows, or end-to-end browser tests.
  * **No Immutable Audit Log or Notifications:** Deletions and edits (`updateBook`, `updateMember`, `deleteBook`) mutate records in place without an event history, and overdue borrowers receive no automated email or SMS reminders.

---

## 7. Demo Accounts & Local Setup

### Pre-Seeded Demo Accounts

A **Demo Switcher** is available in the bottom-left sidebar for one-click role switching during evaluation:

| Role | Email | Password | Pre-Seeded State |
| :--- | :--- | :--- | :--- |
| **Librarian** | `librarian@college.edu` | `password123` | Full administrative access |
| **Student 1** | `aarav.sharma@college.edu` | `password123` | `1` active loan, `1` past return, `1` unpaid fine (`₹20`) |
| **Student 2** | `diya.patel@college.edu` | `password123` | `2` active loans (`1` overdue by 5 days), `1` paid fine (`₹15`) |
| **Student 3** | `rohan.gupta@college.edu` | — *(unactivated)* | `5` active loans (at max borrow limit — tests `LIMIT_REACHED`) |
| **Member 5** | `kabir.mehta@college.edu` | — *(unactivated)* | Status `Inactive` (tests `MEMBER_INACTIVE`) |

> **Zero-Stock Test Case:** Book #30 (*Clean Architecture*) is seeded with `0` available copies and `2` active loans to demonstrate `NO_COPIES` blocking and dynamic **Earliest Expected Return Date** calculation.

### Installation & Commands

```bash
# 1. Install all frontend and backend dependencies
npm install

# 2. (Optional) Configure environment variables
cp .env.example .env

# 3. Seed demo books (30), members (10), transactions, fines, and accounts
npm run seed

# 4. (Optional) Provision an additional librarian account
npm run create-librarian -- new.librarian@college.edu strongpassword123

# 5. Start full-stack server (Express API + Vite middleware on port 3000)
npm run dev
```

### Verification & Production Scripts

```bash
# Type-check entire TypeScript codebase (client + server)
npm run lint

# Build production frontend bundle into dist/
npm run build

# Run in production mode (serves dist/ + /api)
NODE_ENV=production npm start
```

Open `http://localhost:3000` in any modern browser (Chrome, Firefox, Safari, or Edge).
