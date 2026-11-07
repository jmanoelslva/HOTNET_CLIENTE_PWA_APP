import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import AvisoGate from './components/AvisoGate'
import RotaProtegida from './components/RotaProtegida'
import BottomNav from './components/BottomNav'
import StatusBanners from './components/StatusBanners'
import AvisoCopiadoHost from './components/AvisoCopiado'
import BloqueioPin from './components/BloqueioPin'
import { marcarSaidaDoApp, pinAtivo, precisaDesbloquear } from './utils/pinApp'
import Spinner from './components/Spinner'
import { useSessao } from './auth/useSessao'
import { aplicarVersaoNovaSePreciso } from './utils/atualizacaoApp'
import { atualizarCorDasBarras } from './utils/tema'
import { registrarTela } from './utils/pilhaNavegacao'

// Uma página por chunk — carregada só quando o cliente navega até ela, em
// vez de tudo num bundle inicial só (a lista de rotas só cresce).
const AlterarSenha = lazy(() => import('./pages/AlterarSenha'))
const Boletos = lazy(() => import('./pages/Boletos'))
const Cadastro = lazy(() => import('./pages/Cadastro'))
const Consumo = lazy(() => import('./pages/Consumo'))
const Contratos = lazy(() => import('./pages/Contratos'))
const DetalheChamado = lazy(() => import('./pages/DetalheChamado'))
const Faq = lazy(() => import('./pages/Faq'))
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Perfil = lazy(() => import('./pages/Perfil'))
const Quitacao = lazy(() => import('./pages/Quitacao'))
const Velocidade = lazy(() => import('./pages/Velocidade'))
const Seguranca = lazy(() => import('./pages/Seguranca'))
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
  const { logado, cpf, sair } = useSessao()
  const location = useLocation()
  // Proteção por PIN (Perfil → Segurança): pede ao abrir e depois de 5 min fora.
  const [bloqueado, setBloqueado] = useState(() => precisaDesbloquear())
  useEffect(() => {
    const aoMudar = () => {
      if (document.visibilityState === 'hidden') marcarSaidaDoApp()
      else if (precisaDesbloquear()) setBloqueado(true)
    }
    document.addEventListener('visibilitychange', aoMudar)
    return () => document.removeEventListener('visibilitychange', aoMudar)
  }, [])

  // Versão nova já instalada: a troca de tela recarrega já na tela de
  // destino (ver utils/atualizacaoApp.ts).
  useEffect(() => {
    aplicarVersaoNovaSePreciso()
    atualizarCorDasBarras()
  }, [location.pathname])

  // Nível de cada tela no histórico, para o voltar da barra (utils/pilhaNavegacao.ts).
  const tipoNavegacao = useNavigationType()
  useEffect(() => {
    registrarTela(location.key, location.pathname, tipoNavegacao)
  }, [location.key, location.pathname, tipoNavegacao])

  return (
    <AvisoGate>
      <StatusBanners />
      <AvisoCopiadoHost />
      {logado && cpf && bloqueado && pinAtivo(cpf) && (
        <BloqueioPin
          documento={cpf}
          onDesbloquear={() => setBloqueado(false)}
          onSair={() => {
            setBloqueado(false)
            sair()
          }}
        />
      )}
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
            path="/seguranca"
            element={
              <RotaProtegida>
                <Seguranca />
              </RotaProtegida>
            }
          />
          <Route
            path="/velocidade"
            element={
              <RotaProtegida>
                <Velocidade />
              </RotaProtegida>
            }
          />
          <Route
            path="/quitacao"
            element={
              <RotaProtegida>
                <Quitacao />
              </RotaProtegida>
            }
          />
          <Route
            path="/perfil"
            element={
              <RotaProtegida>
                <Perfil />
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
          <Route
            path="/alterar-senha"
            element={
              <RotaProtegida>
                <AlterarSenha />
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
