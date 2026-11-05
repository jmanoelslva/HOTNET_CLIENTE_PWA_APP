import type { IconType } from 'react-icons'
import DialogoHotnet from './DialogoHotnet'

interface Props {
  aberto: boolean
  titulo: string
  texto: string
  confirmar: string
  cancelar?: string
  icone?: IconType
  onConfirmar: () => void
  onCancelar: () => void
}

/** Confirmação no diálogo padrão do app (principal em cima, Cancelar embaixo). */
export default function FolhaConfirmar({ aberto, titulo, texto, confirmar, cancelar = 'Cancelar', icone, onConfirmar, onCancelar }: Props) {
  return (
    <DialogoHotnet
      aberto={aberto}
      onFechar={onCancelar}
      titulo={titulo}
      texto={texto}
      icone={icone}
      acoes={
        <>
          <button type="button" className="botao-primario" onClick={onConfirmar}>
            {confirmar}
          </button>
          <button type="button" className="botao-contorno" onClick={onCancelar}>
            {cancelar}
          </button>
        </>
      }
    />
  )
}
