import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useFecharComVoltar } from './useFecharComVoltar'

function Tela() {
  const [aberto, setAberto] = useState(false)
  useFecharComVoltar(aberto, () => setAberto(false))
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div>
      <span data-testid="chave">{location.key}</span>
      <button onClick={() => setAberto(true)}>abrir</button>
      <button onClick={() => setAberto(false)}>fechar</button>
      <button onClick={() => navigate(-1)}>voltar do celular</button>
      {aberto && <div role="dialog">janela</div>}
    </div>
  )
}

describe('useFecharComVoltar', () => {
  it('o voltar do celular fecha a janela sem sair da tela', async () => {
    const usuario = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/inicio', '/boletos']} initialIndex={1}>
        <Tela />
      </MemoryRouter>,
    )
    const chaveDaTela = screen.getByTestId('chave').textContent
    await usuario.click(screen.getByText('abrir'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await usuario.click(screen.getByText('voltar do celular'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('chave').textContent).toBe(chaveDaTela)
  })

  it('fechar pelo botão desfaz a entrada do histórico', async () => {
    const usuario = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/inicio', '/boletos']} initialIndex={1}>
        <Tela />
      </MemoryRouter>,
    )
    const chaveDaTela = screen.getByTestId('chave').textContent
    await usuario.click(screen.getByText('abrir'))
    await usuario.click(screen.getByText('fechar'))
    await act(async () => {})
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('chave').textContent).toBe(chaveDaTela)
  })
})
