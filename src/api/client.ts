/**
 * Cliente HTTP pro backend Controllr/BRbyte (hotnet.net.br), reaproveitando
 * as mesmas particularidades já confirmadas e documentadas no app Android
 * (ver README do projeto Android, seção "Backend (Controllr/BRbyte)").
 *
 * Todas as chamadas passam por "/api/..." — em desenvolvimento, o proxy do
 * Vite (vite.config.ts) repassa pra hotnet.net.br; em produção, é o
 * servidor web (Apache/Nginx) que precisa fazer esse mesmo reverse proxy,
 * pra manter tudo na mesma origem do navegador e evitar problema de CORS
 * (ver README.md, seção "Deploy em produção").
 */

const API_BASE = '/api'

export class SessaoExpiradaError extends Error {
  constructor() {
    super('Sessão expirada.')
    this.name = 'SessaoExpiradaError'
  }
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * POST com corpo application/x-www-form-urlencoded — é o formato que
 * TODOS os endpoints do Controllr esperam (confirmado no app Android).
 * Sempre manda cookies (credentials: 'include'), já que a sessão é
 * mantida via cookie BRBOSCookie, não por token no header.
 */
async function post<T>(path: string, campos: Record<string, string | number | undefined>): Promise<T> {
  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor !== undefined) corpo.append(chave, String(valor))
  }

  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo.toString(),
  })

  // IMPORTANTE (mesmo quirk do app Android, ver SessionExpiredInterceptor.kt):
  // a própria chamada de /login NÃO deve ser tratada como "sessão expirada"
  // — uma senha errada bate no mesmo padrão (401, ou 200 com
  // {"success": false, "message": "Login Failure"/"Authentication failed..."}),
  // mas ali é só uma falha de login normal, não uma sessão que caiu.
  const ehLogin = path === 'login'

  const json = (await response.json()) as { success?: boolean; message?: string }

  if (!ehLogin) {
    if (response.status === 401 || (json.success === false && /login failure|unauthorized/i.test(json.message ?? ''))) {
      throw new SessaoExpiradaError()
    }
    if (!response.ok) {
      throw new ApiError(json.message ?? `Erro ${response.status} ao chamar ${path}`)
    }
  }

  return json as T
}

export interface LoginResponse {
  success: boolean
  code?: number
  message?: string
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return post<LoginResponse>('login', { username, password })
}

/**
 * Encerra a sessão do lado do servidor (invalida o BRBOSCookie) — sem
 * corpo, sem campos, confirmado inspecionando o painel web oficial.
 */
export function logout(): Promise<{ success: boolean }> {
  return post('session/logout', {})
}

export { post }
