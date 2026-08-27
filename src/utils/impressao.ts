/**
 * Largura/altura aproximadas de uma folha A4 a 96dpi — usadas só como
 * tamanho do iframe invisível onde a página de impressão é carregada
 * pra virar PDF (ver gerarPdf abaixo); o PDF final acompanha o tamanho
 * real do conteúdo renderizado, não fica preso a essas medidas.
 */
const LARGURA_A4_PX = 794
const ALTURA_A4_PX = 1123

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[^\p{L}\p{N}\- ]/gu, '').trim() || 'documento'
}

/**
 * html2canvas às vezes "funciona" sem lançar erro nenhum mas devolve um
 * resultado praticamente em branco (confirmado na prática nesta app —
 * cores via CSS custom properties, `var(--cor-x)`, são uma causa
 * conhecida) — como não tem exceção pra pegar nesse caso, precisa
 * checar o próprio resultado. Amostra uma grade de pontos (não o canvas
 * inteiro, por performance) em vez de vasculhar pixel a pixel.
 */
function canvasPareceEmBranco(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return true

  const passos = 12
  const coresAmostradas = new Set<string>()
  for (let linha = 0; linha < passos; linha++) {
    for (let coluna = 0; coluna < passos; coluna++) {
      const x = Math.min(canvas.width - 1, Math.floor((canvas.width * coluna) / passos))
      const y = Math.min(canvas.height - 1, Math.floor((canvas.height * linha) / passos))
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
      coresAmostradas.add(`${r},${g},${b}`)
    }
  }
  // 1-2 cores na amostra inteira = fundo liso sem texto/borda/logo nenhum.
  return coresAmostradas.size <= 2
}

/**
 * Carrega a página de impressão (mesma origem, via proxy reverso pro
 * Controllr — por isso dá pra ler o conteúdo do iframe sem problema de
 * CORS) num iframe invisível e converte pra um PDF de verdade: tira um
 * "print screen" do conteúdo renderizado (html2canvas) e embute como
 * imagem de página única num PDF do tamanho exato do conteúdo (jsPDF) —
 * mais simples e robusto do que tentar paginar um layout que não foi
 * pensado pra isso. Não preserva texto selecionável (é uma imagem), mas
 * mantém a aparência fiel ao que o Controllr gera.
 *
 * jsPDF/html2canvas são carregados sob demanda (só no clique) — cada um
 * pesa dezenas de KB, não vale meter no bundle de quem nunca usa isso.
 */
async function gerarPdf(url: string, titulo: string): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '0'
  iframe.style.left = '-10000px'
  iframe.style.width = `${LARGURA_A4_PX}px`
  iframe.style.height = `${ALTURA_A4_PX}px`
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.addEventListener('load', () => resolve(), { once: true })
      iframe.addEventListener('error', () => reject(new Error('Falha ao carregar a página de impressão.')), {
        once: true,
      })
      iframe.src = url
    })

    const documento = iframe.contentDocument
    const corpo = documento?.body
    if (!corpo) throw new Error('Não foi possível acessar o conteúdo da página de impressão.')

    // Se a sessão não estiver mais válida quando o iframe carrega (ex:
    // expirou por inatividade durante a navegação), o Controllr manda
    // pra tela de login em vez do boleto — sem isso dar erro nenhum, o
    // html2canvas capturaria o formulário de login (bem menor que a
    // página inteira) igual se fosse a página certa: um PDF "cortado",
    // com cara de foto de uma tela pequena perdida numa folha A4 (já
    // confirmado acontecer na prática). Um campo de senha é o sinal mais
    // simples e confiável de "isto é uma tela de login".
    if (corpo.querySelector('input[type="password"]')) {
      throw new Error('A página de impressão redirecionou pro login (sessão expirada).')
    }

    // O evento "load" do iframe já espera o HTML e as imagens "normais"
    // carregarem, mas dá uma folga extra pra qualquer coisa mais lenta
    // (fonte web, imagem carregada via JS) antes de tirar o "print".
    await new Promise((resolve) => setTimeout(resolve, 300))

    const canvas = await html2canvas(corpo, {
      backgroundColor: '#ffffff',
      useCORS: true,
      scale: 2,
    })

    if (canvasPareceEmBranco(canvas)) {
      throw new Error('A página de impressão não renderizou corretamente (resultado em branco).')
    }

    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, canvas.width, canvas.height)

    const blob = pdf.output('blob')
    return new File([blob], `${sanitizarNomeArquivo(titulo)}.pdf`, { type: 'application/pdf' })
  } finally {
    iframe.remove()
  }
}

/** Baixa um arquivo diretamente — fallback universal pra quem não tem tela nativa de compartilhar arquivo. */
function baixarArquivo(arquivo: File): void {
  const urlObjeto = URL.createObjectURL(arquivo)
  const link = document.createElement('a')
  link.href = urlObjeto
  link.download = arquivo.name
  link.click()
  URL.revokeObjectURL(urlObjeto)
}

/** Último recurso, se a geração do PDF falhar por qualquer motivo: o comportamento de sempre. */
function abrirEImprimirNoNavegador(url: string): void {
  const janela = window.open(url, '_blank')
  if (!janela) return
  janela.addEventListener('load', () => {
    janela.focus()
    janela.print()
  })
}

/**
 * Processa um boleto/contrato num PDF de verdade e abre a tela nativa de
 * compartilhar do sistema com esse arquivo (imprimir, WhatsApp, salvar
 * em Arquivos etc.) — funciona com qualquer destinatário, diferente de
 * compartilhar o link (que exige a sessão ativa de quem abrir).
 *
 * Compartilhamento de ARQUIVO via Web Share API tem suporte mais restrito
 * que compartilhar link (falta no Firefox em geral, por exemplo) — sem
 * suporte, baixa o PDF já gerado direto (funciona em qualquer navegador).
 * Se a geração do PDF em si falhar — rede, DOM inesperado, ou o
 * html2canvas "funcionar" mas devolver algo em branco (ver
 * canvasPareceEmBranco acima; já confirmado acontecer na prática) — cai
 * pro comportamento original: abre a página numa aba e chama
 * window.print(), que sempre reflete o que o navegador realmente
 * consegue renderizar.
 */
export async function abrirEImprimir(url: string, titulo: string): Promise<void> {
  const urlAbsoluta = new URL(url, window.location.origin).href

  let arquivo: File | null = null
  try {
    arquivo = await gerarPdf(urlAbsoluta, titulo)
  } catch {
    arquivo = null
  }

  if (!arquivo) {
    abrirEImprimirNoNavegador(urlAbsoluta)
    return
  }

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: titulo })
      return
    } catch (erro) {
      // AbortError = o próprio cliente cancelou a tela de compartilhar —
      // não é uma falha, e ele já tinha a chance de baixar por lá.
      if (erro instanceof Error && erro.name === 'AbortError') return
    }
  }

  baixarArquivo(arquivo)
}
