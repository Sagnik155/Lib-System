# Project Viva & Study Guide (48 Questions & Model Answers)

A balanced, beginner-to-intermediate preparation guide of **48 questions and model answers** covering foundational web concepts (`npm`, Node.js, React, Express, TypeScript), project commands, folder structure, **code-change impact scenarios**, core library workflows, and constructive system limitations.

---

## Table of Contents

- [Part 1: Beginner Fundamentals & Core Technologies (Q1–Q10)](#part-1-beginner-fundamentals--core-technologies-q1q10)
- [Part 2: Project Structure, Commands & Data Flow (Q11–Q18)](#part-2-project-structure-commands--data-flow-q11q18)
- [Part 3: Code Impact — "What Happens If You Change..." (Q19–Q26)](#part-3-code-impact--what-happens-if-you-change-q19q26)
- [Part 4: Features, Security & Library Business Rules (Q27–Q40)](#part-4-features-security--library-business-rules-q27q40)
- [Part 5: Offline Mode, Limitations & Future Improvements (Q41–Q48)](#part-5-offline-mode-limitations--future-improvements-q41q48)

---

## Part 1: Beginner Fundamentals & Core Technologies (Q1–Q10)

### Q1. What is `npm`, and why is it used in this project?
**Model Answer:**  
`npm` stands for **Node Package Manager**. It is the default package manager and command runner for JavaScript/Node.js projects. In this project, `npm` serves two main roles:
1. **Managing external libraries:** Running `npm install` reads `package.json` and downloads all required packages (like React, Express, `mongodb`, Tailwind CSS, `bcryptjs`, `jspdf`, and `xlsx`) into the `node_modules/` folder so we do not have to write database drivers, cryptography, PDF generation, or spreadsheet parsing from scratch.
2. **Running project scripts:** Commands like `npm run dev`, `npm run seed`, `npm run migrate-json`, and `npm run build` execute shortcuts configured in `package.json`.

### Q2. What is the difference between `package.json` and `node_modules/`?
**Model Answer:**  
- `package.json` is the lightweight blueprint/manifest of the project: it lists the project name, scripts (`dev`, `build`, `lint`, `seed`, `migrate-json`), and the names/versions of required packages.
- `node_modules/` is the large generated folder containing the actual downloaded source code of all packages listed in `package.json` (plus their sub-dependencies). You commit `package.json` to Git, while `node_modules/` is ignored and recreated anytime via `npm install`.

### Q3. What is the difference between `dependencies` and `devDependencies` in `package.json`?
**Model Answer:**  
- `dependencies` are libraries needed by the application while it is **running** for end users (e.g., `react`, `express`, `mongodb`, `jsonwebtoken`, `bcryptjs`, `jspdf`, `xlsx`).
- `devDependencies` are tools only needed by the developer during **coding, type-checking, or building** (e.g., `typescript`, `tsx`, `@types/react`, `@types/express`, `tailwindcss`).

### Q4. What is Node.js, and why do we need it if React runs in the browser?
**Model Answer:**  
Browsers run frontend JavaScript (React UI), but browsers cannot securely hold database credentials, connect directly to MongoDB Atlas, verify secret JWT keys, or enforce library rules where users cannot tamper with them. **Node.js** lets us run JavaScript/TypeScript on the **server side** (outside the browser) so Express can handle API requests, hash passwords, query MongoDB Atlas securely via `MONGODB_URI`, and enforce access control safely.

### Q5. What is TypeScript, and why did we use `.ts` / `.tsx` files instead of plain `.js` / `.jsx`?
**Model Answer:**  
**TypeScript** is JavaScript with static type checking. Using `.ts` (logic/backend) and `.tsx` (React UI with JSX) lets us define exact shapes for objects like `Book`, `Member`, `Transaction`, and `Fine` (`server/src/models/types.ts` and `src/types/index.ts`). If someone misspells a property name or passes a string where a number is expected, TypeScript catches the bug at compile/lint time before a user ever hits it in the browser.

### Q6. What is React, and how are pages and reusable UI pieces organized?
**Model Answer:**  
**React** is a frontend library for building interactive user interfaces out of reusable **components**. In this project:
- `src/pages/` contains full screen views (`DashboardPage.tsx`, `CataloguePage.tsx`, `IssueBookPage.tsx`, `ReturnBookPage.tsx`, `FinesPage.tsx`, `MembersPage.tsx`, `StudentAccountPage.tsx`, `LoginPage.tsx`).
- `src/components/` contains shared layout and modal pieces (`Sidebar.tsx`, `TopBar.tsx`, `SlipModal.tsx`).
- React **state** (`useState`) stores data inside a component (like search text or loaded books), and **effects** (`useEffect`) fetch data from the backend when a page loads or filters change.

### Q7. What is Vite, and why is it used alongside React?
**Model Answer:**  
Modern browsers cannot directly run `.tsx` files or TypeScript imports natively. **Vite** is a fast frontend build tool and development bundler. During development (`npm run dev`), Vite compiles `.tsx` and Tailwind CSS instantly as the browser requests them. For production (`npm run build`), Vite bundles and minifies all React code into optimized static HTML, CSS, and JS files inside `dist/`.

### Q8. What is Tailwind CSS, and why do you see class names like `bg-white rounded-2xl border border-slate-200`?
**Model Answer:**  
**Tailwind CSS** (v4 via `@tailwindcss/vite` and `@import "tailwindcss";` in `src/index.css`) is a utility-first CSS framework. Instead of writing separate `.css` files and inventing custom class names for every card or button, we compose small utility classes (`bg-white`, `p-5`, `rounded-2xl`, `text-emerald-700`) directly on JSX elements, keeping spacing, colors, and responsive layouts consistent across the whole app.

### Q9. What is Express.js, and what is a REST API?
**Model Answer:**  
**Express.js** is a lightweight web framework for Node.js that listens for HTTP requests and routes them to handler functions. A **REST API** organizes backend endpoints around resources (like `/api/books`, `/api/members`, `/api/fines`) using standard HTTP methods:
- `GET` to read data (e.g., `GET /api/books`)
- `POST` to create records or trigger actions (e.g., `POST /api/issues`)
- `PUT` to update existing records (e.g., `PUT /api/books/:id`)
- `DELETE` to remove records (e.g., `DELETE /api/books/:id`)

### Q10. What does `localhost:3000` mean when you open the project in a browser?
**Model Answer:**  
- `localhost` (or `127.0.0.1`) refers to your **own computer** acting as both the server and the client.
- `:3000` is the **network port** number where our Express + Vite server listens for incoming web traffic (`PORT = 3000` in `server.ts`). Multiple programs can run on one machine at the same time because each listens on a different port.

---

## Part 2: Project Structure, Commands & Data Flow (Q11–Q18)

### Q11. Walk through the main folders of the project and what each one is responsible for.
**Model Answer:**  
- `server.ts` — The single entry point that connects to MongoDB Atlas (`connectDb()`), boots the Express API, auto-seeds if empty, and mounts Vite (in dev) or static `dist/` files (in production).
- `server/src/routes/` — Maps URL paths (`/api/books`, `/api/issues`, etc.) to async backend service calls.
- `server/src/middleware/` — Runs shared security and error-handling checks (`auth.ts` for JWT/roles, `errorHandler.ts` for clean JSON errors).
- `server/src/services/` — Holds all library business logic (`CatalogueService`, `IssueReturnService`, `FineService`, `MemberService`, `SearchService`, `DashboardService`, `AuthService`).
- `server/src/config/db.ts` — Manages the `MongoClient` connection to MongoDB Atlas, creates indexes across all 7 collections, and exposes atomic `findOneAndUpdate` helper methods.
- `server/scripts/` — CLI scripts for seeding demo data (`seed.ts`), migrating legacy JSON data (`migrateFromJson.ts`), and creating librarian accounts (`createLibrarian.ts`).
- `src/` — The entire React frontend (`pages/`, `components/`, `context/`, `utils/`, `types/`).

### Q12. What does `npm run dev` do step-by-step?
**Model Answer:**  
1. Runs `tsx server.ts` (using `tsx` so Node executes TypeScript directly without a manual build step).
2. Loads environment variables via `dotenv/config` (including `MONGODB_URI`).
3. Calls `await connectDb()` to connect to MongoDB Atlas, verify the connection with a ping, and ensure unique/query indexes exist; if the `books` or `users` collection is empty, runs `runSeed()` automatically so demo data is ready immediately.
4. Registers JSON parsing, security headers, `/api/health`, and `/api/*` REST routes.
5. Attaches Vite dev middleware for the React frontend and starts listening on port `3000`.

### Q13. What is the difference between `npm run seed`, `npm run migrate-json`, and `npm run create-librarian`?
**Model Answer:**  
- `npm run seed` executes `server/scripts/seed.ts` to reset and populate MongoDB Atlas with sample books (30 titles), authors, categories, members (10 students), sample loans (active, overdue, returned), fines, and demo user accounts.
- `npm run migrate-json` executes `server/scripts/migrateFromJson.ts` to import an existing local `.db_store.json` snapshot directly into the 7 MongoDB Atlas collections.
- `npm run create-librarian -- <email> <password>` executes `server/scripts/createLibrarian.ts` to safely insert a **new custom librarian login** into the MongoDB `users` collection with a bcrypt-hashed password, without resetting existing books or transactions.

### Q14. What do `npm run lint` and `npm run build` check, and when should you run them?
**Model Answer:**  
- `npm run lint` runs `tsc --noEmit` to verify there are no TypeScript errors or broken imports across both `src/` and `server/`.
- `npm run build` runs `vite build` to test that the React app bundles cleanly into `dist/` for production.
Running both after editing code guarantees the project compiles and type-checks before deployment or demoing.

### Q15. Trace what happens from the moment a librarian clicks "Confirm Issue" in the browser until the Issue Slip appears.
**Model Answer:**  
1. `IssueBookPage.tsx` calls `api.post('/issues', { bookId, memberCode })`.
2. `ApiClient` (`src/utils/api.ts`) attaches `Authorization: Bearer <jwt>` and sends an HTTP `POST` to `/api/issues`.
3. Express passes the request through `authMiddleware` (verifies JWT) and `roleMiddleware(['librarian'])` (verifies role).
4. `IssueReturnService.issueBook()` checks all eligibility rules against MongoDB Atlas, atomically decrements `availableCopies` via `db.atomicIssueCopy()` (`findOneAndUpdate`), inserts the `Transaction` document with a 14-day IST `dueDate` into `db.transactions`, and builds an `IssueSlipData` object.
5. The server responds with HTTP `201`, and `IssueBookPage` opens `SlipModal` with the returned slip and refreshes the books/members lists.

### Q16. How does MongoDB Atlas store the library data, and why are custom string `id` fields kept alongside MongoDB `_id`?
**Model Answer:**  
`server/src/config/db.ts` connects to MongoDB Atlas using **Mongoose over TLS** (`mongoose.connect(MONGODB_URI)`) with 7 Mongoose Schemas & Models (`server/src/models/mongooseModels.ts`) mapped to `authors`, `categories`, `books`, `members`, `users`, `transactions`, and `fines` inside `library_db`. Each document keeps a readable string `id` (`bk_1`, `mem_1`, `txn_101`, `fine_1`) enforced by a unique index, and queries strip internal `_id` via `{ projection: { _id: 0 } }` so receipts, API responses, and the React UI remain clean and consistent.

### Q17. Why does `server.ts` parse `--port` and `--host` CLI flags and attach Vite HMR to `httpServer`?
**Model Answer:**  
Preview and container platforms often launch the app with CLI flags like `--port 3000 --host 0.0.0.0` while another environment variable (`PORT=8080`) or Vite's default HMR port (`24678`) might already be occupied. Parsing CLI `--port`/`--host` first and binding Vite HMR onto the existing `httpServer` (or disabling HMR when `DISABLE_HMR=true`) ensures the app boots cleanly on port `3000` without port-collision crashes.

### Q18. Why does the server return `JSON` error objects (`AppError` + `errorHandler`) instead of crashing or returning plain text?
**Model Answer:**  
In `server/src/middleware/errorHandler.ts`, services throw structured `AppError(message, statusCode, code, details)` errors. `errorHandler` catches them and always sends JSON in a consistent format (`{ error: { code, message, details? } }`). That prevents server crashes on bad user input and lets the React UI display helpful, specific feedback (such as `DUPLICATE_ISBN` or `LIMIT_REACHED`).

---

## Part 3: Code Impact — "What Happens If You Change..." (Q19–Q26)

### Q19. What happens if you change `LOAN_DAYS`, `FINE_RATE_PER_DAY`, or `MAX_BORROW_LIMIT` in `server/src/utils/constants.ts`?
**Model Answer:**  
- **Changing `LOAN_DAYS` (from `14` to `21`):** All **newly issued** books from that moment forward will receive a 21-day `dueDate`. Existing active loans keep the `dueDate` already stored on their transaction record.
- **Changing `FINE_RATE_PER_DAY` (from `5` to `10`):** Immediately changes the live accrued fine calculation on the Dashboard, Student `My Account`, Return Desk, and any **newly returned** overdue books. Already-generated fines in `db.fines` keep their saved `amount`.
- **Changing `MAX_BORROW_LIMIT` (from `5` to `3`):** Immediately blocks members who already hold 3 or more active loans from issuing another book on the backend. Note that `IssueBookPage.tsx` also displays `>= 5` in its live UI preview text, so updating the UI threshold to match keeps the frontend and backend consistent.

### Q20. What happens if `MONGODB_URI` is missing, malformed, or your IP address is not whitelisted in MongoDB Atlas?
**Model Answer:**  
During startup, `server.ts` calls `await connectDb()` before starting the HTTP server:
- If `MONGODB_URI` is missing or still contains the `<username>` placeholder, `connectDb()` immediately throws a clear configuration error and exits cleanly so the server never boots in a half-broken state.
- If the Atlas credentials are wrong or the server's IP is not allowed in Atlas **Network Access**, `MongoClient.connect()` times out (`serverSelectionTimeoutMS: 10000`) and logs the authentication/network error so you know to verify the URI and IP allowlist.

### Q21. What happens if someone edits the React code in the browser DevTools to pretend they are a `'librarian'` while logged in as a `'student'`?
**Model Answer:**  
They might momentarily reveal librarian UI tabs on their screen, **but every administrative action will fail with HTTP `403 FORBIDDEN`**. Why? Because Express checks the role inside the cryptographically signed JWT token on the server (`roleMiddleware(['librarian'])` in `server/src/routes/api.ts`), and a student cannot forge a librarian JWT without knowing the server's `JWT_SECRET`.

### Q22. What happens if you remove `roleMiddleware(['librarian'])` from `server/src/routes/api.ts`?
**Model Answer:**  
Because Express applies `roleMiddleware(['librarian'])` as a single gatekeeper before all admin routes (`/members`, `/books` POST/PUT/DELETE, `/issues`, `/returns`, `/fines`, `/dashboard`), removing that single line would allow **any authenticated student** with a valid token to issue books to themselves, delete books, or mark their own fines as paid via API calls.

### Q23. What happens if you drop all collections in MongoDB Atlas and restart the server?
**Model Answer:**  
On startup, `server.ts` checks `await db.books.countDocuments()` and `await db.users.countDocuments()`. When either collection is `0`, `server.ts` automatically runs `runSeed()`, which repopulates MongoDB Atlas with the 30 sample books, 10 members, sample loans, fines, and default demo accounts—recreating a fresh demo dataset.

### Q24. If you edit a backend file (`server/src/...`) vs. a frontend file (`src/...`), what needs to reload for changes to take effect?
**Model Answer:**  
- **Editing a frontend file (`src/...`):** In dev mode (`npm run dev`), Vite compiles the updated file on the next browser refresh (or immediately if HMR is enabled). In production (`npm start`), you must run `npm run build` again so `dist/` updates.
- **Editing a backend file (`server/...` or `server.ts`):** Express runs inside the single `tsx server.ts` Node process, so you must **restart the server** (`npm run dev`) for backend route or service changes to take effect.

### Q25. What happens if you change a field name (e.g., renaming `availableCopies` to `stockCount`) in `server/src/models/types.ts` without updating the rest of the code?
**Model Answer:**  
Because TypeScript connects shared types across services and API responses, `npm run lint` (`tsc --noEmit`) will immediately flag every file referencing `.availableCopies` (`db.ts`, `CatalogueService`, `IssueReturnService`, `SearchService`, `DashboardService`). Running `tsc --noEmit` gives you an exact checklist of every line that must be updated so nothing breaks silently at runtime.

### Q26. What happens if `VITE_API_BASE_URL` is changed in `.env`?
**Model Answer:**  
`src/utils/api.ts` reads `import.meta.env.VITE_API_BASE_URL || '/api'`. By default, `/api` sends requests to the same server (`http://localhost:3000/api`) that served the React page. Changing `VITE_API_BASE_URL` redirects all frontend API calls to a different backend URL (useful if hosting frontend and backend separately, though the backend would then need CORS headers enabled).

---

## Part 4: Features, Security & Library Business Rules (Q27–Q40)

### Q27. How does Student Account Activation work, and why is it separate from normal Sign-Up?
**Model Answer:**  
In a college library, arbitrary strangers on the internet shouldn't be able to create library memberships themselves. First, a librarian registers the student's institutional email and details in **Members**. Then, on the Login page's **Activate Student Account** tab (`POST /api/auth/activate`), the student enters that registered email and sets a password (minimum 6 characters). The server verifies the email exists in `db.members` and assigns `role: 'student'` strictly on the backend.

### Q28. How are passwords protected in MongoDB Atlas?
**Model Answer:**  
Passwords are never saved in plain text. `bcryptjs` hashes every password with `10` salt rounds (`bcrypt.hash(password, 10)`), producing a one-way salted hash stored in the `passwordHash` field of the `users` collection in MongoDB Atlas. During login, `bcrypt.compare(password, user.passwordHash)` verifies the password without ever decrypting it.

### Q29. What is a JWT (JSON Web Token), and how does this app use it after login?
**Model Answer:**  
A **JWT** is a digitally signed token returned by `/api/auth/login` or `/api/auth/activate` containing `{ userId, email, role, memberId }`. The React client stores it in `localStorage` (`library_jwt_token`) and sends it on every API request in the `Authorization: Bearer <token>` header. On the backend, `authMiddleware` verifies the signature using `JWT_SECRET` so the server knows who is making the request without storing session memory.

### Q30. How do `/api/me/books` and `/api/me/fines` make sure one student cannot view another student's records?
**Model Answer:**  
These endpoints do **not** accept a `memberId` from the URL or request body. Instead, `server/src/routes/api.ts` reads `req.user.memberId` directly from the verified JWT decoded by `authMiddleware`. Because a student cannot alter their signed JWT, they can only ever read their own loans and fines.

### Q31. What are all 6 conditions checked before issuing a book (`IssueReturnService.issueBook`)?
**Model Answer:**  
1. Book exists (`BOOK_NOT_FOUND`)
2. Member exists (`MEMBER_NOT_FOUND`)
3. Book has at least 1 shelf copy (`NO_COPIES`)
4. Member status is `'Active'` (`MEMBER_INACTIVE`)
5. Member has zero unpaid fines (`UNPAID_FINE`)
6. Member currently holds fewer than `5` issued books (`LIMIT_REACHED`)

If multiple checks fail at once, the backend collects **all** applicable codes into `failureReasons` and returns HTTP `400 ISSUE_BLOCKED` so the librarian sees every reason clearly at once.

### Q32. Why does the backend use MongoDB transactions (`withTransaction`) and atomic helpers (`atomicIssueCopy`, `atomicReturnCopy`, `atomicPayFine`) in `db.ts`?
**Model Answer:**  
Book Issue and Book Return run inside **multi-document MongoDB ACID transactions** (`db.withTransaction` via `mongoose.startSession()`) combined with atomic conditional `findOneAndUpdate()` filters so stock changes and transaction/fine writes either commit together or roll back completely:
- `atomicIssueCopy` filters `{ id: bookId, availableCopies: { $gt: 0 } }` and decrements `availableCopies` inside the same transaction session as inserting the `Transaction` document, ensuring stock never drops below `0`.
- `atomicReturnCopy` filters `{ id: bookId, $expr: { $lt: ['$availableCopies', '$totalCopies'] } }` inside the same transaction session as marking the loan `'Returned'` and inserting any late fine.
- `atomicPayFine` filters `{ id: fineId, status: 'Unpaid' }` and sets `status: 'Paid'`, ensuring a fine can never be double-paid.

### Q33. How does the app calculate overdue days and late fines without timezone bugs?
**Model Answer:**  
In `server/src/utils/dateHelper.ts`, `getTodayIndiaString()` formats the current date specifically in `Asia/Kolkata` as a `YYYY-MM-DD` string. `addDays()` and `diffInDays()` convert those calendar dates to UTC midnight (`Date.UTC`) and divide by `86,400,000` ms. This guarantees a 14-day loan and `₹5/day` late fine are always calculated on whole Indian calendar days—even if the server is hosted in another country's timezone.

### Q34. What happens when a librarian tries to add a book with an ISBN that already exists?
**Model Answer:**  
`CatalogueService.createBook` detects the duplicate ISBN (case-insensitive) and returns HTTP `409 DUPLICATE_ISBN` along with the existing book's details (`details.existingBook`). In `CataloguePage.tsx`, the modal flags the ISBN input as invalid, explains which book already owns that ISBN, and provides an **Edit Existing Book** button so the librarian can update that book directly.

### Q35. How does bulk Excel/CSV book import (`Import Excel/CSV`) work?
**Model Answer:**  
In the browser (`CataloguePage.tsx`), the SheetJS library (`xlsx`) parses the first sheet of an uploaded `.xlsx` or `.csv` file into JSON rows (`isbn`, `title`, `author`, `category`, `publisher`, `total_copies`) and sends them to `POST /api/books/import`. The backend caps batches at `1,000` rows, skips invalid rows or duplicate ISBNs (without overwriting existing titles), auto-creates missing authors/categories, and returns an import summary detailing imported vs. skipped rows.

### Q36. How does the Dashboard's clickable KPI drill-down work?
**Model Answer:**  
All 8 metric blocks on `DashboardPage.tsx` (such as `Borrowed Books`, `Overdue Books`, `Zero-Stock Titles`, and `Pending Fines`) are interactive buttons. Clicking one calls `onNavigateTo(tab, preset)` in `App.tsx`, which switches to the target page (`ReturnBookPage`, `CataloguePage`, `MembersPage`, or `FinesPage`) and passes a preset filter plus an incrementing trigger counter (`modeTrigger`, `availabilityTrigger`, etc.) so the destination opens pre-filtered to those exact records.

### Q37. What rules prevent accidental deletion of books, members, authors, or categories?
**Model Answer:**  
- A **Book** or **Member** cannot be deleted if they have any active transaction with `status === 'Issued'` (`BOOK_HAS_ACTIVE_LOANS` / `ACTIVE_TRANSACTIONS_EXIST`).
- An **Author** or **Category** cannot be deleted while any book in the catalogue still references it (`AUTHOR_HAS_BOOKS` / `CATEGORY_HAS_BOOKS`).
- A book's `totalCopies` cannot be reduced below the number of copies currently checked out (`COPIES_LESS_THAN_ISSUED`).

### Q38. How does the Return Book Desk handle both active returns and completed return history?
**Model Answer:**  
`ReturnBookPage.tsx` provides three modes: **Active Loans** (`GET /api/issues/active`), **Overdue Only** (client-filtered active loans where `isOverdue === true`), and **Completed Returns** (`GET /api/returns/history`, sorted newest-first). Confirming a return calls `POST /api/returns/:transactionId`, restocks the copy, generates an `Unpaid` fine if late, and opens the `Return` slip modal.

### Q39. How do "Print Slip" and "Save PDF" work in `SlipModal.tsx` without printing the sidebar or triggering popup blockers?
**Model Answer:**  
- **Print Slip:** Instead of `window.open()` or printing the whole page with `window.print()`, `SlipModal` writes clean, standalone HTML receipt markup into a hidden `<iframe srcDoc>` and prints only `iframe.contentWindow`—hiding all app navigation chrome.
- **Save PDF:** Uses `jsPDF` (`a5` portrait) to lay out wrapped text fields cleanly and download a file like `Library_ISSUE_Slip_<ref>.pdf`. (User inputs are also escaped via `escapeHtml()` before rendering inside the print frame.)

### Q40. How does "Reprint Receipt" work on the Fines & Receipts page?
**Model Answer:**  
Under the **Cleared / Paid History** tab in `FinesPage.tsx`, every paid fine has a **Reprint Receipt** button. Clicking it reconstructs the `PaymentSlipData` payload from the stored fine record (`fineId`, `amount`, `paidOn`, `collectedBy`, member, and book details) and opens `SlipModal` so the receipt can be printed or saved as a PDF anytime.

---

## Part 5: Offline Mode, Limitations & Future Improvements (Q41–Q48)

### Q41. How does Offline Catalogue Mode work using IndexedDB?
**Model Answer:**  
Whenever `CataloguePage.tsx` loads books online (`navigator.onLine` is true), `saveCatalogueToCache()` (`src/utils/offlineCache.ts`) saves the catalogue into browser **IndexedDB** (`LibraryAppCatalogueCache`, store `catalogue`) and records the timestamp in `localStorage`. Meanwhile, `TopBar.tsx` listens to browser `online`/`offline` events to show a status pill. If a search request fails due to lost internet, `CataloguePage` catches the network error, loads books from `getCatalogueFromCache()`, and shows an amber `"Offline Mode: Displaying catalogue from local browser cache."` banner.

### Q42. Why is the offline IndexedDB cache cleared when a user logs out?
**Model Answer:**  
In `AuthContext.logout()`, `clearOfflineCache()` wipes the IndexedDB store and sync timestamp so that on shared campus or library computers, the next person using the browser does not inherit cached records from a previous session.

### Q43. How does the PWA Service Worker work alongside IndexedDB when offline?
**Model Answer:**  
`vite-plugin-pwa` generates a Workbox **Service Worker** and Web App Manifest (`manifest.webmanifest`) that precaches the React app shell (HTML, JS, CSS, icons, and fonts) while excluding `/api/*` from navigation fallbacks. Meanwhile, **IndexedDB** (`src/utils/offlineCache.ts`) caches the catalogue JSON data, and `PWAInstallButton` lets users install the app directly onto desktop or mobile. Note that offline mode is intentionally **search/read-only** (book issue, return, and fine payment require live server connectivity).

### Q44. What is one edge case in how `CataloguePage` saves and reads the offline cache during filtered searches?
**Model Answer:**  
`CataloguePage` currently calls `saveCatalogueToCache(booksData)` using the response of `/api/search?...`. If a user applies a narrow filter while online and then goes offline, IndexedDB stores only that filtered subset rather than the full catalogue; additionally, the offline fallback displays the cached list directly without re-filtering locally. A straightforward improvement would be syncing the full `/api/books` list into IndexedDB and filtering that array in JavaScript when offline.

### Q45. What are the trade-offs of using MongoDB Atlas + Mongoose compared to a relational SQL database (like PostgreSQL)?
**Model Answer:**  
- **Benefits:** Cloud-hosted persistence on Atlas works across restarts and deployments, Mongoose schemas & models (`server/src/models/mongooseModels.ts`) map cleanly to TypeScript interfaces across all 7 collections, unique/query indexes keep lookups fast, and Mongoose sessions (`withTransaction`) + `findOneAndUpdate` provide ACID multi-document issue/return safety.
- **Trade-Offs:** Unlike PostgreSQL, MongoDB does not enforce foreign-key constraints automatically at the database level—so referential integrity (blocking deletion of an issued book, an active borrower, or a referenced author/category) is enforced in our Express services and verified by our automated test suite (`npm test` → `server/tests/libraryRules.test.ts`).

### Q46. What security layers are built in, and what demo conveniences should be tightened before deploying to a live campus?
**Model Answer:**  
The Express API applies `helmet`, `cors`, `express-rate-limit` (including stricter auth rate limits), server-side validation, deny-by-default JWT authentication (`authMiddleware`), and role checks (`roleMiddleware`). Before a live campus rollout, three demo conveniences should be tightened:
1. The top-right **Demo Credentials** dropdown on `LoginPage.tsx` displays seeded demo emails and `'password123'` for quick viva/demo walkthroughs—in production it should be removed or hidden behind a dev-only environment flag.
2. `JWT_SECRET` in `server/src/middleware/auth.ts` has a default fallback string if `.env` is missing; production should require a strong secret from environment variables.
3. Student account activation (`POST /api/auth/activate`) checks email registration against `db.members` without sending an email OTP verification link, and JWTs are stored in `localStorage` rather than `HttpOnly` cookies.

### Q47. Why does the system track `totalCopies` and `availableCopies` per book title instead of individual physical copy barcodes?
**Model Answer:**  
Using integer counters (`totalCopies`, `availableCopies`) per ISBN keeps issuing, returning, and bulk Excel importing simple and fast for a college project. The trade-off is that the system tracks *how many* copies are on the shelf rather than *which specific physical copy* (by barcode/accession number and condition) a student borrowed, and there is no hold/reservation queue when all copies are checked out.

### Q48. If you were asked to extend this project next semester, what upgrades would add the most value?
**Model Answer:**  
Matching our Future Scope slide:
1. **Automated Email/SMS Notifications:** Scheduled reminders before due dates, overdue alerts, fine receipts, and book-availability notifications.
2. **Book Reservations & Physical Barcodes:** Add a hold/reservation queue when all copies are out plus individual `BookCopy` accession barcodes/conditions.
3. **Centralised Online Payment Gateway:** Integrate UPI/Razorpay/Stripe so students can settle fines online with automated webhook receipts.
4. **Server-Side Pagination & Search Indexing:** Add cursor/limit pagination and Atlas Search text indexes for 100k+ title university catalogues.
