import type { IconType } from 'react-icons'
import './EstadoVazio.css'

interface Props {
  icone: IconType
  titulo: string
  subtitulo?: string
}

/** Estado vazio com ícone — usado no lugar de um texto solto quando uma
 * lista não tem nada pra mostrar (sem boletos, sem chamados, etc.). */
export default function EstadoVazio({ icone: Icone, titulo, subtitulo }: Props) {
  return (
    <div className="estado-vazio">
      <span className="estado-vazio-icone">
        <Icone size={32} />
      </span>
      <p className="estado-vazio-titulo">{titulo}</p>
      {subtitulo && <p className="estado-vazio-subtitulo">{subtitulo}</p>}
    </div>
  )
}
