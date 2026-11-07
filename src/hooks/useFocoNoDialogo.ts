import { useEffect, type RefObject } from 'react'
import { focaveisDentro } from '../utils/acessibilidade'

/**
 * Janela por cima (role="dialog"): ao abrir, o leitor de tela vai para
 * dentro dela e anuncia o título; o Tab não escapa para a tela de trás; ao
 * fechar, o foco volta para o botão que abriu — como o Dialog do Android.
 */
export function useFocoNoDialogo(ref: RefObject<HTMLElement | null>, aberto = true) {
  useEffect(() => {
    const dialogo = ref.current
    if (!aberto || !dialogo) return
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialogo.hasAttribute('tabindex')) dialogo.setAttribute('tabindex', '-1')
    dialogo.focus({ preventScroll: true })

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Tab' || !dialogo) return
      const itens = focaveisDentro(dialogo)
      if (itens.length === 0) {
        evento.preventDefault()
        return
      }
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (evento.shiftKey && (document.activeElement === primeiro || document.activeElement === dialogo)) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      if (antes?.isConnected) antes.focus({ preventScroll: true })
    }
  }, [ref, aberto])
}
