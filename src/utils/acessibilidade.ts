/**
 * Leitura por TalkBack/VoiceOver no mesmo espírito do app Android, que usa
 * semantics/clearAndSetSemantics para falar frases inteiras em vez de pedaços.
 */

/** Nome falado de cada tela (também vira o título da janela). */
const TITULOS: Array<[RegExp, string]> = [
  [/^\/$/, 'Início'],
  [/^\/login$/, 'Entrar'],
  [/^\/boletos$/, 'Boletos'],
  [/^\/contratos$/, 'Contratos'],
  [/^\/consumo$/, 'Consumo'],
  [/^\/suporte$/, 'Suporte'],
  [/^\/suporte\/.+/, 'Chamado'],
  [/^\/seguranca$/, 'Segurança'],
  [/^\/velocidade$/, 'Teste de velocidade'],
  [/^\/quitacao$/, 'Declaração de quitação'],
  [/^\/perfil$/, 'Perfil'],
  [/^\/cadastro$/, 'Meus dados'],
  [/^\/faq$/, 'Dúvidas'],
  [/^\/sobre$/, 'Sobre'],
  [/^\/alterar-senha$/, 'Alterar senha'],
]

export function tituloDaTela(pathname: string): string {
  return TITULOS.find(([padrao]) => padrao.test(pathname))?.[1] ?? 'HOTNET'
}

/**
 * Como o documento_cpf_final_desc do app: o leitor não soletra o CPF
 * mascarado ("asterisco asterisco ponto..."), diz só o final.
 */
export function descricaoDocumento(documento: string | null | undefined): string {
  const digitos = (documento ?? '').replace(/\D/g, '')
  const cnpj = (documento ?? '').includes('/') || digitos.length === 14
  const final = digitos.slice(-2).split('').join(' ')
  return `${cnpj ? 'CNPJ' : 'CPF'} terminado em ${final}`
}

/**
 * Leva o foco do leitor ao título da tela nova, para ele anunciar a troca
 * (no app nativo o TalkBack faz isso sozinho ao trocar de tela). A tela
 * pode chegar depois (carregamento sob demanda), então tenta por até 3 s.
 * Com uma janela aberta por cima, não mexe no foco.
 */
export function focarTituloDaTela(): () => void {
  let cancelado = false
  const inicio = performance.now()
  function tentar() {
    if (cancelado) return
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
    const titulo = document.querySelector<HTMLElement>('#root h1')
    if (titulo?.isConnected) {
      if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1')
      titulo.focus({ preventScroll: true })
      return
    }
    if (performance.now() - inicio < 3000) requestAnimationFrame(tentar)
  }
  requestAnimationFrame(tentar)
  return () => {
    cancelado = true
  }
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Elementos que recebem foco por Tab dentro de um contêiner. */
export function focaveisDentro(conteiner: HTMLElement): HTMLElement[] {
  return Array.from(conteiner.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((el) => !el.closest('[aria-hidden="true"]'))
}
