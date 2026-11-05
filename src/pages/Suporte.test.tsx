import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Suporte from './Suporte'
import { ToastProvider } from '../components/Toast/ToastContext'
import * as apiSuporte from '../api/suporte'
import type { CategoriaDto, TicketDto } from '../api/client'

vi.mock('../auth/useSessao', () => ({
  useSessao: () => ({ cpf: '12345678900' }),
}))

vi.mock('../api/suporte', async () => {
  const real = await vi.importActual<typeof import('../api/suporte')>('../api/suporte')
  return {
    ...real,
    buscarCategorias: vi.fn(),
    buscarChamados: vi.fn(),
    abrirChamado: vi.fn(),
  }
})

vi.mock('../api/contratos', () => ({ buscarContratos: vi.fn().mockResolvedValue([]) }))
vi.mock('../api/situacao', async () => {
  const real = await vi.importActual<typeof import('../api/situacao')>('../api/situacao')
  return { ...real, contarBoletosAtrasados: vi.fn().mockResolvedValue(0) }
})

function chamado(parcial: Partial<TicketDto>): TicketDto {
  return { ticket_pk: 1, ticket_title: 'Chamado', ...parcial }
}

function categoria(parcial: Partial<CategoriaDto>): CategoriaDto {
  return { category_pk: 1, category_name: 'Suporte técnico', ...parcial }
}

function renderizar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Suporte />
      </ToastProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

// Regressão: buscarCategorias() falhando no mount deixava "categorias"
// vazio pro resto da sessão — abrirDialog() avisava "tente novamente" mas
// nada de fato tentava de novo.
describe('Suporte — retry de categorias', () => {
  it('tenta buscar categorias de novo ao abrir "Novo chamado" se a carga inicial falhou', async () => {
    vi.mocked(apiSuporte.buscarChamados).mockResolvedValue({ chamados: [], total: 0 })
    vi.mocked(apiSuporte.buscarCategorias)
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValueOnce([categoria({ category_pk: 7, category_name: 'Financeiro e pagamentos' })])

    renderizar()
    await waitFor(() => expect(apiSuporte.buscarCategorias).toHaveBeenCalledTimes(1))

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo chamado' }))
    await usuario.click(screen.getByRole('button', { name: 'Pular e abrir chamado' }))

    await waitFor(() => expect(apiSuporte.buscarCategorias).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('Financeiro e pagamentos')).toBeInTheDocument())
  })
})

// Regressão: a paginação de chamados não filtra por status no backend —
// a aba só filtra o que já foi carregado. Uma aba vazia (nada carregado
// daquele tipo ainda) não pode mostrar o mesmo aviso definitivo de "não
// existe nenhum" que aparece quando já se sabe que não há mais nada.
describe('Suporte — estado vazio x paginação por aba', () => {
  it('não mostra o aviso definitivo de vazio quando ainda há chamados por carregar', async () => {
    const chamadosFechados = Array.from({ length: 20 }, (_, i) =>
      chamado({ ticket_pk: i, ticket_date_close: '2024-01-01 10:00:00' }),
    )
    vi.mocked(apiSuporte.buscarChamados).mockResolvedValue({ chamados: chamadosFechados, total: 25 })
    vi.mocked(apiSuporte.buscarCategorias).mockResolvedValue([])

    renderizar()

    await waitFor(() => expect(screen.getByRole('button', { name: /Carregar mais/ })).toBeInTheDocument())
    expect(screen.queryByText('Você não tem chamados em aberto')).not.toBeInTheDocument()
    expect(screen.getByText(/entre os já carregados/)).toBeInTheDocument()
  })

  it('mostra o aviso definitivo de vazio quando não há mais chamados a carregar', async () => {
    const chamadosFechados = [chamado({ ticket_pk: 1, ticket_date_close: '2024-01-01 10:00:00' })]
    vi.mocked(apiSuporte.buscarChamados).mockResolvedValue({ chamados: chamadosFechados, total: 1 })
    vi.mocked(apiSuporte.buscarCategorias).mockResolvedValue([])

    renderizar()

    await waitFor(() => expect(screen.getByText('Você não tem chamados em aberto')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Carregar mais/ })).not.toBeInTheDocument()
  })
})
