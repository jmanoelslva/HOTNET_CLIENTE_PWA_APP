/**
 * Versão nova do app sem precisar fechar e abrir.
 *
 * O service worker novo assume na hora (skipWaiting + clientsClaim, ver
 * vite.config.ts), mas a tela aberta continua com o JavaScript antigo — e
 * as telas carregadas sob demanda (lazy) pedem arquivos da versão anterior,
 * que o servidor já apagou (respondem com o index.html, e a tela quebra ou
 * fica velha). Então:
 * - quando a versão nova assume, recarrega na próxima troca de tela ou
 *   quando o app volta ao primeiro plano (nunca no meio do que está aberto);
 * - se um arquivo de tela falhar ao carregar, recarrega na hora;
 * - ao abrir e ao voltar ao primeiro plano, confere em /version.json qual build está
 *   publicado. Se o service worker ficou preso numa versão antiga (aconteceu: só
 *   desinstalando o app resolvia), apaga o service worker e o cache e recarrega,
 *   uma vez por build, para nunca entrar em ciclo.
 */

let versaoNova = false
let recarregando = false

function recarregar(): void {
  if (recarregando) return
  recarregando = true
  window.location.reload()
}

/** Chamado a cada troca de tela (App.tsx): aplica a versão nova, se houver. */
export function aplicarVersaoNovaSePreciso(): void {
  if (versaoNova) recarregar()
}

const CHAVE_TENTATIVA = 'build-reiniciado'
const INTERVALO_MINIMO_MS = 60_000
let ultimaVerificacao = 0

export type DecisaoVersao = 'em-dia' | 'limpar' | 'aguardar'

/**
 * Compara o build do app com o publicado. Sem informação (desenvolvimento, falha de
 * rede) ou igual: em dia. Diferente: limpar, salvo se já limpou para esse build nesta
 * sessão (aí espera, para não recarregar sem parar).
 */
export function decidirVersao(local: string, publicado: string | null, jaTentado: string | null): DecisaoVersao {
  if (!local || !publicado || local === publicado) return 'em-dia'
  return jaTentado === publicado ? 'aguardar' : 'limpar'
}

function lerSessao(chave: string): string | null {
  try {
    return sessionStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravarSessao(chave: string, valor: string | null): void {
  try {
    if (valor == null) sessionStorage.removeItem(chave)
    else sessionStorage.setItem(chave, valor)
  } catch {
    /* sem sessionStorage: segue sem a trava */
  }
}

async function limparEReabrir(): Promise<void> {
  try {
    const registros = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(registros.map((r) => r.unregister()))
    if ('caches' in window) {
      const chaves = await caches.keys()
      await Promise.all(chaves.map((c) => caches.delete(c)))
    }
  } finally {
    recarregar()
  }
}

/** Confere o build publicado; no máximo 1x por minuto. Nunca lança erro. */
export async function verificarVersaoPublicada(): Promise<void> {
  const local = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : ''
  if (!local || recarregando || Date.now() - ultimaVerificacao < INTERVALO_MINIMO_MS) return
  ultimaVerificacao = Date.now()
  let publicado: string | null = null
  try {
    const resposta = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!resposta.ok) return
    const dados = (await resposta.json()) as { build?: unknown }
    publicado = typeof dados.build === 'string' ? dados.build : null
  } catch {
    return
  }
  const decisao = decidirVersao(local, publicado, lerSessao(CHAVE_TENTATIVA))
  if (decisao === 'em-dia') {
    gravarSessao(CHAVE_TENTATIVA, null)
  } else if (decisao === 'limpar' && publicado) {
    gravarSessao(CHAVE_TENTATIVA, publicado)
    await limparEReabrir()
  }
}

export function iniciarAtualizacaoApp(): void {
  void verificarVersaoPublicada()
  // Arquivo de tela (import dinâmico) que não existe mais: versão velha.
  window.addEventListener('vite:preloadError', (evento) => {
    evento.preventDefault()
    recarregar()
  })

  if (!('serviceWorker' in navigator)) return
  // Sem controlador = primeira instalação: o SW assumir não é versão nova.
  const jaTinhaVersao = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (jaTinhaVersao) versaoNova = true
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    aplicarVersaoNovaSePreciso()
    void verificarVersaoPublicada()
  })
}
