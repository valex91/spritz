import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeDate, cn } from '../utils'

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should format timestamps less than 60 minutes as minutes ago', () => {
    const now = new Date('2024-01-01T12:00:00Z').getTime()
    vi.setSystemTime(now)

    const tenMinutesAgo = now - 10 * 60 * 1000
    expect(formatRelativeDate(tenMinutesAgo)).toBe('10m ago')

    const fiftyMinutesAgo = now - 50 * 60 * 1000
    expect(formatRelativeDate(fiftyMinutesAgo)).toBe('50m ago')
  })

  it('should format timestamps less than 24 hours as hours ago', () => {
    const now = new Date('2024-01-01T12:00:00Z').getTime()
    vi.setSystemTime(now)

    const twoHoursAgo = now - 2 * 60 * 60 * 1000
    expect(formatRelativeDate(twoHoursAgo)).toBe('2h ago')

    const twentyHoursAgo = now - 20 * 60 * 60 * 1000
    expect(formatRelativeDate(twentyHoursAgo)).toBe('20h ago')
  })

  it('should format timestamps less than 7 days as days ago', () => {
    const now = new Date('2024-01-08T12:00:00Z').getTime()
    vi.setSystemTime(now)

    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000
    expect(formatRelativeDate(threeDaysAgo)).toBe('3d ago')

    const sixDaysAgo = now - 6 * 24 * 60 * 60 * 1000
    expect(formatRelativeDate(sixDaysAgo)).toBe('6d ago')
  })

  it('should format timestamps older than 7 days with toLocaleDateString', () => {
    const now = new Date('2024-01-15T12:00:00Z').getTime()
    vi.setSystemTime(now)

    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000
    const date = new Date(tenDaysAgo)
    expect(formatRelativeDate(tenDaysAgo)).toBe(date.toLocaleDateString())
  })

  it('should handle edge case of exactly 60 minutes', () => {
    const now = new Date('2024-01-01T12:00:00Z').getTime()
    vi.setSystemTime(now)

    const sixtyMinutesAgo = now - 60 * 60 * 1000
    expect(formatRelativeDate(sixtyMinutesAgo)).toBe('1h ago')
  })
})

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3')
  })

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
  })
})
