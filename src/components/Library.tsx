import { useEffect, useState } from 'react'
import { Upload, Trash2, BookOpen, Clock, Palette } from 'lucide-react'
import { epubDB, type Book } from '../lib/db'
import ePub from 'epubjs'
import { useNavigate } from '@tanstack/react-router'
import { useTheme, themes, type Theme } from '../lib/theme'

export function Library() {
  const [books, setBooks] = useState<Book[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showThemeSettings, setShowThemeSettings] = useState(false)
  const [coverUrls, setCoverUrls] = useState<Map<string, string>>(new Map())
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    loadBooks()
  }, [])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      coverUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [coverUrls])

  const loadBooks = async () => {
    const allBooks = await epubDB.getAllBooks()
    // Sort by last read, then by added date
    allBooks.sort((a, b) => {
      if (a.lastRead && b.lastRead) {
        return b.lastRead - a.lastRead
      }
      if (a.lastRead) return -1
      if (b.lastRead) return 1
      return b.addedAt - a.addedAt
    })

    // Create object URLs for cover images
    const newCoverUrls = new Map<string, string>()
    allBooks.forEach((book) => {
      if (book.coverBlob) {
        const url = URL.createObjectURL(book.coverBlob)
        newCoverUrls.set(book.id, url)
      }
    })

    // Revoke old URLs
    coverUrls.forEach((url) => URL.revokeObjectURL(url))
    setCoverUrls(newCoverUrls)
    setBooks(allBooks)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const book = ePub(arrayBuffer)

      // Load metadata
      await book.ready

      const metadata = await book.loaded.metadata

      // Get cover as blob instead of URL
      let coverBlob: Blob | undefined
      try {
        const coverUrl = await book.coverUrl()
        if (coverUrl) {
          const response = await fetch(coverUrl)
          coverBlob = await response.blob()
        }
      } catch (err) {
        console.warn('Could not load cover image:', err)
      }

      const bookId = crypto.randomUUID()

      const bookData: Book = {
        id: bookId,
        title: metadata.title || 'Unknown Title',
        author: metadata.creator || 'Unknown Author',
        file: arrayBuffer,
        coverBlob,
        addedAt: Date.now(),
      }

      await epubDB.addBook(bookData)
      await loadBooks()

      // Clear the input
      e.target.value = ''
    } catch (error) {
      console.error('Error uploading book:', error)
      alert('Failed to upload book. Make sure it is a valid EPUB file.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return

    await epubDB.deleteBook(bookId)
    await loadBooks()
  }

  const handleOpenBook = (bookId: string) => {
    navigate({ to: '/read/$bookId', params: { bookId } })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - timestamp

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const getThemeClasses = () => {
    switch (theme) {
      case 'high-contrast':
        return {
          bg: 'bg-black',
          bgSecondary: 'bg-[#1a1a1a]',
          bgTertiary: 'bg-[#2d2d2d]',
          text: 'text-white',
          textSecondary: 'text-[#e0e0e0]',
          textMuted: 'text-[#a0a0a0]',
          border: 'border-[#404040]',
          accent: 'bg-[#00d9ff] hover:bg-[#00b8d4]',
          accentText: 'text-[#00d9ff]',
        }
      case 'oled':
        return {
          bg: 'bg-black',
          bgSecondary: 'bg-black',
          bgTertiary: 'bg-[#0a0a0a]',
          text: 'text-white',
          textSecondary: 'text-[#cccccc]',
          textMuted: 'text-[#888888]',
          border: 'border-[#1a1a1a]',
          accent: 'bg-cyan-500 hover:bg-cyan-600',
          accentText: 'text-cyan-400',
        }
      default: // base
        return {
          bg: 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900',
          bgSecondary: 'bg-slate-800/50',
          bgTertiary: 'bg-slate-800',
          text: 'text-white',
          textSecondary: 'text-gray-300',
          textMuted: 'text-gray-400',
          border: 'border-slate-700',
          accent: 'bg-cyan-500 hover:bg-cyan-600',
          accentText: 'text-cyan-400',
        }
    }
  }

  const tc = getThemeClasses()

  return (
    <div className={`min-h-screen ${tc.bg}`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className={`text-4xl font-bold ${tc.text} mb-2`}>My Library</h1>
            <p className={tc.textMuted}>
              Your EPUB books are stored locally in your browser
            </p>
          </div>

          <button
            onClick={() => setShowThemeSettings(!showThemeSettings)}
            className={`p-3 ${tc.bgTertiary} hover:opacity-80 rounded-lg transition-colors ${tc.border} border`}
            aria-label="Theme settings"
          >
            <Palette className={`w-6 h-6 ${tc.textMuted}`} />
          </button>
        </div>

        {/* Theme Settings Panel */}
        {showThemeSettings && (
          <div className={`mb-8 ${tc.bgSecondary} rounded-xl p-6 ${tc.border} border`}>
            <h2 className={`text-xl font-semibold ${tc.text} mb-4`}>Theme Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(Object.keys(themes) as Theme[]).map((themeKey) => (
                <button
                  key={themeKey}
                  onClick={() => setTheme(themeKey)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === themeKey
                      ? `${tc.border} ${tc.bgTertiary}`
                      : `border-transparent ${tc.bgTertiary} opacity-60 hover:opacity-100`
                  }`}
                >
                  <div className={`font-semibold ${tc.text} mb-1`}>
                    {themes[themeKey].name}
                  </div>
                  <div className={`text-sm ${tc.textMuted}`}>
                    {themes[themeKey].description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-8">
          <label className="block">
            <input
              type="file"
              accept=".epub"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="epub-upload"
            />
            <div className={`flex items-center justify-center w-full p-8 border-2 border-dashed ${tc.border} rounded-xl hover:border-cyan-500 transition-colors cursor-pointer ${tc.bgSecondary}`}>
              {isUploading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
                  <p className={tc.textMuted}>Processing EPUB...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className={`w-12 h-12 ${tc.accentText} mx-auto mb-2`} />
                  <p className={`${tc.text} font-medium mb-1`}>
                    Upload EPUB Book
                  </p>
                  <p className={`text-sm ${tc.textMuted}`}>
                    Click to browse or drag and drop
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Books Grid */}
        {books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className={`w-16 h-16 ${tc.textMuted} opacity-30 mx-auto mb-4`} />
            <p className={`${tc.textMuted} text-lg`}>No books in your library</p>
            <p className={`${tc.textMuted} text-sm opacity-70`}>Upload an EPUB to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className={`group relative ${tc.bgSecondary} rounded-lg overflow-hidden border ${tc.border} hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10`}
              >
                {/* Book Cover */}
                <div
                  className={`aspect-[2/3] ${tc.bgTertiary} cursor-pointer`}
                  onClick={() => handleOpenBook(book.id)}
                >
                  {coverUrls.get(book.id) ? (
                    <img
                      src={coverUrls.get(book.id)}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className={`w-12 h-12 ${tc.textMuted}`} />
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-3">
                  <h3
                    className={`font-medium ${tc.text} text-sm line-clamp-2 mb-1 cursor-pointer hover:${tc.accentText}`}
                    onClick={() => handleOpenBook(book.id)}
                  >
                    {book.title}
                  </h3>
                  <p className={`text-xs ${tc.textMuted} line-clamp-1 mb-2`}>
                    {book.author}
                  </p>

                  {book.lastRead && (
                    <div className={`flex items-center gap-1 text-xs ${tc.textMuted} mb-2`}>
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(book.lastRead)}</span>
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteBook(book.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
