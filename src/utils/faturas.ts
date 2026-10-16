import type { FaturaDto } from '../api/client'

/** Em aberto e com dias de atraso — mesma regra da aba "Atrasado" de Boletos. */
export function estaVencida(fatura: FaturaDto): boolean {
  const dias = Number.parseInt(fatura.days_late ?? '', 10) || 0
  return !fatura.invoice_date_credit && dias > 0
}
