import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.ts';
import { Book, Category } from '../types/index.ts';
import { saveCatalogueToCache, getCatalogueFromCache } from '../utils/offlineCache.ts';
import { formatDisplayDate } from '../../server/src/utils/dateHelper.ts';
import * as XLSX from 'xlsx';
import {
  Search,
  Plus,
  Upload,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface CataloguePageProps {
  isLibrarian: boolean;
  externalSearch?: string;
  externalSearchTrigger?: number;
  initialAvailability?: 'all' | 'available' | 'unavailable';
  availabilityTrigger?: number;
}

export const CataloguePage: React.FC<CataloguePageProps> = ({
  isLibrarian,
  externalSearch = '',
  externalSearchTrigger = 0,
  initialAvailability = 'all',
  availabilityTrigger = 0,
}) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>(initialAvailability);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Add/Edit Book Form state
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [publisher, setPublisher] = useState('');
  const [totalCopies, setTotalCopies] = useState<number>(3);
  const [formError, setFormError] = useState<string | null>(null);
  const [isIsbnInvalid, setIsIsbnInvalid] = useState(false);
  const [conflictingBook, setConflictingBook] = useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Import state
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importReport, setImportReport] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (externalSearchTrigger > 0) {
      setSearchQuery(externalSearch);
    }
  }, [externalSearch, externalSearchTrigger]);

  useEffect(() => {
    if (availabilityTrigger > 0) {
      setAvailabilityFilter(initialAvailability);
    }
  }, [initialAvailability, availabilityTrigger]);

  const fetchCatalogue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set('q', searchQuery);
      if (selectedCategory !== 'all') queryParams.set('category', selectedCategory);
      if (availabilityFilter !== 'all') queryParams.set('availability', availabilityFilter);

      const [booksData, categoriesData] = await Promise.all([
        api.get<Book[]>(`/search?${queryParams.toString()}`),
        api.get<Category[]>('/categories').catch(() => []),
      ]);

      setBooks(booksData);
      setCategories(categoriesData);

      // Save to IndexedDB cache for offline search
      if (navigator.onLine && booksData.length > 0) {
        await saveCatalogueToCache(booksData);
      }
    } catch (err: any) {
      const cached = await getCatalogueFromCache();
      if (cached && cached.length > 0) {
        setBooks(cached);
        setError('Offline Mode: Displaying catalogue from local browser cache.');
      } else {
        setError(err.message || 'Failed to load catalogue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, [searchQuery, selectedCategory, availabilityFilter]);

  const resetFormState = () => {
    setIsbn('');
    setTitle('');
    setAuthorName('');
    setCategoryName('');
    setPublisher('');
    setTotalCopies(3);
    setFormError(null);
    setIsIsbnInvalid(false);
    setConflictingBook(null);
  };

  const openAddModal = () => {
    resetFormState();
    setShowAddModal(true);
  };

  const openEditModal = (book: Book) => {
    setShowAddModal(false);
    setEditingBook(book);
    setIsbn(book.isbn);
    setTitle(book.title);
    setAuthorName(book.authorName || '');
    setCategoryName(book.categoryName || '');
    setPublisher(book.publisher || '');
    setTotalCopies(book.totalCopies);
    setFormError(null);
    setIsIsbnInvalid(false);
    setConflictingBook(null);
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsIsbnInvalid(false);
    setConflictingBook(null);
    setIsSubmitting(true);

    try {
      await api.post('/books', {
        isbn: isbn.trim(),
        title: title.trim(),
        authorName: authorName.trim(),
        categoryName: categoryName.trim(),
        publisher: publisher.trim(),
        totalCopies,
      });

      setSuccessMsg(`Book "${title.trim()}" added to library catalogue.`);
      setShowAddModal(false);
      resetFormState();
      fetchCatalogue();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.code === 'DUPLICATE_ISBN') {
        setIsIsbnInvalid(true);
        setConflictingBook(err.details?.existingBook || null);
        setFormError(err.message || 'Invalid ISBN: This ISBN already exists in the catalogue.');
      } else {
        setFormError(err.message || 'Failed to add book');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    setFormError(null);
    setIsIsbnInvalid(false);
    setConflictingBook(null);
    setIsSubmitting(true);

    try {
      await api.put(`/books/${editingBook.id}`, {
        isbn: isbn.trim(),
        title: title.trim(),
        authorName: authorName.trim(),
        categoryName: categoryName.trim(),
        publisher: publisher.trim(),
        totalCopies,
      });

      setSuccessMsg(`Book "${title.trim()}" updated successfully.`);
      setEditingBook(null);
      resetFormState();
      fetchCatalogue();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.code === 'DUPLICATE_ISBN') {
        setIsIsbnInvalid(true);
        setConflictingBook(err.details?.existingBook || null);
        setFormError(err.message || 'Invalid ISBN: Another book already uses this ISBN.');
      } else {
        setFormError(err.message || 'Failed to update book');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteBook = async () => {
    if (!deletingBook) return;
    const book = deletingBook;
    setDeletingBook(null);
    setError(null);

    try {
      await api.delete(`/books/${book.id}`);
      setSuccessMsg(`Book "${book.title}" deleted.`);
      fetchCatalogue();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Cannot delete book: active loans exist for this title.');
    }
  };

  // Bulk Import File Handler (xlsx / csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportReport(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setParsedRows(data);
      } catch {
        setImportError('Failed to parse file. Please upload a valid .xlsx or .csv file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportReport(null);
    setImportError(null);

    try {
      const res = await api.post('/books/import', { rows: parsedRows });
      setImportReport(res);
      setSuccessMsg(`Bulk import complete: ${res.importedCount} books imported successfully.`);
      fetchCatalogue();
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadSampleTemplate = () => {
    const sample = [
      {
        isbn: '978-0-13-110362-7',
        title: 'The C Programming Language',
        author: 'Dennis Ritchie',
        category: 'Computer Science',
        publisher: 'Prentice Hall',
        total_copies: 4,
      },
      {
        isbn: '978-0-262-03384-8',
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        category: 'Computer Science',
        publisher: 'MIT Press',
        total_copies: 5,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BooksTemplate');
    XLSX.writeFile(wb, 'library_books_import_template.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Books & Catalogue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search titles, check shelf availability, and manage library inventory
          </p>
        </div>

        {isLibrarian && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setParsedRows([]);
                setImportFileName('');
                setImportReport(null);
                setImportError(null);
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              Import Excel/CSV
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Book
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-800 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Title, Author, Category, or ISBN..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-full px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-full text-[11px] font-semibold">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                availabilityFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                availabilityFilter === 'available' ? 'bg-emerald-600 text-white font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setAvailabilityFilter('unavailable')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                availabilityFilter === 'unavailable' ? 'bg-rose-500 text-white font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Loaned Out (0)
            </button>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">ISBN</th>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4 whitespace-nowrap">Author</th>
                <th className="py-3 px-4 whitespace-nowrap">Category</th>
                <th className="py-3 px-4 whitespace-nowrap">Availability</th>
                <th className="py-3 px-4 whitespace-nowrap">Earliest Return</th>
                {isLibrarian && <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={isLibrarian ? 7 : 6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Searching catalogue...</span>
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={isLibrarian ? 7 : 6} className="py-12 text-center text-slate-400 font-medium">
                    No books matched your search criteria.
                  </td>
                </tr>
              ) : (
                books.map(b => {
                  const isAvailable = b.availableCopies > 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block whitespace-nowrap tabular-nums">
                          {b.isbn}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 min-w-[180px] max-w-[230px]">
                        <span className="block truncate" title={b.title}>
                          {b.title}
                        </span>
                        <span className="block text-[10px] font-normal text-slate-400 truncate">
                          {b.publisher || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">{b.authorName}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium inline-block whitespace-nowrap">
                          {b.categoryName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isAvailable ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="font-bold text-emerald-700 tabular-nums">
                              {b.availableCopies} / {b.totalCopies} available
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                            <span className="font-bold text-rose-600 tabular-nums">
                              0 / {b.totalCopies} on shelf
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {!isAvailable ? (
                          b.earliestExpectedReturnDate ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg text-xs font-semibold border border-amber-200">
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              <span>{formatDisplayDate(b.earliestExpectedReturnDate)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Loan active</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      {isLibrarian && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(b)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingBook(b)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                              title="Delete book"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Book Modal */}
      {(showAddModal || editingBook) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingBook ? 'Edit Book Details' : 'Add New Book to Catalogue'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingBook(null);
                  resetFormState();
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-2">
                <div className="flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p>{formError}</p>
                    {isIsbnInvalid && (
                      <p className="text-[11px] font-normal text-red-700 mt-1">
                        Book addition could not be completed because every book in the catalogue must have a unique ISBN. Would you like to edit the ISBN you entered below, or update the existing book record?
                      </p>
                    )}
                  </div>
                </div>

                {conflictingBook && (
                  <div className="pl-6 pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-red-200/70">
                    <span className="text-[11px] text-red-700">
                      Existing book: <strong>{conflictingBook.title}</strong> ({conflictingBook.authorName || 'Unknown Author'})
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(conflictingBook)}
                      className="px-3 py-1 bg-white border border-red-300 hover:bg-red-100 text-red-800 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                    >
                      Edit Existing Book
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={editingBook ? handleUpdateBook : handleCreateBook} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ISBN Number *</label>
                  <input
                    type="text"
                    required
                    value={isbn}
                    onChange={e => {
                      setIsbn(e.target.value);
                      if (isIsbnInvalid) {
                        setIsIsbnInvalid(false);
                        setFormError(null);
                      }
                    }}
                    placeholder="e.g. 978-0-13-110362-7"
                    className={`w-full border rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 ${
                      isIsbnInvalid
                        ? 'border-red-500 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Copies *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={totalCopies}
                    onChange={e => setTotalCopies(parseInt(e.target.value, 10) || 1)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Clean Code: A Handbook of Agile Software Craftsmanship"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Author Name *</label>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    placeholder="e.g. Robert C. Martin"
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category / Genre *</label>
                  <input
                    type="text"
                    required
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Publisher</label>
                <input
                  type="text"
                  value={publisher}
                  onChange={e => setPublisher(e.target.value)}
                  placeholder="e.g. Prentice Hall"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBook(null);
                    resetFormState();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingBook ? 'Save Changes' : 'Add to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Remove Book</h3>
              <button
                onClick={() => setDeletingBook(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to remove <strong className="text-slate-900">"{deletingBook.title}"</strong> (
              <span className="font-mono whitespace-nowrap">{deletingBook.isbn}</span>) from the library catalogue?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBook(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBook}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Delete Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Bulk Import Books (.xlsx / .csv)</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                {importError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800">Need the standard spreadsheet format?</p>
                  <p className="text-[11px] text-slate-500">
                    Columns: isbn, title, author, category, publisher, total_copies
                  </p>
                </div>
                <button
                  onClick={handleDownloadSampleTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Download Sample Template
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-input"
                />
                <label htmlFor="file-upload-input" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <span className="font-semibold text-slate-800 block text-sm">
                    {importFileName ? importFileName : 'Click to upload .xlsx or .csv file'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Maximum 1,000 rows per file</span>
                </label>
              </div>

              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Previewing first {Math.min(5, parsedRows.length)} of {parsedRows.length} rows:
                    </span>
                    <span className="text-emerald-700 font-bold">{parsedRows.length} rows detected</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 font-bold">
                        <tr>
                          <th className="p-2 whitespace-nowrap">ISBN</th>
                          <th className="p-2">Title</th>
                          <th className="p-2">Author</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Copies</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-semibold whitespace-nowrap">{row.isbn || '—'}</td>
                            <td className="p-2 font-medium">{row.title || '—'}</td>
                            <td className="p-2">{row.author || '—'}</td>
                            <td className="p-2">{row.category || '—'}</td>
                            <td className="p-2 font-bold">{row.total_copies || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importReport && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-700 font-bold">Imported: {importReport.importedCount}</span>
                    <span className="text-amber-700 font-bold">Skipped/Duplicates: {importReport.skippedCount}</span>
                  </div>
                  {importReport.skippedDetails?.length > 0 && (
                    <div className="text-[11px] text-slate-500 max-h-24 overflow-y-auto space-y-1">
                      {importReport.skippedDetails.map((sk: any, i: number) => (
                        <p key={i} className="text-amber-800">
                          Row {sk.row} ({sk.isbn}): {sk.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={parsedRows.length === 0 || isImporting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {isImporting ? 'Importing...' : `Import ${parsedRows.length} Books`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
