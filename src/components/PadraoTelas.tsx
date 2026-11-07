import { Fragment, type ReactNode } from 'react'
import { MdKeyboardArrowRight } from 'react-icons/md'
import type { IconType } from 'react-icons'
import './PadraoTelas.css'

/**
 * Peças de tela do app Android (ui/components/PadraoTelas.kt), para as
 * telas do PWA terem a mesma cara: rótulo de grupo em maiúsculas, bloco
 * branco com borda fina e divisória entre as linhas, linha com ícone num
 * círculo e abas em pílula.
 */

export function RotuloGrupo({ children, fim }: { children: ReactNode; fim?: ReactNode }) {
  return (
    <div className="rotulo-grupo">
      <h2>{children}</h2>
      {fim}
    </div>
  )
}

export function BlocoBranco({ children, className = '' }: { children: ReactNode; className?: string }) {
  const itens = (Array.isArray(children) ? children : [children]).filter(Boolean)
  return (
    <div className={`bloco-branco ${className}`}>
      {itens.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <hr className="bloco-branco-divisoria" />}
          {item}
        </Fragment>
      ))}
    </div>
  )
}

interface LinhaItemProps {
  icone: IconType
  titulo: string
  /** Rótulo pequeno acima do título (como LinhaInfo do app Android). */
  rotulo?: string
  detalhe?: ReactNode
  onClick?: () => void
  comSeta?: boolean
  /** "primaria": ícone laranja no círculo laranja-claro; "neutra": grafite no cinza; "perigo": vermelho. */
  tom?: 'primaria' | 'neutra' | 'perigo'
  fim?: ReactNode
}

export function LinhaItem({ icone: Icone, titulo, rotulo, detalhe, onClick, comSeta, tom = 'neutra', fim }: LinhaItemProps) {
  const conteudo = (
    <>
      <span className={`linha-item-icone linha-item-icone-${tom}`} aria-hidden="true">
        <Icone size={18} />
      </span>
      <span className="linha-item-textos">
        {rotulo && <span className="linha-item-rotulo">{rotulo}</span>}
        <span className={`linha-item-titulo ${tom === 'perigo' ? 'linha-item-titulo-perigo' : ''}`}>{titulo}</span>
      </span>
      {detalhe != null && <span className="linha-item-detalhe">{detalhe}</span>}
      {fim}
      {(comSeta ?? onClick != null) && <MdKeyboardArrowRight size={20} className="linha-item-seta" aria-hidden="true" />}
    </>
  )
  if (onClick) {
    return (
      <button type="button" className="linha-item linha-item-clicavel" onClick={onClick}>
        {conteudo}
      </button>
    )
  }
  return <div className="linha-item">{conteudo}</div>
}

export interface OpcaoPilula<T extends string> {
  valor: T
  rotulo: string
  icone?: IconType
  contador?: number
  alerta?: boolean
}

export function AbasPilula<T extends string>({
  opcoes,
  selecionada,
  onSelecionar,
  rotulo,
}: {
  opcoes: OpcaoPilula<T>[]
  selecionada: T
  onSelecionar: (valor: T) => void
  rotulo: string
}) {
  return (
    <div className="abas-pilula" role="tablist" aria-label={rotulo}>
      {opcoes.map((opcao) => {
        const ativa = opcao.valor === selecionada
        return (
          <button
            key={opcao.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            className={`abas-pilula-item ${ativa ? 'ativa' : ''}`}
            onClick={() => onSelecionar(opcao.valor)}
          >
            {opcao.icone && <opcao.icone size={18} aria-hidden="true" />}
            <span className="abas-pilula-rotulo">{opcao.rotulo}</span>
            {opcao.contador != null && opcao.contador > 0 && (
              <span className={`abas-pilula-contador ${opcao.alerta ? 'alerta' : ''}`}>
                {opcao.contador > 99 ? '99+' : opcao.contador}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
