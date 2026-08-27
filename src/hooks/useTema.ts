import { useSyncExternalStore } from 'react'
import { definirTema, temaAtual, type Tema } from '../utils/tema'

const ouvintesMudanca = new Set<() => void>()

function notificarMudanca() {
  ouvintesMudanca.forEach((ouvir) => ouvir())
}

function inscrever(ouvir: () => void): () => void {
  ouvintesMudanca.add(ouvir)
  // Reage também quando o sistema muda (e o cliente não tinha escolhido
  // manualmente) — iniciarTema() já reaplica o atributo nesse caso, mas
  // sem isso o hook não saberia que precisa reler e re-renderizar.
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', ouvir)
  return () => {
    ouvintesMudanca.delete(ouvir)
    mq.removeEventListener('change', ouvir)
  }
}

/** Tema efetivo atual + alternar — reativo a mudanças feitas por qualquer instância do hook. */
export function useTema(): { tema: Tema; alternarTema: () => void } {
  const tema = useSyncExternalStore(inscrever, temaAtual)

  function alternarTema() {
    definirTema(tema === 'dark' ? 'light' : 'dark')
    notificarMudanca()
  }

  return { tema, alternarTema }
}
