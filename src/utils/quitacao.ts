import type { FaturaDto } from '../api/client'
import { dataIsoParaBr, mascararDocumento, paraCentavos } from './recibo'

/**
 * Declaração anual de quitação (Lei 12.007/2009), mesma regra do app Android
 * (billing/Quitacao.kt): o ano é o do vencimento (art. 2º); só sai de ano
 * encerrado e com tudo pago, e cobrança em aberto de ano anterior também
 * bloqueia (art. 4º: a declaração vale para "os anos anteriores").
 */

export interface AnoQuitacao {
  ano: number
  faturas: FaturaDto[]
  encerrado: boolean
  /** Cobranças do próprio ano ainda não pagas. */
  pendentes: number
  /** Ano mais recente anterior com cobrança em aberto, ou null. */
  anoAnteriorPendente: number | null
  disponivel: boolean
  totalPagoCentavos: number
}

export interface LinhaQuitacao {
  numero: string
  vencimento: string
  pagamento: string
  pagoCentavos: number
}

export interface DadosQuitacao {
  clienteNome: string | null
  documentoMascarado: string | null
  contratoNumero: number | null
  ano: number
  linhas: LinhaQuitacao[]
  totalCentavos: number
}

/** Mesmo critério do recibo: sem valor pago, vale o valor do título. */
function pagoCentavos(f: FaturaDto): number {
  return paraCentavos(f.invoice_amount_paid) ?? paraCentavos(f.invoice_amount_document) ?? 0
}

function anoDoVencimento(f: FaturaDto): number | null {
  const ano = Number.parseInt((f.invoice_date_due ?? '').slice(0, 4), 10)
  return Number.isFinite(ano) ? ano : null
}

/** Anos do contrato, do mais recente ao mais antigo, até `limite`. */
export function anosQuitacao(faturas: FaturaDto[], contratoPk: number, anoAtual: number, limite = 5): AnoQuitacao[] {
  const porAno = new Map<number, FaturaDto[]>()
  for (const f of faturas) {
    if (f.contract_pk !== contratoPk) continue
    const ano = anoDoVencimento(f)
    if (ano == null) continue
    porAno.set(ano, [...(porAno.get(ano) ?? []), f])
  }
  const anosComPendencia = [...porAno.entries()].filter(([, lista]) => lista.some((f) => !f.invoice_date_credit)).map(([ano]) => ano)

  return [...porAno.keys()]
    .sort((a, b) => b - a)
    .slice(0, limite)
    .map((ano) => {
      const lista = porAno.get(ano)!
      const pendentes = lista.filter((f) => !f.invoice_date_credit).length
      const anteriores = anosComPendencia.filter((a) => a < ano)
      const anoAnteriorPendente = anteriores.length > 0 ? Math.max(...anteriores) : null
      const encerrado = ano < anoAtual
      return {
        ano,
        faturas: lista,
        encerrado,
        pendentes,
        anoAnteriorPendente,
        disponivel: encerrado && pendentes === 0 && anoAnteriorPendente == null && lista.length > 0,
        totalPagoCentavos: lista.reduce((soma, f) => soma + pagoCentavos(f), 0),
      }
    })
}

/** Null quando o ano não está disponível. */
export function montarDadosQuitacao(ano: AnoQuitacao, clienteNome: string | null, documento: string | null): DadosQuitacao | null {
  if (!ano.disponivel) return null
  const linhas = [...ano.faturas]
    .sort((a, b) => (a.invoice_date_due ?? '').localeCompare(b.invoice_date_due ?? ''))
    .map((f) => ({
      numero: String(f.invoice_pk).padStart(8, '0'),
      vencimento: dataIsoParaBr(f.invoice_date_due ?? ''),
      pagamento: dataIsoParaBr(f.invoice_date_credit ?? ''),
      pagoCentavos: pagoCentavos(f),
    }))
  return {
    clienteNome: clienteNome?.trim() || null,
    documentoMascarado: mascararDocumento(documento),
    contratoNumero: ano.faturas.find((f) => f.contract_number != null)?.contract_number ?? null,
    ano: ano.ano,
    linhas,
    totalCentavos: linhas.reduce((soma, l) => soma + l.pagoCentavos, 0),
  }
}
