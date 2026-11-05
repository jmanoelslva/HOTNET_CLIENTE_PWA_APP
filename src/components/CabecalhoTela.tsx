import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import './CabecalhoTela.css'

interface Props {
  /** Mantidos por compatibilidade com as telas; o título do app Android não tem ícone nem cor. */
  icone?: IconType
  cor?: string
  titulo: string
  subtitulo?: string
  /** Botões à direita do título (ex.: atualizar, filtro). */
  acoes?: ReactNode
}

/**
 * Cabeçalho padrão das telas internas, igual ao CabecalhoTela do app
 * Android (ui/components/PadraoTelas.kt): título grande em negrito e
 * subtítulo em cinza, direto sobre o fundo, sem caixa colorida.
 */
export default function CabecalhoTela({ titulo, subtitulo, acoes }: Props) {
  return (
    <header className="cabecalho-tela">
      <div className="cabecalho-tela-textos">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {acoes}
    </header>
  )
}
