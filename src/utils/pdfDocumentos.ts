import type { jsPDF as JsPdf } from 'jspdf'
import logoPdf from '../assets/logo-pdf.png'
import fonteRegular from '../assets/fonts/pdf/manrope_regular.ttf?url'
import fonteSemibold from '../assets/fonts/pdf/manrope_semibold.ttf?url'
import fonteBold from '../assets/fonts/pdf/manrope_bold.ttf?url'
import fonteExtrabold from '../assets/fonts/pdf/manrope_extrabold.ttf?url'
import {
  EMPRESA_RECIBO,
  acrescimosCentavos,
  descricaoLinha,
  formatarCentavosComSinal,
  formatarReais,
  linhasDemonstrativo,
  numeroRecibo,
  rotuloDocumento,
  tituloSemAcrescimosCentavos,
  valorPorExtenso,
  type DadosRecibo,
} from './recibo'
import type { DadosQuitacao } from './quitacao'

/**
 * Recibo e declaração de quitação em PDF, com as mesmas medidas, fontes,
 * cores e textos do app Android (billing/ReciboPdf.kt e QuitacaoPdf.kt):
 * A4 em pontos, margem 48, Manrope embutida, papel sempre no tema claro.
 * O jsPDF e as fontes só são baixados quando alguém gera um PDF.
 */

const LARGURA = 595
const ALTURA = 842
const MARGEM = 48
const DIREITA = LARGURA - MARGEM
const LIMITE = ALTURA - 70

// Cores do tema claro do app (ui/theme/Color.kt, StatusColors.kt).
const TINTA = '#243642'
const SUAVE = '#586476'
const LINHA = '#d5dae0'
const VERMELHO = '#c21624'
const LARANJA = '#c94300'
const VERDE = '#1e7a46'
const FAIXA = '#f2f4f6'

const EMPRESA = {
  ...EMPRESA_RECIBO,
  zona: 'Zona Rural',
  cep: '57318-600',
  telefone: '(82) 99942-6613',
  email: 'contato@hotnet.net.br',
  site: 'hotnet.net.br',
}

type Peso = 'regular' | 'semibold' | 'bold' | 'extrabold'
const NOMES: Record<Peso, string> = { regular: 'Manrope', semibold: 'ManropeSemi', bold: 'ManropeBold', extrabold: 'ManropeX' }
const URLS: Record<Peso, string> = { regular: fonteRegular, semibold: fonteSemibold, bold: fonteBold, extrabold: fonteExtrabold }

let fontesCache: Promise<Record<Peso, string> | null> | null = null

function paraBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binario)
}

/** Manrope em base64 (null se não der para baixar: cai na Helvetica). */
function carregarFontes(): Promise<Record<Peso, string> | null> {
  fontesCache ??= Promise.all(
    (Object.keys(URLS) as Peso[]).map(async (p) => {
      const r = await fetch(URLS[p])
      if (!r.ok) throw new Error(`fonte ${p}`)
      return [p, paraBase64(await r.arrayBuffer())] as const
    }),
  )
    .then((pares) => Object.fromEntries(pares) as Record<Peso, string>)
    .catch(() => {
      fontesCache = null
      return null
    })
  return fontesCache
}

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Data de hoje "06/11/2026 às 14:32" e por extenso "6 de novembro de 2026". */
function agora(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`
}

function porExtenso(data: Date): string {
  return `${data.getDate()} de ${data.toLocaleDateString('pt-BR', { month: 'long' })} de ${data.getFullYear()}`
}

function dataBrParaDate(br: string): Date | null {
  const [d, m, a] = br.split('/').map(Number)
  return d && m && a ? new Date(a, m - 1, d) : null
}

/** Desenho no papel, com as mesmas funções do app (texto, traço, faixa). */
class Papel {
  private manrope = false

  readonly doc: JsPdf

  constructor(doc: JsPdf, fontes: Record<Peso, string> | null) {
    this.doc = doc
    if (fontes) {
      for (const p of Object.keys(fontes) as Peso[]) {
        doc.addFileToVFS(`${NOMES[p]}.ttf`, fontes[p])
        doc.addFont(`${NOMES[p]}.ttf`, NOMES[p], 'normal')
      }
      this.manrope = true
    }
  }

  fonte(peso: Peso, tamanho: number, cor = TINTA) {
    if (this.manrope) this.doc.setFont(NOMES[peso], 'normal')
    else this.doc.setFont('helvetica', peso === 'regular' ? 'normal' : 'bold')
    this.doc.setFontSize(tamanho)
    this.doc.setTextColor(cor)
  }

  texto(t: string, x: number, y: number, peso: Peso, tamanho: number, cor = TINTA, alinhamento: 'left' | 'right' | 'center' = 'left') {
    this.fonte(peso, tamanho, cor)
    this.doc.text(t, x, y, { align: alinhamento })
  }

  largura(t: string, peso: Peso, tamanho: number): number {
    this.fonte(peso, tamanho)
    return this.doc.getTextWidth(t)
  }

  traco(x1: number, y1: number, x2: number, y2: number, cor = LINHA, largura = 0.8) {
    this.doc.setDrawColor(cor)
    this.doc.setLineWidth(largura)
    this.doc.line(x1, y1, x2, y2)
  }

  retangulo(x: number, y: number, l: number, a: number, cor: string) {
    this.doc.setFillColor(cor)
    this.doc.rect(x, y, l, a, 'F')
  }

  /** Faixa da marca no topo: vermelho + laranja do logotipo. */
  faixaDaMarca() {
    this.retangulo(0, 0, LARGURA * 0.7, 6, VERMELHO)
    this.retangulo(LARGURA * 0.7, 0, LARGURA * 0.3, 6, LARANJA)
  }

  /**
   * Parágrafo justificado (JUSTIFICATION_MODE_INTER_WORD), com trechos em
   * ExtraBold. Devolve a altura ocupada.
   */
  paragrafo(partes: { t: string; negrito?: boolean }[], x: number, topo: number, tamanho: number, cor: string, espaco: number): number {
    const larguraMax = DIREITA - x
    // Cada palavra guarda seus pedaços (negrito ou não): "SILVA," vira "SILVA" + ",".
    type Palavra = { pedacos: { w: string; peso: Peso }[] }
    const tokens: Palavra[] = []
    let atualToken: Palavra | null = null
    for (const parte of partes) {
      const peso: Peso = parte.negrito ? 'extrabold' : 'regular'
      for (const ch of parte.t) {
        if (/\s/.test(ch)) {
          atualToken = null
          continue
        }
        if (!atualToken) {
          atualToken = { pedacos: [] }
          tokens.push(atualToken)
        }
        const ultimo = atualToken.pedacos[atualToken.pedacos.length - 1]
        if (ultimo && ultimo.peso === peso) ultimo.w += ch
        else atualToken.pedacos.push({ w: ch, peso })
      }
    }
    const larguraToken = (t: Palavra) => t.pedacos.reduce((s, p) => s + this.largura(p.w, p.peso, tamanho), 0)
    const espacoNormal = this.largura(' ', 'regular', tamanho)

    const linhas: Palavra[][] = []
    let atual: Palavra[] = []
    let larguraAtual = 0
    for (const t of tokens) {
      const l = larguraToken(t)
      const necessario = atual.length ? larguraAtual + espacoNormal + l : l
      if (atual.length && necessario > larguraMax) {
        linhas.push(atual)
        atual = [t]
        larguraAtual = l
      } else {
        atual.push(t)
        larguraAtual = necessario
      }
    }
    if (atual.length) linhas.push(atual)

    const alturaLinha = tamanho * 1.366 + espaco
    linhas.forEach((linha, i) => {
      const y = topo + tamanho * 1.07 + i * alturaLinha
      const ultima = i === linhas.length - 1
      const soma = linha.reduce((s, t) => s + larguraToken(t), 0)
      const espacoJust = !ultima && linha.length > 1 ? (larguraMax - soma) / (linha.length - 1) : espacoNormal
      let cx = x
      for (const t of linha) {
        for (const p of t.pedacos) {
          this.texto(p.w, cx, y, p.peso, tamanho, cor)
          cx += this.largura(p.w, p.peso, tamanho)
        }
        cx += espacoJust
      }
    })
    return linhas.length * alturaLinha
  }
}

async function novoPapel(): Promise<Papel> {
  const [{ jsPDF }, fontes] = await Promise.all([import('jspdf'), carregarFontes()])
  return new Papel(new jsPDF({ unit: 'pt', format: 'a4', compress: true }), fontes)
}

/** Cabeçalho comum: ícone, dados da empresa e título à direita. */
async function cabecalho(papel: Papel, titulo: string, linha1: string, linha2: string): Promise<number> {
  const topo = 44
  const logo = await carregarImagem(logoPdf)
  if (logo) papel.doc.addImage(logo, 'PNG', MARGEM, topo, 58, 58)
  const x = MARGEM + 70
  papel.texto(EMPRESA.nome, x, topo + 14, 'extrabold', 14)
  papel.texto(`${EMPRESA.responsavel} · CNPJ ${EMPRESA.cnpj}`, x, topo + 28, 'regular', 8.5, SUAVE)
  papel.texto(EMPRESA.endereco, x, topo + 40, 'regular', 8.5, SUAVE)
  papel.texto(`${EMPRESA.zona} · ${EMPRESA.cidade} · CEP ${EMPRESA.cep}`, x, topo + 52, 'regular', 8.5, SUAVE)
  papel.texto(`${EMPRESA.telefone} · ${EMPRESA.email} · ${EMPRESA.site}`, x, topo + 64, 'regular', 8.5, SUAVE)
  papel.texto(titulo.toLocaleUpperCase('pt-BR'), DIREITA, topo + 14, 'extrabold', 13, VERMELHO, 'right')
  papel.texto(linha1, DIREITA, topo + 30, 'semibold', 10.5, TINTA, 'right')
  papel.texto(linha2.toLocaleUpperCase('pt-BR'), DIREITA, topo + 43, 'bold', 7.5, SUAVE, 'right')
  return topo + 68
}

function quadro(papel: Papel, colunas: [string, string][], topo: number): number {
  const altura = 40
  const largura = (DIREITA - MARGEM) / colunas.length
  papel.doc.setDrawColor(LINHA)
  papel.doc.setLineWidth(0.8)
  papel.doc.roundedRect(MARGEM, topo, DIREITA - MARGEM, altura, 5, 5, 'S')
  colunas.forEach(([rotulo, valor], i) => {
    const x = MARGEM + i * largura
    if (i > 0) papel.traco(x, topo, x, topo + altura)
    const centro = x + largura / 2
    papel.texto(rotulo.toLocaleUpperCase('pt-BR'), centro, topo + 15, 'bold', 7, SUAVE, 'center')
    papel.texto(valor, centro, topo + 30, 'bold', 10.5, TINTA, 'center')
  })
  return topo + altura
}

/** Carimbo verde inclinado (-6°), desenhado num canvas com a Manrope da página. */
function carimbo(papel: Papel, centroX: number, centroY: number, larguraCaixa: number, titulo: string, tamanhoTitulo: number, subtitulo: string) {
  const escala = 4
  const lw = 160
  const lh = 100
  const canvas = document.createElement('canvas')
  canvas.width = lw * escala
  canvas.height = lh * escala
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(escala, escala)
  ctx.translate(lw / 2, lh / 2)
  ctx.rotate((-6 * Math.PI) / 180)
  ctx.strokeStyle = VERDE
  ctx.fillStyle = VERDE
  ctx.lineWidth = 1.8
  const meia = larguraCaixa / 2
  ctx.beginPath()
  ctx.roundRect(-meia, -24, larguraCaixa, 46, 7)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.font = `800 ${tamanhoTitulo}px Manrope, sans-serif`
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tamanhoTitulo * 0.12}px`
  ctx.fillText(titulo, 0, -2)
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px'
  ctx.font = '700 8.5px Manrope, sans-serif'
  ctx.fillText(subtitulo, 0, 12)
  papel.doc.addImage(canvas.toDataURL('image/png'), 'PNG', centroX - lw / 2, centroY - lh / 2, lw, lh)
}

/** Assinatura: local e data, linha, empresa e "dispensa assinatura". */
function assinatura(papel: Papel, base: number, dataTexto: string) {
  const dispensa = 'Documento emitido eletronicamente, dispensa assinatura.'
  const centro = DIREITA - Math.max(110, papel.largura(dispensa, 'regular', 8.5) / 2)
  papel.texto(`${EMPRESA.cidade}, ${dataTexto}`, centro, base - 26, 'regular', 9, SUAVE, 'center')
  papel.traco(centro - 110, base - 12, centro + 110, base - 12, TINTA, 0.8)
  papel.texto(`${EMPRESA.nome} · CNPJ ${EMPRESA.cnpj}`, centro, base + 2, 'bold', 9, TINTA, 'center')
  papel.texto(dispensa, centro, base + 14, 'regular', 8.5, SUAVE, 'center')
}

function rodape(papel: Papel) {
  const y = ALTURA - 40
  papel.traco(MARGEM, y - 14, DIREITA, y - 14)
  papel.texto(`Emitido pelo app HOTNET em ${agora()}`, MARGEM, y, 'regular', 7.5, SUAVE)
  papel.texto(`Dúvidas: ${EMPRESA.telefone}`, DIREITA, y, 'regular', 7.5, SUAVE, 'right')
}

export async function pdfRecibo(d: DadosRecibo): Promise<Blob> {
  const papel = await novoPapel()
  papel.faixaDaMarca()
  let y = await cabecalho(papel, 'Recibo de pagamento', `Nº ${numeroRecibo(d)}`, 'Via do cliente')

  // Declaração com a barra laranja à esquerda.
  const topoDecl = y + 28
  const alturaDecl = papel.paragrafo(
    [
      { t: 'Recebemos de ' },
      { t: d.clienteNome?.toLocaleUpperCase('pt-BR') ?? 'TITULAR DO CONTRATO', negrito: true },
      { t: d.documentoMascarado ? `, ${rotuloDocumento(d.documentoMascarado)} ${d.documentoMascarado}` : '' },
      { t: ', a importância de ' },
      { t: `${formatarReais(d.pagoCentavos)} (${valorPorExtenso(d.pagoCentavos)})`, negrito: true },
      { t: `, referente à mensalidade${d.contratoNumero != null ? ` do contrato nº ${d.contratoNumero}` : ''} com vencimento em ${d.vencimento}, dando plena quitação deste valor.` },
    ],
    MARGEM + 14,
    topoDecl,
    11,
    TINTA,
    4,
  )
  papel.retangulo(MARGEM, topoDecl, 3, alturaDecl, LARANJA)
  y = topoDecl + alturaDecl

  y = quadro(
    papel,
    [
      ['Cobrança', numeroRecibo(d)],
      ['Vencimento', d.vencimento],
      ['Data de crédito', d.dataCredito],
      ['Contrato', d.contratoNumero != null ? `Nº ${d.contratoNumero}` : '—'],
    ],
    y + 22,
  )

  // Demonstrativo.
  const topo = y + 26
  papel.texto('DEMONSTRATIVO', MARGEM, topo, 'extrabold', 8, SUAVE)
  y = topo + 8
  papel.retangulo(MARGEM, y, DIREITA - MARGEM, 18, FAIXA)
  papel.texto('SERVIÇO', MARGEM + 8, y + 12, 'bold', 7.5, SUAVE)
  papel.texto('VALOR', DIREITA - 8, y + 12, 'bold', 7.5, SUAVE, 'right')
  y += 18
  for (const linha of linhasDemonstrativo(d)) {
    papel.texto(descricaoLinha(linha), MARGEM + 8, y + 16, 'regular', 10)
    papel.texto(formatarCentavosComSinal(linha.centavos), DIREITA - 8, y + 16, 'regular', 10, TINTA, 'right')
    y += 24
    papel.traco(MARGEM, y, DIREITA, y)
  }
  const acrescimos = acrescimosCentavos(d)
  y += 18
  papel.texto('Valor do título', MARGEM + 8, y, 'regular', 10, SUAVE)
  papel.texto(formatarReais(acrescimos > 0 ? tituloSemAcrescimosCentavos(d) : d.tituloCentavos), DIREITA - 8, y, 'regular', 10, SUAVE, 'right')
  if (acrescimos > 0) {
    y += 18
    papel.texto('(+) Acréscimos', MARGEM + 8, y, 'regular', 10, SUAVE)
    papel.texto(formatarReais(acrescimos), DIREITA - 8, y, 'regular', 10, SUAVE, 'right')
  }
  y += 22
  papel.texto(acrescimos > 0 ? '(=) Valor pago' : 'Valor pago', MARGEM + 8, y, 'extrabold', 12.5)
  papel.texto(formatarReais(d.pagoCentavos), DIREITA - 8, y, 'extrabold', 12.5, VERMELHO, 'right')

  // Carimbo "PAGO" com a data de crédito e a assinatura.
  const base = Math.min(y + 70, 690)
  carimbo(papel, MARGEM + 55, base - 18, 100, 'PAGO', 15, d.dataCredito)
  const credito = dataBrParaDate(d.dataCredito)
  assinatura(papel, base, credito ? porExtenso(credito) : d.dataCredito)

  rodape(papel)
  return papel.doc.output('blob')
}

export async function pdfQuitacao(d: DadosQuitacao): Promise<Blob> {
  const papel = await novoPapel()
  const doc = papel.doc
  let primeira = true
  const novaPagina = () => {
    if (!primeira) {
      rodape(papel)
      doc.addPage()
    }
    primeira = false
    papel.faixaDaMarca()
  }
  const continuacao = (): number => {
    const y = 40
    papel.texto(EMPRESA.nome, MARGEM, y, 'extrabold', 11)
    papel.texto(`Declaração de quitação ${d.ano} · continuação`, DIREITA, y, 'bold', 8.5, SUAVE, 'right')
    papel.traco(MARGEM, y + 10, DIREITA, y + 10)
    return y + 10
  }
  const colVenc = MARGEM + 150
  const colPag = MARGEM + 290
  const cabecalhoTabela = (topo: number): number => {
    papel.retangulo(MARGEM, topo, DIREITA - MARGEM, 18, FAIXA)
    papel.texto('COBRANÇA', MARGEM + 8, topo + 12, 'bold', 7.5, SUAVE)
    papel.texto('VENCIMENTO', colVenc, topo + 12, 'bold', 7.5, SUAVE)
    papel.texto('PAGAMENTO', colPag, topo + 12, 'bold', 7.5, SUAVE)
    papel.texto('VALOR PAGO', DIREITA - 8, topo + 12, 'bold', 7.5, SUAVE, 'right')
    return topo + 18
  }

  novaPagina()
  let y = await cabecalho(papel, 'Declaração de quitação', `Ano de referência ${d.ano}`, 'Lei nº 12.007/2009')

  const topoDecl = y + 28
  const alturaDecl = papel.paragrafo(
    [
      { t: 'Declaramos, para os fins da Lei nº 12.007/2009, que ' },
      { t: d.clienteNome?.toLocaleUpperCase('pt-BR') ?? 'TITULAR DO CONTRATO', negrito: true },
      { t: d.documentoMascarado ? `, ${rotuloDocumento(d.documentoMascarado)} ${d.documentoMascarado}` : '' },
      { t: `, efetuou o pagamento de todas as cobranças${d.contratoNumero != null ? ` do contrato nº ${d.contratoNumero}` : ''} com vencimento no ano de ` },
      { t: String(d.ano), negrito: true },
      { t: ', no total de ' },
      { t: `${formatarReais(d.totalCentavos)} (${valorPorExtenso(d.totalCentavos)})`, negrito: true },
      { t: ', nada devendo a esta empresa referente a esse período.' },
    ],
    MARGEM + 14,
    topoDecl,
    11,
    TINTA,
    4,
  )
  papel.retangulo(MARGEM, topoDecl, 3, alturaDecl, LARANJA)
  y = topoDecl + alturaDecl

  y = quadro(
    papel,
    [
      ['Ano', String(d.ano)],
      ['Cobranças', String(d.linhas.length)],
      ['Contrato', d.contratoNumero != null ? `Nº ${d.contratoNumero}` : '—'],
      ['Total pago', formatarReais(d.totalCentavos)],
    ],
    y + 20,
  )

  // Tabela das cobranças, com quebra de página.
  const topoTabela = y + 28
  papel.texto('COBRANÇAS QUITADAS NO PERÍODO', MARGEM, topoTabela, 'extrabold', 8, SUAVE)
  y = cabecalhoTabela(topoTabela + 8)
  for (const l of d.linhas) {
    if (y + 18 > LIMITE) {
      novaPagina()
      y = cabecalhoTabela(continuacao() + 16)
    }
    papel.texto(`Nº ${l.numero}`, MARGEM + 8, y + 12.5, 'regular', 9.5)
    papel.texto(l.vencimento, colVenc, y + 12.5, 'regular', 9.5)
    papel.texto(l.pagamento, colPag, y + 12.5, 'regular', 9.5)
    papel.texto(formatarReais(l.pagoCentavos), DIREITA - 8, y + 12.5, 'regular', 9.5, TINTA, 'right')
    y += 18
    papel.traco(MARGEM, y, DIREITA, y)
  }
  if (y + 26 > LIMITE) {
    novaPagina()
    y = continuacao()
  }
  y += 22
  papel.texto('Total pago no ano', MARGEM + 8, y, 'extrabold', 12)
  papel.texto(formatarReais(d.totalCentavos), DIREITA - 8, y, 'extrabold', 12, VERMELHO, 'right')

  // Texto exigido pelo art. 4º da lei.
  const substituicao = [
    {
      t: 'Esta declaração substitui, para a comprovação do cumprimento das obrigações do consumidor, as quitações dos faturamentos mensais dos débitos do ano a que se refere e dos anos anteriores (art. 4º da Lei nº 12.007/2009).',
    },
  ]
  let topoSub = y + 16
  const alturaEstimada = 3 * (9 * 1.366 + 3)
  if (topoSub + alturaEstimada > LIMITE) {
    novaPagina()
    topoSub = 60
  }
  y = topoSub + papel.paragrafo(substituicao, MARGEM, topoSub, 9, SUAVE, 3)

  let base = y + 76
  if (base + 20 > LIMITE) {
    novaPagina()
    base = 60 + 76
  }
  carimbo(papel, MARGEM + 60, base - 18, 110, 'QUITADO', 14, `ANO ${d.ano}`)
  assinatura(papel, base, porExtenso(new Date()))

  rodape(papel)
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
  baixarPdf(blob, nomeArquivo)
  return 'baixado'
}

export function baixarPdf(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
