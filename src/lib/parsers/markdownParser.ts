import type { FileParser, ParsedContent } from './types'

function extractTitleFromMarkdown(text: string): string | null {
  const h1Match = text.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()

  const altH1Match = text.match(/^(.+)\n=+\s*$/m)
  if (altH1Match) return altH1Match[1].trim()

  return null
}

function stripMarkdownSyntax(text: string): string {
  return (
    text
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/!\[.*?\]\(.+?\)/g, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^\s*>\s+/gm, '')
      .replace(/^[-*_]{3,}\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
  )
}

export const markdownParser: FileParser = {
  supportedExtensions: ['.md', '.markdown', '.txt'],
  mimeTypes: ['text/markdown', 'text/plain', 'text/x-markdown'],

  async parse(file: File): Promise<ParsedContent> {
    const text = await file.text()
    const title = extractTitleFromMarkdown(text) || file.name.replace(/\.(md|markdown|txt)$/i, '')
    const cleanText = stripMarkdownSyntax(text)

    return {
      title,
      author: 'Unknown Author',
      text: cleanText,
    }
  },
}
