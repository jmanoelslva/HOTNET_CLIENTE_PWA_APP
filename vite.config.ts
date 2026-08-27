import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
