import { useEffect, useId, useRef, type ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { useFecharComVoltar } from '../hooks/useFecharComVoltar'
import { useFocoNoDialogo } from '../hooks/useFocoNoDialogo'
import './DialogoHotnet.css'

interface Props {
  aberto: boolean
  onFechar: () => void
  titulo: string
  texto?: ReactNode
  icone?: IconType
  /** Cor do círculo do ícone: laranja (padrão), vermelho (perigo) ou verde. */
  tom?: 'primaria' | 'perigo' | 'sucesso'
  children?: ReactNode
  /** Botões, um embaixo do outro, o principal em cima. */
  acoes?: ReactNode
}

/**
 * Diálogo padrão do app Android (ui/components/HotnetDialog.kt): centralizado,
 * cantos de 28, ícone num círculo, título forte, texto e botões empilhados.
 * O app não tem folhas que sobem de baixo; o voltar do celular fecha.
 */
export default function DialogoHotnet({ aberto, onFechar, titulo, texto, icone: Icone, tom = 'primaria', children, acoes }: Props) {
  useFecharComVoltar(aberto, onFechar)
  const ref = useRef<HTMLDivElement>(null)
  useFocoNoDialogo(ref, aberto)
  const idTexto = useId()
  // Mesmo diálogo trocando de conteúdo (ex.: ajuda do login): o leitor lê o título novo.
  useEffect(() => {
    if (aberto) ref.current?.focus({ preventScroll: true })
  }, [titulo, aberto])
  if (!aberto) return null
  return (
    <div className="dialogo-fundo" onClick={onFechar}>
      <div
        ref={ref}
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        aria-describedby={texto ? idTexto : undefined}
        onClick={(e) => e.stopPropagation()}>
        {Icone && (
          <span className={`dialogo-icone ${tom}`} aria-hidden="true">
            <Icone size={26} />
          </span>
        )}
        <h2 className="dialogo-titulo">{titulo}</h2>
        {texto && (
          <p className="dialogo-texto" id={idTexto}>
            {texto}
          </p>
        )}
        {children}
        {acoes && <div className="dialogo-acoes">{acoes}</div>}
      </div>
    </div>
  )
}
