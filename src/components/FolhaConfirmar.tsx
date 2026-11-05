import './ModalConfirmarLogout.css'

interface Props {
  aberto: boolean
  titulo: string
  texto: string
  confirmar: string
  cancelar?: string
  onConfirmar: () => void
  onCancelar: () => void
}

/** Folha de confirmação genérica (mesmo visual da de "Sair da conta"). */
export default function FolhaConfirmar({ aberto, titulo, texto, confirmar, cancelar = 'Cancelar', onConfirmar, onCancelar }: Props) {
  if (!aberto) return null
  return (
    <div className="modal-confirmar-logout-fundo" onClick={onCancelar}>
      <div className="modal-confirmar-logout" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <p>{texto}</p>
        <div className="modal-confirmar-logout-acoes">
          <button type="button" onClick={onCancelar}>
            {cancelar}
          </button>
          <button type="button" className="modal-confirmar-logout-sair" onClick={onConfirmar}>
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
