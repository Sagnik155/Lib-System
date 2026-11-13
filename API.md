# Library Management System API Documentation

Base path: `/api`

All dates are formatted as calendar day strings in India Standard Time: `YYYY-MM-DD`.

---

## 1. Authentication & Activation

### POST `/api/auth/login`
Authenticates a user and issues a signed JWT.

* **Request Body:**
  ```json
  {
    "email": "librarian@college.edu",
    "password": "password123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "usr_librarian_1",
      "email": "librarian@college.edu",
      "role": "librarian"
    }
  }
  ```

### POST `/api/auth/activate`
Student account activation. Student must be pre-registered by the librarian.

* **Request Body:**
  ```json
  {
    "email": "aarav.sharma@college.edu",
    "password": "newSecurePassword123"
  }
  ```
* **Response (201 Created):** Returns JWT token and linked student user object.

### GET `/api/auth/me`
Returns authenticated user profile.
* **Header:** `Authorization: Bearer <token>`

---

## 2. Members Management (Librarian Only)

* `GET /api/members?search=` — List all registered members with active loan count and unpaid fines.
* `GET /api/members/:id` — Get single member details.
* `POST /api/members` — Register new member (`fullName`, `email`, `phone`, `membershipType`, `memberCode`).
* `PUT /api/members/:id` — Update contact information or toggle status (`Active` / `Inactive`).
* `DELETE /api/members/:id` — Delete member (Blocked if member has active loans).

---

## 3. Books & Catalogue

* `GET /api/books` — List all books.
* `GET /api/search?q=&category=&availability=` — Search across title, author, category, ISBN. Calculates earliest expected return date if copies = 0.
* `POST /api/books` — Add book (`isbn`, `title`, `authorName`, `categoryName`, `totalCopies`).
* `PUT /api/books/:id` — Update book details including ISBN, title, author, category, publisher, and copy count.
* `DELETE /api/books/:id` — Delete book (Blocked if active loans exist).
* `POST /api/books/import` — Bulk import up to 1,000 rows from client-parsed Excel or CSV.

---

## 4. Circulation Desks

### POST `/api/issues`
Issue a book to a member.
* **Body:**
  ```json
  {
    "bookId": "bk_1",
    "memberCode": "M001"
  }
  ```
* **Failure Response (400 Bad Request):**
  ```json
  {
    "error": {
      "code": "ISSUE_BLOCKED",
      "message": "Cannot issue book: NO_COPIES, UNPAID_FINE",
      "details": {
        "failureReasons": ["NO_COPIES", "UNPAID_FINE"]
      }
    }
  }
  ```
* **Success Response (201 Created):** Returns transaction record and `IssueSlipData`.

### POST `/api/returns/:transactionId`
Return an issued book. Automatically increments shelf stock and generates late fines if returned after due date (₹5/day).
* **Success Response (200 OK):** Returns transaction record, fine record (if any), and `ReturnSlipData`.

---

## 5. Fines Management

* `GET /api/fines?status=Unpaid|Paid` — List fines with borrower and book information.
* `POST /api/fines/:id/pay` — Pay fine in full. Updates status to `Paid` and returns `PaymentSlipData`.

---

## 6. Student Portal Endpoints

* `GET /api/me/books` — Currently borrowed books with days remaining countdown & overdue flags, plus borrowing history.
* `GET /api/me/fines` — Outstanding and cleared fines for authenticated student.
