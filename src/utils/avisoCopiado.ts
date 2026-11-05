/**
 * Estado do selo central de "copiado" (ver components/AvisoCopiado.tsx).
 * Sem fila: uma cópia nova troca o texto e reinicia o tempo. O último aviso
 * fica guardado depois de sumir, para a animação de saída não ficar vazia.
 */

export interface AvisoCopiado {
  titulo: string
  dica?: string
  id: number
  visivel: boolean
}

const DURACAO_MS = 1500
let estado: AvisoCopiado | null = null
let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined
const ouvintes = new Set<() => void>()

function notificar() {
  ouvintes.forEach((ouvir) => ouvir())
}

export function mostrarAvisoCopiado(titulo: string, dica?: string): void {
  estado = { titulo, dica, id: ++seq, visivel: true }
  try {
    navigator.vibrate?.(20)
  } catch {
    // Sem vibração no aparelho: só o selo.
  }
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (estado) estado = { ...estado, visivel: false }
    notificar()
  }, DURACAO_MS)
  notificar()
}

export function avisoCopiadoAtual(): AvisoCopiado | null {
  return estado
}

export function inscreverAvisoCopiado(ouvir: () => void): () => void {
  ouvintes.add(ouvir)
  return () => {
    ouvintes.delete(ouvir)
  }
}
