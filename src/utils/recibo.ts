/**
 * Recibo de pagamento montado pelo portal a partir da fatura paga — mesma regra do app Android
 * (billing/Recibo.kt). Valor do título e valor pago vêm de invoice/list; o demonstrativo, de
 * invoice/list_details. Sem itens (fatura antiga ou falha de rede), cai no plano do contrato +
 * encargos/desconto pela diferença entre pago e título. Valores em centavos.
 */

export interface ItemRecibo {
  nome: string
  valorCentavos: number
  descontoCentavos: number
  outrosCentavos: number
}

export type TipoLinhaRecibo = 'item' | 'mensalidade' | 'encargos' | 'desconto' | 'outros'

export interface LinhaRecibo {
  tipo: TipoLinhaRecibo
  nome: string | null
  centavos: number
}

export interface DadosRecibo {
  invoicePk: number
  clienteNome: string | null
  documentoMascarado: string | null
  contratoNumero: number | null
  plano: string | null
  /** dd/MM/yyyy */
  vencimento: string
  /** dd/MM/yyyy */
  dataCredito: string
  tituloCentavos: number
  pagoCentavos: number
  itens: ItemRecibo[]
}

export const EMPRESA_RECIBO = {
  nome: 'HOT NET',
  responsavel: 'QUITERIA BONIFACIO DA SILVA',
  cnpj: '17.659.900/0001-48',
  endereco: 'Rua Sebastião Gomes da Silva, 21, Vila São José',
  cidade: 'Arapiraca/AL',
}

export function paraCentavos(valor: string | number | null | undefined): number | null {
  if (valor == null || valor === '') return null
  const numero = Number.parseFloat(String(valor).replace(',', '.'))
  return Number.isFinite(numero) ? Math.round(numero * 100) : null
}

/** "R$ 1.234,56" */
export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Valor negativo (desconto) sai como "− R$ 4,50". */
export function formatarCentavosComSinal(centavos: number): string {
  return centavos < 0 ? `− ${formatarReais(-centavos)}` : formatarReais(centavos)
}

/** CPF/CNPJ parcialmente oculto, pro recibo que circula por WhatsApp: ***.456.789-** ou **.345.678/0001-** */
export function mascararDocumento(documento: string | null | undefined): string | null {
  const d = documento?.replace(/\D/g, '') ?? ''
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
  if (d.length === 14) return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-**`
  return null
}

/** "CPF" ou "CNPJ", pelo formato mascarado de [mascararDocumento]. */
export function rotuloDocumento(mascarado: string): string {
  return mascarado.includes('/') ? 'CNPJ' : 'CPF'
}

/** "yyyy-MM-dd[ HH:mm:ss]" → "dd/MM/yyyy"; formato inesperado volta como veio. */
export function dataIsoParaBr(raw: string): string {
  const partes = raw.split(' ')[0].split('-')
  if (partes.length !== 3) return raw
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n: number): string {
  if (n === 100) return 'cem'
  const partes: string[] = []
  if (n >= 100) partes.push(CENTENAS[Math.floor(n / 100)])
  const r = n % 100
  if (r >= 1 && r <= 19) partes.push(UNIDADES[r])
  else if (r >= 20) partes.push(r % 10 === 0 ? DEZENAS[Math.floor(r / 10)] : `${DEZENAS[Math.floor(r / 10)]} e ${UNIDADES[r % 10]}`)
  return partes.join(' e ')
}

/** Inteiro por extenso, até 999.999.999. */
export function numeroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  const grupos: Array<[number, string]> = []
  const milhoes = Math.floor(n / 1_000_000)
  const milhares = Math.floor(n / 1000) % 1000
  const resto = n % 1000
  if (milhoes > 0) grupos.push([milhoes, `${ate999(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}`])
  if (milhares > 0) grupos.push([milhares, milhares === 1 ? 'mil' : `${ate999(milhares)} mil`])
  if (resto > 0) grupos.push([resto, ate999(resto)])
  // "mil e duzentos", "dois mil e cinquenta", mas "mil duzentos e trinta".
  return grupos
    .map(([valor, texto], i) => {
      if (i === 0) return texto
      if (i === grupos.length - 1 && (valor < 100 || valor % 100 === 0)) return `e ${texto}`
      return texto
    })
    .join(' ')
}

/** Valor em reais por extenso: 5500 → "cinquenta e cinco reais". */
export function valorPorExtenso(centavos: number): string {
  const reais = Math.floor(centavos / 100)
  const cent = centavos % 100
  let parteReais: string | null = null
  if (reais === 1) parteReais = 'um real'
  else if (reais > 0 && reais % 1_000_000 === 0) parteReais = `${numeroPorExtenso(reais)} de reais`
  else if (reais > 0) parteReais = `${numeroPorExtenso(reais)} reais`
  let parteCentavos: string | null = null
  if (cent === 1) parteCentavos = 'um centavo'
  else if (cent > 1) parteCentavos = `${numeroPorExtenso(cent)} centavos`
  return [parteReais, parteCentavos].filter(Boolean).join(' e ') || 'zero reais'
}

export function numeroRecibo(d: DadosRecibo): string {
  return String(d.invoicePk).padStart(8, '0')
}

/** Itens de encargo do list_details, ex.: "Multa/Juros por atraso de pagamento" (como no app). */
export function ehEncargo(nome: string): boolean {
  return /multa|juros/i.test(nome)
}

/**
 * Multa/juros do fechamento (DadosRecibo.acrescimosCentavos do app). Com itens,
 * soma os itens de encargo: o Controllr às vezes grava o título já com os
 * juros (título = pago), e a diferença pago − título daria zero.
 */
export function acrescimosCentavos(d: DadosRecibo): number {
  if (d.itens.length > 0) {
    const soma = d.itens
      .filter((i) => ehEncargo(i.nome))
      .reduce((t, i) => t + i.valorCentavos - i.descontoCentavos + i.outrosCentavos, 0)
    return Math.max(soma, 0)
  }
  return Math.max(d.pagoCentavos - d.tituloCentavos, 0)
}

/** "Valor do título" do fechamento: sem os acréscimos, para fechar título + acréscimos = pago. */
export function tituloSemAcrescimosCentavos(d: DadosRecibo): number {
  const acrescimos = acrescimosCentavos(d)
  return acrescimos > 0 ? d.pagoCentavos - acrescimos : d.tituloCentavos
}

/** Serviços primeiro (item único = mensalidade do plano), encargos numa linha só no fim. */
export function linhasDemonstrativo(d: DadosRecibo): LinhaRecibo[] {
  if (d.itens.length > 0) {
    // Sem itens zerados (equipamento em comodato, ex.: "ROTEADOR HUAWEI AX2" a R$ 0,00).
    const servicos = d.itens
      .filter((i) => !ehEncargo(i.nome))
      .filter((i) => i.valorCentavos !== 0 || i.descontoCentavos !== 0 || i.outrosCentavos !== 0)
    const tipo: TipoLinhaRecibo = servicos.length === 1 ? 'mensalidade' : 'item'
    const linhas: LinhaRecibo[] = servicos.flatMap((item) => {
      const l: LinhaRecibo[] = [{ tipo, nome: item.nome, centavos: item.valorCentavos }]
      if (item.descontoCentavos > 0) l.push({ tipo: 'desconto', nome: item.nome, centavos: -item.descontoCentavos })
      if (item.outrosCentavos > 0) l.push({ tipo: 'outros', nome: item.nome, centavos: item.outrosCentavos })
      return l
    })
    const acrescimos = acrescimosCentavos(d)
    if (acrescimos > 0) linhas.push({ tipo: 'encargos', nome: null, centavos: acrescimos })
    return linhas
  }
  const encargos = Math.max(d.pagoCentavos - d.tituloCentavos, 0)
  const desconto = Math.max(d.tituloCentavos - d.pagoCentavos, 0)
  const linhas: LinhaRecibo[] = [{ tipo: 'mensalidade', nome: d.plano, centavos: d.tituloCentavos }]
  if (encargos > 0) linhas.push({ tipo: 'encargos', nome: null, centavos: encargos })
  if (desconto > 0) linhas.push({ tipo: 'desconto', nome: null, centavos: -desconto })
  return linhas
}

/** Mesmos textos do app (recibo_mensalidade_plano, recibo_encargos…). */
export function descricaoLinha(linha: LinhaRecibo): string {
  switch (linha.tipo) {
    case 'item':
      return linha.nome ?? ''
    case 'mensalidade':
      return linha.nome ? `${linha.nome} — mensalidade` : 'Mensalidade'
    case 'encargos':
      return 'Multa e juros por pagamento após o vencimento'
    case 'desconto':
      return linha.nome ? `Desconto · ${linha.nome}` : 'Desconto'
    case 'outros':
      return `Outros · ${linha.nome ?? ''}`
  }
}

/** null quando a fatura não está paga ou não tem valor. */
export function montarDadosRecibo(
  fatura: {
    invoice_pk: number
    contract_number?: number
    invoice_date_due?: string
    invoice_date_credit?: string
    invoice_amount_document?: string
    invoice_amount_paid?: string
  },
  clienteNome: string | null,
  documento: string | null,
  plano: string | null,
  itens: ItemRecibo[],
): DadosRecibo | null {
  const credito = fatura.invoice_date_credit?.trim()
  if (!credito) return null
  const titulo = paraCentavos(fatura.invoice_amount_document)
  if (titulo == null) return null
  return {
    invoicePk: fatura.invoice_pk,
    clienteNome: clienteNome?.trim() || null,
    documentoMascarado: mascararDocumento(documento),
    contratoNumero: fatura.contract_number ?? null,
    plano: plano?.trim() || null,
    vencimento: dataIsoParaBr(fatura.invoice_date_due ?? ''),
    dataCredito: dataIsoParaBr(credito),
    tituloCentavos: titulo,
    // Sem invoice_amount_paid, assume pago = título (não inventa encargo).
    pagoCentavos: paraCentavos(fatura.invoice_amount_paid) ?? titulo,
    itens,
  }
}

/** Texto pra compartilhar (WhatsApp, e-mail…), mesmo conteúdo do recibo. */
export function textoRecibo(d: DadosRecibo): string {
  const linhas = [
    `*Recibo de pagamento HOTNET* · Nº ${numeroRecibo(d)}`,
    '',
    `Recebemos de ${d.clienteNome?.toUpperCase() ?? 'TITULAR DO CONTRATO'}${
      d.documentoMascarado ? `, ${rotuloDocumento(d.documentoMascarado)} ${d.documentoMascarado}` : ''
    }, a importância de ${formatarReais(d.pagoCentavos)} (${valorPorExtenso(d.pagoCentavos)}), referente à mensalidade${
      d.contratoNumero != null ? ` do contrato nº ${d.contratoNumero}` : ''
    } com vencimento em ${d.vencimento}, dando plena quitação deste valor.`,
    '',
    ...linhasDemonstrativo(d).map((l) => `${descricaoLinha(l)}: ${formatarCentavosComSinal(l.centavos)}`),
    `Valor pago: ${formatarReais(d.pagoCentavos)}`,
    `Data de crédito: ${d.dataCredito}`,
    '',
    `${EMPRESA_RECIBO.nome} · CNPJ ${EMPRESA_RECIBO.cnpj}`,
  ]
  return linhas.join('\n')
}
