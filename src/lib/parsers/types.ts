export interface ParsedContent {
  title: string
  author: string
  text: string
}

export interface FileParser {
  parse(file: File): Promise<ParsedContent>
  supportedExtensions: string[]
  mimeTypes: string[]
}
