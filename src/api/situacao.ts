import { listarBoletos } from './client'
import type { Contrato } from './contratos'
import { estaVencida } from '../utils/faturas'

/**
 * Situação única dos contratos pro Suporte/checklist, mesma regra do app Android: todos
 * cancelados = 5; um status só (1 a 4) = esse status; vários diferentes ou nenhum = null.
 */
export function situacaoDosContratos(contratos: Contrato[]): number | null {
  const status = contratos.map((c) => c.status ?? -1)
  if (status.length === 0) return null
  if (status.every((s) => s === 5)) return 5
  const distintos = [...new Set(status)]
  return distintos.length === 1 && distintos[0] >= 1 && distintos[0] <= 4 ? distintos[0] : null
}

/** Quantos boletos em atraso; null quando não deu pra consultar (a linha some no checklist). */
export async function contarBoletosAtrasados(): Promise<number | null> {
  try {
    const resposta = await listarBoletos()
    if (!resposta.success) return null
    return (resposta.results ?? []).filter(estaVencida).length
  } catch {
    return null
  }
}
