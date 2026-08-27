import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AvisoGate from './components/AvisoGate'
import RotaProtegida from './components/RotaProtegida'
import BottomNav from './components/BottomNav'
import { useSessao } from './auth/SessionContext'
import Boletos from './pages/Boletos'
import Cadastro from './pages/Cadastro'
import Consumo from './pages/Consumo'
import Contratos from './pages/Contratos'
import DetalheChamado from './pages/DetalheChamado'
import Faq from './pages/Faq'
import Home from './pages/Home'
import Login from './pages/Login'
import Sobre from './pages/Sobre'
import Suporte from './pages/Suporte'

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

      {logado && mostrarBottomNav(location.pathname) && <BottomNav />}
    </AvisoGate>
  )
}

export default App
