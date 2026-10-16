import { describe, expect, it } from 'vitest'
import { situacaoDosContratos } from './situacao'
import type { Contrato } from './contratos'

function contrato(status: number | null): Contrato {
  return { id: 1, numero: 1, status, diaPagamento: null, dataAtivacao: null, valor: null, plano: null, itens: [], podeVerDados: true, podeVerDocumento: true }
}

describe('situacaoDosContratos', () => {
  it('todos cancelados = 5', () => {
    expect(situacaoDosContratos([contrato(5), contrato(5)])).toBe(5)
  })
  it('um status só entre 1 e 4 vale', () => {
    expect(situacaoDosContratos([contrato(4)])).toBe(4)
    expect(situacaoDosContratos([contrato(1), contrato(1)])).toBe(1)
  })
  it('status diferentes, desconhecido ou nenhum contrato = null', () => {
    expect(situacaoDosContratos([contrato(1), contrato(4)])).toBeNull()
    expect(situacaoDosContratos([contrato(null)])).toBeNull()
    expect(situacaoDosContratos([])).toBeNull()
  })
})
