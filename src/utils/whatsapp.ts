// 55 (Brasil) + 82 (DDD) + 999426613 — mesmo número usado no app Android.
const NUMERO_WHATSAPP = '5582999426613'

function abrir(mensagem: string) {
  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Mensagem com nome e CPF, usada pelo botão de WhatsApp da Home. */
export function abrirWhatsappSuporte(nomeCompleto: string | null, cpf: string | null) {
  const identificacao = nomeCompleto ? `Sou *${nomeCompleto}*` : 'Sou cliente'
  abrir(`Olá,\n\n${identificacao}\n\nCPF: *${cpf ?? 'Não informado'}*`)
}

/** Mensagem simplificada (sem endereço), usada pelo botão de WhatsApp da tela de Ajuda. */
export function abrirWhatsappAjuda(nomeCompleto: string | null, cpf: string | null) {
  abrir(
    `Olá!\nSou *${nomeCompleto ?? 'Não informado'}*\nCPF: *${cpf ?? 'Não informado'}*\n\nNão encontrei minha dúvida nas Perguntas Frequentes do aplicativo.`,
  )
}

/** Mensagem fixa usada pelo "Não consigo entrar?" da tela de login (sem nome/CPF — o cliente ainda não está logado). */
export function abrirWhatsappLogin() {
  abrir('Olá, preciso de ajuda para entrar no aplicativo.')
}
