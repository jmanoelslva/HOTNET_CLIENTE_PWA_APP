import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AvisoGate from './components/AvisoGate'
import RotaProtegida from './components/RotaProtegida'
import BottomNav from './components/BottomNav'
import StatusBanners from './components/StatusBanners'
import Spinner from './components/Spinner'
import { useSessao } from './auth/SessionContext'

// Uma página por chunk — carregada só quando o cliente navega até ela, em
// vez de tudo num bundle inicial só (a lista de rotas só cresce).
const Boletos = lazy(() => import('./pages/Boletos'))
const Cadastro = lazy(() => import('./pages/Cadastro'))
const Consumo = lazy(() => import('./pages/Consumo'))
const Contratos = lazy(() => import('./pages/Contratos'))
const DetalheChamado = lazy(() => import('./pages/DetalheChamado'))
const Faq = lazy(() => import('./pages/Faq'))
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Sobre = lazy(() => import('./pages/Sobre'))
const Suporte = lazy(() => import('./pages/Suporte'))

// Telas onde a barra de navegação não aparece: login (ainda sem sessão)
// e o chat de um chamado (já tem sua própria barra fixa de envio no
// rodapé, sobreporia as duas).
function mostrarBottomNav(pathname: string): boolean {
  if (pathname === '/login') return false
  if (pathname.startsWith('/suporte/')) return false
  return true
}

function App() {
  const { logado } = useSessao()
  const location = useLocation()

  return (
    <AvisoGate>
      <StatusBanners />
      <Suspense fallback={<Spinner tela />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RotaProtegida>
                <Home />
              </RotaProtegida>
            }
          />
          <Route
            path="/boletos"
            element={
              <RotaProtegida>
                <Boletos />
              </RotaProtegida>
            }
          />
          <Route
            path="/contratos"
            element={
              <RotaProtegida>
                <Contratos />
              </RotaProtegida>
            }
          />
          <Route
            path="/consumo"
            element={
              <RotaProtegida>
                <Consumo />
              </RotaProtegida>
            }
          />
          <Route
            path="/suporte"
            element={
              <RotaProtegida>
                <Suporte />
              </RotaProtegida>
            }
          />
          <Route
            path="/suporte/:ticketPk"
            element={
              <RotaProtegida>
                <DetalheChamado />
              </RotaProtegida>
            }
          />
          <Route
            path="/cadastro"
            element={
              <RotaProtegida>
                <Cadastro />
              </RotaProtegida>
            }
          />
          <Route
            path="/faq"
            element={
              <RotaProtegida>
                <Faq />
              </RotaProtegida>
            }
          />
          <Route
            path="/sobre"
            element={
              <RotaProtegida>
                <Sobre />
              </RotaProtegida>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {logado && mostrarBottomNav(location.pathname) && <BottomNav />}
    </AvisoGate>
  )
}

export default App
