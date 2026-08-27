import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessao } from '../auth/SessionContext'
import logoHotnet from '../assets/logo-hotnet.png'
import './Login.css'

export default function Login() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const { entrar, carregando, erro } = useSessao()
  const navigate = useNavigate()

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const sucesso = await entrar(usuario, senha)
    if (sucesso) navigate('/')
  }

  return (
    <div className="login-tela">
      <div className="login-card">
        <img src={logoHotnet} alt="HOTNET" className="login-logo" />
        <p className="login-subtitulo">Acesse com seu CPF ou CNPJ</p>

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
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
          />

          {erro && <p className="login-erro">{erro}</p>}

          <button type="submit" disabled={carregando}>
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
