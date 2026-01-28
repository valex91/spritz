import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import pngToIco from 'png-to-ico'

const PUBLIC_DIR = path.join(import.meta.dirname, '../public')
const SVG_PATH = path.join(PUBLIC_DIR, 'icon.svg')

async function generateIcons() {
  const svgBuffer = await fs.readFile(SVG_PATH)

  // Generate PNG files for PWA
  console.log('Generating logo192.png...')
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo192.png'))

  console.log('Generating logo512.png...')
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo512.png'))

  // Generate sizes for favicon
  const sizes = [16, 32, 48, 64]
  const pngBuffers = []

  for (const size of sizes) {
    console.log(`Generating ${size}x${size} for favicon...`)
    const buffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer()
    pngBuffers.push(buffer)
  }

  // Convert to ICO
  console.log('Generating favicon.ico...')
  const icoBuffer = await pngToIco(pngBuffers)
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer)

  console.log('Done! Generated:')
  console.log('  - public/logo192.png')
  console.log('  - public/logo512.png')
  console.log('  - public/favicon.ico')
}

generateIcons().catch(console.error)
