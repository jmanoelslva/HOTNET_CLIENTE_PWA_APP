import { MdExitToApp } from 'react-icons/md'
import DialogoHotnet from './DialogoHotnet'

interface Props {
  aberto: boolean
  onCancelar: () => void
  onConfirmar: () => void
}

/** "Sair da conta?" — mesmo diálogo do app Android (ContaScreen.kt). */
export default function ModalConfirmarLogout({ aberto, onCancelar, onConfirmar }: Props) {
  return (
    <DialogoHotnet
      aberto={aberto}
      onFechar={onCancelar}
      titulo="Sair da conta?"
      texto="Sua conta continua salva neste celular para entrar de novo."
      icone={MdExitToApp}
      tom="perigo"
      acoes={
        <>
          <button type="button" className="botao-perigo" onClick={onConfirmar}>
            Sair da conta
          </button>
          <button type="button" className="botao-contorno" onClick={onCancelar}>
            Continuar no app
          </button>
        </>
      }
    />
  )
}
