import { describe, expect, it } from 'vitest'
import {
  dataIsoParaBr,
  formatarCentavosComSinal,
  linhasDemonstrativo,
  acrescimosCentavos,
  tituloSemAcrescimosCentavos,
  mascararDocumento,
  montarDadosRecibo,
  numeroRecibo,
  paraCentavos,
  rotuloDocumento,
  valorPorExtenso,
} from './recibo'

// Mesmos casos do ReciboTest do app Android.
describe('recibo — valor por extenso', () => {
  it('reais e centavos', () => {
    expect(valorPorExtenso(5500)).toBe('cinquenta e cinco reais')
    expect(valorPorExtenso(100)).toBe('um real')
    expect(valorPorExtenso(12345)).toBe('cento e vinte e três reais e quarenta e cinco centavos')
    expect(valorPorExtenso(120000)).toBe('mil e duzentos reais')
    expect(valorPorExtenso(123000)).toBe('mil duzentos e trinta reais')
    expect(valorPorExtenso(100000000)).toBe('um milhão de reais')
    expect(valorPorExtenso(0)).toBe('zero reais')
    expect(valorPorExtenso(1)).toBe('um centavo')
    expect(valorPorExtenso(9990)).toBe('noventa e nove reais e noventa centavos')
    expect(valorPorExtenso(10000)).toBe('cem reais')
    expect(valorPorExtenso(10100)).toBe('cento e um reais')
    expect(valorPorExtenso(123456)).toBe('mil duzentos e trinta e quatro reais e cinquenta e seis centavos')
    expect(valorPorExtenso(205050)).toBe('dois mil e cinquenta reais e cinquenta centavos')
  })
})

describe('recibo — documento e formatos', () => {
  it('mascara CPF e CNPJ', () => {
    expect(mascararDocumento('123.456.789-01')).toBe('***.456.789-**')
    expect(mascararDocumento('12.345.678/0001-90')).toBe('**.345.678/0001-**')
    expect(mascararDocumento('1234')).toBeNull()
    expect(mascararDocumento(null)).toBeNull()
    expect(rotuloDocumento('**.345.678/0001-**')).toBe('CNPJ')
    expect(rotuloDocumento('***.456.789-**')).toBe('CPF')
  })

  it('centavos, datas e sinal', () => {
    expect(paraCentavos('50.00')).toBe(5000)
    expect(paraCentavos('52,35')).toBe(5235)
    expect(paraCentavos('')).toBeNull()
    expect(dataIsoParaBr('2026-10-08 12:00:00')).toBe('08/10/2026')
    expect(formatarCentavosComSinal(-450).startsWith('−')).toBe(true)
  })
})

describe('recibo — montagem e demonstrativo', () => {
  const fatura = {
    invoice_pk: 271665,
    contract_number: 1024,
    invoice_date_due: '2026-10-10',
    invoice_date_credit: '2026-10-08',
    invoice_amount_document: '50.00',
  }

  it('fatura não paga não tem recibo', () => {
    expect(montarDadosRecibo({ ...fatura, invoice_date_credit: undefined }, 'Ana', null, null, [])).toBeNull()
  })

  it('sem itens: mensalidade + encargos pela diferença', () => {
    const d = montarDadosRecibo({ ...fatura, invoice_amount_paid: '52.35' }, 'Ana', '12345678901', 'Plano 100Mbps', [])!
    expect(numeroRecibo(d)).toBe('00271665')
    expect(d.documentoMascarado).toBe('***.456.789-**')
    expect(linhasDemonstrativo(d)).toEqual([
      { tipo: 'mensalidade', nome: 'Plano 100Mbps', centavos: 5000 },
      { tipo: 'encargos', nome: null, centavos: 235 },
    ])
  })

  it('sem valor pago assume o valor do título (não inventa encargo)', () => {
    const d = montarDadosRecibo(fatura, null, null, null, [])!
    expect(d.pagoCentavos).toBe(5000)
    expect(linhasDemonstrativo(d)).toEqual([{ tipo: 'mensalidade', nome: null, centavos: 5000 }])
  })

  it('com itens: usa os itens, com desconto e outros', () => {
    const d = montarDadosRecibo(fatura, 'Ana', null, null, [
      { nome: 'Plano 100Mbps', valorCentavos: 5000, descontoCentavos: 450, outrosCentavos: 0 },
      { nome: 'ROTEADOR', valorCentavos: 0, descontoCentavos: 0, outrosCentavos: 0 },
    ])!
    // Item zerado (comodato) sai; item único vira mensalidade, como no app.
    expect(linhasDemonstrativo(d).map((l) => l.tipo)).toEqual(['mensalidade', 'desconto'])
  })

  it('juros já embutidos no título: acréscimos vêm dos itens de encargo', () => {
    const d = montarDadosRecibo({ ...fatura, invoice_amount_document: '52.35', invoice_amount_paid: '52.35' }, 'Ana', null, null, [
      { nome: 'Plano 100Mbps', valorCentavos: 5000, descontoCentavos: 0, outrosCentavos: 0 },
      { nome: 'Multa/Juros por atraso de pagamento', valorCentavos: 235, descontoCentavos: 0, outrosCentavos: 0 },
    ])!
    expect(acrescimosCentavos(d)).toBe(235)
    expect(tituloSemAcrescimosCentavos(d)).toBe(5000)
    expect(linhasDemonstrativo(d)).toEqual([
      { tipo: 'mensalidade', nome: 'Plano 100Mbps', centavos: 5000 },
      { tipo: 'encargos', nome: null, centavos: 235 },
    ])
  })
})
