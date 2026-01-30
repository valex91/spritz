import { describe, it, expect, beforeEach, vi } from 'vitest'
import { epubDB, type Book, type Bookmark } from '../db'

// Mock idb module
vi.mock('idb', () => ({
  openDB: vi.fn(() => {
    const store = new Map()

    return Promise.resolve({
      put: vi.fn((_storeName, data) => {
        store.set(data.id || data.bookId, data)
        return Promise.resolve()
      }),
      get: vi.fn((_storeName, id) => {
        return Promise.resolve(store.get(id))
      }),
      getAll: vi.fn((_storeName) => {
        return Promise.resolve(Array.from(store.values()))
      }),
      delete: vi.fn((_storeName, id) => {
        store.delete(id)
        return Promise.resolve()
      }),
      transaction: vi.fn((_storeNames, _mode) => {
        const txStore = {
          delete: vi.fn((id: string) => {
            store.delete(id)
            return Promise.resolve()
          }),
        }
        return {
          objectStore: vi.fn(() => txStore),
          done: Promise.resolve(),
        }
      }),
    })
  }),
}))

describe('Book interface', () => {
  it('should have correct structure', () => {
    const book: Book = {
      id: 'test-id',
      title: 'Test Book',
      author: 'Test Author',
      text: 'Sample book text content',
      addedAt: Date.now(),
    }

    expect(book).toHaveProperty('id')
    expect(book).toHaveProperty('title')
    expect(book).toHaveProperty('author')
    expect(book).toHaveProperty('text')
    expect(book).toHaveProperty('addedAt')
  })

  it('should allow optional coverBlob and lastRead', () => {
    const bookWithOptionals: Book = {
      id: 'test-id',
      title: 'Test Book',
      author: 'Test Author',
      text: 'Sample book text content',
      coverBlob: new Blob(['test'], { type: 'image/jpeg' }),
      addedAt: Date.now(),
      lastRead: Date.now(),
    }

    expect(bookWithOptionals.coverBlob).toBeDefined()
    expect(bookWithOptionals.lastRead).toBeDefined()
  })
})

describe('Bookmark interface', () => {
  it('should have correct structure', () => {
    const bookmark: Bookmark = {
      bookId: 'test-book-id',
      cfi: '',
      percentage: 50,
      updatedAt: Date.now(),
    }

    expect(bookmark).toHaveProperty('bookId')
    expect(bookmark).toHaveProperty('cfi')
    expect(bookmark).toHaveProperty('percentage')
    expect(bookmark).toHaveProperty('updatedAt')
  })

  it('should accept percentage values from 0 to 100', () => {
    const bookmark0: Bookmark = {
      bookId: 'test',
      cfi: '',
      percentage: 0,
      updatedAt: Date.now(),
    }

    const bookmark100: Bookmark = {
      bookId: 'test',
      cfi: '',
      percentage: 100,
      updatedAt: Date.now(),
    }

    expect(bookmark0.percentage).toBe(0)
    expect(bookmark100.percentage).toBe(100)
  })
})

describe('epubDB', () => {
  beforeEach(async () => {
    // Reset database state before each test
    await epubDB.init()
  })

  describe('Database initialization', () => {
    it('should initialize database', async () => {
      const db = await epubDB.init()
      expect(db).toBeDefined()
    })

    it('should return existing database on subsequent calls', async () => {
      const db1 = await epubDB.getDB()
      const db2 = await epubDB.getDB()
      expect(db1).toBe(db2)
    })
  })

  describe('Book operations', () => {
    it('should add a book', async () => {
      const book: Book = {
        id: 'test-book-1',
        title: 'Test Book',
        author: 'Test Author',
        text: 'Sample book text content',
        addedAt: Date.now(),
      }

      await expect(epubDB.addBook(book)).resolves.not.toThrow()
    })

    it('should retrieve a book by id', async () => {
      const book: Book = {
        id: 'test-book-2',
        title: 'Test Book 2',
        author: 'Test Author 2',
        text: 'Sample book text content',
        addedAt: Date.now(),
      }

      await epubDB.addBook(book)
      const retrieved = await epubDB.getBook('test-book-2')

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('test-book-2')
      expect(retrieved?.title).toBe('Test Book 2')
    })

    it('should return undefined for non-existent book', async () => {
      const retrieved = await epubDB.getBook('non-existent')
      expect(retrieved).toBeUndefined()
    })

    it('should get all books', async () => {
      const book1: Book = {
        id: 'book-1',
        title: 'Book 1',
        author: 'Author 1',
        text: 'Sample book text content',
        addedAt: Date.now(),
      }

      const book2: Book = {
        id: 'book-2',
        title: 'Book 2',
        author: 'Author 2',
        text: 'Sample book text content',
        addedAt: Date.now(),
      }

      await epubDB.addBook(book1)
      await epubDB.addBook(book2)

      const allBooks = await epubDB.getAllBooks()
      expect(allBooks.length).toBeGreaterThanOrEqual(2)
    })

    it('should update lastRead timestamp', async () => {
      const book: Book = {
        id: 'test-book-3',
        title: 'Test Book 3',
        author: 'Test Author 3',
        text: 'Sample book text content',
        addedAt: Date.now(),
      }

      await epubDB.addBook(book)

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      await epubDB.updateLastRead('test-book-3')

      const updated = await epubDB.getBook('test-book-3')
      expect(updated?.lastRead).toBeDefined()
      expect(updated?.lastRead).toBeGreaterThanOrEqual(book.addedAt)
    })

    it('should handle updating lastRead for non-existent book', async () => {
      await expect(epubDB.updateLastRead('non-existent')).resolves.not.toThrow()
    })
  })

  describe('Bookmark operations', () => {
    it('should save a bookmark', async () => {
      const bookmark: Bookmark = {
        bookId: 'test-book-1',
        cfi: '',
        percentage: 25.5,
        updatedAt: Date.now(),
      }

      await expect(epubDB.saveBookmark(bookmark)).resolves.not.toThrow()
    })

    it('should retrieve a bookmark', async () => {
      const bookmark: Bookmark = {
        bookId: 'test-book-2',
        cfi: 'test-cfi',
        percentage: 50,
        updatedAt: Date.now(),
      }

      await epubDB.saveBookmark(bookmark)
      const retrieved = await epubDB.getBookmark('test-book-2')

      expect(retrieved).toBeDefined()
      expect(retrieved?.bookId).toBe('test-book-2')
      expect(retrieved?.percentage).toBe(50)
    })

    it('should update existing bookmark', async () => {
      const bookmark1: Bookmark = {
        bookId: 'test-book-3',
        cfi: '',
        percentage: 25,
        updatedAt: Date.now(),
      }

      await epubDB.saveBookmark(bookmark1)

      const bookmark2: Bookmark = {
        bookId: 'test-book-3',
        cfi: '',
        percentage: 75,
        updatedAt: Date.now() + 1000,
      }

      await epubDB.saveBookmark(bookmark2)

      const retrieved = await epubDB.getBookmark('test-book-3')
      expect(retrieved?.percentage).toBe(75)
    })

    it('should return undefined for non-existent bookmark', async () => {
      const retrieved = await epubDB.getBookmark('non-existent')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('Delete operations', () => {
    it('should delete a book and its bookmark', async () => {
      const book: Book = {
        id: 'delete-test',
        title: 'Delete Test',
        author: 'Test Author',
        text: 'Sample book text content',
        addedAt: Date.now(),
      }

      const bookmark: Bookmark = {
        bookId: 'delete-test',
        cfi: '',
        percentage: 50,
        updatedAt: Date.now(),
      }

      await epubDB.addBook(book)
      await epubDB.saveBookmark(bookmark)
      await epubDB.deleteBook('delete-test')

      const retrievedBook = await epubDB.getBook('delete-test')
      const retrievedBookmark = await epubDB.getBookmark('delete-test')

      expect(retrievedBook).toBeUndefined()
      expect(retrievedBookmark).toBeUndefined()
    })
  })
})
