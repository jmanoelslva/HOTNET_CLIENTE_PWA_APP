import { describe, expect, it } from 'vitest'
import type { FaturaDto } from '../api/client'
import { encargosDetalhados, textoCompartilharFatura, textoPrazo } from './faturas'

const base: FaturaDto = { invoice_pk: 1, invoice_date_due: '2026-11-10', invoice_amount_document: '100.00' }
const hoje = new Date(2026, 10, 6) // sex, 06/11/2026

describe('textoPrazo', () => {
  it('conta os dias até o vencimento, como no app', () => {
    expect(textoPrazo(base, hoje)).toBe('Vence em 4 dias · ter, 10/11')
    expect(textoPrazo({ ...base, invoice_date_due: '2026-11-07' }, hoje)).toBe('Vence amanhã · sáb, 07/11')
    expect(textoPrazo({ ...base, invoice_date_due: '2026-11-06' }, hoje)).toBe('Vence hoje · sex, 06/11')
    expect(textoPrazo({ ...base, invoice_date_due: '2026-11-03', days_late: '3' }, hoje)).toBe('Atrasado há 3 dias · venceu 03/11')
  })
})

describe('encargosDetalhados', () => {
  it('soma multa fixa e juros ao dia sobre o original', () => {
    const e = encargosDetalhados({ ...base, days_late: '10', invoice_rate_fine: '2', invoice_rate_interest: '0.033' })
    expect(e?.multa).toBeCloseTo(2)
    expect(e?.juros).toBeCloseTo(0.33)
    expect(e?.total).toBeCloseTo(102.33)
  })
})

describe('textoCompartilharFatura', () => {
  it('monta a mensagem com Pix e linha digitável', () => {
    const texto = textoCompartilharFatura({ ...base, invoice_qrcode: 'PIX123', invoice_barcode: '3419' })
    expect(texto).toContain('Boleto HOTNET')
    expect(texto).toContain('Pix copia e cola:\nPIX123')
    expect(texto).toContain('Linha digitável:\n3419')
  })
})
