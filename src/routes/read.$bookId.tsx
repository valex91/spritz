import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { EpubReader } from '../components/EpubReader'
import { epubDB } from '../lib/db'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/read/$bookId')({
  component: ReaderPage,
})

function ReaderPage() {
  const { bookId } = Route.useParams()
  const navigate = useNavigate()
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const loadBook = async () => {
      try {
        const book = await epubDB.getBook(bookId)

        if (!book) {
          setError('Book not found')
          return
        }

        setFileBuffer(book.file)
      } catch (err) {
        console.error('Error loading book:', err)
        setError('Failed to load book')
      }
    }

    loadBook()
  }, [bookId])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    )
  }

  if (!fileBuffer) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-gray-400">Loading book...</div>
      </div>
    )
  }

  return <EpubReader bookId={bookId} fileBuffer={fileBuffer} />
}
