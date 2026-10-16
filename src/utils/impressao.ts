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
export function abrirEImprimir(url: string, aoFalhar?: () => void): void {
  const janela = window.open(url, '_blank')
  if (!janela) {
    // Aba bloqueada pelo navegador: antes nada acontecia e o cliente ficava sem resposta.
    aoFalhar?.()
    return
  }
  janela.addEventListener(
    'load',
    () => {
      // Sessão vencida ou erro do servidor carregam um JSON ou outra página: antes ia pra
      // impressão como se fosse o boleto. once: true — imprime uma vez só.
      if (!paginaDeImpressaoValida(janela, url)) {
        janela.close()
        aoFalhar?.()
        return
      }
      janela.focus()
      janela.print()
    },
    { once: true },
  )
}

/** A aba ainda está no endereço pedido e não mostra uma resposta JSON (erro/sessão expirada). */
export function paginaDeImpressaoValida(janela: Window, urlPedida: string): boolean {
  try {
    const esperado = new URL(urlPedida, window.location.origin).pathname
    if (janela.location.pathname !== esperado) return false
    const documento = janela.document
    if (documento.contentType?.includes('json')) return false
    const texto = documento.body?.textContent?.trim() ?? ''
    return !(texto.startsWith('{') && texto.includes('"success"'))
  } catch {
    // Sem acesso ao conteúdo (não deveria acontecer: mesma origem via /api): não bloqueia.
    return true
  }
}
