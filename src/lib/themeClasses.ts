import type { Theme } from './theme'

export type ThemeClasses = {
  bg: string
  bgSecondary: string
  bgTertiary: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  accent: string
  accentText: string
}

export const getThemeClasses = (theme: Theme): ThemeClasses => {
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
