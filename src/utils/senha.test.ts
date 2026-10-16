import { describe, expect, it } from 'vitest'
import { avaliarSenha, ehSequenciaObvia } from './senha'

// Mesmos casos do RegrasSenhaTest do app Android.
const cpf = '25945678970'

describe('regras da senha nova', () => {
  it('senha boa passa em tudo', () => {
    expect(avaliarSenha('Casa@2026', 'Casa@2026', cpf).valida).toBe(true)
  })

  it('limites do Controllr (8 a 16)', () => {
    expect(avaliarSenha('Ab1@xyz', 'Ab1@xyz', cpf).tamanhoOk).toBe(false)
    expect(avaliarSenha('Ab1@xyz9', 'Ab1@xyz9', cpf).tamanhoOk).toBe(true)
    expect(avaliarSenha('Ab1@xyz9Ab1@xyz9', '', cpf).tamanhoOk).toBe(true)
    expect(avaliarSenha('Ab1@xyz9Ab1@xyz9X', '', cpf).tamanhoOk).toBe(false)
  })

  it('não pode ser o próprio CPF', () => {
    expect(avaliarSenha(cpf, cpf, cpf).diferenteDoDocumento).toBe(false)
    expect(avaliarSenha('259.456.789-70', '259.456.789-70', cpf).diferenteDoDocumento).toBe(false)
    expect(avaliarSenha(`x${cpf}`, `x${cpf}`, cpf).diferenteDoDocumento).toBe(true)
  })

  it('sequências óbvias', () => {
    expect(ehSequenciaObvia('12345678')).toBe(true)
    expect(ehSequenciaObvia('87654321')).toBe(true)
    expect(ehSequenciaObvia('11111111')).toBe(true)
    expect(ehSequenciaObvia('aaaaaaaa')).toBe(true)
    expect(ehSequenciaObvia('13572468')).toBe(false)
    expect(ehSequenciaObvia('Casa@2026')).toBe(false)
  })

  it('confirmação precisa ser igual', () => {
    expect(avaliarSenha('Casa@2026', 'Casa@2027', cpf).confirmacaoIgual).toBe(false)
    expect(avaliarSenha('Casa@2026', '', cpf).confirmacaoIgual).toBe(false)
  })
})
