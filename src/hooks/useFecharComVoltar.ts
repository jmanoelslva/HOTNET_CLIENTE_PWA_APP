import { useEffect, useId, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Como no Android: com uma janela aberta, o voltar do celular fecha a
 * janela (em vez de trocar de tela por baixo dela). Ao abrir, empilha uma
 * entrada no histórico; o voltar a tira e fecha. Fechou pelo botão: desfaz
 * a entrada para não sobrar um "voltar" vazio.
 */
export function useFecharComVoltar(aberto: boolean, onFechar: () => void): void {
  const location = useLocation()
  const navigate = useNavigate()
  const id = useId()
  // empilhou: pedimos a entrada; naPilhaJaVista: ela já apareceu no histórico.
  const empilhou = useRef(false)
  const naPilhaJaVista = useRef(false)
  const fechar = useRef(onFechar)
  const caminho = useRef(location.pathname)
  useEffect(() => {
    fechar.current = onFechar
    caminho.current = location.pathname
  })

  const naPilha = (location.state as { dialogo?: string } | null)?.dialogo === id

  useEffect(() => {
    if (aberto && !empilhou.current) {
      empilhou.current = true
      naPilhaJaVista.current = false
      navigate(
        { pathname: location.pathname, search: location.search },
        { state: { ...((location.state as object | null) ?? {}), dialogo: id } },
      )
    } else if (!aberto && empilhou.current) {
      empilhou.current = false
      if (naPilha) navigate(-1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  useEffect(() => {
    if (naPilha) {
      naPilhaJaVista.current = true
      return
    }
    // Voltar do celular: a entrada que já estava na pilha saiu.
    if (aberto && empilhou.current && naPilhaJaVista.current) {
      empilhou.current = false
      naPilhaJaVista.current = false
      fechar.current()
    }
  }, [naPilha, aberto])

  // Janela tirada da tela ainda aberta: desfaz a entrada, mas só se seguimos
  // na mesma tela (se a janela levou para outra tela, não volta).
  useEffect(
    () => () => {
      const estado = window.history.state as { usr?: { dialogo?: string } } | null
      if (empilhou.current && window.location.pathname === caminho.current && estado?.usr?.dialogo === id) {
        empilhou.current = false
        navigate(-1)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
}
