import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LuArrowDownToLine, LuChevronRight, LuHeadset, LuEye, LuEyeOff, LuX } from 'react-icons/lu'
import { contasSalvas, esquecerConta, fotoDaConta, type ContaSalva } from '../utils/contaLocal'
import { mascararDocumento } from '../utils/recibo'
import { FaWhatsapp } from 'react-icons/fa'
import { useSessao } from '../auth/useSessao'
import ModalInstalarIos from '../components/ModalInstalarIos'
import { usePwaInstall } from '../hooks/usePwaInstall'
import logoApp from '../assets/logo-app.png'
import { abrirWhatsappLogin } from '../utils/whatsapp'
import './Login.css'

export default function Login() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  // Contas já usadas neste aparelho (sem senha), como no app Android.
  const [contas, setContas] = useState<ContaSalva[]>(() => contasSalvas())
  const campoSenha = useRef<HTMLInputElement>(null)

  function escolherConta(conta: ContaSalva) {
    setUsuario(conta.documento)
    setSenha('')
    campoSenha.current?.focus()
  }
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
      {/* Topo da identidade "H" do app Android (gradienteTopoMarca): laranja
          sólido atrás do texto branco, depois degradê até o fundo. */}
      <header className="login-topo">
        <span className="login-logo-circulo">
          <img src={logoApp} alt="" className="login-logo" />
        </span>
        <span className="login-marca">HOTNET</span>
        <h1>Entre na sua conta</h1>
        <p>Conexão, boletos e suporte num só lugar.</p>
      </header>

      <div className="login-conteudo">
      <div className="login-card">
        {contas.length > 0 && (
          <div className="login-contas">
            <span className="login-contas-titulo">Contas neste aparelho</span>
            {contas.map((conta) => {
              const foto = fotoDaConta(conta.documento)
              const ativa = usuario.replace(/\D/g, '') === conta.documento
              return (
                <div key={conta.documento} className={`login-conta ${ativa ? 'ativa' : ''}`}>
                  <button type="button" className="login-conta-escolher" onClick={() => escolherConta(conta)}>
                    <span className="login-conta-avatar" aria-hidden="true">
                      {foto ? <img src={foto} alt="" /> : (conta.nome ?? 'C').charAt(0).toUpperCase()}
                    </span>
                    <span className="login-conta-textos">
                      <strong>{conta.nome ?? 'Cliente HOTNET'}</strong>
                      <span>{mascararDocumento(conta.documento) ?? conta.documento}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="login-conta-esquecer"
                    onClick={() => {
                      esquecerConta(conta.documento)
                      setContas(contasSalvas())
                      if (ativa) setUsuario('')
                    }}
                    aria-label={`Esquecer a conta de ${conta.nome ?? 'cliente'}`}
                  >
                    <LuX size={18} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <form onSubmit={aoEnviar}>
          <label htmlFor="usuario">CPF ou CNPJ</label>
          <input
            id="usuario"
            type="text"
            inputMode="numeric"
            value={usuario}
            onChange={(evento) => setUsuario(evento.target.value)}
            placeholder="Somente números"
            required
          />

          <label htmlFor="senha">Senha</label>
          <div className="login-campo-senha">
            <input
              ref={campoSenha}
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
              {mostrarSenha ? <LuEyeOff size={20} /> : <LuEye size={20} />}
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

      </div>

      <button type="button" className="login-ajuda" onClick={() => abrirWhatsappLogin(usuario)}>
        <span className="login-ajuda-icone" aria-hidden="true">
          <FaWhatsapp size={20} />
        </span>
        <span className="login-ajuda-textos">
          <strong>Precisa de ajuda?</strong>
          <span>Fale com a gente no WhatsApp</span>
        </span>
        <LuChevronRight size={22} aria-hidden="true" />
      </button>

      {podeInstalar && (
        <button type="button" className="login-btn-instalar" onClick={aoClicarInstalar}>
          <LuArrowDownToLine size={18} /> Instalar o app
        </button>
      )}

      {__APP_VERSION__ && <p className="login-versao">Versão {__APP_VERSION__}</p>}
      </div>

      {ajudaAberta && (
        <div className="login-modal-fundo" onClick={() => setAjudaAberta(false)}>
          <div className="login-modal" onClick={(evento) => evento.stopPropagation()}>
            <h2>
              <LuHeadset className="login-modal-icone" /> Precisando de ajuda?
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
                  abrirWhatsappLogin(usuario)
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
