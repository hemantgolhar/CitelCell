import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/CitelCell/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'CitelCell',
        short_name: 'CitelCell',
        description: 'Offline personal mobile sales CRM',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1769e0',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/citelcell-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/citelcell-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/citelcell-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,wasm,gz}'],
        globIgnores: ['icons/citelcell-master.png'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
    }),
  ],
})
