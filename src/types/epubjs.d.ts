declare module 'epubjs' {
  export interface NavItem {
    id: string
    href: string
    label: string
    subitems?: NavItem[]
  }

  export interface Metadata {
    title: string
    creator: string
    description?: string
    pubdate?: string
    publisher?: string
    identifier?: string
    language?: string
    rights?: string
    modified_date?: string
  }

  export interface Location {
    start: {
      cfi: string
      displayed: { page: number; total: number }
      href: string
      index: number
      location: number
      percentage: number
    }
    end: {
      cfi: string
      displayed: { page: number; total: number }
      href: string
      index: number
      location: number
      percentage: number
    }
  }

  export interface Book {
    ready: Promise<void>
    loaded: {
      metadata: Promise<Metadata>
      navigation: Promise<{ toc: NavItem[] }>
      cover: Promise<string>
    }
    renderTo(element: HTMLElement | string, options?: any): Rendition
    coverUrl(): Promise<string | null>
    destroy(): void
  }

  export interface Rendition {
    display(target?: string | number): Promise<void>
    next(): Promise<void>
    prev(): Promise<void>
    on(event: string, callback: (data: any) => void): void
    off(event: string, callback: (data: any) => void): void
    themes: {
      default(styles: any): void
      fontSize(size: string): void
      font(font: string): void
      register(name: string, styles: any): void
      select(name: string): void
    }
    currentLocation(): Location
    destroy(): void
  }

  export default function ePub(
    url: string | ArrayBuffer,
    options?: any
  ): Book
}
