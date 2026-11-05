/**
 * Proteção do app por PIN de 4 dígitos (Perfil → Segurança), como o "PIN do
 * app" do app Android. Fica só neste aparelho; guarda o hash (SHA-256 com o
 * documento), nunca o PIN. Pede o PIN ao abrir o app e depois de 5 minutos
 * fora dele; 5 erros seguidos encerram a sessão.
 */

const MINUTOS_FORA = 5
export const TENTATIVAS_MAXIMAS = 5

function chave(documento: string) {
  return `hotnet-pin-${documento}`
}

function ler(k: string, sessao = false): string | null {
  try {
    return (sessao ? sessionStorage : localStorage).getItem(k)
  } catch {
    return null
  }
}

function gravar(k: string, valor: string | null, sessao = false): void {
  try {
    const armazenamento = sessao ? sessionStorage : localStorage
    if (valor == null) armazenamento.removeItem(k)
    else armazenamento.setItem(k, valor)
  } catch {
    // Sem armazenamento: o PIN não fica salvo.
  }
}

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

async function hash(documento: string, pin: string): Promise<string> {
  const dados = new TextEncoder().encode(`hotnet:${documento}:${pin}`)
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', dados))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function pinAtivo(documento: string | null): boolean {
  return !!documento && !!ler(chave(documento))
}

export async function definirPin(documento: string, pin: string): Promise<void> {
  if (!pinValido(pin)) throw new Error('Digite um PIN de 4 dígitos')
  gravar(chave(documento), await hash(documento, pin))
  gravar(`hotnet-pin-erros-${documento}`, null)
  marcarDesbloqueado()
}

export function removerPin(documento: string): void {
  gravar(chave(documento), null)
  gravar(`hotnet-pin-erros-${documento}`, null)
}

/** Confere o PIN; devolve quantas tentativas ainda restam (0 = acabou). */
export async function conferirPin(documento: string, pin: string): Promise<{ ok: boolean; restantes: number }> {
  const salvo = ler(chave(documento))
  if (salvo && salvo === (await hash(documento, pin))) {
    gravar(`hotnet-pin-erros-${documento}`, null)
    marcarDesbloqueado()
    return { ok: true, restantes: TENTATIVAS_MAXIMAS }
  }
  const erros = Number(ler(`hotnet-pin-erros-${documento}`) ?? '0') + 1
  gravar(`hotnet-pin-erros-${documento}`, String(erros))
  return { ok: false, restantes: Math.max(0, TENTATIVAS_MAXIMAS - erros) }
}

/** Desbloqueio vale para esta aba/abertura do app (sessionStorage). */
export function marcarDesbloqueado(): void {
  gravar('hotnet-pin-desbloqueado', '1', true)
  gravar('hotnet-pin-saiu-em', null, true)
}

export function marcarSaidaDoApp(): void {
  gravar('hotnet-pin-saiu-em', String(Date.now()), true)
}

/** Bloqueado se nunca desbloqueou nesta abertura, ou se ficou mais de 5 min fora. */
export function precisaDesbloquear(agora = Date.now()): boolean {
  if (ler('hotnet-pin-desbloqueado', true) !== '1') return true
  const saiu = Number(ler('hotnet-pin-saiu-em', true) ?? '0')
  return saiu > 0 && agora - saiu > MINUTOS_FORA * 60 * 1000
}
