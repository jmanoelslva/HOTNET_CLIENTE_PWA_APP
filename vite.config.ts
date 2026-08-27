import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Nunca cachear /api/* — são sempre dados dinâmicos e ligados à
      // sessão (boletos, consumo, chamados...); o service worker só
      // deve cuidar dos arquivos estáticos do próprio app.
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'HOTNET — Portal do Cliente',
        short_name: 'HOTNET',
        description: 'Acompanhe boletos, contratos, consumo e suporte da HOTNET.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5f5f5',
        theme_color: '#f28f3b',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // Em desenvolvimento, o navegador só fala com o próprio servidor
      // do Vite (localhost) — ele repassa pra hotnet.net.br por baixo,
      // então o cookie de sessão (BRBOSCookie) e a origem ficam
      // consistentes, sem problema de CORS. Em produção, isso precisa
      // ser feito pelo servidor real (Apache/Nginx) — ver README.md.
      '/api': {
        target: 'https://hotnet.net.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})
