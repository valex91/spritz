import { describe, it, expect } from 'vitest'

// Extract ORP calculation for testing
export function getORP(word: string): number {
  const length = word.length
  if (length <= 1) return 0
  if (length <= 5) return 1
  if (length <= 9) return 2
  if (length <= 13) return 3
  return 4
}

export function calculateFontSize(word: string, viewportWidth: number): number {
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

describe('Spritz ORP (Optimal Recognition Point)', () => {
  describe('getORP', () => {
    it('should return 0 for single character words', () => {
      expect(getORP('I')).toBe(0)
      expect(getORP('a')).toBe(0)
    })

    it('should return 1 for words with 2-5 characters', () => {
      expect(getORP('is')).toBe(1) // 2 chars
      expect(getORP('the')).toBe(1) // 3 chars
      expect(getORP('book')).toBe(1) // 4 chars
      expect(getORP('hello')).toBe(1) // 5 chars
    })

    it('should return 2 for words with 6-9 characters', () => {
      expect(getORP('reader')).toBe(2) // 6 chars
      expect(getORP('reading')).toBe(2) // 7 chars
      expect(getORP('software')).toBe(2) // 8 chars
      expect(getORP('algorithm')).toBe(2) // 9 chars
    })

    it('should return 3 for words with 10-13 characters', () => {
      expect(getORP('technology')).toBe(3) // 10 chars
      expect(getORP('application')).toBe(3) // 11 chars
      expect(getORP('organization')).toBe(3) // 12 chars
      expect(getORP('international')).toBe(3) // 13 chars
    })

    it('should return 4 for words with 14+ characters', () => {
      expect(getORP('implementation')).toBe(4) // 14 chars
      expect(getORP('responsibilities')).toBe(4) // 16 chars
      expect(getORP('electroencephalography')).toBe(4) // 22 chars
    })

    it('should handle edge cases', () => {
      expect(getORP('')).toBe(0) // Empty string
      expect(getORP('ab')).toBe(1) // Exactly 2 chars
      expect(getORP('abcdef')).toBe(2) // Exactly 6 chars
      expect(getORP('abcdefghij')).toBe(3) // Exactly 10 chars
      expect(getORP('abcdefghijklmn')).toBe(4) // Exactly 14 chars
    })
  })
})

describe('Dynamic Font Sizing', () => {
  describe('calculateFontSize', () => {
    describe('Mobile viewport (< 640px)', () => {
      const mobileWidth = 390

      it('should constrain to 24-64px range for normal words', () => {
        const shortWord = calculateFontSize('I', mobileWidth)
        const mediumWord = calculateFontSize('hello', mobileWidth)

        expect(shortWord).toBeGreaterThanOrEqual(24)
        expect(shortWord).toBeLessThanOrEqual(64)
        expect(mediumWord).toBeGreaterThanOrEqual(24)
        expect(mediumWord).toBeLessThanOrEqual(64)
      })

      it('should scale down for very long words', () => {
        const mediumWord = calculateFontSize('hello', mobileWidth)
        const longWord = calculateFontSize('internationalization', mobileWidth)

        expect(longWord).toBeLessThan(mediumWord)
      })

      it('should return 64px max for very short words', () => {
        const result = calculateFontSize('I', mobileWidth)
        expect(result).toBe(64)
      })
    })

    describe('Tablet viewport (640px - 1024px)', () => {
      const tabletWidth = 768

      it('should constrain to 32-96px range for normal words', () => {
        const shortWord = calculateFontSize('I', tabletWidth)
        const mediumWord = calculateFontSize('hello', tabletWidth)

        expect(shortWord).toBeGreaterThanOrEqual(32)
        expect(shortWord).toBeLessThanOrEqual(96)
        expect(mediumWord).toBeGreaterThanOrEqual(32)
        expect(mediumWord).toBeLessThanOrEqual(96)
      })

      it('should be larger or equal to mobile for same word', () => {
        const word = 'hello'
        const mobileSize = calculateFontSize(word, 390)
        const tabletSize = calculateFontSize(word, 768)

        expect(tabletSize).toBeGreaterThanOrEqual(mobileSize)
      })
    })

    describe('Desktop viewport (>= 1024px)', () => {
      const desktopWidth = 1920

      it('should constrain to 48-128px range', () => {
        const shortWord = calculateFontSize('I', desktopWidth)
        const longWord = calculateFontSize('internationalization', desktopWidth)

        expect(shortWord).toBeGreaterThanOrEqual(48)
        expect(shortWord).toBeLessThanOrEqual(128)
        expect(longWord).toBeGreaterThanOrEqual(20)
        expect(longWord).toBeLessThanOrEqual(128)
      })

      it('should use container max width not viewport width', () => {
        const word = 'hello'
        const size1080 = calculateFontSize(word, 1080)
        const size1920 = calculateFontSize(word, 1920)
        const size3840 = calculateFontSize(word, 3840)

        expect(size1080).toBe(size1920)
        expect(size1920).toBe(size3840)
      })
    })

    describe('Word length scaling', () => {
      const viewportWidth = 1920

      it('should scale down for words longer than 15 characters', () => {
        const word15 = 'fifteencharword'
        const word16 = 'sixteencharwordx'

        const size15 = calculateFontSize(word15, viewportWidth)
        const size16 = calculateFontSize(word16, viewportWidth)

        expect(size16).toBeLessThanOrEqual(size15)
      })

      it('should scale down more for words longer than 20 characters', () => {
        const word20 = 'twentycharacterword1'
        const word21 = 'twentyonecharacterwd1'

        const size20 = calculateFontSize(word20, viewportWidth)
        const size21 = calculateFontSize(word21, viewportWidth)

        expect(size21).toBeLessThanOrEqual(size20)
      })
    })

    describe('Edge cases', () => {
      it('should return 96 for zero viewport width', () => {
        expect(calculateFontSize('hello', 0)).toBe(96)
      })

      it('should handle empty string', () => {
        const result = calculateFontSize('', 1920)
        expect(result).toBe(128)
      })

      it('should return integer values', () => {
        const result = calculateFontSize('hello', 1920)
        expect(result).toBe(Math.floor(result))
        expect(Number.isInteger(result)).toBe(true)
      })
    })

    describe('Consistent behavior', () => {
      it('should always return larger size for shorter words on same viewport', () => {
        const viewportWidth = 1920

        const size1 = calculateFontSize('a', viewportWidth)
        const size5 = calculateFontSize('hello', viewportWidth)
        const size10 = calculateFontSize('helloworld', viewportWidth)

        expect(size1).toBeGreaterThanOrEqual(size5)
        expect(size5).toBeGreaterThanOrEqual(size10)
      })

      it('should maintain relative sizing across different viewports', () => {
        const word = 'testing'

        const mobile = calculateFontSize(word, 390)
        const tablet = calculateFontSize(word, 768)
        const desktop = calculateFontSize(word, 1920)

        expect(mobile).toBeLessThanOrEqual(tablet)
        expect(tablet).toBeLessThanOrEqual(desktop)
      })
    })
  })
})
