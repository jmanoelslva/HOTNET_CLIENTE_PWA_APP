import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { IconContext } from 'react-icons'
import { SessionProvider } from './auth/SessionContext.tsx'
import { ToastProvider } from './components/Toast/ToastContext.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { iniciarTema } from './utils/tema.ts'
import { iniciarAtualizacaoApp } from './utils/atualizacaoApp.ts'
import './index.css'
import App from './App.tsx'

// Antes do primeiro render, pra não piscar no tema errado (flash of
// wrong theme) enquanto o React ainda nem montou.
iniciarTema()
// Versão nova sem fechar e abrir o app (ver utils/atualizacaoApp.ts).
iniciarAtualizacaoApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Ícones são enfeite: o leitor de tela lê o texto ou o aria-label do botão, como no app (contentDescription = null). */}
    <IconContext.Provider value={{ attr: { 'aria-hidden': true, focusable: 'false' } }}>
      <BrowserRouter>
        <ErrorBoundary>
          <ToastProvider>
            <SessionProvider>
              <App />
            </SessionProvider>
          </ToastProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </IconContext.Provider>
  </StrictMode>,
)
