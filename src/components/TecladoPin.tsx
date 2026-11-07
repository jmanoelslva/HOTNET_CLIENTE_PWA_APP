import './TecladoPin.css'
import { MdBackspace } from 'react-icons/md'

interface Props {
  valor: string
  onMudar: (valor: string) => void
  /** Chamado quando o 4º dígito entra. */
  onCompleto?: (valor: string) => void
  erro?: string | null
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar']

/** Quatro bolinhas e teclado numérico grande, como o PIN do app Android. */
export default function TecladoPin({ valor, onMudar, onCompleto, erro }: Props) {
  function tocar(tecla: string) {
    if (tecla === 'apagar') {
      onMudar(valor.slice(0, -1))
      return
    }
    if (valor.length >= 4) return
    const novo = valor + tecla
    onMudar(novo)
    if (novo.length === 4) onCompleto?.(novo)
  }

  return (
    <div className="teclado-pin">
      <div className={`teclado-pin-bolinhas ${erro ? 'erro' : ''}`} aria-label={`${valor.length} de 4 dígitos`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < valor.length ? 'cheia' : ''} />
        ))}
      </div>
      <p className="teclado-pin-erro" role="alert">
        {erro ?? ''}
      </p>
      <div className="teclado-pin-teclas">
        {TECLAS.map((tecla, i) =>
          tecla === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className={tecla === 'apagar' ? 'apagar' : ''}
              onClick={() => tocar(tecla)}
              aria-label={tecla === 'apagar' ? 'Apagar' : tecla}
            >
              {tecla === 'apagar' ? <MdBackspace size={24} /> : tecla}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
