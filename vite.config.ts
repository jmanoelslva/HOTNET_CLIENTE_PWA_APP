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
    // Escuta em todas as interfaces de rede (não só localhost), pra dar
    // pra abrir o app a partir de outro aparelho na mesma rede Wi-Fi
    // (ex: celular) usando o IP local da máquina — ver URLs impressas no
    // terminal ao rodar "npm run dev" (a "Network:").
    host: true,
    proxy: {
      // Em desenvolvimento, o navegador só fala com o próprio servidor
      // do Vite — ele repassa pra hotnet.net.br por baixo, então o
      // cookie de sessão (BRBOSCookie) e a origem ficam consistentes,
      // sem problema de CORS. Em produção, isso precisa ser feito pelo
      // servidor real (Apache/Nginx) — ver README.md.
      '/api': {
        target: 'https://hotnet.net.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          // Reescreve o domínio do cookie de sessão pro host que o
          // navegador REALMENTE usou pra falar com o Vite — localhost,
          // 127.0.0.1 ou o IP da rede local (celular) — em vez de um
          // valor fixo. Um cookieDomainRewrite fixo (ex: 'localhost')
          // quebraria o acesso pelo IP: o navegador rejeita cookie de
          // domínio incompatível com o host que ele está acessando.
          proxy.on('proxyRes', (proxyRes, req) => {
            const setCookie = proxyRes.headers['set-cookie']
            if (!setCookie) return
            const host = (req.headers.host ?? 'localhost').split(':')[0]
            proxyRes.headers['set-cookie'] = setCookie.map((cookie) =>
              cookie.replace(/Domain=[^;]+/i, `Domain=${host}`),
            )
          })
        },
      },
      // Páginas geradas pelo próprio backend (ex: o layout de impressão
      // do boleto, invoice_ctl/invoice/print_layout, servido via /api)
      // referenciam logo/ícones com caminho absoluto (ex:
      // "/public/assets/uploaddir/logo/office/1/logo.png"), esperando
      // estar em hotnet.net.br — sem repassar essas duas rotas também,
      // o navegador tenta buscar essas imagens no nosso próprio domínio
      // e elas quebram. Sem rewrite: mantém o path igual dos dois lados.
      '/public': {
        target: 'https://hotnet.net.br',
        changeOrigin: true,
        secure: true,
      },
      '/common': {
        target: 'https://hotnet.net.br',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
