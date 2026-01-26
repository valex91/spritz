# Claude AI Development Guide for Spritz

This document provides context for AI assistants working on the Spritz speed reading application. It explains architectural decisions, coding patterns, and how to make decisions aligned with project goals.

---

## Project Overview

**What is Spritz?**
A browser-based EPUB reader implementing the Spritz speed reading technique. Books are displayed one word at a time with the Optimal Recognition Point (ORP) highlighted to maximize reading speed.

**Core Philosophy**:
- **Privacy-first**: Everything runs client-side, no data leaves the browser
- **Simplicity**: Minimal dependencies, straightforward architecture
- **Accessibility**: Works on all devices from mobile to desktop
- **No backend**: Pure client-side application

**Target Users**: People who want to read faster without subvocalization, optimized for mobile reading.

---

## Technology Stack & Rationale

### Framework: TanStack Start
**Why**: Modern full-stack React framework with TypeScript support
**When to suggest changes**: Only if there's a compelling reason (unlikely)
**Note**: Uses file-based routing in `src/routes/`

### State Management: React Hooks + Context (minimal)
**Why**: Keeps complexity low, state close to usage
**Pattern**:
- Local state (`useState`) for UI
- Context only for theme (cross-component)
- IndexedDB for persistence
**Don't**: Suggest Redux, Zustand, or other state libraries unless absolutely necessary

### Storage: IndexedDB via `idb`
**Why**: Can store large binary files (EPUBs), persists across sessions
**Critical**: Store Blobs/ArrayBuffers, NOT URLs (URLs are session-specific)
**Pattern**: All DB operations in `src/lib/db.ts`

### Styling: Tailwind CSS
**Why**: Rapid development, consistent spacing, responsive design
**Pattern**: Theme classes via functions (not CSS variables) for type safety
**Don't**: Suggest CSS-in-JS libraries, we use utility classes

### Unit tests:
**Why**: Because it maintain reliable system funcionality when adding and refactoring
**Pattern**: Favour logic and result instead of coverage
**Don't**: test implementation details just focus on results of the outcome rather then how we got to it

### EPUB Parsing: epub.js
**Why**: Industry standard, handles metadata and rendering
**Critical**: Text extraction via rendering (not XML parsing) for accuracy
**Don't**: Suggest alternatives unless epub.js has fundamental issues

---

## Critical Architecture Decisions

### 1. Client-Side Only

**Decision**: No backend, everything in browser
**Rationale**: Privacy, simplicity, zero hosting cost
**Implications**:
- All data in IndexedDB
- No authentication/user accounts
- No cross-device sync
- Limited by browser storage quotas

**When users ask for cloud features**: Explain trade-offs (privacy vs convenience) before implementing

### 2. Store Binary Data, Not URLs

**Critical Rule**: Always store `Blob` objects, not blob URLs

❌ **Wrong**:
```typescript
const coverUrl = await book.coverUrl()
bookData.coverUrl = coverUrl  // This is temporary!
```

✅ **Correct**:
```typescript
const coverUrl = await book.coverUrl()
const response = await fetch(coverUrl)
bookData.coverBlob = await response.blob()
```

**Why**: Blob URLs like `blob:http://...` are session-dependent. Creating new URLs from stored Blobs works across reloads.

### 3. Text Extraction via Rendering

**Decision**: Render each chapter to hidden iframe, extract text from DOM
**Why**: epub.js's renderer handles complex HTML/XHTML correctly
**Trade-off**: Slower (100ms/chapter) but accurate

**Don't suggest**: XML/HTML parsing unless rendering becomes prohibitively slow (>10s for typical books)

### 4. Word-Based Progress Tracking

**Decision**: Track position as percentage of total words
**Why**: Simple, consistent across all EPUBs, doesn't depend on CFI
**Trade-off**: No chapter awareness

**If users request chapter navigation**: This would require architectural changes - store chapter boundaries during extraction

### 5. Dynamic Font Sizing

**Decision**: Calculate font size based on viewport width and word length
**Algorithm**:
```typescript
fontSize = (viewportWidth * 0.8) / (wordLength * 0.6)
// Then clamp based on device type
```

**Constants**:
- `0.8`: Viewport usage (80% of screen width)
- `0.6`: Character width ratio for monospace fonts

**If fonts overflow**: Adjust these constants, don't change the algorithm structure

### 6. Theme System Implementation

**Decision**: Tailwind classes via React functions, not CSS custom properties
**Why**: Type safety, flexibility for complex logic
**Pattern**:
```typescript
const getThemeClasses = () => {
  switch (theme) {
    case 'high-contrast': return { /* classes */ }
    // ...
  }
}
```

**When adding themes**: Update both `Library.tsx` and `EpubReader.tsx`

---

## Development Environment

**Context**: Developer works in WSL2 on Windows
**Implications**:
- Network access requires `host: '0.0.0.0'` in vite config
- Firewall rules may be needed for phone testing
- File paths are Linux-style

**Current config**: `vite.config.ts` already set to `0.0.0.0:3000`

---

## Coding Patterns & Preferences

### Component Structure

**Standard order** (follow this):
```typescript
// 1. Imports
import { useState, useEffect } from 'react'

// 2. Interfaces
interface Props {
  bookId: string
}

// 3. Component
export function Component({ bookId }: Props) {
  // 3a. Hooks (navigate, theme, etc)
  const navigate = useNavigate()

  // 3b. State
  const [loading, setLoading] = useState(false)

  // 3c. Effects
  useEffect(() => {
    // ...
    return () => cleanup()
  }, [deps])

  // 3d. Handlers
  const handleClick = () => {}

  // 3e. Theme classes (if needed)
  const tc = getThemeClasses()

  // 3f. Early returns
  if (loading) return <LoadingState />

  // 3g. Render
  return <div>...</div>
}
```

### State Management Rules

1. **Local state first**: Use `useState` unless state needs to be shared
2. **Context sparingly**: Only for theme (already implemented)
3. **No prop drilling**: If passing props >2 levels, consider restructuring
4. **Derived state**: Calculate, don't store (e.g., font size from viewport)

### Effect Cleanup

**Always cleanup resources**:
```typescript
useEffect(() => {
  const id = setInterval(...)
  const url = URL.createObjectURL(...)

  return () => {
    clearInterval(id)
    URL.revokeObjectURL(url)
  }
}, [deps])
```

**Common resources to cleanup**:
- Intervals/timeouts
- Event listeners
- Blob URLs
- epub.js renditions

### Error Handling

**Pattern**: User-friendly messages, detailed logs
```typescript
try {
  await operation()
} catch (error) {
  console.error('Detailed error:', error)  // For debugging
  alert('User-friendly message')           // For user
}
```

**Don't**: Let errors crash the app, always provide recovery

### TypeScript Guidelines

- **Interfaces over types**: Use `interface` for objects
- **Type parameters**: Use explicit types, avoid `any`
- **Optional chaining**: Use `?.` for potentially undefined values
- **Non-null assertion**: Avoid `!` unless absolutely certain

### Styling Preferences

- **Tailwind only**: No inline styles unless dynamic (like `fontSize`)
- **Responsive**: Use `sm:`, `md:`, `lg:` breakpoints
- **Theme classes**: Use `tc` object from `getThemeClasses()`
- **No magic numbers**: Use Tailwind spacing (`p-4`, `mb-8`)

---

## Common Tasks & Approaches

### Adding a New Feature

1. **Ask clarifying questions first**: Don't assume requirements
2. **Check for existing patterns**: Look at similar features
3. **Keep it simple**: Don't over-engineer
4. **Consider mobile**: Test responsive behavior
5. **Update README**: Document new features/shortcuts

### Adding a New Theme

1. Update `Theme` type in `src/lib/theme.tsx`
2. Add to `themes` object with name and description
3. Add case to `getThemeClasses()` in both:
   - `src/components/Library.tsx`
   - `src/components/EpubReader.tsx`
4. Test: Switch themes in library and reader

### Adding Database Fields

1. Update interface in `src/lib/db.ts`
2. **Increment** `DB_VERSION`
3. Add migration in `upgrade()` callback:
   ```typescript
   upgrade(db, oldVersion) {
     if (oldVersion < 2) {
       // migration logic
     }
   }
   ```
4. Update components that use the data

### Adding Keyboard Shortcuts

1. Add to keyboard handler in `EpubReader.tsx`
2. Prevent default: `e.preventDefault()`
3. Update help text in footer
4. Update README keyboard shortcuts section

### Optimizing Performance

**Before optimizing**:
1. Profile to confirm bottleneck
2. Check if it's actually slow in practice
3. Consider impact on code complexity

**Common optimizations**:
- `useMemo` for expensive calculations
- `useCallback` for stable function references
- Debounce frequent operations (bookmark saves)
- Virtual scrolling for large lists

**Don't prematurely optimize**: Keep code simple until proven slow

---

## Things to Watch Out For

### 1. SSR vs Client-Side

**Issue**: TanStack Start supports SSR, but we need client-side APIs

**Rule**: Access browser APIs only in `useEffect`

❌ **Wrong**:
```typescript
const theme = localStorage.getItem('theme')  // Breaks SSR
```

✅ **Correct**:
```typescript
useEffect(() => {
  const theme = localStorage.getItem('theme')
  setTheme(theme)
}, [])
```

### 2. Memory Leaks

**Common causes**:
- Intervals not cleared
- Event listeners not removed
- Blob URLs not revoked
- Large arrays/objects held in closures

**Always**: Return cleanup function from effects

### 3. IndexedDB Transaction Auto-Close

**Issue**: Transactions close automatically after idle time

❌ **Wrong**:
```typescript
const book = await db.get('books', id)
await someAsyncOperation()  // Transaction closed!
await db.put('books', book)  // Fails
```

✅ **Correct**:
```typescript
const tx = db.transaction('books', 'readwrite')
const book = await tx.store.get(id)
book.field = newValue
await tx.store.put(book)
await tx.done
```

### 4. Theme Application Timing

**Issue**: Theme must be applied after component mounts

**Current solution**: `mounted` state in `ThemeProvider`

**Don't**: Remove the mounting check, it prevents hydration mismatches

### 5. Font Size Calculation Dependencies

**Issue**: Font size must recalculate for every word

**Pattern**: Calculate in render, not in state
```typescript
const fontSize = calculateFontSize(currentWord)  // Every render
```

**Don't**: Store in state, it won't update correctly

---

## User Preferences & Constraints

### Code Style

- **No emojis**: Unless explicitly requested
- **Dont comment unless asked**: Only where logic isn't self-evident
- **No over-engineering**: Simplest solution that works
- **Value existing patterns**: Consistency is king
- **Use native API when possible and existing dependencies if available**: Dont reinvent the wheel every time
- **Type safety**: Prefer explicit types over inference
- **Use SOLID principles**: No spaghetti code allowed that work for just one use case
- **Attempt to do not repeat**: If there is 2 instances of something really similar maybe is worth abstracting
- **Do not create files that are too long to read**: code split effetively




### Feature Requests

**Default response**: Implement as requested, but if unclear:
1. Ask clarifying questions
2. Suggest alternatives if better approach exists
3. Explain trade-offs clearly

**Don't**: Make assumptions about requirements

### Testing Approach

**Current**: Manual testing only
**When adding features**:
1. Test on desktop (Chrome)
2. Test on mobile resolution (iPhone 12: 390px)
3. Test theme switching
4. Test data persistence (reload page)

**Don't**: Write unit tests unless specifically requested

### Documentation Updates

**After significant changes**:
1. Update `README.md` if user-facing
2. Update `DEVELOPMENT.md` if architectural
3. Update this file if patterns change

---

## Decision-Making Framework

When faced with choices, prioritize in this order:

1. **Privacy & Security**: Never compromise user data privacy
2. **Simplicity**: Simpler solution over feature-rich
3. **Mobile Experience**: Must work well on phones
4. **Performance**: Fast is better, but not at expense of simplicity
5. **Maintainability**: Code clarity over cleverness

### Example Decisions

**Should we add Redux for state management?**
- ❌ No: Adds complexity, current approach works fine
- ✅ Only if: App grows significantly (unlikely for client-side)

**Should we cache extracted text?**
- ✅ Yes: If load times exceed 5 seconds for typical books
- ❌ No: If current approach is fast enough

**Should we add user accounts?**
- ❌ No: Breaks privacy-first principle
- Alternative: Consider local export/import feature

**Should we support PDF files?**
- Ask: Is there a reliable client-side PDF parser?
- Consider: EPUB-first is core mission, PDFs are different use case
- Probably: ❌ unless user strongly requests and library exists

---

## Common Pitfalls & Solutions

### Pitfall: "Let's add cloud sync"

**Issue**: Breaks privacy-first principle
**Alternative**: Export/import library as JSON file
**When to reconsider**: If user explicitly wants cloud and understands trade-offs

### Pitfall: "Let's rewrite in [framework]"

**Issue**: Framework is fine, rewrite has no benefits
**Response**: TanStack Start is modern and suitable
**When to reconsider**: Never, unless framework becomes unmaintained

### Pitfall: "Let's add chapters to database"

**Issue**: Requires re-extracting all books
**Better approach**: Extract chapters during initial load and store with book
**Migration**: Must handle existing books without chapter data

### Pitfall: "Font size is wrong on [device]"

**Issue**: Likely need to adjust constants
**Don't**: Rewrite algorithm
**Do**: Tweak `VIEWPORT_USAGE` or device breakpoint constants

### Pitfall: "IndexedDB quota exceeded"

**Issue**: Browser storage limit reached
**Don't**: Add server storage
**Do**:
1. Warn users about large EPUBs
2. Add library size indicator
3. Provide cleanup tools

---

## Project-Specific Context

### Why No Server?

**User priority**: Privacy and simplicity
**Trade-off accepted**: No cross-device sync
**Don't suggest**: Backend unless absolutely necessary

### Why Spritz Reading?

**Goal**: Maximize reading speed
**Research-backed**: ORP technique is proven effective
**Don't suggest**: Traditional reading modes, we're Spritz-focused

### Why IndexedDB Over Server?

**Benefits**: Privacy, zero cost, works offline
**Limitation**: Browser quotas (~50-100MB)
**Acceptable**: For typical user with 10-20 books

### Why Word-Based Tracking?

**Simplicity**: Easy to implement and understand
**Limitation**: No chapter awareness
**Future**: Could add chapters without breaking existing bookmarks

---

## Quick Reference

### Project Structure
```
src/
├── components/
│   ├── EpubReader.tsx     # Reading interface
│   ├── Library.tsx        # Book management
│   └── Header.tsx         # Unused navigation
├── lib/
│   ├── db.ts             # IndexedDB operations
│   ├── theme.tsx         # Theme context
│   └── utils.ts          # Utilities
├── routes/
│   ├── __root.tsx        # App shell
│   ├── index.tsx         # Library (home)
│   └── read.$bookId.tsx  # Reader route
└── types/
    └── epubjs.d.ts       # epub.js types
```

### Key Files to Check Before Changes

- **Adding features**: Check `Library.tsx` and `EpubReader.tsx`
- **Data model changes**: Update `src/lib/db.ts` + increment version
- **Theme changes**: Update both `Library.tsx` and `EpubReader.tsx`
- **Route changes**: Modify `src/routes/`
- **Type changes**: Update `src/types/epubjs.d.ts` if epub.js related

### Constants You Might Need

```typescript
// Font sizing (EpubReader.tsx)
VIEWPORT_USAGE = 0.8        // Use 80% of screen width
CHAR_WIDTH_RATIO = 0.6      // Monospace char width
MOBILE_MAX_FONT = 64        // Max font size on mobile
TABLET_MAX_FONT = 96        // Max font size on tablet
DESKTOP_MAX_FONT = 128      // Max font size on desktop

// Reading
DEFAULT_WPM = 300           // Default reading speed

// Database
DB_NAME = 'spritz-reader'
DB_VERSION = 1              // Increment on schema changes
```

---

## Collaboration Guidelines

### When to Ask Questions

**Always ask if**:
- Requirements are ambiguous
- Multiple valid approaches exist
- Change affects privacy/security
- Architectural change needed
- User preference unclear

**Don't assume**:
- User wants features not requested
- More complex is better
- Backend is acceptable

### When to Suggest Alternatives

**Do suggest** if:
- Simpler approach exists
- Performance improvement is significant
- Security vulnerability present

**Frame suggestions**: "This works, but [alternative] might be better because..."

### When to Push Back

**Respectfully decline** if request:
- Compromises privacy principle
- Adds unnecessary complexity
- Requires complete rewrite
- Goes against established patterns

**Explain trade-offs**: Help user make informed decision

---

## Testing Checklist (for AI)

Before marking work complete, mentally verify:

- [ ] Works on mobile viewport (390px width)
- [ ] Works on desktop viewport (1920px width)
- [ ] All themes apply correctly (base, high-contrast, OLED)
- [ ] No console errors
- [ ] Data persists after reload
- [ ] Cleanup functions present in effects
- [ ] TypeScript has no errors
- [ ] No inline styles (unless dynamic values)
- [ ] Follows component structure pattern
- [ ] README updated if user-facing change

---

## Example Prompts & Expected Responses

### User: "Add cloud sync"

**Bad Response**: "I'll add Firebase authentication and storage..."

**Good Response**: "Cloud sync would compromise the privacy-first principle of storing everything locally. Would you like to implement export/import instead, so you can manually transfer your library between devices?"

### User: "The font is too small on my tablet"

**Bad Response**: "Let me rewrite the font calculation..."

**Good Response**: "I'll adjust the tablet font size constraints. The current max is 96px, I can increase it. What size feels comfortable? Or I can test a few values."

### User: "Can we add PDF support?"

**Bad Response**: "Sure, I'll add pdf.js..."

**Good Response**: "PDFs and EPUBs are quite different formats. Is there a specific reason you need PDFs? If it's just for reading, EPUBs are better suited for Spritz-style reading. But if you frequently have PDFs, we could explore it."

### User: "Add a bookmark feature"

**Bad Response**: "I'll create a new bookmarks system..."

**Good Response**: "Actually, automatic bookmarking is already implemented! Your reading position is saved on every word. Did you mean something different, like saving multiple positions or manual bookmarks?"

---

## Learning Resources

If you need to understand specific parts:

- **TanStack Router**: Check file-based routing patterns in `src/routes/`
- **epub.js**: See text extraction in `EpubReader.tsx` lines 145-180
- **IndexedDB**: Review `src/lib/db.ts` for patterns
- **Spritz ORP**: See `getORP()` function in `EpubReader.tsx`
- **Theme system**: Check `src/lib/theme.tsx` and usage in components
- **Responsive font**: See `calculateFontSize()` in `EpubReader.tsx`

---

## Final Notes

**Project Philosophy**: This is a focused tool for Spritz speed reading. It does one thing well. Resist feature creep.

**Code Quality**: Favor readability over cleverness. The next AI (or human) should easily understand the code.

**User First**: The user chose this architecture (client-side, privacy-first). Respect those decisions unless they explicitly want to change direction.

**Be Helpful**: If you see opportunities for improvement, suggest them. But always explain the trade-offs and let the user decide.

---

**Last Updated**: 2026-01-26
**Version**: 1.0
**Update this file**: When patterns change or new decisions are made
