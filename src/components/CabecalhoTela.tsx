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
  /** Fica parado no topo enquanto a tela rola (ver .topo-fixo em index.css). */
  fixo?: boolean
}

/**
 * Cabeçalho padrão das telas internas, igual ao CabecalhoTela do app
 * Android (ui/components/PadraoTelas.kt): título grande em negrito e
 * subtítulo em cinza, direto sobre o fundo, sem caixa colorida.
 */
export default function CabecalhoTela({ titulo, subtitulo, acoes, fixo = false }: Props) {
  return (
    <header className={`cabecalho-tela ${fixo ? 'topo-fixo' : ''}`}>
      <div className="cabecalho-tela-textos">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {acoes}
    </header>
  )
}
