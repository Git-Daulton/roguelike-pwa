// vite.config.js
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Roguelike PWA',
        short_name: 'Roguelike',
        start_url: '/',
        display: 'standalone',
        background_color: '#070a0e',
        theme_color: '#070a0e',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    host: true,      // bind 0.0.0.0 so it’s reachable on LAN/WSL
    port: 5174,
    strictPort: true
  }
})