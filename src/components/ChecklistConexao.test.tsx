import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ChecklistConexao from './ChecklistConexao'

function renderizar(props: Partial<Parameters<typeof ChecklistConexao>[0]> = {}) {
  const handlers = {
    onVerBoletos: vi.fn(),
    onFechar: vi.fn(),
    onContinuar: vi.fn(),
    onWhatsapp: vi.fn(),
  }
  render(
    <MemoryRouter>
      <ChecklistConexao boletosAtrasados={0} contratoStatus={1} {...handlers} {...props} />
    </MemoryRouter>,
  )
  return handlers
}

describe('ChecklistConexao', () => {
  it('passos marcados vão junto ao abrir o chamado', async () => {
    const { onContinuar } = renderizar()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByLabelText('Reinicie o roteador'))
    await usuario.click(screen.getByLabelText('Confira os cabos'))
    await usuario.click(screen.getByRole('button', { name: 'Pular e abrir chamado' }))
    expect(onContinuar).toHaveBeenCalledWith(['Reiniciou o roteador', 'Conferiu os cabos'])
  })

  it('com todos os passos feitos pergunta se a internet voltou', async () => {
    const { onFechar, onContinuar } = renderizar()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByLabelText('Reinicie o roteador'))
    await usuario.click(screen.getByLabelText('Espere as luzes acenderem'))
    await usuario.click(screen.getByLabelText('Confira os cabos'))
    expect(screen.getByText('A internet voltou?')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Sim, voltou' }))
    expect(onFechar).toHaveBeenCalled()
    expect(onContinuar).not.toHaveBeenCalled()
  })

  it('conta bloqueada: sem passos do roteador, leva aos boletos', async () => {
    const { onVerBoletos } = renderizar({ contratoStatus: 4, boletosAtrasados: 2 })
    expect(screen.queryByLabelText('Reinicie o roteador')).not.toBeInTheDocument()
    expect(screen.getByText(/Identificamos 2 boletos em aberto/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver boletos' }))
    expect(onVerBoletos).toHaveBeenCalled()
  })

  it('contrato cancelado: só WhatsApp', () => {
    renderizar({ contratoStatus: 5 })
    expect(screen.getByRole('button', { name: 'Falar no WhatsApp' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /abrir chamado/ })).not.toBeInTheDocument()
  })
})
