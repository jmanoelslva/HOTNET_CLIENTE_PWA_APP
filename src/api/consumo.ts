import { ApiError, buscarConsumoDiario, buscarSessaoAtual } from './client'

export interface ConsumoDiario {
  data: string // yyyy-MM-dd
  rxBytes: number
  txBytes: number
}

export interface ConsumoPorContrato {
  cpePk: number
  contractPk: number | null
  contractNumber: number | null
  planoNome: string | null
  dias: ConsumoDiario[]
}

export function totalRxBytes(consumo: ConsumoPorContrato): number {
  return consumo.dias.reduce((soma, dia) => soma + dia.rxBytes, 0)
}

export function totalTxBytes(consumo: ConsumoPorContrato): number {
  return consumo.dias.reduce((soma, dia) => soma + dia.txBytes, 0)
}

export function totalBytes(consumo: ConsumoPorContrato): number {
  return totalRxBytes(consumo) + totalTxBytes(consumo)
}

function paraDataIso(data: Date): string {
  return data.toISOString().slice(0, 10)
}

/**
 * Busca o consumo diário de um mês específico, já agrupado por
 * contrato/CPE — um cliente com 2 contratos tem 2 CPEs, cada um com seu
 * próprio histórico, nunca somados juntos (mesmo critério do app Android).
 *
 * @param ano ano do período (ex: 2026)
 * @param mes mês do período, de 1 a 12
 */
export async function buscarConsumoDoMes(ano: number, mes: number): Promise<ConsumoPorContrato[]> {
  const hoje = new Date()
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1

  const inicioPeriodo = paraDataIso(new Date(ano, mes - 1, 1))
  // Se for o mês corrente, o fim é hoje (não faz sentido pedir dias
  // futuros); se for um mês passado, o fim é o último dia daquele mês.
  const fimPeriodo = ehMesAtual ? paraDataIso(hoje) : paraDataIso(new Date(ano, mes, 0))

  const where = JSON.stringify([
    { field: 'usage_date', oper: 4, value: inicioPeriodo },
    { field: 'AND' },
    { field: 'usage_date', oper: 3, value: fimPeriodo },
  ])

  const resposta = await buscarConsumoDiario(where)
  if (resposta.success === false) {
    throw new ApiError(resposta.message ?? 'Falha ao buscar consumo.')
  }

  const porCpe = new Map<number, ConsumoPorContrato>()
  for (const linha of resposta.results ?? []) {
    if (linha.cpe_pk == null || !linha.usage_date) continue

    let grupo = porCpe.get(linha.cpe_pk)
    if (!grupo) {
      grupo = {
        cpePk: linha.cpe_pk,
        contractPk: linha.contract_pk ?? null,
        contractNumber: linha.contract_number ?? null,
        planoNome: linha.plan_name ?? null,
        dias: [],
      }
      porCpe.set(linha.cpe_pk, grupo)
    }

    grupo.dias.push({
      data: linha.usage_date,
      rxBytes: (linha.usage_rx_byte ?? 0) * 1024,
      txBytes: (linha.usage_tx_byte ?? 0) * 1024,
    })
  }

  for (const grupo of porCpe.values()) {
    grupo.dias.sort((a, b) => a.data.localeCompare(b.data))
  }

  return [...porCpe.values()].sort((a, b) => (a.contractNumber ?? a.cpePk) - (b.contractNumber ?? b.cpePk))
}

export interface SessaoAtual {
  ip: string | null
  ipv6Prefixo: string | null
  ipv6Delegado: string | null
  macAddress: string | null
  callingId: string | null
  conectadoDesde: string | null
  ultimaAtividade: string | null
  tempoOnlineSegundos: number
  rxBytes: number
  txBytes: number
}

/**
 * Sessão de conexão ATUAL (ao vivo) de um CPE. Retorna null se o CPE não
 * tiver sessão ativa agora (offline) — não é erro, é um estado válido.
 */
export async function buscarSessaoAtualPorCpe(cpePk: number): Promise<SessaoAtual | null> {
  const where = JSON.stringify([{ field: 'aaa_cpe.cpe_pk', oper: 5, value: String(cpePk) }])
  const resposta = await buscarSessaoAtual(where)
  if (resposta.success === false) return null

  const primeiro = resposta.results?.[0]
  if (!primeiro) return null

  const sessao: SessaoAtual = {
    ip: primeiro.session_v4_ip?.trim() || null,
    ipv6Prefixo: primeiro.session_v6_px?.trim() || null,
    ipv6Delegado: primeiro.session_v6_pd?.trim() || null,
    macAddress: primeiro.session_mac?.trim() || null,
    callingId: primeiro.session_callingid?.trim() || null,
    conectadoDesde: primeiro.session_date_add ?? null,
    ultimaAtividade: primeiro.session_date_last ?? null,
    tempoOnlineSegundos: primeiro.session_acct_time ?? 0,
    rxBytes: (primeiro.session_rx_byte ?? 0) * 1024,
    txBytes: (primeiro.session_tx_byte ?? 0) * 1024,
  }

  if (!sessao.ip && sessao.tempoOnlineSegundos <= 0) return null
  return sessao
}
