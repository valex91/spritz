import { openDB, type IDBPDatabase } from 'idb'

export interface Book {
  id: string
  title: string
  author: string
  file: ArrayBuffer
  coverBlob?: Blob
  addedAt: number
  lastRead?: number
}

export interface Bookmark {
  bookId: string
  cfi: string // EPUB Canonical Fragment Identifier
  percentage: number
  updatedAt: number
}

const DB_NAME = 'spritz-reader'
const DB_VERSION = 1

class EpubDatabase {
  private db: IDBPDatabase | null = null

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' })
          bookStore.createIndex('lastRead', 'lastRead')
          bookStore.createIndex('addedAt', 'addedAt')
        }

        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'bookId' })
        }
      },
    })
    return this.db
  }

  async getDB() {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  async addBook(book: Book) {
    const db = await this.getDB()
    await db.put('books', book)
  }

  async getBook(id: string): Promise<Book | undefined> {
    const db = await this.getDB()
    return db.get('books', id)
  }

  async getAllBooks(): Promise<Book[]> {
    const db = await this.getDB()
    return db.getAll('books')
  }

  async deleteBook(id: string) {
    const db = await this.getDB()
    const tx = db.transaction(['books', 'bookmarks'], 'readwrite')
    await Promise.all([
      tx.objectStore('books').delete(id),
      tx.objectStore('bookmarks').delete(id),
      tx.done,
    ])
  }

  async saveBookmark(bookmark: Bookmark) {
    const db = await this.getDB()
    await db.put('bookmarks', bookmark)
  }

  async getBookmark(bookId: string): Promise<Bookmark | undefined> {
    const db = await this.getDB()
    return db.get('bookmarks', bookId)
  }

  async updateLastRead(bookId: string) {
    const db = await this.getDB()
    const book = await db.get('books', bookId)
    if (book) {
      book.lastRead = Date.now()
      await db.put('books', book)
    }
  }
}

export const epubDB = new EpubDatabase()
