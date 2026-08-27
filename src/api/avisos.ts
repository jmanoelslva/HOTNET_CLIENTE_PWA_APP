import { ApiError, listarAvisos, marcarAvisoComoLido, type NoticeDto } from './client'

export interface Aviso {
  noticePk: number
  tipo: number | null
  contractPk: number | null
  contractNumber: number | null
  invoicePk: number | null
  invoiceNossoNum: string | null
  dataCriacao: string | null
}

function paraAviso(dto: NoticeDto): Aviso {
  return {
    noticePk: dto.notice_pk,
    tipo: dto.notice_type ?? null,
    contractPk: dto.contract_pk ?? null,
    contractNumber: dto.contract_number ?? null,
    invoicePk: dto.invoice_pk ?? null,
    invoiceNossoNum: dto.invoice_nosso_num ?? null,
    dataCriacao: dto.notice_date_cad ?? null,
  }
}

/** Busca todos os avisos e devolve só os que ainda não foram confirmados. */
export async function buscarAvisosNaoLidos(): Promise<Aviso[]> {
  const resposta = await listarAvisos()
  if (!resposta.success) {
    throw new ApiError(resposta.message ?? 'Erro ao buscar avisos.')
  }
  return (resposta.results ?? []).filter((dto) => !dto.notice_read_date).map(paraAviso)
}

/** Confirma que o cliente visualizou o aviso — registrado no servidor, não só localmente. */
export async function confirmarLeitura(noticePk: number): Promise<void> {
  const resposta = await marcarAvisoComoLido(noticePk)
  if (!resposta.success) {
    throw new ApiError(resposta.message ?? 'Erro ao confirmar leitura.')
  }
}

/**
 * Traduz o código de notice_type pra um texto explicativo.
 *
 * IMPORTANTE: essa numeração é uma HIPÓTESE DE TRABALHO, baseada em só 2
 * exemplos reais observados (tipo 4 e tipo 5), seguindo a mesma numeração
 * já confirmada pra contract_status (0=Desativado, 1=Ativado, 2=Alertado,
 * 3=Pendente, 4=Bloqueado, 5=Cancelado) — mesmo critério do app Android.
 */
export function descricaoDoTipo(tipo: number | null): { titulo: string; descricao: string } {
  switch (tipo) {
    case 2:
      return {
        titulo: 'Alerta na sua conexão',
        descricao: 'Notamos uma situação de alerta no seu contrato. Dá uma olhada nos seus boletos pra evitar que a conexão seja bloqueada.',
      }
    case 3:
      return {
        titulo: 'Pendência no seu contrato',
        descricao: 'Existe uma pendência no seu contrato que pode afetar sua conexão em breve. Vale a pena conferir seus boletos.',
      }
    case 4:
      return {
        titulo: 'Sua conexão está temporariamente bloqueada',
        descricao: 'Identificamos uma pendência financeira em aberto. Assim que o boleto for regularizado, sua conexão volta a funcionar normalmente.',
      }
    case 5:
      return {
        titulo: 'Seu contrato foi cancelado',
        descricao: 'Se tiver alguma dúvida sobre esse cancelamento, nossa equipe está à disposição pra te ajudar.',
      }
    default:
      return {
        titulo: 'Aviso importante sobre sua conta',
        descricao: 'Temos uma informação sobre o seu contrato. Se precisar de ajuda, nossa equipe está à disposição.',
      }
  }
}
