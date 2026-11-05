/**
 * Perguntas das Dúvidas — as mesmas do app Android (res/values/strings.xml,
 * FaqScreen.kt), com o mesmo atalho de cada uma. Gerado por script.
 */

export type FaqDestino = 'BOLETOS' | 'SUPORTE' | 'CONTRATOS' | 'CONSUMO' | 'TESTE_VELOCIDADE' | 'SEGURANCA' | 'ALTERAR_SENHA'

export interface FaqCategoriaDados {
  id: string
  nome: string
  subtitulo: string
  cor: string
}

export interface FaqPergunta {
  categoriaId: string
  pergunta: string
  resposta: string
  destino?: FaqDestino
}

export const FAQ_CATEGORIAS: FaqCategoriaDados[] = [
  {
    "id": "atendimento",
    "nome": "Atendimento",
    "subtitulo": "Horários e canais",
    "cor": "#0f8a45"
  },
  {
    "id": "wifi",
    "nome": "Internet e Wi-Fi",
    "subtitulo": "Velocidade e sinal",
    "cor": "#2a72b8"
  },
  {
    "id": "cobrancas",
    "nome": "Cobranças",
    "subtitulo": "Boletos e pagamentos",
    "cor": "#d94a38"
  },
  {
    "id": "contratos",
    "nome": "Contratos",
    "subtitulo": "Planos e contratos",
    "cor": "#4a5c7a"
  },
  {
    "id": "consumo",
    "nome": "Consumo",
    "subtitulo": "Uso e conexão",
    "cor": "#18afc0"
  },
  {
    "id": "seguranca",
    "nome": "Segurança",
    "subtitulo": "Login e segurança",
    "cor": "#e84d79"
  }
]

export const FAQ_PERGUNTAS: FaqPergunta[] = [
  {
    "categoriaId": "atendimento",
    "pergunta": "Qual o horário de atendimento?",
    "resposta": "De segunda a sexta, das 8h às 12h e das 14h às 18h. Aos sábados, das 8h às 12h. Fora desse horário, você pode abrir um chamado pelo app e nossa equipe responde assim que o atendimento voltar.",
    "destino": "SUPORTE"
  },
  {
    "categoriaId": "atendimento",
    "pergunta": "Como abro um chamado de suporte?",
    "resposta": "Em Suporte, toque em \"Novo chamado\". Antes, o app confere seus boletos e seu contrato e sugere alguns passos rápidos, como reiniciar o roteador, que resolvem a maioria dos casos. Os passos que você fizer vão junto no chamado. Depois, escolha o assunto e descreva o problema. Ao enviar, o app mostra o número do chamado e você acompanha as respostas na conversa. Pelo botão \"+\", dá para anexar fotos, vídeos, arquivos ou sua localização. Fotos são enviadas em tamanho menor para economizar seus dados; cada arquivo pode ter até 25 MB.",
    "destino": "SUPORTE"
  },
  {
    "categoriaId": "wifi",
    "pergunta": "Como faço o teste de velocidade corretamente?",
    "resposta": "Na Início, toque em \"Testar velocidade\", no cartão da sua conexão. O botão aparece quando o contrato está ativo e o seu roteador está conectado. Antes de medir, o app mostra como o celular está conectado (Wi-Fi, faixa e sinal), se o seu roteador está on-line e o seu plano. Faça o teste conectado ao Wi-Fi da sua casa, perto do roteador, e pause downloads e vídeos. Se o celular estiver nos dados móveis, com VPN ligada ou o roteador estiver fora do ar, o app avisa antes de começar. No fim, o resultado aparece comparado ao seu plano.",
    "destino": "TESTE_VELOCIDADE"
  },
  {
    "categoriaId": "wifi",
    "pergunta": "Meu Wi-Fi está lento, mas o teste deu bom perto do roteador. O que pode ser?",
    "resposta": "Se a velocidade é boa perto do roteador e cai em outros cômodos, o problema costuma ser a cobertura do Wi-Fi (distância, paredes, outros aparelhos), não a internet. Testar em cômodos diferentes ajuda a achar onde o sinal enfraquece. Se o seu roteador tiver duas redes, prefira a de 5 GHz perto dele: a de 2,4 GHz alcança mais longe, mas é mais lenta."
  },
  {
    "categoriaId": "wifi",
    "pergunta": "Preciso trocar meu roteador. Como peço?",
    "resposta": "Abra um chamado em Suporte, escolha \"Suporte técnico\" e descreva a situação (pode anexar foto do equipamento). Nossa equipe avalia e agenda uma visita, se for preciso.",
    "destino": "SUPORTE"
  },
  {
    "categoriaId": "cobrancas",
    "pergunta": "Como pago meu boleto?",
    "resposta": "Em Boletos, toque em \"Copiar código Pix\" e cole no app do seu banco. Também dá para usar o QR Code ou o botão \"Código de barras\". O botão Pagar, no centro da barra inferior, abre direto o boleto mais urgente.",
    "destino": "BOLETOS"
  },
  {
    "categoriaId": "cobrancas",
    "pergunta": "Meu boleto venceu. O valor com juros e multa já está certo?",
    "resposta": "Sim. Para boletos atrasados, o app mostra o valor do boleto, a multa, os juros e o total de hoje, separados. Basta pagar o total que aparece na tela.",
    "destino": "BOLETOS"
  },
  {
    "categoriaId": "cobrancas",
    "pergunta": "Como funciona o aviso de vencimento?",
    "resposta": "No portal, a Início mostra o próximo boleto e avisa quando ele está atrasado, com o Pix pronto para copiar. Os avisos por notificação são do app HOTNET para Android."
  },
  {
    "categoriaId": "cobrancas",
    "pergunta": "Como pego o recibo de um boleto pago?",
    "resposta": "Em Boletos, abra a aba Pagos e toque em \"Recibo\" ao lado do boleto. Ou toque em \"Recibos\", no Acesso rápido da Início. Dá para compartilhar o recibo em PDF pelo WhatsApp ou salvar no celular.",
    "destino": "BOLETOS"
  },
  {
    "categoriaId": "cobrancas",
    "pergunta": "Paguei, mas a internet continua bloqueada. O que faço?",
    "resposta": "Em Boletos, toque no \"⋯\" do boleto e em \"Já paguei este boleto\". A conexão é liberada temporariamente enquanto o banco confirma o pagamento. O boleto só aparece como pago depois dessa confirmação.",
    "destino": "BOLETOS"
  },
  {
    "categoriaId": "contratos",
    "pergunta": "Tenho mais de um contrato. Como acompanho cada um?",
    "resposta": "Seus contratos ficam em Perfil → Contratos, com plano, valor e itens de cada um. Quando disponível, \"Ver contrato completo\" abre o documento. Em Boletos, um filtro por contrato aparece sozinho quando você tem mais de um.",
    "destino": "CONTRATOS"
  },
  {
    "categoriaId": "contratos",
    "pergunta": "Como faço para cancelar meu contrato?",
    "resposta": "O cancelamento não é feito pelo app. Abra um chamado ou fale com a gente no WhatsApp e nossa equipe explica os próximos passos.",
    "destino": "SUPORTE"
  },
  {
    "categoriaId": "contratos",
    "pergunta": "Minha conta aparece como cancelada. O que faço?",
    "resposta": "Contratos cancelados não abrem chamado pelo app. Fale com a gente no WhatsApp, logo abaixo, que nossa equipe explica como regularizar."
  },
  {
    "categoriaId": "consumo",
    "pergunta": "Como acompanho quanto de internet já usei?",
    "resposta": "Na Início, toque em \"Consumo\", no Acesso rápido. Você vê o total do mês (download e upload) e o histórico por dia. Para ver outro mês, toque no nome do mês no topo. A tela também mostra se você está conectado agora, há quanto tempo e com qual IP.",
    "destino": "CONSUMO"
  },
  {
    "categoriaId": "seguranca",
    "pergunta": "Como ligo ou desligo a proteção do app?",
    "resposta": "Na aba Perfil, na barra inferior, toque em \"Segurança\". Lá você liga ou desliga a proteção por PIN deste aparelho. Com ela ligada, o portal pede o PIN ao abrir e depois de 5 minutos sem uso.",
    "destino": "SEGURANCA"
  },
  {
    "categoriaId": "seguranca",
    "pergunta": "Como troco minha senha?",
    "resposta": "Na aba Perfil, toque em Segurança e em \"Alterar senha\". O portal confirma que é você com a senha atual e pede a nova senha: de 8 a 16 caracteres e diferente do seu CPF ou CNPJ. A nova senha vale para o app e para a área do cliente no site,.",
    "destino": "ALTERAR_SENHA"
  },
  {
    "categoriaId": "seguranca",
    "pergunta": "Qual é a minha senha de acesso?",
    "resposta": "No primeiro acesso, a senha é o seu CPF ou CNPJ, só os números. Depois você pode criar uma senha só sua em Perfil → Segurança → Alterar senha. Se ainda usa a senha padrão, o app mostra um lembrete na Início.",
    "destino": "ALTERAR_SENHA"
  },
  {
    "categoriaId": "seguranca",
    "pergunta": "Esqueci minha senha. E agora?",
    "resposta": "Fale com o escritório pelo WhatsApp ou abra um chamado: eles voltam sua senha para a padrão (seu CPF ou CNPJ). Na tela de entrada, toque em \"Não consigo entrar?\" e em \"Esqueci minha senha\" para enviar o pedido já com seu nome e CPF. Depois, entre com a senha padrão e, se quiser, crie uma nova.",
    "destino": "SUPORTE"
  },
  {
    "categoriaId": "seguranca",
    "pergunta": "Troquei de celular. Preciso fazer algo?",
    "resposta": "Instale o app no celular novo e entre com seu CPF ou CNPJ e sua senha. Por segurança, contas salvas, PIN e foto não passam de um celular para outro. Se trocou a senha em outro aparelho, o app avisa e pede a senha atual."
  }
]
