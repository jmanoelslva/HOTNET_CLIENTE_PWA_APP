/**
 * Abre uma URL de impressão (boleto/contrato em PDF, servida via /api —
 * mesma origem, então dá pra interagir com a nova janela) numa aba nova e
 * já dispara a tela de impressão nativa do navegador assim que a página
 * carregar. O próprio navegador converte HTML/CSS num PDF vetorial de
 * verdade (texto selecionável, arquivo pequeno) quando o cliente escolhe
 * "Salvar como PDF" — no Android/Chrome isso já vem como opção pronta no
 * diálogo de impressão do sistema; no iOS Safari, a própria tela de
 * pré-visualização de impressão tem um botão de compartilhar nativo
 * (imprimir, enviar, salvar em Arquivos etc.), sem precisar de nada extra
 * daqui.
 *
 * Já tentamos gerar o PDF no próprio navegador (html2canvas + jsPDF) pra
 * poder abrir a tela de compartilhar direto — mas isso sempre produz uma
 * IMAGEM dentro de um PDF (um "print screen" da página), nunca um PDF de
 * verdade com texto real, além de ter se mostrado frágil (SVG, cores via
 * CSS custom properties, sessão expirada no meio do carregamento). Não
 * compensa o ganho de UX perder a qualidade do PDF em si.
 */
export function abrirEImprimir(url: string): void {
  const janela = window.open(url, '_blank')
  if (!janela) return
  janela.addEventListener('load', () => {
    janela.focus()
    janela.print()
  })
}
