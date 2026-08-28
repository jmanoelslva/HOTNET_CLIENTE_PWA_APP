import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { aoExpirarSessao, buscarCadastroInfo, login as apiLogin, logout as apiLogout } from '../api/client'
import { useToast } from '../components/Toast/useToast'
import { SessionContext } from './session-context'

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
  const { toast } = useToast()
  // Espelha "logado" num ref porque o ouvinte de sessão expirada (efeito
  // logo abaixo) só registra a função uma vez — sem o ref ele ficaria preso
  // ao "logado" (sempre false) capturado nesse primeiro render.
  const logadoRef = useRef(false)

  useEffect(() => {
    logadoRef.current = logado
  }, [logado])

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

  // Ouvinte global de "sessão expirada" (ver aoExpirarSessao em client.ts)
  // — dispara em qualquer 401 fora de /login ou /session/logout, vindo de
  // qualquer tela. Sem isso, quando o lease de 10min do Controllr vence
  // (ver README, "Sessão: persistência e expiração"), nada avisava o
  // cliente nem tirava ele da tela protegida; ele só via os dados pararem
  // de carregar. Só reage se já havia sessão de fato nesta aba — a própria
  // checagem inicial (useEffect acima) também bate 401 num visitante sem
  // cookie nenhum, e isso não é "sessão expirou", é só "nunca logou".
  useEffect(() => {
    aoExpirarSessao(() => {
      if (!logadoRef.current) return
      logadoRef.current = false
      toast('Sua sessão expirou. Faça login novamente.', 'info')
      sair().catch(() => {})
    })
    return () => aoExpirarSessao(null)
  }, [sair, toast])

  return (
    <SessionContext.Provider value={{ logado, verificando, carregando, erro, cpf, entrar, sair }}>
      {children}
    </SessionContext.Provider>
  )
}
