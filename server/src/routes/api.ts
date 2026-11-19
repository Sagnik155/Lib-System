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
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

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

router.get('/auth/me', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await AuthService.getCurrentUser(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ======================== CATALOGUE & SEARCH (ANY LOGGED IN USER) ========================
router.get('/books', async (_req, res, next) => {
  try {
    res.json(await CatalogueService.getAllBooks());
  } catch (err) {
    next(err);
  }
});

router.get('/books/:id', async (req, res, next) => {
  try {
    res.json(await CatalogueService.getBookById(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/authors', async (_req, res, next) => {
  try {
    res.json(await CatalogueService.getAllAuthors());
  } catch (err) {
    next(err);
  }
});

router.get('/categories', async (_req, res, next) => {
  try {
    res.json(await CatalogueService.getAllCategories());
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q as string;
    const category = req.query.category as string;
    const availability = req.query.availability as any;
    res.json(await SearchService.search(q, category, availability));
  } catch (err) {
    next(err);
  }
});

// ======================== STUDENT SCOPED ROUTES ========================
router.get('/me/books', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.memberId) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'User is not linked to a student member profile' },
      });
      return;
    }
    res.json(await DashboardService.getStudentBooks(req.user.memberId));
  } catch (err) {
    next(err);
  }
});

router.get('/me/fines', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.memberId) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'User is not linked to a student member profile' },
      });
      return;
    }
    res.json(await DashboardService.getStudentFines(req.user.memberId));
  } catch (err) {
    next(err);
  }
});

// ======================== LIBRARIAN ONLY ROUTES ========================
router.use(roleMiddleware(['librarian']));

// Member Management
router.get('/members', async (req, res, next) => {
  try {
    const search = req.query.search as string;
    res.json(await MemberService.getAllMembers(search));
  } catch (err) {
    next(err);
  }
});

router.get('/members/:id', async (req, res, next) => {
  try {
    res.json(await MemberService.getMemberById(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/members', async (req, res, next) => {
  try {
    const member = await MemberService.createMember(req.body);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

router.put('/members/:id', async (req, res, next) => {
  try {
    const member = await MemberService.updateMember(req.params.id, req.body);
    res.json(member);
  } catch (err) {
    next(err);
  }
});

router.delete('/members/:id', async (req, res, next) => {
  try {
    await MemberService.deleteMember(req.params.id);
    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Catalogue Management
router.post('/books', async (req, res, next) => {
  try {
    const book = await CatalogueService.createBook(req.body);
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

router.put('/books/:id', async (req, res, next) => {
  try {
    const book = await CatalogueService.updateBook(req.params.id, req.body);
    res.json(book);
  } catch (err) {
    next(err);
  }
});

router.delete('/books/:id', async (req, res, next) => {
  try {
    await CatalogueService.deleteBook(req.params.id);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/books/import', async (req, res, next) => {
  try {
    const result = await CatalogueService.bulkImport(req.body.rows);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Authors & Categories Management
router.post('/authors', async (req, res, next) => {
  try {
    res.status(201).json(await CatalogueService.createAuthor(req.body.name));
  } catch (err) {
    next(err);
  }
});

router.delete('/authors/:id', async (req, res, next) => {
  try {
    await CatalogueService.deleteAuthor(req.params.id);
    res.json({ message: 'Author deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    res.status(201).json(await CatalogueService.createCategory(req.body.name));
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    await CatalogueService.deleteCategory(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Issue & Return Desks
router.get('/issues/active', async (req, res, next) => {
  try {
    const search = req.query.search as string;
    res.json(await IssueReturnService.getActiveLoans(search));
  } catch (err) {
    next(err);
  }
});

router.post('/issues', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { bookId, memberCode } = req.body;
    const result = await IssueReturnService.issueBook(bookId, memberCode, req.user!.userId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/returns/:transactionId', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await IssueReturnService.returnBook(req.params.transactionId, req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/returns/history', async (req, res, next) => {
  try {
    const search = req.query.search as string;
    res.json(await IssueReturnService.getReturnedLoans(search));
  } catch (err) {
    next(err);
  }
});

// Fines Management
router.get('/fines', async (req, res, next) => {
  try {
    const status = req.query.status as any;
    res.json(await FineService.getFines(status));
  } catch (err) {
    next(err);
  }
});

router.post('/fines/:id/pay', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await FineService.payFine(req.params.id, req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Dashboard Analytics & Overdue Reports
router.get('/dashboard', async (_req, res, next) => {
  try {
    res.json(await DashboardService.getDashboardStats());
  } catch (err) {
    next(err);
  }
});

router.get('/reports/overdue', async (_req, res, next) => {
  try {
    res.json(await DashboardService.getOverdueReport());
  } catch (err) {
    next(err);
  }
});

export default router;
