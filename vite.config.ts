import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import { VitePWA } from 'vite-plugin-pwa'

import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  base: '/spritz/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
  },
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    TanStackRouterVite(),
    viteReact(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff,woff2}'],
      },
      manifest: {
        name: 'Spritz - Speed Reading',
        short_name: 'Spritz',
        description: 'A privacy-first speed reading app using the Spritz technique',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/spritz/',
        scope: '/spritz/',
        icons: [
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})

export default config
