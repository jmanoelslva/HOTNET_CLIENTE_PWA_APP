/**
 * Abre a impressão/PDF de um boleto ou contrato — a URL é servida via
 * /api (mesma origem, atrás do proxy reverso pro Controllr).
 *
 * Com suporte a Web Share API (Android Chrome, iOS Safari — a maioria
 * dos navegadores mobile), compartilha o link direto: abre a mesma tela
 * nativa de "imprimir/enviar/salvar" do sistema, em vez do diálogo de
 * impressão do próprio navegador. Como é o LINK (não um PDF já gerado
 * localmente), a sessão (cookie) só vale nesta aba — enviar o link pra
 * outra pessoa ou outro aparelho não funciona, ela cairia no login.
 *
 * Sem suporte a compartilhamento (a maioria dos navegadores desktop),
 * cai pro comportamento anterior: abre numa aba nova e já dispara
 * window.print() — que já tem "Salvar como PDF" como opção nativa.
 */
export async function abrirEImprimir(url: string, titulo: string): Promise<void> {
  const urlAbsoluta = new URL(url, window.location.origin).href

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ url: urlAbsoluta, title: titulo })
      return
    } catch (erro) {
      // AbortError = o próprio cliente cancelou o compartilhamento (ex:
      // fechou a tela sem escolher nada) — não é uma falha, não deve
      // cair no fallback abaixo abrindo uma aba extra por cima.
      if (erro instanceof Error && erro.name === 'AbortError') return
    }
  }

  const janela = window.open(urlAbsoluta, '_blank')
  if (!janela) return
  janela.addEventListener('load', () => {
    janela.focus()
    janela.print()
  })
}
