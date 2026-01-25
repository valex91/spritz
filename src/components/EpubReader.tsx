import { useEffect, useRef, useState } from 'react'
import ePub, { type Book } from 'epubjs'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Home,
  Settings,
  Maximize,
  Minimize,
} from 'lucide-react'
import { epubDB } from '../lib/db'
import { useNavigate } from '@tanstack/react-router'
import { useTheme } from '../lib/theme'

interface EpubReaderProps {
  bookId: string
  fileBuffer: ArrayBuffer
}

export function EpubReader({ bookId, fileBuffer }: EpubReaderProps) {
  const navigate = useNavigate()
  const bookRef = useRef<Book | null>(null)
  const intervalRef = useRef<number | null>(null)
  const { theme } = useTheme()

  const [words, setWords] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(300)
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [bookTitle, setBookTitle] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)

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
          bg: 'bg-slate-900',
          bgSecondary: 'bg-slate-800',
          bgTertiary: 'bg-slate-700',
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

  // Calculate the Optimal Recognition Point (ORP) for a word
  const getORP = (word: string) => {
    const length = word.length
    if (length <= 1) return 0
    if (length <= 5) return 1
    if (length <= 9) return 2
    if (length <= 13) return 3
    return 4
  }

  // Calculate responsive font size based on word length and viewport
  const calculateFontSize = (word: string) => {
    if (!viewportWidth) return 96 // Default fallback

    const wordLength = word.length
    const availableWidth = viewportWidth * 0.8 // Use 80% of viewport width

    // Estimate character width in pixels (monospace font approximation)
    // This is a rough estimate - actual width depends on font
    const charWidthRatio = 0.6 // mono chars are roughly 0.6x their font size

    // Calculate max font size that fits the word
    let fontSize = availableWidth / (wordLength * charWidthRatio)

    // Apply constraints based on screen size
    if (viewportWidth < 640) {
      // Mobile: smaller range
      fontSize = Math.min(fontSize, 64) // Max 4rem
      fontSize = Math.max(fontSize, 32) // Min 2rem
    } else if (viewportWidth < 1024) {
      // Tablet: medium range
      fontSize = Math.min(fontSize, 96) // Max 6rem
      fontSize = Math.max(fontSize, 48) // Min 3rem
    } else {
      // Desktop: larger range
      fontSize = Math.min(fontSize, 128) // Max 8rem
      fontSize = Math.max(fontSize, 64) // Min 4rem
    }

    // Additional scaling for very long words
    if (wordLength > 15) {
      fontSize *= 0.9
    }
    if (wordLength > 20) {
      fontSize *= 0.85
    }

    return Math.floor(fontSize)
  }

  // Extract text content from EPUB
  useEffect(() => {
    const initBook = async () => {
      try {
        setIsLoading(true)

        const book = ePub(fileBuffer)
        bookRef.current = book

        await book.ready

        const metadata = await book.loaded.metadata
        setBookTitle(metadata.title || 'Unknown Title')

        // Create a temporary container to render and extract text
        const tempContainer = document.createElement('div')
        tempContainer.style.position = 'absolute'
        tempContainer.style.left = '-9999px'
        tempContainer.style.width = '1000px'
        document.body.appendChild(tempContainer)

        const rendition = book.renderTo(tempContainer, {
          width: 1000,
          height: 1000,
        })

        const spine = await book.loaded.spine
        let allText = ''

        // Extract text from all chapters by rendering them
        for (const item of spine.items) {
          try {
            await rendition.display(item.href)
            // Wait a bit for content to render
            await new Promise(resolve => setTimeout(resolve, 100))

            // Get the iframe content
            const iframe = tempContainer.querySelector('iframe')
            if (iframe?.contentDocument?.body) {
              const text = iframe.contentDocument.body.textContent || ''
              allText += text + ' '
            }
          } catch (err) {
            console.error('Error loading chapter:', item.href, err)
          }
        }

        // Clean up
        rendition.destroy()
        document.body.removeChild(tempContainer)

        // Split into words and filter out empty strings
        const wordArray = allText
          .split(/\s+/)
          .map((w) => w.trim())
          .filter((w) => w.length > 0)

        setWords(wordArray)

        // Load saved bookmark
        const bookmark = await epubDB.getBookmark(bookId)
        if (bookmark && bookmark.percentage > 0) {
          // Use the percentage to calculate word index
          const savedIndex = Math.floor(
            (bookmark.percentage / 100) * wordArray.length
          )
          setCurrentIndex(savedIndex)
        }

        await epubDB.updateLastRead(bookId)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading book:', error)
        setIsLoading(false)
      }
    }

    initBook()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [bookId, fileBuffer])

  // Save bookmark when index changes
  useEffect(() => {
    if (words.length > 0 && currentIndex >= 0) {
      const percentage = (currentIndex / words.length) * 100
      epubDB.saveBookmark({
        bookId,
        cfi: '', // We're not using CFI for word-by-word reading
        percentage,
        updatedAt: Date.now(),
      })
    }
  }, [currentIndex, words.length, bookId])

  // Playback control
  useEffect(() => {
    if (isPlaying && currentIndex < words.length - 1) {
      const msPerWord = 60000 / wpm
      intervalRef.current = window.setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= words.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, msPerWord)
    } else if (!isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, wpm, currentIndex, words.length])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIndex((prev) => Math.max(0, prev - 1))
        setIsPlaying(false)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentIndex((prev) => Math.min(words.length - 1, prev + 1))
        setIsPlaying(false)
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [words.length])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Track viewport width for responsive font sizing
  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth)
    }

    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    return () => window.removeEventListener('resize', updateViewportWidth)
  }, [])

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const skipBack = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 10))
    setIsPlaying(false)
  }

  const skipForward = () => {
    setCurrentIndex((prev) => Math.min(words.length - 1, prev + 10))
    setIsPlaying(false)
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newIndex = Math.floor(percentage * words.length)
    setCurrentIndex(Math.max(0, Math.min(words.length - 1, newIndex)))
    setIsPlaying(false)
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${tc.bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <div className={tc.textMuted}>Loading book...</div>
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className={`min-h-screen ${tc.bg} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load book content</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className={`px-4 py-2 ${tc.accent} ${tc.text} rounded-lg transition-colors`}
          >
            Back to Library
          </button>
        </div>
      </div>
    )
  }

  const currentWord = words[currentIndex] || ''
  const orpIndex = getORP(currentWord)
  const progress = (currentIndex / words.length) * 100
  const fontSize = calculateFontSize(currentWord)

  return (
    <div className={`flex flex-col h-screen ${tc.bg}`}>
      {/* Header */}
      <div className={`${tc.bgSecondary} border-b ${tc.border} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: '/' })}
            className={`p-2 hover:${tc.bgTertiary} rounded-lg transition-colors`}
            aria-label="Back to library"
          >
            <Home className={`w-5 h-5 ${tc.textMuted}`} />
          </button>
          <div>
            <h1 className={`${tc.text} font-medium`}>{bookTitle}</h1>
            <p className={`text-xs ${tc.textMuted}`}>
              {currentIndex + 1} / {words.length} words
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className={`p-2 hover:${tc.bgTertiary} rounded-lg transition-colors`}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className={`w-5 h-5 ${tc.textMuted}`} />
            ) : (
              <Maximize className={`w-5 h-5 ${tc.textMuted}`} />
            )}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 hover:${tc.bgTertiary} rounded-lg transition-colors`}
            aria-label="Settings"
          >
            <Settings className={`w-5 h-5 ${tc.textMuted}`} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`${tc.bgSecondary} border-b ${tc.border} px-4 py-4`}>
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <label className={`text-sm ${tc.textMuted}`}>
                Reading Speed: {wpm} WPM
              </label>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="w-full"
            />
            <div className={`flex justify-between text-xs ${tc.textMuted} mt-1`}>
              <span>100 WPM</span>
              <span>1000 WPM</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div
        className={`h-2 ${tc.bgSecondary} cursor-pointer relative group`}
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-cyan-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 bg-cyan-400/0 group-hover:bg-cyan-400/10 transition-colors" />
      </div>

      {/* Spritz Display */}
      <div className={`flex-1 flex items-center justify-center ${tc.bg}`}>
        <div className="text-center px-8 w-full max-w-2xl">
          {/* Word Display with ORP */}
          <div className="relative mb-8">
            {/* Focal guide line */}
            <div
              className="absolute left-1/2 top-1/2 w-px bg-red-500/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ height: `${fontSize * 1.2}px` }}
            />

            <div
              className="font-mono font-bold tracking-wider inline-block"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: '1.2',
                minHeight: `${fontSize * 1.2}px`,
              }}
            >
              {currentWord.split('').map((char, idx) => (
                <span
                  key={idx}
                  className={
                    idx === orpIndex
                      ? 'text-red-500'
                      : tc.text
                  }
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

          {/* Context Words (preview) */}
          <div
            className={`${tc.textMuted} mb-8`}
            style={{
              fontSize: `${Math.max(12, fontSize * 0.15)}px`,
              minHeight: `${Math.max(24, fontSize * 0.3)}px`,
            }}
          >
            {words.slice(currentIndex + 1, currentIndex + 6).join(' ')}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`${tc.bgSecondary} border-t ${tc.border} px-4 py-6`}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={skipBack}
              className={`p-3 hover:${tc.bgTertiary} rounded-lg transition-colors`}
              aria-label="Skip back 10 words"
            >
              <SkipBack className={`w-6 h-6 ${tc.textMuted}`} />
            </button>

            <button
              onClick={togglePlayPause}
              className={`p-4 ${tc.accent} rounded-full transition-colors`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className={`w-8 h-8 ${tc.text}`} />
              ) : (
                <Play className={`w-8 h-8 ${tc.text}`} />
              )}
            </button>

            <button
              onClick={skipForward}
              className={`p-3 hover:${tc.bgTertiary} rounded-lg transition-colors`}
              aria-label="Skip forward 10 words"
            >
              <SkipForward className={`w-6 h-6 ${tc.textMuted}`} />
            </button>
          </div>

          <div className={`text-center text-xs ${tc.textMuted} mt-4`}>
            Space: Play/Pause • Arrow Keys: Navigate • F: Fullscreen • {Math.round(progress)}%
            complete
          </div>
        </div>
      </div>
    </div>
  )
}
