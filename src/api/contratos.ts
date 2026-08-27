import {
  ApiError,
  buscarDetalhesContrato,
  listarBoletos,
  listarItensContrato,
  type ContratoDto,
} from './client'

export interface ItemServico {
  nome: string
  valor: string | null
  ehEquipamento: boolean
}

export interface Contrato {
  id: number
  numero: number | null
  status: number | null
  diaPagamento: number | null
  dataAtivacao: string | null
  valor: string | null
  plano: string | null
  itens: ItemServico[]
}

async function detalhesSeguro(contractPk: number): Promise<ContratoDto | null> {
  try {
    const resposta = await buscarDetalhesContrato(contractPk)
    if (resposta.success === false) return null
    const resultados = resposta.results
    if (Array.isArray(resultados)) return resultados[0] ?? null
    if (resultados && typeof resultados === 'object') return resultados
    return null
  } catch {
    return null
  }
}

async function itensSeguro(contractPk: number): Promise<ItemServico[]> {
  try {
    const resposta = await listarItensContrato(contractPk)
    if (!resposta.success) return []
    const itens: ItemServico[] = []
    for (const dto of resposta.results ?? []) {
      const nome = dto.item_name ?? dto.plan_name
      if (!nome) continue
      itens.push({
        nome,
        valor: dto.item_amount ?? null,
        ehEquipamento: dto.item_rent === true || dto.item_type === 5,
      })
    }
    return itens
  } catch {
    return []
  }
}

/**
 * Monta a lista de contratos do cliente logado: descobre os contract_pk
 * existentes a partir das faturas (fonte confiável), depois enriquece
 * cada um com detalhes (contract/list) e itens (contract/svclist). Um
 * contrato sem detalhes disponíveis (contract_client_show=false no
 * servidor) é excluído da lista — mesmo critério do app Android.
 */
export async function buscarContratos(): Promise<Contrato[]> {
  const respostaFaturas = await listarBoletos({ limit: 300 })
  if (!respostaFaturas.success) {
    throw new ApiError(respostaFaturas.message ?? 'Erro ao buscar contratos.')
  }

  const basicos = new Map<number, number | null>()
  for (const fatura of respostaFaturas.results ?? []) {
    if (fatura.contract_pk != null && !basicos.has(fatura.contract_pk)) {
      basicos.set(fatura.contract_pk, fatura.contract_number ?? null)
    }
  }

  const contratos = await Promise.all(
    [...basicos.entries()].map(async ([pk, numeroBasico]): Promise<Contrato | null> => {
      const detalhes = await detalhesSeguro(pk)
      if (!detalhes) return null

      const itens = await itensSeguro(pk)
      const plano = itens.find((item) => !item.ehEquipamento)?.nome ?? null

      return {
        id: pk,
        numero: detalhes.contract_number ?? numeroBasico,
        status: detalhes.contract_status ?? null,
        diaPagamento: detalhes.contract_pay_day ?? null,
        dataAtivacao: detalhes.contract_date_activation ?? detalhes.contract_date_cad ?? null,
        valor: detalhes.contract_amount ?? detalhes.contract_value ?? null,
        plano,
        itens,
      }
    }),
  )

  return contratos.filter((contrato): contrato is Contrato => contrato !== null)
}
