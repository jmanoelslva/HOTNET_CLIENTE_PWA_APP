/** Guia da Início (components/TourInicio.tsx): aparece uma vez por aparelho. */
const CHAVE = 'hotnet-tour-inicio'

export function tourJaVisto(): boolean {
  try {
    return localStorage.getItem(CHAVE) === 'visto'
  } catch {
    return true
  }
}

export function marcarTourVisto(): void {
  try {
    localStorage.setItem(CHAVE, 'visto')
  } catch {
    // Sem armazenamento: o guia pode aparecer de novo, sem prejuízo.
  }
}
