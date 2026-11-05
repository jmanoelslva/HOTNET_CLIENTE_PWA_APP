/**
 * Profundidade de cada tela no histórico, para o voltar funcionar como no
 * app Android: as abas da barra ficam sempre logo acima do Início (nível 1),
 * o voltar de uma aba leva ao Início (nível 0) e, dele, sai do app.
 *
 * Cada entrada do histórico tem uma chave (location.key); guardamos o nível
 * por chave em sessionStorage, que sobrevive ao recarregar a página.
 */

const CHAVE = 'hotnet-pilha'

function ler(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function gravar(mapa: Record<string, number>) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(mapa))
  } catch {
    // Sem armazenamento: o voltar segue o histórico normal do navegador.
  }
}

let chaveAnterior: string | null = null

/** Registra a tela atual (chamado a cada troca de tela, em App.tsx). */
export function registrarTela(chave: string, caminho: string, tipo: 'PUSH' | 'REPLACE' | 'POP'): void {
  const mapa = ler()
  if (caminho === '/') {
    mapa[chave] = 0
  } else if (mapa[chave] == null) {
    const anterior = chaveAnterior != null ? (mapa[chaveAnterior] ?? 0) : 0
    mapa[chave] = tipo === 'REPLACE' ? Math.max(anterior, 1) : anterior + 1
  }
  chaveAnterior = chave
  gravar(mapa)
}

/** Nível da tela atual (0 = Início). Desconhecido conta como 1. */
export function nivelDaTela(chave: string, caminho: string): number {
  if (caminho === '/') return 0
  return ler()[chave] ?? 1
}

/** Quanto voltar no histórico ao tocar numa aba, e se a troca é por substituição. */
export function planoTrocaDeAba(nivelAtual: number, destino: string): { voltar: number; substituir: boolean } {
  if (destino === '/') return { voltar: nivelAtual, substituir: false }
  if (nivelAtual === 0) return { voltar: 0, substituir: false }
  // Volta até ficar logo acima do Início e troca a tela no lugar.
  return { voltar: nivelAtual - 1, substituir: true }
}
