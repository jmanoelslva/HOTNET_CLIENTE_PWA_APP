import type { ComponentType } from 'react'
import './EstadoVazio.css'

interface Props {
  icone: ComponentType<{ size?: number }>
  titulo: string
  subtitulo?: string
  /** 'sucesso' = círculo verde (EtiquetaPago do app), para "Tudo em dia" e afins. */
  tom?: 'neutro' | 'sucesso'
  acao?: { rotulo: string; onClick: () => void }
}

/** Estado vazio com ícone, como o EstadoVazio do app Android: círculo de 72, título,
 * texto e, se houver, um botão de contorno com a próxima ação. */
export default function EstadoVazio({ icone: Icone, titulo, subtitulo, tom = 'neutro', acao }: Props) {
  return (
    <div className="estado-vazio">
      <span className={`estado-vazio-icone ${tom === 'sucesso' ? 'sucesso' : ''}`}>
        <Icone size={34} />
      </span>
      <p className="estado-vazio-titulo">{titulo}</p>
      {subtitulo && <p className="estado-vazio-subtitulo">{subtitulo}</p>}
      {acao && (
        <button type="button" className="botao-contorno estado-vazio-acao" onClick={acao.onClick}>
          {acao.rotulo}
        </button>
      )}
    </div>
  )
}
