// 55 (Brasil) + 82 (DDD) + 999426613 — mesmo número usado no app Android.
const NUMERO_WHATSAPP = '5582999426613'

function abrir(mensagem: string) {
  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Mensagem completa (nome, CPF e endereço), usada pelo botão de WhatsApp da Home. */
export function abrirWhatsappSuporte(nomeCompleto: string | null, cpf: string | null, endereco: string | null) {
  const identificacao = nomeCompleto ? `Sou *${nomeCompleto}*` : 'Sou cliente'
  const linhaEndereco = endereco ? `\n\nEndereço: *${endereco}*` : ''
  abrir(`Olá,\n\n${identificacao}\n\nCPF: *${cpf ?? 'Não informado'}*${linhaEndereco}`)
}

/** Mensagem simplificada (sem endereço), usada pelo botão de WhatsApp da tela de Ajuda. */
export function abrirWhatsappAjuda(nomeCompleto: string | null, cpf: string | null) {
  abrir(
    `Olá!\nSou *${nomeCompleto ?? 'Não informado'}*\nCPF: *${cpf ?? 'Não informado'}*\n\nNão encontrei minha dúvida nas Perguntas Frequentes do aplicativo.`,
  )
}
