import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdAccountCircle, MdGetApp, MdLock, MdSupportAgent, MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { useSessao } from '../auth/SessionContext'
import LoginBackground from '../components/LoginBackground'
import ModalInstalarIos from '../components/ModalInstalarIos'
import { usePwaInstall } from '../hooks/usePwaInstall'
import logoHotnet from '../assets/logo-hotnet.png'
import { abrirWhatsappLogin } from '../utils/whatsapp'
import './Login.css'

export default function Login() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const { entrar, carregando, erro } = useSessao()
  const navigate = useNavigate()
  const { podeInstalar, podeInstalarIos, aoClicarInstalar, modalIosAberto, fecharModalIos } = usePwaInstall()

  // Em iOS não existe prompt automático do navegador (ver usePwaInstall.ts)
  // — esse é o jeito de aparecer "sozinho" logo na tela de login, já que é
  // a primeira tela que o cliente vê antes mesmo de entrar. Aparece de
  // novo a cada visita à tela de login enquanto o app não for instalado
  // (sem "só uma vez" salvo em localStorage) — se o cliente ignorar ou
  // fechar sem seguir o passo a passo, o botão "Instalar app" abaixo
  // continua disponível a qualquer momento, sem depender de ver esse aviso
  // de novo.
  useEffect(() => {
    if (!podeInstalarIos) return
    aoClicarInstalar()
  }, [podeInstalarIos, aoClicarInstalar])

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const sucesso = await entrar(usuario, senha)
    if (sucesso) navigate('/', { viewTransition: true })
  }

  return (
    <div className="login-tela tela-entrada">
      <LoginBackground />

      <div className="login-card">
        <img src={logoHotnet} alt="HOTNET" className="login-logo" />

        <form onSubmit={aoEnviar}>
          <label htmlFor="usuario">
            <MdAccountCircle className="login-label-icone" /> CPF ou CNPJ
          </label>
          <input
            id="usuario"
            type="text"
            inputMode="numeric"
            value={usuario}
            onChange={(evento) => setUsuario(evento.target.value)}
            placeholder="Somente números"
            required
          />

          <label htmlFor="senha">
            <MdLock className="login-label-icone" /> Senha
          </label>
          <div className="login-campo-senha">
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              placeholder="Digite sua senha"
              required
            />
            <button
              type="button"
              className="login-toggle-senha"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
            </button>
          </div>

          {erro && <p className="login-erro">{erro}</p>}

          <button type="submit" className="login-btn-entrar" disabled={carregando}>
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <button type="button" className="login-nao-consigo" onClick={() => setAjudaAberta(true)}>
          Não consigo entrar?
        </button>

        {podeInstalar && (
          <button type="button" className="login-btn-instalar" onClick={aoClicarInstalar}>
            <MdGetApp size={18} /> Instalar app
          </button>
        )}
      </div>

      {ajudaAberta && (
        <div className="login-modal-fundo" onClick={() => setAjudaAberta(false)}>
          <div className="login-modal" onClick={(evento) => evento.stopPropagation()}>
            <h2>
              <MdSupportAgent className="login-modal-icone" /> Precisando de ajuda?
            </h2>
            <p>
              Usuário e senha são o mesmo número: seu CPF ou CNPJ, sem pontos nem traço. Se o problema persistir,
              fale com a gente pelo WhatsApp.
            </p>
            <div className="login-modal-acoes">
              <button onClick={() => setAjudaAberta(false)}>Entendi</button>
              <button
                className="login-modal-whatsapp"
                onClick={() => {
                  setAjudaAberta(false)
                  abrirWhatsappLogin()
                }}
              >
                Falar com a gente
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalInstalarIos aberto={modalIosAberto} onFechar={fecharModalIos} />
    </div>
  )
}
