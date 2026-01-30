import { useState } from 'react'
import { Upload, Plus, X } from 'lucide-react'
import { epubDB, type Book } from '../lib/db'
import { parseFile, getAcceptString } from '../lib/parsers'
import type { ThemeClasses } from '../lib/themeClasses'

interface FileUploaderProps {
  onUploadComplete: () => void
  themeClasses: ThemeClasses
  expanded: boolean
  onToggle: () => void
}

export function FileUploader({
  onUploadComplete,
  themeClasses: tc,
  expanded,
  onToggle,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const parsed = await parseFile(file)
      const book: Book = {
        id: crypto.randomUUID(),
        title: parsed.title,
        author: parsed.author,
        text: parsed.text,
        addedAt: Date.now(),
      }
      await epubDB.addBook(book)
      onUploadComplete()
      e.target.value = ''
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file. Make sure it is a supported format (EPUB, PDF, or Markdown).')
    } finally {
      setIsUploading(false)
    }
  }

  if (!expanded) {
    return (
      <div className="mb-8">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-2 px-4 py-2 ${tc.bgSecondary} ${tc.border} border rounded-lg hover:border-cyan-500 transition-colors`}
        >
          <Plus className={`w-5 h-5 ${tc.accentText}`} />
          <span className={tc.text}>Add Reading Material</span>
        </button>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={onToggle}
          className={`p-1 ${tc.textMuted} hover:${tc.text} transition-colors`}
          aria-label="Close uploader"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <label className="block">
        <input
          type="file"
          accept={getAcceptString()}
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <div
          className={`flex items-center justify-center w-full p-8 border-2 border-dashed ${tc.border} rounded-xl hover:border-cyan-500 transition-colors cursor-pointer ${tc.bgSecondary}`}
        >
          {isUploading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2" />
              <p className={tc.textMuted}>Processing file...</p>
            </div>
          ) : (
            <div className="text-center">
              <Upload className={`w-12 h-12 ${tc.accentText} mx-auto mb-2`} />
              <p className={`${tc.text} font-medium mb-1`}>Upload Reading Material</p>
              <p className={`text-sm ${tc.textMuted}`}>EPUB, PDF, or Markdown files</p>
            </div>
          )}
        </div>
      </label>
    </div>
  )
}
