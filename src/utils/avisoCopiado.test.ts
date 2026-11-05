import { afterEach, describe, expect, it, vi } from 'vitest'
import { avisoCopiadoAtual, mostrarAvisoCopiado } from './avisoCopiado'

describe('mostrarAvisoCopiado', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra o selo e some depois de 1,5 s', () => {
    vi.useFakeTimers()
    mostrarAvisoCopiado('Código Pix copiado', 'Cole no app do seu banco')
    expect(avisoCopiadoAtual()).toMatchObject({ titulo: 'Código Pix copiado', visivel: true })
    vi.advanceTimersByTime(1500)
    expect(avisoCopiadoAtual()?.visivel).toBe(false)
  })

  it('cópia nova troca o texto e reinicia o tempo', () => {
    vi.useFakeTimers()
    mostrarAvisoCopiado('Código Pix copiado')
    vi.advanceTimersByTime(1000)
    mostrarAvisoCopiado('Código de barras copiado')
    vi.advanceTimersByTime(1000)
    expect(avisoCopiadoAtual()).toMatchObject({ titulo: 'Código de barras copiado', visivel: true })
  })
})
