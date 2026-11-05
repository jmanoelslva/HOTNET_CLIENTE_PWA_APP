export type Tema = 'light' | 'dark'

const CHAVE_TEMA = 'hotnet-tema'

function temaDoSistema(): Tema {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Tema efetivo agora: a escolha manual salva, ou o do sistema se o cliente nunca escolheu. */
export function temaAtual(): Tema {
  const salvo = localStorage.getItem(CHAVE_TEMA)
  return salvo === 'light' || salvo === 'dark' ? salvo : temaDoSistema()
}

function aplicar(tema: Tema): void {
  document.documentElement.setAttribute('data-theme', tema)
  atualizarCorDasBarras()
}

/**
 * Cor das barras do sistema (notificação e navegação): a do fundo da tela,
 * como no app Android; no login, o laranja do topo (claro) ou o laranja
 * fechado (escuro), por trás do degradê.
 */
export function atualizarCorDasBarras(): void {
  const escuro = document.documentElement.getAttribute('data-theme') === 'dark'
  const login = window.location.pathname === '/login'
  const cor = login ? (escuro ? '#8a3008' : '#c94300') : escuro ? '#141a1f' : '#f7f8fa'
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = cor
}

/** Escolha manual do cliente — fica salva e passa a ignorar o sistema. */
export function definirTema(tema: Tema): void {
  localStorage.setItem(CHAVE_TEMA, tema)
  aplicar(tema)
}

/** Escolha da tela Perfil → Aparência: "sistema" segue o celular (padrão). */
export type ModoTema = 'sistema' | Tema

export function modoTemaAtual(): ModoTema {
  const salvo = localStorage.getItem(CHAVE_TEMA)
  return salvo === 'light' || salvo === 'dark' ? salvo : 'sistema'
}

export function definirModoTema(modo: ModoTema): void {
  if (modo === 'sistema') {
    localStorage.removeItem(CHAVE_TEMA)
    aplicar(temaDoSistema())
  } else {
    definirTema(modo)
  }
}

/**
 * Aplica o tema assim que o app carrega e mantém sincronizado com o
 * sistema operacional enquanto o cliente não tiver escolhido nada
 * manualmente (ver definirTema) — chamado uma vez em main.tsx, antes do
 * primeiro render, pra não piscar no tema errado.
 */
export function iniciarTema(): void {
  aplicar(temaAtual())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem(CHAVE_TEMA)) aplicar(temaDoSistema())
  })
}
