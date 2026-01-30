import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'
import type { FileParser, ParsedContent } from './types'

GlobalWorkerOptions.workerPort = new PdfWorker()

async function extractTextFromPdf(pdf: PDFDocumentProxy): Promise<string> {
  const textParts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textParts.push(pageText)
  }

  return textParts.join(' ')
}

function extractTitleFromPdfMetadata(metadata: unknown): string | null {
  if (metadata && typeof metadata === 'object' && 'info' in metadata) {
    const info = (metadata as { info: Record<string, unknown> }).info
    if (info.Title && typeof info.Title === 'string') {
      return info.Title
    }
  }
  return null
}

function extractAuthorFromPdfMetadata(metadata: unknown): string | null {
  if (metadata && typeof metadata === 'object' && 'info' in metadata) {
    const info = (metadata as { info: Record<string, unknown> }).info
    if (info.Author && typeof info.Author === 'string') {
      return info.Author
    }
  }
  return null
}

export const pdfParser: FileParser = {
  supportedExtensions: ['.pdf'],
  mimeTypes: ['application/pdf'],

  async parse(file: File): Promise<ParsedContent> {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise

    const [metadata, text] = await Promise.all([
      pdf.getMetadata().catch(() => null),
      extractTextFromPdf(pdf),
    ])

    const title =
      extractTitleFromPdfMetadata(metadata) || file.name.replace(/\.pdf$/i, '')
    const author = extractAuthorFromPdfMetadata(metadata) || 'Unknown Author'

    return {
      title,
      author,
      text,
    }
  },
}
