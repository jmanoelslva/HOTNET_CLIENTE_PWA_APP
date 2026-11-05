import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { IcSupportAgent } from './IconesApp'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import NovoChamado from './NovoChamado'

const categorias = [
  { category_pk: 9, category_name: 'Vendas e comercial' },
  { category_pk: 3, category_name: 'Suporte técnico' },
]

function renderizar(onEnviar = vi.fn().mockResolvedValue({ ticketPk: 55, protocolo: '2026101500012' }), contratoStatus: number | null = 1) {
  const handlers = { onVerConversa: vi.fn(), onVerBoletos: vi.fn(), onWhatsapp: vi.fn(), onFechar: vi.fn() }
  render(
    <MemoryRouter>
    <NovoChamado
      categorias={categorias}
      contratoStatus={contratoStatus}
      passosFeitos={['Reiniciou o roteador']}
      iconeDaCategoria={() => IcSupportAgent}
      corDaCategoria={() => 'var(--cor-suporte)'}
      onEnviar={onEnviar}
      {...handlers}
    />
    </MemoryRouter>,
  )
  return { onEnviar, ...handlers }
}

describe('NovoChamado', () => {
  it('categorias mais comuns primeiro, com explicação', () => {
    renderizar()
    const botoes = screen.getAllByRole('button').map((b) => b.textContent ?? '')
    expect(botoes.findIndex((t) => t.startsWith('Suporte técnico'))).toBeLessThan(botoes.findIndex((t) => t.startsWith('Vendas')))
    expect(screen.getByText('Sem internet, lentidão, Wi-Fi caindo')).toBeInTheDocument()
  })

  it('envia com a sugestão escolhida e os passos do checklist no fim do texto, e mostra o número', async () => {
    const { onEnviar, onVerConversa } = renderizar()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: /Suporte técnico/ }))
    await usuario.click(screen.getByRole('button', { name: 'Internet lenta' }))
    await usuario.type(screen.getByLabelText('Conte o que acontece'), 'Cai toda noite')
    await usuario.click(screen.getByRole('button', { name: 'Enviar chamado' }))
    expect(onEnviar).toHaveBeenCalledWith(3, 'Internet lenta', 'Cai toda noite\n\nPassos já feitos pelo app:\n- Reiniciou o roteador')
    expect(await screen.findByText('2026101500012')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Ver conversa' }))
    expect(onVerConversa).toHaveBeenCalledWith({ ticketPk: 55, protocolo: '2026101500012' }, 'Internet lenta', 'Suporte técnico')
  })

  it('erro no envio mantém o texto no formulário', async () => {
    renderizar(vi.fn().mockResolvedValue(null))
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: /Suporte técnico/ }))
    await usuario.type(screen.getByLabelText('Assunto'), 'Sem sinal')
    await usuario.type(screen.getByLabelText('Conte o que acontece'), 'Desde ontem')
    await usuario.click(screen.getByRole('button', { name: 'Enviar chamado' }))
    expect(screen.getByLabelText('Conte o que acontece')).toHaveValue('Desde ontem')
  })

  it('todos os contratos cancelados: só WhatsApp', () => {
    renderizar(undefined, 5)
    expect(screen.getByRole('button', { name: 'Falar no WhatsApp' })).toBeInTheDocument()
    expect(screen.queryByText('Sobre o que é o chamado?')).not.toBeInTheDocument()
  })
})
