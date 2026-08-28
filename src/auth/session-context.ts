import { createContext } from 'react'

export interface SessionState {
  logado: boolean
  // true só durante a checagem inicial de sessão (ver useEffect em
  // SessionContext.tsx) — enquanto isso as rotas protegidas esperam em
  // vez de já mandar pro login (ver RotaProtegida.tsx).
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

// Isolado num arquivo à parte (sem componente nenhum aqui) pra
// SessionContext.tsx (o Provider) e useSessao.ts (o hook) poderem
// compartilhar o mesmo contexto sem que nenhum dos dois arquivos misture
// export de componente com export de função/valor — é essa mistura que
// quebra o Fast Refresh do Vite (ver aviso "only-export-components").
export const SessionContext = createContext<SessionState | null>(null)
