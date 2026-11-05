import type { FaturaDto } from '../api/client'

/** Em aberto e com dias de atraso — mesma regra da aba "Atrasado" de Boletos. */
export function estaVencida(fatura: FaturaDto): boolean {
  const dias = Number.parseInt(fatura.days_late ?? '', 10) || 0
  return !fatura.invoice_date_credit && dias > 0
}

export function diasDeAtraso(fatura: FaturaDto): number {
  return Number.parseInt(fatura.days_late ?? '', 10) || 0
}

function numero(valor: string | undefined): number {
  const n = Number.parseFloat(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : Number.NaN
}

export interface Encargos {
  original: number
  multa: number
  juros: number
  total: number
}

/**
 * Multa fixa + juros simples ao dia sobre o valor original (Febraban), só
 * para boleto vencido com as duas taxas — igual ao Fatura.encargosDetalhados()
 * do app Android.
 */
export function encargosDetalhados(fatura: FaturaDto): Encargos | null {
  const dias = diasDeAtraso(fatura)
  if (dias <= 0) return null
  const original = numero(fatura.invoice_amount_document)
  const multaPct = numero(fatura.invoice_rate_fine)
  const jurosPct = numero(fatura.invoice_rate_interest)
  if (![original, multaPct, jurosPct].every(Number.isFinite)) return null
  const multa = original * (multaPct / 100)
  const juros = original * (jurosPct / 100) * dias
  return { original, multa, juros, total: original + multa + juros }
}

/** Valor a mostrar: com encargos quando vencido, senão o do título. */
export function valorAtual(fatura: FaturaDto): number {
  const e = estaVencida(fatura) ? encargosDetalhados(fatura) : null
  const original = numero(fatura.invoice_amount_document)
  return e?.total ?? (Number.isFinite(original) ? original : 0)
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarDataBr(iso: string | undefined): string {
  const partes = (iso ?? '').split(' ')[0].split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : (iso ?? '')
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** "seg, 20/10" — como diaDaSemanaEData do app. */
export function diaDaSemanaEData(iso: string | undefined): string | null {
  const partes = (iso ?? '').split(' ')[0].split('-').map(Number)
  if (partes.length !== 3 || partes.some((p) => !Number.isFinite(p))) return null
  const [ano, mes, dia] = partes
  const semana = DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()]
  return `${semana}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

export type Prazo = { tipo: 'faltam'; dias: number } | { tipo: 'hoje' } | { tipo: 'atrasado'; dias: number }

/** Prazo em contagem de dias (PrazoBoleto.kt): o atraso vem da API. */
export function calcularPrazo(fatura: FaturaDto, hoje = new Date()): Prazo | null {
  const atraso = diasDeAtraso(fatura)
  if (atraso > 0) return { tipo: 'atrasado', dias: atraso }
  const partes = (fatura.invoice_date_due ?? '').split(' ')[0].split('-').map(Number)
  if (partes.length !== 3 || partes.some((p) => !Number.isFinite(p))) return null
  const vencimento = Date.UTC(partes[0], partes[1] - 1, partes[2])
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const dias = Math.round((vencimento - hojeUtc) / 86_400_000)
  return dias <= 0 ? { tipo: 'hoje' } : { tipo: 'faltam', dias }
}

/** Texto da etiqueta de prazo ("Vence em 4 dias · ter, 20/10"). */
export function textoPrazo(fatura: FaturaDto, hoje = new Date()): string {
  const prazo = calcularPrazo(fatura, hoje)
  const semanaData = diaDaSemanaEData(fatura.invoice_date_due)
  if (!prazo || !semanaData) return textoVencimento(fatura)
  const dataCurta = semanaData.split(', ')[1]
  if (prazo.tipo === 'hoje') return `Vence hoje · ${semanaData}`
  if (prazo.tipo === 'faltam') return prazo.dias === 1 ? `Vence amanhã · ${semanaData}` : `Vence em ${prazo.dias} dias · ${semanaData}`
  return `Atrasado há ${prazo.dias} ${prazo.dias === 1 ? 'dia' : 'dias'} · venceu ${dataCurta}`
}

/** "Vence em 20/10/2026" ou "Venceu em 20/10/2026 · há 3 dias" (FaturaCompacta). */
export function textoVencimento(fatura: FaturaDto): string {
  const data = formatarDataBr(fatura.invoice_date_due)
  if (!estaVencida(fatura)) return `Vence em ${data}`
  const dias = diasDeAtraso(fatura)
  return `Venceu em ${data} · há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

/** Mensagem completa para compartilhar (textoCompartilharFatura do app). */
export function textoCompartilharFatura(fatura: FaturaDto): string {
  const linhas = [
    'Boleto HOTNET',
    `Valor: ${formatarMoeda(valorAtual(fatura))}`,
    `Vencimento: ${formatarDataBr(fatura.invoice_date_due)}`,
  ]
  if (fatura.invoice_qrcode?.trim()) linhas.push('', 'Pix copia e cola:', fatura.invoice_qrcode.trim())
  if (fatura.invoice_barcode?.trim()) linhas.push('', 'Linha digitável:', fatura.invoice_barcode.trim())
  return linhas.join('\n')
}
