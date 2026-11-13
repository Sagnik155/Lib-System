import { Router, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthenticatedRequest } from '../middleware/auth.ts';
import { AuthService } from '../services/authService.ts';
import { MemberService } from '../services/memberService.ts';
import { CatalogueService } from '../services/catalogueService.ts';
import { SearchService } from '../services/searchService.ts';
import { IssueReturnService } from '../services/issueReturnService.ts';
import { FineService } from '../services/fineService.ts';
import { DashboardService } from '../services/dashboardService.ts';

const router = Router();

// ======================== AUTHENTICATION ========================
// Public: Login
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Public: Student Account Activation
router.post('/auth/activate', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.activateStudent(email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// ======================== PROTECTED ROUTES (DENY BY DEFAULT) ========================
router.use(authMiddleware);

// Current User Profile
router.get('/auth/me', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = AuthService.getCurrentUser(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ======================== CATALOGUE & SEARCH (ANY LOGGED IN USER) ========================
router.get('/books', (_req, res, next) => {
  try {
    res.json(CatalogueService.getAllBooks());
  } catch (err) {
    next(err);
  }
});

router.get('/books/:id', (req, res, next) => {
  try {
    res.json(CatalogueService.getBookById(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/authors', (_req, res, next) => {
  try {
    res.json(CatalogueService.getAllAuthors());
  } catch (err) {
    next(err);
  }
});

router.get('/categories', (_req, res, next) => {
  try {
    res.json(CatalogueService.getAllCategories());
  } catch (err) {
    next(err);
  }
});

// Multi-attribute search with availability & earliest expected return
router.get('/search', (req, res, next) => {
  try {
    const q = req.query.q as string;
    const category = req.query.category as string;
    const availability = req.query.availability as any;
    res.json(SearchService.search(q, category, availability));
  } catch (err) {
    next(err);
  }
});

// ======================== STUDENT SCOPED ROUTES ========================
// Server-side student scoping: uses req.user.memberId exclusively
router.get('/me/books', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.memberId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'User is not linked to a student member profile' } });
      return;
    }
    res.json(DashboardService.getStudentBooks(req.user.memberId));
  } catch (err) {
    next(err);
  }
});

router.get('/me/fines', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.memberId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'User is not linked to a student member profile' } });
      return;
    }
    res.json(DashboardService.getStudentFines(req.user.memberId));
  } catch (err) {
    next(err);
  }
});

// ======================== LIBRARIAN ONLY ROUTES ========================
router.use(roleMiddleware(['librarian']));

// Member Management
router.get('/members', (req, res, next) => {
  try {
    const search = req.query.search as string;
    res.json(MemberService.getAllMembers(search));
  } catch (err) {
    next(err);
  }
});

router.get('/members/:id', (req, res, next) => {
  try {
    res.json(MemberService.getMemberById(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/members', (req, res, next) => {
  try {
    const member = MemberService.createMember(req.body);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

router.put('/members/:id', (req, res, next) => {
  try {
    const member = MemberService.updateMember(req.params.id, req.body);
    res.json(member);
  } catch (err) {
    next(err);
  }
});

router.delete('/members/:id', (req, res, next) => {
  try {
    MemberService.deleteMember(req.params.id);
    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Catalogue Management
router.post('/books', (req, res, next) => {
  try {
    const book = CatalogueService.createBook(req.body);
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

router.put('/books/:id', (req, res, next) => {
  try {
    const book = CatalogueService.updateBook(req.params.id, req.body);
    res.json(book);
  } catch (err) {
    next(err);
  }
});

router.delete('/books/:id', (req, res, next) => {
  try {
    CatalogueService.deleteBook(req.params.id);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Bulk Import Books
router.post('/books/import', (req, res, next) => {
  try {
    const result = CatalogueService.bulkImport(req.body.rows);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Authors & Categories Management
router.post('/authors', (req, res, next) => {
  try {
    res.status(201).json(CatalogueService.createAuthor(req.body.name));
  } catch (err) {
    next(err);
  }
});

router.delete('/authors/:id', (req, res, next) => {
  try {
    CatalogueService.deleteAuthor(req.params.id);
    res.json({ message: 'Author deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', (req, res, next) => {
  try {
    res.status(201).json(CatalogueService.createCategory(req.body.name));
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', (req, res, next) => {
  try {
    CatalogueService.deleteCategory(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Issue & Return Desks
router.get('/issues/active', (req, res, next) => {
  try {
    const search = req.query.search as string;
    res.json(IssueReturnService.getActiveLoans(search));
  } catch (err) {
    next(err);
  }
});

router.post('/issues', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { bookId, memberCode } = req.body;
    const result = IssueReturnService.issueBook(bookId, memberCode, req.user!.userId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/returns/:transactionId', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = IssueReturnService.returnBook(req.params.transactionId, req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/returns/history', (req, res, next) => {
  try {
    const search = req.query.search as string;
    res.json(IssueReturnService.getReturnedLoans(search));
  } catch (err) {
    next(err);
  }
});

// Fines Management
router.get('/fines', (req, res, next) => {
  try {
    const status = req.query.status as any;
    res.json(FineService.getFines(status));
  } catch (err) {
    next(err);
  }
});

router.post('/fines/:id/pay', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = FineService.payFine(req.params.id, req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Dashboard Analytics & Overdue Reports
router.get('/dashboard', (_req, res, next) => {
  try {
    res.json(DashboardService.getDashboardStats());
  } catch (err) {
    next(err);
  }
});

router.get('/reports/overdue', (_req, res, next) => {
  try {
    res.json(DashboardService.getOverdueReport());
  } catch (err) {
    next(err);
  }
});

export default router;
