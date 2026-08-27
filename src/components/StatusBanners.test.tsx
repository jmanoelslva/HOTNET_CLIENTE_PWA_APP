import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StatusBanners from './StatusBanners'

const updateServiceWorker = vi.fn()
let needRefresh = false

// Módulo virtual do vite-plugin-pwa — não existe fora do build real, então
// o próprio hook precisa ser mockado pra testar o componente isolado.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}))

function ficarOffline() {
  Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
  act(() => window.dispatchEvent(new Event('offline')))
}

function ficarOnline() {
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
  act(() => window.dispatchEvent(new Event('online')))
}

afterEach(() => {
  needRefresh = false
  ficarOnline()
  vi.clearAllMocks()
})

describe('StatusBanners', () => {
  it('não mostra nada quando está online e não há atualização', () => {
    const { container } = render(<StatusBanners />)
    expect(container).toBeEmptyDOMElement()
  })

  it('avisa que está sem conexão quando o navegador fica offline', () => {
    render(<StatusBanners />)
    ficarOffline()
    expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument()
  })

  it('avisa de nova versão e aciona a atualização ao clicar', async () => {
    needRefresh = true
    render(<StatusBanners />)
    expect(screen.getByText('Nova versão disponível')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('prioriza o aviso de offline sobre o de atualização', () => {
    needRefresh = true
    render(<StatusBanners />)
    ficarOffline()
    expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument()
    expect(screen.queryByText('Nova versão disponível')).not.toBeInTheDocument()
  })
})
