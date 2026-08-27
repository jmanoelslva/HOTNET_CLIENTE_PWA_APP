import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessao } from '../auth/SessionContext'
import LoginBackground from '../components/LoginBackground'
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

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const sucesso = await entrar(usuario, senha)
    if (sucesso) navigate('/')
  }

  return (
    <div className="login-tela">
      <LoginBackground />

      <div className="login-card">
        <img src={logoHotnet} alt="HOTNET" className="login-logo" />

        <form onSubmit={aoEnviar}>
          <label htmlFor="usuario">
            <span className="login-label-icone">👤</span> CPF ou CNPJ
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
            <span className="login-label-icone">🔒</span> Senha
          </label>
          <div className="login-campo-senha">
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              required
            />
            <button
              type="button"
              className="login-toggle-senha"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? '🙈' : '👁️'}
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

      {ajudaAberta && (
        <div className="login-modal-fundo" onClick={() => setAjudaAberta(false)}>
          <div className="login-modal" onClick={(evento) => evento.stopPropagation()}>
            <h2>
              <span className="login-modal-icone">🛟</span> Precisando de ajuda?
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
    </div>
  )
}
