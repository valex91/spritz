import { useEffect, useRef, useState } from 'react'
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
import { getThemeClasses } from '../lib/themeClasses'

interface ReaderProps {
  bookId: string
  title: string
  text: string
}

export function Reader({ bookId, title, text }: ReaderProps) {
  const navigate = useNavigate()
  const rafRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const { theme } = useTheme()

  const [words, setWords] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(300)
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)

  const tc = getThemeClasses(theme)

  const getORP = (word: string): number => {
    const length = word.length
    if (length <= 1) return 0
    if (length <= 5) return 1
    if (length <= 9) return 2
    if (length <= 13) return 3
    return 4
  }

  const calculateFontSize = (word: string): number => {
    if (!viewportWidth) return 96

    const wordLength = word.length
    const maxContainerWidth = 672 - 64
    const availableWidth = Math.min(viewportWidth - 64, maxContainerWidth) * 0.95
    const charWidthRatio = 0.6

    let fontSize = availableWidth / (wordLength * charWidthRatio)

    if (viewportWidth < 640) {
      fontSize = Math.min(fontSize, 64)
      fontSize = Math.max(fontSize, 24)
    } else if (viewportWidth < 1024) {
      fontSize = Math.min(fontSize, 96)
      fontSize = Math.max(fontSize, 32)
    } else {
      fontSize = Math.min(fontSize, 128)
      fontSize = Math.max(fontSize, 48)
    }

    if (wordLength > 15) {
      fontSize *= 0.85
    }
    if (wordLength > 20) {
      fontSize *= 0.8
    }

    return Math.floor(fontSize)
  }

  useEffect(() => {
    const initReader = async () => {
      setIsLoading(true)

      const wordArray = text
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)

      setWords(wordArray)

      const bookmark = await epubDB.getBookmark(bookId)
      if (bookmark && bookmark.percentage > 0) {
        const savedIndex = Math.floor((bookmark.percentage / 100) * wordArray.length)
        setCurrentIndex(savedIndex)
      }

      await epubDB.updateLastRead(bookId)
      setIsLoading(false)
    }

    initReader()

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [bookId, text])

  useEffect(() => {
    if (words.length > 0 && currentIndex >= 0) {
      const percentage = (currentIndex / words.length) * 100
      epubDB.saveBookmark({
        bookId,
        cfi: '',
        percentage,
        updatedAt: Date.now(),
      })
    }
  }, [currentIndex, words.length, bookId])

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    if (currentIndex >= words.length - 1) {
      setIsPlaying(false)
      return
    }

    const msPerWord = 60000 / wpm
    lastUpdateRef.current = performance.now()

    const animate = (timestamp: number) => {
      if (!isPlaying) return

      const elapsed = timestamp - lastUpdateRef.current

      if (elapsed >= msPerWord) {
        setCurrentIndex((prev) => {
          if (prev >= words.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
        lastUpdateRef.current = timestamp
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, wpm, currentIndex, words.length])

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth)
    }

    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    return () => window.removeEventListener('resize', updateViewportWidth)
  }, [])

  const togglePlayPause = (): void => {
    setIsPlaying(!isPlaying)
  }

  const skipBack = (): void => {
    setCurrentIndex((prev) => Math.max(0, prev - 10))
    setIsPlaying(false)
  }

  const skipForward = (): void => {
    setCurrentIndex((prev) => Math.min(words.length - 1, prev + 10))
    setIsPlaying(false)
  }

  const toggleFullscreen = async (): Promise<void> => {
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>): void => {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
          <div className={tc.textMuted}>Loading...</div>
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className={`min-h-screen ${tc.bg} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">No content found</p>
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
            <h1 className={`${tc.text} font-medium`}>{title}</h1>
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

      <div className={`flex-1 flex items-center justify-center ${tc.bg}`}>
        <div className="text-center px-8 w-full max-w-2xl">
          <div className="relative mb-8">
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
                  className={idx === orpIndex ? 'text-red-500' : tc.text}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

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
