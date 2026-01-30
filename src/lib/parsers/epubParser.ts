import ePub from 'epubjs'
import type { FileParser, ParsedContent } from './types'

async function extractTextFromEpub(arrayBuffer: ArrayBuffer): Promise<string> {
  const book = ePub(arrayBuffer)
  await book.ready

  const tempContainer = document.createElement('div')
  tempContainer.style.position = 'absolute'
  tempContainer.style.left = '-9999px'
  tempContainer.style.width = '1000px'
  document.body.appendChild(tempContainer)

  const rendition = book.renderTo(tempContainer, {
    width: 1000,
    height: 1000,
  })

  const { spine } = book
  let allText = ''

  for (const item of spine.items) {
    try {
      await rendition.display(item.href)
      await new Promise((resolve) => setTimeout(resolve, 100))

      const iframe = tempContainer.querySelector('iframe')
      if (iframe?.contentDocument?.body) {
        const text = iframe.contentDocument.body.textContent || ''
        allText += text + ' '
      }
    } catch {
      // Skip chapters that fail to load
    }
  }

  rendition.destroy()
  document.body.removeChild(tempContainer)
  book.destroy()

  return allText
}

export const epubParser: FileParser = {
  supportedExtensions: ['.epub'],
  mimeTypes: ['application/epub+zip'],

  async parse(file: File): Promise<ParsedContent> {
    const arrayBuffer = await file.arrayBuffer()
    const book = ePub(arrayBuffer)
    await book.ready

    const metadata = await book.loaded.metadata
    const text = await extractTextFromEpub(arrayBuffer)

    return {
      title: metadata.title || file.name.replace(/\.epub$/i, ''),
      author: metadata.creator || 'Unknown Author',
      text,
    }
  },
}
