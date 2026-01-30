import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'base' | 'high-contrast' | 'oled'

const themeBackgrounds: Record<Theme, string> = {
  base: '#0f172a',
  'high-contrast': '#000000',
  oled: '#000000',
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('base')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('spritz-theme') as Theme | null
    if (saved) {
      setThemeState(saved)
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('spritz-theme', newTheme)
  }

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme)
      const bgColor = themeBackgrounds[theme]
      document.documentElement.style.backgroundColor = bgColor
      document.body.style.backgroundColor = bgColor
    }
  }, [theme, mounted])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const themes = {
  base: {
    name: 'Base',
    description: 'Comfortable dark theme with slate tones',
  },
  'high-contrast': {
    name: 'High Contrast',
    description: 'Maximum contrast for better readability',
  },
  oled: {
    name: 'OLED',
    description: 'Pure black background for OLED displays',
  },
} as const
