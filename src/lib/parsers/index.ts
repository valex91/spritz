import { epubParser } from './epubParser'
import { markdownParser } from './markdownParser'
import { pdfParser } from './pdfParser'
import type { FileParser, ParsedContent } from './types'

export type { ParsedContent, FileParser }

const parsers: FileParser[] = [epubParser, pdfParser, markdownParser]

export function getParserForFile(file: File): FileParser | null {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  const mimeType = file.type.toLowerCase()

  for (const parser of parsers) {
    if (parser.supportedExtensions.includes(extension)) {
      return parser
    }
    if (mimeType && parser.mimeTypes.includes(mimeType)) {
      return parser
    }
  }

  return null
}

export function getSupportedExtensions(): string[] {
  return parsers.flatMap((p) => p.supportedExtensions)
}

export function getAcceptString(): string {
  const extensions = parsers.flatMap((p) => p.supportedExtensions)
  const mimeTypes = parsers.flatMap((p) => p.mimeTypes)
  return [...extensions, ...mimeTypes].join(',')
}

export async function parseFile(file: File): Promise<ParsedContent> {
  const parser = getParserForFile(file)
  if (!parser) {
    throw new Error(`Unsupported file type: ${file.name}`)
  }
  return parser.parse(file)
}
