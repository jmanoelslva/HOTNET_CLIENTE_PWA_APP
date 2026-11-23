import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listarChamados } from './client'
import { buscarChamadoPorPk } from './suporte'

vi.mock('./client', async (original) => ({ ...(await original<typeof import('./client')>()), listarChamados: vi.fn() }))

const listar = vi.mocked(listarChamados)

function pagina(pks: number[], total: number) {
  return { success: true, total, results: pks.map((ticket_pk) => ({ ticket_pk })) }
}

describe('buscarChamadoPorPk', () => {
  beforeEach(() => listar.mockReset())

  it('acha o chamado na segunda página', async () => {
    listar.mockResolvedValueOnce(pagina([1, 2], 4)).mockResolvedValueOnce(pagina([3, 4], 4))
    expect(await buscarChamadoPorPk(3, 2)).toEqual({ ticket_pk: 3 })
    expect(listar).toHaveBeenNthCalledWith(2, 2, 2)
  })

  it('para no fim da lista e devolve null', async () => {
    listar.mockResolvedValueOnce(pagina([1, 2], 2))
    expect(await buscarChamadoPorPk(9, 2)).toBeNull()
    expect(listar).toHaveBeenCalledTimes(1)
  })

  it('respeita o máximo de páginas', async () => {
    listar.mockResolvedValue(pagina([1, 2], 100))
    expect(await buscarChamadoPorPk(9, 2, 3)).toBeNull()
    expect(listar).toHaveBeenCalledTimes(3)
  })
})
