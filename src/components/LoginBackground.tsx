import { useEffect, useRef } from 'react'
import './LoginBackground.css'

interface Ponto {
  x: number
  y: number
  vx: number
  vy: number
}

const QUANTIDADE_PONTOS = 56
const RAIO_PONTO = 2
const DISTANCIA_CONEXAO = 150
const VELOCIDADE_MAXIMA = 0.12
const ALPHA_MAXIMO_LINHA = 200 / 255
const ALPHA_PONTO = 150 / 255
const COR_RGB = '242, 143, 59' // #F28F3B — login_orange_gradient_start

/**
 * Fundo decorativo animado da tela de login: pontos que flutuam devagar e
 * se ligam por linhas quando ficam perto um do outro — mesma "teia de
 * conexões" (LoginNetworkBackgroundView) do app Android, portada pra
 * canvas. Ao contrário da onda do rodapé (ver LoginBackground.css), este
 * elemento é intencionalmente animado, como no app original.
 */
export default function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let pontos: Ponto[] = []
    let frameId: number

    function gerarPontos(largura: number, altura: number) {
      pontos = Array.from({ length: QUANTIDADE_PONTOS }, () => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        vx: (Math.random() * 2 - 1) * VELOCIDADE_MAXIMA,
        vy: (Math.random() * 2 - 1) * VELOCIDADE_MAXIMA,
      }))
    }

    function redimensionar() {
      if (!canvas) return
      const largura = window.innerWidth
      const altura = window.innerHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = largura * dpr
      canvas.height = altura * dpr
      canvas.style.width = `${largura}px`
      canvas.style.height = `${altura}px`
      ctx?.scale(dpr, dpr)
      gerarPontos(largura, altura)
    }

    function desenhar() {
      if (!ctx || !canvas) return
      const largura = window.innerWidth
      const altura = window.innerHeight

      for (const ponto of pontos) {
        ponto.x += ponto.vx
        ponto.y += ponto.vy
        if (ponto.x < 0) ponto.x = largura
        if (ponto.x > largura) ponto.x = 0
        if (ponto.y < 0) ponto.y = altura
        if (ponto.y > altura) ponto.y = 0
      }

      ctx.clearRect(0, 0, largura, altura)

      for (let i = 0; i < pontos.length; i++) {
        for (let j = i + 1; j < pontos.length; j++) {
          const a = pontos[i]
          const b = pontos[j]
          const distancia = Math.hypot(a.x - b.x, a.y - b.y)
          if (distancia < DISTANCIA_CONEXAO) {
            const proporcao = 1 - distancia / DISTANCIA_CONEXAO
            ctx.strokeStyle = `rgba(${COR_RGB}, ${(ALPHA_MAXIMO_LINHA * proporcao).toFixed(3)})`
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      ctx.fillStyle = `rgba(${COR_RGB}, ${ALPHA_PONTO})`
      for (const ponto of pontos) {
        ctx.beginPath()
        ctx.arc(ponto.x, ponto.y, RAIO_PONTO, 0, Math.PI * 2)
        ctx.fill()
      }

      frameId = requestAnimationFrame(desenhar)
    }

    redimensionar()
    window.addEventListener('resize', redimensionar)
    frameId = requestAnimationFrame(desenhar)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', redimensionar)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="login-background-canvas" aria-hidden="true" />

      {/*
        Decoração do rodapé (curva vermelha atrás + laranja na frente) —
        intencionalmente ESTÁTICA, sem animação (o usuário já pediu pra
        manter assim, ver LoginBottomDecorationView.kt do app Android).
      */}
      <svg
        className="login-background-onda"
        viewBox="0 0 400 150"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ondaVermelha" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e57567" />
            <stop offset="100%" stopColor="#d94a38" />
          </linearGradient>
          <linearGradient id="ondaLaranja" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6b370" />
            <stop offset="100%" stopColor="#f28f3b" />
          </linearGradient>
          <filter id="sombraOnda" x="-20%" y="-60%" width="140%" height="200%">
            <feDropShadow dx="0" dy="-3" stdDeviation="5" floodColor="#f28f3b" floodOpacity="0.35" />
          </filter>
        </defs>

        <path
          d="M0,60 C70,92 160,102 260,70 C310,54 350,44 400,38 L400,150 L0,150 Z"
          fill="url(#ondaVermelha)"
          opacity="0.88"
        />
        <path
          d="M0,82 C90,112 190,116 290,74 C330,58 370,48 400,44 L400,150 L0,150 Z"
          fill="url(#ondaLaranja)"
          filter="url(#sombraOnda)"
        />
      </svg>
    </>
  )
}
