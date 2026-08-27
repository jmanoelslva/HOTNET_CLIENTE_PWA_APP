import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { login as apiLogin, logout as apiLogout } from '../api/client'

interface SessionState {
  logado: boolean
  carregando: boolean
  erro: string | null
  entrar: (usuario: string, senha: string) => Promise<boolean>
  sair: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

/**
 * Estado de sessão simples, só em memória (igual ao SessaoAppState do app
 * Android: o cookie de sessão do Controllr também só existe em memória,
 * nunca é persistido em disco). Recarregar a página perde a sessão, o
 * que é aceitável aqui — não estamos guardando CPF/senha localmente.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [logado, setLogado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const entrar = useCallback(async (usuario: string, senha: string) => {
    setCarregando(true)
    setErro(null)
    try {
      const somenteDigitos = usuario.replace(/\D/g, '')
      const resposta = await apiLogin(somenteDigitos, senha)
      if (resposta.success) {
        setLogado(true)
        return true
      }
      // A mensagem do servidor (ex: "Authentication failed for user [X]") é
      // técnica e em inglês — trocamos por uma mensagem clara, em
      // português (mesmo critério do AuthRepository do app Android).
      setErro('CPF/CNPJ ou senha incorretos. Verifique e tente novamente.')
      return false
    } catch {
      setErro('Não foi possível conectar. Tente novamente.')
      return false
    } finally {
      setCarregando(false)
    }
  }, [])

  const sair = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setLogado(false)
    }
  }, [])

  return (
    <SessionContext.Provider value={{ logado, carregando, erro, entrar, sair }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSessao(): SessionState {
  const contexto = useContext(SessionContext)
  if (!contexto) throw new Error('useSessao precisa estar dentro de <SessionProvider>')
  return contexto
}
