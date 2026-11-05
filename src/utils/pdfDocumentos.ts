import type { jsPDF as JsPdf } from 'jspdf'
import logoHotnet from '../assets/logo-hotnet.png'
import {
  EMPRESA_RECIBO,
  descricaoLinha,
  formatarCentavosComSinal,
  formatarReais,
  linhasDemonstrativo,
  numeroRecibo,
  rotuloDocumento,
  valorPorExtenso,
  type DadosRecibo,
} from './recibo'
import type { DadosQuitacao } from './quitacao'

/**
 * Recibo e declaração de quitação em PDF de verdade, no mesmo desenho do app
 * Android (billing/ReciboPdf.kt e QuitacaoPdf.kt): A4, margem de 48 pt,
 * faixa vermelho/laranja no topo, logotipo, declaração com a barra laranja,
 * quadro de dados e tabela. O jsPDF só é baixado quando alguém gera um PDF.
 */

const LARGURA = 595
const ALTURA = 842
const MARGEM = 48
const DIREITA = LARGURA - MARGEM
const VERMELHO = '#c21624'
const LARANJA = '#ff8a4c'
const TINTA = '#243642'
const SUAVE = '#586476'
const LINHA = '#d5dae0'

let logoCache: Promise<string | null> | null = null

/** Logotipo reduzido (o PNG original tem 2 mil px) em PNG base64. */
function logoReduzido(): Promise<string | null> {
  logoCache ??= new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const escala = 160 / Math.max(img.naturalWidth, img.naturalHeight)
      canvas.width = Math.round(img.naturalWidth * escala)
      canvas.height = Math.round(img.naturalHeight * escala)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = logoHotnet
  })
  return logoCache
}

async function novoDocumento(): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'pt', format: 'a4' })
}

/** Faixa do topo e cabeçalho com empresa e título à direita. Devolve o y seguinte. */
async function cabecalho(doc: JsPdf, titulo: string, linha1: string, linha2: string): Promise<number> {
  doc.setFillColor(VERMELHO)
  doc.rect(0, 0, LARGURA * 0.7, 6, 'F')
  doc.setFillColor(LARANJA)
  doc.rect(LARGURA * 0.7, 0, LARGURA * 0.3, 6, 'F')

  const topo = 44
  const logo = await logoReduzido()
  if (logo) doc.addImage(logo, 'PNG', MARGEM, topo, 58, 50)
  const x = MARGEM + (logo ? 70 : 0)
  doc.setTextColor(TINTA)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(EMPRESA_RECIBO.nome, x, topo + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(SUAVE)
  doc.text(`${EMPRESA_RECIBO.responsavel} · CNPJ ${EMPRESA_RECIBO.cnpj}`, x, topo + 28)
  doc.text(EMPRESA_RECIBO.endereco, x, topo + 40)
  doc.text(EMPRESA_RECIBO.cidade, x, topo + 52)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(VERMELHO)
  doc.text(titulo.toUpperCase(), DIREITA, topo + 14, { align: 'right' })
  doc.setFontSize(10.5)
  doc.setTextColor(TINTA)
  doc.text(linha1, DIREITA, topo + 30, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setTextColor(SUAVE)
  doc.text(linha2.toUpperCase(), DIREITA, topo + 43, { align: 'right' })
  return topo + 76
}

/** Parágrafo com trechos em negrito e a barra laranja à esquerda. */
function declaracao(doc: JsPdf, partes: { t: string; negrito?: boolean }[], topo: number): number {
  const x = MARGEM + 14
  const largura = DIREITA - x
  doc.setFontSize(11)
  doc.setTextColor(TINTA)
  // Quebra palavra a palavra, trocando a fonte em cada trecho.
  const palavras = partes.flatMap((p) => p.t.split(/(\s+)/).filter(Boolean).map((w) => ({ w, negrito: !!p.negrito })))
  let cx = x
  let y = topo + 11
  for (const { w, negrito } of palavras) {
    doc.setFont('helvetica', negrito ? 'bold' : 'normal')
    const lw = doc.getTextWidth(w)
    if (/^\s+$/.test(w)) {
      if (cx > x) cx += lw
      continue
    }
    if (cx + lw > x + largura && cx > x) {
      cx = x
      y += 16
    }
    doc.text(w, cx, y)
    cx += lw
  }
  doc.setFillColor(LARANJA)
  doc.rect(MARGEM, topo, 3, y - topo + 5, 'F')
  return y + 18
}

/** Quadro com colunas de rótulo/valor (datas, contrato, total). */
function quadro(doc: JsPdf, colunas: [string, string][], topo: number): number {
  const altura = 40
  const largura = (DIREITA - MARGEM) / colunas.length
  doc.setDrawColor(LINHA)
  doc.setLineWidth(0.8)
  doc.roundedRect(MARGEM, topo, DIREITA - MARGEM, altura, 5, 5, 'S')
  colunas.forEach(([rotulo, valor], i) => {
    const x0 = MARGEM + i * largura
    if (i > 0) doc.line(x0, topo, x0, topo + altura)
    const centro = x0 + largura / 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(SUAVE)
    doc.text(rotulo.toUpperCase(), centro, topo + 15, { align: 'center' })
    doc.setFontSize(10.5)
    doc.setTextColor(TINTA)
    doc.text(valor, centro, topo + 30, { align: 'center' })
  })
  return topo + altura + 22
}

function rodape(doc: JsPdf, texto: string) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(SUAVE)
  const linhas = doc.splitTextToSize(texto, DIREITA - MARGEM) as string[]
  doc.text(linhas, MARGEM, ALTURA - 40 - (linhas.length - 1) * 10)
}

export async function pdfRecibo(d: DadosRecibo): Promise<Blob> {
  const doc = await novoDocumento()
  let y = await cabecalho(doc, 'Recibo de pagamento', `Nº ${numeroRecibo(d)}`, 'Via do cliente')
  y = declaracao(
    doc,
    [
      { t: 'Recebemos de ' },
      { t: d.clienteNome?.toUpperCase() ?? 'TITULAR DO CONTRATO', negrito: true },
      { t: d.documentoMascarado ? `, ${rotuloDocumento(d.documentoMascarado)} ${d.documentoMascarado}` : '' },
      { t: ', a importância de ' },
      { t: `${formatarReais(d.pagoCentavos)} (${valorPorExtenso(d.pagoCentavos)})`, negrito: true },
      { t: `, referente à mensalidade${d.contratoNumero != null ? ` do contrato nº ${d.contratoNumero}` : ''} com vencimento em ${d.vencimento}, dando plena quitação deste valor.` },
    ],
    y,
  )
  y = quadro(
    doc,
    [
      ['Cobrança', numeroRecibo(d)],
      ['Vencimento', d.vencimento],
      ['Data de crédito', d.dataCredito],
      ['Contrato', d.contratoNumero != null ? `Nº ${d.contratoNumero}` : '—'],
    ],
    y,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(SUAVE)
  doc.text('DEMONSTRATIVO', MARGEM, y)
  y += 10
  const linhas: [string, string, boolean][] = [
    ...linhasDemonstrativo(d).map((l): [string, string, boolean] => [descricaoLinha(l), formatarCentavosComSinal(l.centavos), false]),
    ['Valor do título', formatarReais(d.tituloCentavos), false],
  ]
  doc.setFontSize(9.5)
  for (const [texto, valor] of linhas) {
    doc.setDrawColor(LINHA)
    doc.line(MARGEM, y, DIREITA, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(TINTA)
    doc.text(texto, MARGEM + 8, y + 13)
    doc.text(valor, DIREITA - 8, y + 13, { align: 'right' })
    y += 20
  }
  doc.setFillColor('#fff3ec')
  doc.rect(MARGEM, y, DIREITA - MARGEM, 26, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Valor pago', MARGEM + 8, y + 17)
  doc.setTextColor(VERMELHO)
  doc.text(formatarReais(d.pagoCentavos), DIREITA - 8, y + 17, { align: 'right' })

  rodape(doc, `Emitido pelo portal HOTNET em ${new Date().toLocaleDateString('pt-BR')}.`)
  return doc.output('blob')
}

export async function pdfQuitacao(d: DadosQuitacao): Promise<Blob> {
  const doc = await novoDocumento()
  let y = await cabecalho(doc, 'Declaração de quitação', `Ano de referência ${d.ano}`, 'Lei nº 12.007/2009')
  y = declaracao(
    doc,
    [
      { t: 'Declaramos, para os fins da Lei nº 12.007/2009, que ' },
      { t: d.clienteNome?.toUpperCase() ?? 'TITULAR DO CONTRATO', negrito: true },
      { t: d.documentoMascarado ? `, ${rotuloDocumento(d.documentoMascarado)} ${d.documentoMascarado}` : '' },
      { t: `, efetuou o pagamento de todas as cobranças${d.contratoNumero != null ? ` do contrato nº ${d.contratoNumero}` : ''} com vencimento no ano de ` },
      { t: String(d.ano), negrito: true },
      { t: ', no total de ' },
      { t: `${formatarReais(d.totalCentavos)} (${valorPorExtenso(d.totalCentavos)})`, negrito: true },
      { t: ', nada devendo a esta empresa referente a esse período.' },
    ],
    y,
  )
  y = quadro(
    doc,
    [
      ['Ano', String(d.ano)],
      ['Cobranças', String(d.linhas.length)],
      ['Contrato', d.contratoNumero != null ? `Nº ${d.contratoNumero}` : '—'],
      ['Total pago', formatarReais(d.totalCentavos)],
    ],
    y,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(SUAVE)
  doc.text('COBRANÇAS QUITADAS NO PERÍODO', MARGEM, y)
  y += 8
  const colVenc = MARGEM + 150
  const colPag = MARGEM + 270
  const titulos = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(SUAVE)
    doc.text('COBRANÇA', MARGEM + 8, y + 12)
    doc.text('VENCIMENTO', colVenc, y + 12)
    doc.text('PAGAMENTO', colPag, y + 12)
    doc.text('VALOR PAGO', DIREITA - 8, y + 12, { align: 'right' })
    y += 18
  }
  titulos()
  for (const l of d.linhas) {
    if (y > ALTURA - 110) {
      // Página seguinte, com o título da continuação.
      doc.addPage()
      y = 48
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(TINTA)
      doc.text(EMPRESA_RECIBO.nome, MARGEM, y)
      doc.setFontSize(8.5)
      doc.setTextColor(SUAVE)
      doc.text(`Declaração de quitação ${d.ano} · continuação`, DIREITA, y, { align: 'right' })
      y += 20
      titulos()
    }
    doc.setDrawColor(LINHA)
    doc.line(MARGEM, y, DIREITA, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(TINTA)
    doc.text(`Nº ${l.numero}`, MARGEM + 8, y + 12.5)
    doc.text(l.vencimento, colVenc, y + 12.5)
    doc.text(l.pagamento, colPag, y + 12.5)
    doc.text(formatarReais(l.pagoCentavos), DIREITA - 8, y + 12.5, { align: 'right' })
    y += 18
  }
  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(TINTA)
  doc.text('Total pago no ano', MARGEM + 8, y)
  doc.setTextColor(VERMELHO)
  doc.text(formatarReais(d.totalCentavos), DIREITA - 8, y, { align: 'right' })

  rodape(
    doc,
    'Esta declaração substitui, para a comprovação do cumprimento das obrigações do consumidor, as quitações dos ' +
      'faturamentos mensais dos débitos do ano a que se refere e dos anos anteriores (art. 4º da Lei nº 12.007/2009). ' +
      `Emitida pelo portal HOTNET em ${new Date().toLocaleDateString('pt-BR')}.`,
  )
  return doc.output('blob')
}

/**
 * Compartilha o PDF como arquivo (WhatsApp, e-mail…), como o app; onde o
 * navegador não compartilha arquivo (computador), baixa.
 */
export async function compartilharPdf(blob: Blob, nomeArquivo: string, titulo: string): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const arquivo = new File([blob], nomeArquivo, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: titulo })
      return 'compartilhado'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'baixado'
}
