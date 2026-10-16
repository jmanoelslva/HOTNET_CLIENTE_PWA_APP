import { describe, expect, it } from 'vitest'
import { comNumeroDoContrato, vincularContratos, type ConsumoPorContrato } from './consumo'
import type { Contrato } from './contratos'

function consumo(cpePk: number): ConsumoPorContrato {
  return { cpePk, contractPk: null, contractNumber: null, planoNome: 'Plano', dias: [] }
}

function contrato(id: number, numero: number, cpePk: number): Contrato {
  return {
    id,
    numero,
    status: 1,
    diaPagamento: 10,
    dataAtivacao: null,
    valor: '50.00',
    plano: 'Plano 100Mbps',
    itens: [{ nome: 'Plano 100Mbps', valor: '50.00', ehEquipamento: false, cpePk }],
    podeVerDados: true,
    podeVerDocumento: true,
  }
}

describe('vincularContratos', () => {
  it('conexão ganha o número do contrato pelo cpe_pk dos itens, ordenada pelo número', () => {
    const vinculados = vincularContratos(
      [consumo(2164), consumo(3222), consumo(9999)],
      [contrato(2987, 2909, 3222), contrato(2089, 2037, 2164)],
    )
    expect(vinculados.map((c) => c.contractNumber)).toEqual([2037, 2909, null])
    expect(vinculados.map((c) => c.contractPk)).toEqual([2089, 2987, null])
    expect(vinculados.map((c) => c.cpePk)).toEqual([2164, 3222, 9999])
  })
})

describe('comNumeroDoContrato', () => {
  it('com uma conexão só não busca contratos', async () => {
    let chamadas = 0
    const buscar = async () => {
      chamadas++
      return []
    }
    await comNumeroDoContrato([consumo(1)], buscar)
    expect(chamadas).toBe(0)
  })

  it('falha ao buscar contratos mantém o consumo como veio', async () => {
    const original = [consumo(1), consumo(2)]
    const resultado = await comNumeroDoContrato(original, async () => {
      throw new Error('rede')
    })
    expect(resultado).toEqual(original)
  })
})
