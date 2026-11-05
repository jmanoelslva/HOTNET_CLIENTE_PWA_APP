import { useNavigate } from 'react-router-dom'
import { IcClose } from './IconesApp'
import './BotaoFechar.css'

/**
 * X de fechar no canto do título, como as telas do app Android que abrem por
 * cima (declaração de quitação, teste de velocidade): volta para onde estava.
 */
export default function BotaoFechar() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="botao-fechar"
      aria-label="Fechar"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/', { viewTransition: true }))}
    >
      <IcClose size={24} />
    </button>
  )
}
