/**
 * Abre uma URL de impressão (boleto/contrato em PDF, servida via /api —
 * mesma origem, então dá pra interagir com a nova janela) numa aba nova
 * e já dispara a tela de impressão nativa do navegador assim que a
 * página carregar — no Android/Chrome isso abre o diálogo de impressão
 * do sistema, que já tem "Salvar como PDF" como opção, sem precisar de
 * nenhum processamento extra no backend.
 */
export function abrirEImprimir(url: string): void {
  const janela = window.open(url, '_blank')
  if (!janela) return
  janela.addEventListener('load', () => {
    janela.focus()
    janela.print()
  })
}
