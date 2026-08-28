import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DetalheChamado from './DetalheChamado'
import { ToastProvider } from '../components/Toast/ToastContext'
import * as apiSuporte from '../api/suporte'

vi.mock('../api/suporte', async () => {
  const real = await vi.importActual<typeof import('../api/suporte')>('../api/suporte')
  return {
    ...real,
    buscarOperacoes: vi.fn(),
    enviarMensagem: vi.fn(),
    enviarAnexoChamado: vi.fn(),
  }
})

// jsdom não implementa scrollIntoView — DetalheChamado chama isso a cada
// carga pra rolar o chat pro fim.
Element.prototype.scrollIntoView = vi.fn()

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/suporte/123']}>
      <ToastProvider>
        <Routes>
          <Route path="/suporte/:ticketPk" element={<DetalheChamado />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

function definirVisibilidade(estado: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  vi.clearAllMocks()
  definirVisibilidade('visible')
})

describe('DetalheChamado — acessibilidade do chat', () => {
  it('a lista de mensagens tem role="log" com aria-live pra leitor de tela anunciar novidades', async () => {
    vi.mocked(apiSuporte.buscarOperacoes).mockResolvedValue([])
    renderizar()
    const log = await screen.findByRole('log')
    expect(log).toHaveAttribute('aria-live', 'polite')
  })
})

// Sem isso, o polling de 10s continuava rodando com o app minimizado —
// gasto de dados/bateria à toa, principalmente pesado pra quem já está
// numa conexão ruim (o próprio público de um portal de cliente de ISP).
describe('DetalheChamado — polling pausa em segundo plano', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('para de buscar mensagens com a aba oculta e retoma (buscando na hora) ao voltar', async () => {
    vi.mocked(apiSuporte.buscarOperacoes).mockResolvedValue([])
    renderizar()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(apiSuporte.buscarOperacoes).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(apiSuporte.buscarOperacoes).toHaveBeenCalledTimes(2)

    act(() => definirVisibilidade('hidden'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(apiSuporte.buscarOperacoes).toHaveBeenCalledTimes(2)

    await act(async () => {
      definirVisibilidade('visible')
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(apiSuporte.buscarOperacoes).toHaveBeenCalledTimes(3)
  })
})
