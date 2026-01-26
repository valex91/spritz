import { describe, it, expect } from 'vitest'
import { getThemeClasses, type ThemeClasses } from '../themeClasses'
import type { Theme } from '../theme'

describe('getThemeClasses', () => {
  it('should return base theme classes', () => {
    const classes = getThemeClasses('base')

    expect(classes).toEqual({
      bg: 'bg-slate-900',
      bgSecondary: 'bg-slate-800',
      bgTertiary: 'bg-slate-700',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      border: 'border-slate-700',
      accent: 'bg-cyan-500 hover:bg-cyan-600',
      accentText: 'text-cyan-400',
    })
  })

  it('should return high-contrast theme classes', () => {
    const classes = getThemeClasses('high-contrast')

    expect(classes).toEqual({
      bg: 'bg-black',
      bgSecondary: 'bg-[#1a1a1a]',
      bgTertiary: 'bg-[#2d2d2d]',
      text: 'text-white',
      textSecondary: 'text-[#e0e0e0]',
      textMuted: 'text-[#a0a0a0]',
      border: 'border-[#404040]',
      accent: 'bg-[#00d9ff] hover:bg-[#00b8d4]',
      accentText: 'text-[#00d9ff]',
    })
  })

  it('should return OLED theme classes', () => {
    const classes = getThemeClasses('oled')

    expect(classes).toEqual({
      bg: 'bg-black',
      bgSecondary: 'bg-black',
      bgTertiary: 'bg-[#0a0a0a]',
      text: 'text-white',
      textSecondary: 'text-[#cccccc]',
      textMuted: 'text-[#888888]',
      border: 'border-[#1a1a1a]',
      accent: 'bg-cyan-500 hover:bg-cyan-600',
      accentText: 'text-cyan-400',
    })
  })

  it('should return consistent structure for all themes', () => {
    const themes: Theme[] = ['base', 'high-contrast', 'oled']

    themes.forEach((theme) => {
      const classes = getThemeClasses(theme)

      // Check all required properties exist
      expect(classes).toHaveProperty('bg')
      expect(classes).toHaveProperty('bgSecondary')
      expect(classes).toHaveProperty('bgTertiary')
      expect(classes).toHaveProperty('text')
      expect(classes).toHaveProperty('textSecondary')
      expect(classes).toHaveProperty('textMuted')
      expect(classes).toHaveProperty('border')
      expect(classes).toHaveProperty('accent')
      expect(classes).toHaveProperty('accentText')

      // Check all values are strings
      Object.values(classes).forEach((value) => {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      })
    })
  })

  it('should have different backgrounds for high-contrast and OLED', () => {
    const highContrast = getThemeClasses('high-contrast')
    const oled = getThemeClasses('oled')

    // Both have black primary bg
    expect(highContrast.bg).toBe('bg-black')
    expect(oled.bg).toBe('bg-black')

    // But different secondary backgrounds
    expect(highContrast.bgSecondary).toBe('bg-[#1a1a1a]')
    expect(oled.bgSecondary).toBe('bg-black')
  })

  it('should maintain type safety with ThemeClasses', () => {
    const classes: ThemeClasses = getThemeClasses('base')

    // This is a compile-time check, but we can verify the structure
    expect(classes).toBeDefined()
    expect(Object.keys(classes).length).toBe(9)
  })
})
