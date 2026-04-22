import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const basePath = process.env.BASE_PATH || '/Mila-scheduler/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'График на Мила',
        short_name: 'Мила',
        description: 'Ежедневен график за хранене и сън на Мила',
        lang: 'bg',
        theme_color: '#db2777',
        background_color: '#fdf2f8',
        display: 'standalone',
        orientation: 'portrait',
        scope: basePath,
        start_url: basePath,
        icons: [
          {
            src: 'favicon.svg',
            sizes: '64x64 128x128 256x256',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'apple-touch-icon.svg',
            sizes: '180x180 192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
