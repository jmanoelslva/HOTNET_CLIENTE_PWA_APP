import { useState } from 'react'
import TecladoPin from './TecladoPin'
import { conferirPin, removerPin } from '../utils/pinApp'
import logoApp from '../assets/logo-app.png'
import './BloqueioPin.css'

interface Props {
  documento: string
  onDesbloquear: () => void
  onSair: () => void
}

/** Tela de bloqueio ao abrir o app (ou depois de 5 min fora) quando há PIN. */
export default function BloqueioPin({ documento, onDesbloquear, onSair }: Props) {
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function conferir(valor: string) {
    const { ok, restantes } = await conferirPin(documento, valor)
    if (ok) {
      onDesbloquear()
      return
    }
    setPin('')
    if (restantes === 0) {
      // Muitas tentativas: tira o PIN e pede o login de novo (como no app).
      removerPin(documento)
      onSair()
      return
    }
    setErro(`PIN incorreto. ${restantes} ${restantes === 1 ? 'tentativa restante' : 'tentativas restantes'}.`)
  }

  return (
    <div className="bloqueio-pin" role="dialog" aria-modal="true" aria-labelledby="bloqueio-pin-titulo">
      <span className="bloqueio-pin-logo">
        <img src={logoApp} alt="" />
      </span>
      <h1 id="bloqueio-pin-titulo">Digite seu PIN</h1>
      <TecladoPin
        valor={pin}
        onMudar={(v) => {
          setPin(v)
          if (v.length > 0) setErro(null)
        }}
        onCompleto={conferir}
        erro={erro}
      />
      <button
        type="button"
        className="bloqueio-pin-esqueci"
        onClick={() => {
          removerPin(documento)
          onSair()
        }}
      >
        Esqueci o PIN — entrar com CPF e senha
      </button>
    </div>
  )
}
