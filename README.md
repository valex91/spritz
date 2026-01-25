# Spritz - Speed Reading EPUB Reader

A browser-based EPUB reader that uses the Spritz speed reading technique to display one word at a time with optimal recognition point (ORP) highlighting.

## Features

- **Spritz Speed Reading**: Read one word at a time with the ORP character highlighted in red
- **Adjustable Speed**: 100-1000 WPM (default 300 WPM)
- **Responsive Font Sizing**: Automatically adjusts text size based on word length and screen size
- **Client-Side Storage**: All books and bookmarks stored in IndexedDB
- **Automatic Bookmarking**: Your reading position is saved automatically
- **Keyboard Controls**: Space to play/pause, arrow keys to navigate, F for fullscreen
- **Progress Tracking**: Visual progress bar with click-to-seek functionality
- **Fullscreen Mode**: Distraction-free reading with fullscreen support
- **Theme Options**: Base, High Contrast, and OLED themes
- **Mobile Optimized**: Works perfectly on all screen sizes from iPhone to desktop

## Tech Stack

- **TanStack Start**: Full-stack React framework
- **epub.js**: EPUB parsing and rendering
- **idb**: IndexedDB wrapper for data persistence
- **Tailwind CSS**: Styling
- **Lucide React**: Icons

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── EpubReader.tsx    # Main Spritz reader component
│   ├── Library.tsx        # Book library/upload interface
│   └── Header.tsx         # Navigation header (unused)
├── lib/
│   ├── db.ts             # IndexedDB schema and operations
│   └── utils.ts          # Utility functions
├── routes/
│   ├── __root.tsx        # Root layout
│   ├── index.tsx         # Homepage (Library)
│   └── read.$bookId.tsx  # Book reader page
└── types/
    └── epubjs.d.ts       # TypeScript definitions for epub.js
```

## Key Implementation Details

### IndexedDB Schema (`src/lib/db.ts`)

Two object stores:

1. **books**: Stores EPUB files and metadata
   - `id`: Unique identifier (UUID)
   - `title`: Book title from EPUB metadata
   - `author`: Author name from EPUB metadata
   - `file`: ArrayBuffer of the EPUB file
   - `coverUrl`: Cover image URL (optional)
   - `addedAt`: Timestamp when book was added
   - `lastRead`: Timestamp of last reading session

2. **bookmarks**: Stores reading position
   - `bookId`: Foreign key to books
   - `cfi`: EPUB Canonical Fragment Identifier (unused in Spritz mode)
   - `percentage`: Reading progress as percentage (0-100)
   - `updatedAt`: Timestamp of last update

### Spritz Reader Implementation (`src/components/EpubReader.tsx`)

#### Text Extraction Process

1. Load EPUB file using epub.js
2. Create a hidden off-screen container
3. Render each chapter from the spine to an iframe
4. Extract text content from each rendered iframe
5. Split text into individual words
6. Clean up temporary rendering elements

```typescript
// Key technique: Render chapters to extract clean text
const rendition = book.renderTo(tempContainer, { width: 1000, height: 1000 })
await rendition.display(item.href)
const text = iframe.contentDocument.body.textContent
```

#### Optimal Recognition Point (ORP)

The ORP is the character in each word where your eye should focus for fastest recognition:

```typescript
const getORP = (word: string) => {
  const length = word.length
  if (length <= 1) return 0
  if (length <= 5) return 1
  if (length <= 9) return 2
  if (length <= 13) return 3
  return 4
}
```

This character is highlighted in red while others remain white.

#### Dynamic Font Sizing

Font size automatically adjusts based on word length and screen size to ensure optimal readability:

```typescript
const calculateFontSize = (word: string) => {
  const wordLength = word.length
  const availableWidth = viewportWidth * 0.8

  // Calculate font size to fit word within viewport
  let fontSize = availableWidth / (wordLength * charWidthRatio)

  // Apply device-specific constraints
  if (mobile) fontSize = clamp(32, 64)      // 2rem - 4rem
  else if (tablet) fontSize = clamp(48, 96)  // 3rem - 6rem
  else fontSize = clamp(64, 128)             // 4rem - 8rem

  return fontSize
}
```

This ensures:
- Short words are large and easy to read
- Long words scale down to fit the screen
- Mobile devices get appropriately sized text
- Desktop users get larger, more comfortable text

#### Playback Control

Words are displayed using a `setInterval` timer:

```typescript
const msPerWord = 60000 / wpm  // Convert WPM to milliseconds per word
setInterval(() => {
  setCurrentIndex(prev => prev + 1)
}, msPerWord)
```

#### Bookmark Persistence

Reading position is saved on every word change:

```typescript
useEffect(() => {
  if (words.length > 0 && currentIndex >= 0) {
    const percentage = (currentIndex / words.length) * 100
    epubDB.saveBookmark({ bookId, cfi: '', percentage, updatedAt: Date.now() })
  }
}, [currentIndex, words.length, bookId])
```

On load, the position is restored:

```typescript
const bookmark = await epubDB.getBookmark(bookId)
if (bookmark && bookmark.percentage > 0) {
  const savedIndex = Math.floor((bookmark.percentage / 100) * wordArray.length)
  setCurrentIndex(savedIndex)
}
```

### Library Component (`src/components/Library.tsx`)

Handles EPUB upload and book management:

1. **File Upload**: Reads EPUB as ArrayBuffer
2. **Metadata Extraction**: Uses epub.js to get title, author, cover
3. **Storage**: Saves to IndexedDB with UUID
4. **Display**: Grid of books sorted by last read time
5. **Navigation**: Click to open book in Spritz reader

## Keyboard Shortcuts

- **Space**: Play/Pause reading
- **Left Arrow**: Previous word
- **Right Arrow**: Next word
- **F**: Toggle fullscreen mode
- **ESC**: Exit fullscreen (browser default)
- **Click Progress Bar**: Jump to position

## Button Controls

- **Play/Pause**: Start/stop automatic word advancement
- **Skip Back**: Jump back 10 words
- **Skip Forward**: Jump forward 10 words
- **Home**: Return to library
- **Fullscreen**: Toggle fullscreen mode for distraction-free reading
- **Settings**: Adjust reading speed (100-1000 WPM)

## Database Operations

All operations are async and use the `epubDB` singleton:

```typescript
// Add a book
await epubDB.addBook(bookData)

// Get a book
const book = await epubDB.getBook(bookId)

// Get all books
const books = await epubDB.getAllBooks()

// Delete a book (also deletes bookmark)
await epubDB.deleteBook(bookId)

// Save bookmark
await epubDB.saveBookmark({ bookId, cfi: '', percentage, updatedAt })

// Get bookmark
const bookmark = await epubDB.getBookmark(bookId)

// Update last read time
await epubDB.updateLastRead(bookId)
```

## Browser Compatibility

Requires modern browser with:
- IndexedDB support
- ES6+ support
- DOM Parser API
- Blob/ArrayBuffer support

Works best in Chrome, Firefox, Safari, and Edge (latest versions).

## Storage Limits

IndexedDB storage is limited by browser quota (typically 50-100MB minimum). Large EPUB files (with images) may use significant space. Text-only EPUBs are very efficient.

## Maintenance Notes

### Adding New Features

1. **New routes**: Add files to `src/routes/` following TanStack Router conventions
2. **New components**: Add to `src/components/`
3. **Database changes**: Update `src/lib/db.ts` and increment `DB_VERSION`
4. **Styling**: Use Tailwind classes, modify colors in Tailwind config if needed

### Common Issues

1. **"Failed to load book content"**: Usually caused by corrupted EPUB or unsupported format
2. **Bookmark not saving**: Check IndexedDB quota in browser DevTools
3. **Slow text extraction**: Large EPUBs with many chapters take time to render

### Performance Considerations

- Text extraction happens once per book load (not cached currently)
- Each word transition saves to IndexedDB (debounce if performance issues)
- Large books (>100k words) work fine but take longer to load initially

## License

MIT
