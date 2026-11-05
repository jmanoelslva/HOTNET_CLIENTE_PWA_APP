import { useEffect, useLayoutEffect, useState } from 'react'
import { marcarTourVisto } from '../utils/tour'
import './TourInicio.css'

/**
 * Guia da Início na primeira vez, como o TourInicio do app Android: destaca
 * cada parte da tela com um recorte e explica em um cartão. O passo do sino
 * fica de fora — o portal ainda não tem notificações.
 */

const PASSOS = [
  {
    seletor: '.home-faixa, .home-faixa-problema',
    titulo: 'Sua internet num relance',
    texto: 'Aqui aparece a situação da sua internet. Se houver algum problema, o próprio aviso mostra o que fazer.',
  },
  {
    seletor: '.bottom-nav-pagar-botao',
    titulo: 'Pagar em um toque',
    texto: 'O botão do meio abre direto os boletos em aberto, com Pix e QR Code.',
  },
  {
    seletor: '.home-atalhos',
    titulo: 'Atalhos',
    texto: 'Teste de velocidade, consumo, recibos, novo chamado e dúvidas a um toque.',
  },
]

interface Retangulo {
  top: number
  left: number
  width: number
  height: number
}

export default function TourInicio({ onFim }: { onFim: () => void }) {
  const [passo, setPasso] = useState(0)
  const [alvo, setAlvo] = useState<Retangulo | null>(null)
  const atual = PASSOS[passo]

  useLayoutEffect(() => {
    function medir() {
      const el = document.querySelector(atual.seletor)
      if (!el) {
        setAlvo(null)
        return
      }
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      setAlvo({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 })
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [atual.seletor])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') concluir()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  })

  function concluir() {
    marcarTourVisto()
    onFim()
  }

  const ultimo = passo === PASSOS.length - 1
  // Cartão abaixo do destaque, ou acima quando o destaque está na metade de baixo.
  const embaixo = !alvo || alvo.top + alvo.height / 2 < window.innerHeight / 2

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-titulo">
      {alvo ? (
        <div className="tour-recorte" style={{ top: alvo.top, left: alvo.left, width: alvo.width, height: alvo.height }} />
      ) : (
        <div className="tour-fundo" />
      )}
      <div
        className="tour-cartao"
        style={
          alvo
            ? embaixo
              ? { top: Math.min(alvo.top + alvo.height + 12, window.innerHeight - 200) }
              : { bottom: Math.max(window.innerHeight - alvo.top + 12, 16) }
            : { top: '35%' }
        }
      >
        <span className="tour-passo">
          {passo + 1} de {PASSOS.length}
        </span>
        <h2 id="tour-titulo">{atual.titulo}</h2>
        <p>{atual.texto}</p>
        <div className="tour-acoes">
          {!ultimo && (
            <button type="button" className="tour-pular" onClick={concluir}>
              Pular
            </button>
          )}
          <button type="button" className="botao-primario" onClick={() => (ultimo ? concluir() : setPasso(passo + 1))}>
            {ultimo ? 'Entendi' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
