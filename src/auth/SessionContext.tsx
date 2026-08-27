import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { buscarCadastroInfo, login as apiLogin, logout as apiLogout } from '../api/client'

interface SessionState {
  logado: boolean
  // true só durante a checagem inicial de sessão (ver useEffect abaixo) —
  // enquanto isso as rotas protegidas esperam em vez de já mandar pro
  // login (ver RotaProtegida.tsx).
  verificando: boolean
  carregando: boolean
  erro: string | null
  // CPF/CNPJ (só dígitos) usado no login — guardado em memória (nunca em
  // localStorage/sessionStorage) só pra resolver o client_pk ao abrir um
  // chamado de suporte, igual ao SessionManager.getSavedUsername() do
  // app Android.
  cpf: string | null
  entrar: (usuario: string, senha: string) => Promise<boolean>
  sair: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

/**
 * Estado de sessão simples, só em memória (igual ao SessaoAppState do app
 * Android: o cookie de sessão do Controllr também só existe em memória,
 * nunca é persistido em disco) — não estamos guardando CPF/senha
 * localmente. Mas o cookie de sessão (BRBOSCookie) em si é do navegador,
 * não da nossa memória: ele sobrevive a um F5. Por isso, ao montar,
 * confirmamos com o servidor se já existe uma sessão válida antes de
 * mandar pro login, senão TODO reload desconectaria o cliente à toa.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [logado, setLogado] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [cpf, setCpf] = useState<string | null>(null)

  useEffect(() => {
    buscarCadastroInfo()
      .then((resposta) => {
        if (resposta.success === false) return
        const dado = Array.isArray(resposta.results) ? resposta.results[0] : resposta.results
        const doc = dado?.client_doc1 ?? resposta.client_doc1
        if (doc) setCpf(doc.replace(/\D/g, ''))
        setLogado(true)
      })
      .catch(() => {
        // Sem sessão válida (401/sessão expirada) — segue pro login normalmente.
      })
      .finally(() => setVerificando(false))
  }, [])

  const entrar = useCallback(async (usuario: string, senha: string) => {
    setCarregando(true)
    setErro(null)
    try {
      const somenteDigitos = usuario.replace(/\D/g, '')
      const resposta = await apiLogin(somenteDigitos, senha)
      if (resposta.success) {
        setLogado(true)
        setCpf(somenteDigitos)
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
      setCpf(null)
    }
  }, [])

  return (
    <SessionContext.Provider value={{ logado, verificando, carregando, erro, cpf, entrar, sair }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSessao(): SessionState {
  const contexto = useContext(SessionContext)
  if (!contexto) throw new Error('useSessao precisa estar dentro de <SessionProvider>')
  return contexto
}
