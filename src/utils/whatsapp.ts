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

/**
 * "Não consigo entrar?" da tela de login: sem sessão não há nome, mas vai o CPF/CNPJ digitado
 * (ou "Não informado"), como no app Android — o atendimento identifica o cliente sem perguntar.
 */
export function abrirWhatsappLogin(cpfDigitado: string | null, nome: string | null = null, esqueciSenha = false) {
  const cpf = cpfDigitado?.replace(/\D/g, '') || null
  const pedido = esqueciSenha
    ? 'Esqueci minha senha do aplicativo. Podem voltar para a senha padrão?'
    : 'Preciso de ajuda para entrar no aplicativo.'
  abrir(`Olá!\nSou *${nome ?? 'Não informado'}*\nCPF: *${cpf ?? 'Não informado'}*\n\n${pedido}`)
}
