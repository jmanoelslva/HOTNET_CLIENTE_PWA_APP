/**
 * O que o portal guarda no próprio aparelho, por conta (nunca senha):
 * - contas já usadas aqui, para entrar com um toque (como o app Android);
 * - se a senha ainda é a padrão (o próprio CPF/CNPJ), para o lembrete;
 * - a foto de perfil (só neste aparelho, como no app).
 * Tudo em try/catch: em janela anônima ou com o armazenamento bloqueado,
 * o portal funciona igual, só sem lembrar.
 */

export interface ContaSalva {
  documento: string
  nome: string | null
}

const CHAVE_CONTAS = 'hotnet-contas'
const LIMITE_CONTAS = 5

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravar(chave: string, valor: string | null): void {
  try {
    if (valor == null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, valor)
  } catch {
    // Armazenamento indisponível: segue sem lembrar.
  }
}

export function contasSalvas(): ContaSalva[] {
  try {
    const lista = JSON.parse(ler(CHAVE_CONTAS) ?? '[]') as ContaSalva[]
    return Array.isArray(lista) ? lista.filter((c) => typeof c?.documento === 'string') : []
  } catch {
    return []
  }
}

/** Coloca a conta no topo da lista (sem repetir) e guarda o nome, se veio. */
export function lembrarConta(documento: string, nome?: string | null): void {
  const atual = contasSalvas()
  const anterior = atual.find((c) => c.documento === documento)
  const conta: ContaSalva = { documento, nome: nome ?? anterior?.nome ?? null }
  const lista = [conta, ...atual.filter((c) => c.documento !== documento)].slice(0, LIMITE_CONTAS)
  gravar(CHAVE_CONTAS, JSON.stringify(lista))
}

export function esquecerConta(documento: string): void {
  gravar(CHAVE_CONTAS, JSON.stringify(contasSalvas().filter((c) => c.documento !== documento)))
  gravar(`hotnet-foto-${documento}`, null)
  gravar(`hotnet-senha-padrao-${documento}`, null)
}

/** Senha padrão = o próprio documento (como na conta nova da HOTNET). */
export function ehSenhaPadrao(documento: string, senha: string): boolean {
  return senha.replace(/\D/g, '') === documento && senha.trim() === documento
}

export function marcarSenhaPadrao(documento: string, padrao: boolean): void {
  gravar(`hotnet-senha-padrao-${documento}`, padrao ? '1' : null)
}

export function usaSenhaPadrao(documento: string | null): boolean {
  return !!documento && ler(`hotnet-senha-padrao-${documento}`) === '1'
}

export function fotoDaConta(documento: string | null): string | null {
  return documento ? ler(`hotnet-foto-${documento}`) : null
}

export function salvarFoto(documento: string, dataUrl: string | null): void {
  gravar(`hotnet-foto-${documento}`, dataUrl)
  window.dispatchEvent(new Event('hotnet-foto'))
}

/** Reduz a imagem escolhida para 256×256 (corte central) em JPEG. */
export async function prepararFoto(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Imagem inválida'))
      i.src = url
    })
    const lado = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Sem canvas')
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
