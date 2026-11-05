import { describe, expect, it } from 'vitest'
import type { FaturaDto } from '../api/client'
import { anosQuitacao, montarDadosQuitacao } from './quitacao'

function fatura(pk: number, vencimento: string, pago: string | null, valor = '100.00'): FaturaDto {
  return {
    invoice_pk: pk,
    contract_pk: 7,
    contract_number: 123,
    invoice_date_due: vencimento,
    invoice_amount_document: valor,
    invoice_date_credit: pago ?? undefined,
  }
}

describe('anosQuitacao', () => {
  it('libera só ano encerrado, todo pago e sem pendência em ano anterior', () => {
    const faturas = [
      fatura(1, '2024-05-10', '2024-05-09'),
      fatura(2, '2024-06-10', null),
      fatura(3, '2025-05-10', '2025-05-10'),
      fatura(4, '2026-01-10', '2026-01-10'),
    ]
    const anos = anosQuitacao(faturas, 7, 2026)
    expect(anos.map((a) => a.ano)).toEqual([2026, 2025, 2024])
    expect(anos[0].disponivel).toBe(false) // ano em andamento
    expect(anos[1].disponivel).toBe(false) // 2024 ainda tem cobrança em aberto
    expect(anos[1].anoAnteriorPendente).toBe(2024)
    expect(anos[2].pendentes).toBe(1)
  })

  it('soma o total pago e ordena as cobranças por vencimento', () => {
    const faturas = [fatura(9, '2025-02-10', '2025-02-10', '50.00'), fatura(8, '2025-01-10', '2025-01-11', '49.90')]
    const [ano] = anosQuitacao(faturas, 7, 2026)
    const dados = montarDadosQuitacao(ano, 'Maria', '12345678901')
    expect(dados?.totalCentavos).toBe(9990)
    expect(dados?.linhas.map((l) => l.numero)).toEqual(['00000008', '00000009'])
    expect(dados?.contratoNumero).toBe(123)
  })
})
