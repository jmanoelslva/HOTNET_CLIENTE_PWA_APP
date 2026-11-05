import { beforeEach, describe, expect, it } from 'vitest'
import { contasSalvas, ehSenhaPadrao, esquecerConta, lembrarConta, marcarSenhaPadrao, usaSenhaPadrao } from './contaLocal'

describe('contas salvas', () => {
  beforeEach(() => localStorage.clear())

  it('põe a última conta no topo, sem repetir, e mantém o nome', () => {
    lembrarConta('11111111111', 'Maria')
    lembrarConta('22222222222')
    lembrarConta('11111111111')
    expect(contasSalvas()).toEqual([
      { documento: '11111111111', nome: 'Maria' },
      { documento: '22222222222', nome: null },
    ])
  })

  it('esquecer tira a conta e o lembrete de senha', () => {
    lembrarConta('11111111111')
    marcarSenhaPadrao('11111111111', true)
    esquecerConta('11111111111')
    expect(contasSalvas()).toEqual([])
    expect(usaSenhaPadrao('11111111111')).toBe(false)
  })
})

describe('ehSenhaPadrao', () => {
  it('é padrão só quando a senha é o próprio documento', () => {
    expect(ehSenhaPadrao('25936057070', '25936057070')).toBe(true)
    expect(ehSenhaPadrao('25936057070', 'outrasenha1')).toBe(false)
    expect(ehSenhaPadrao('25936057070', '259.360.570-70')).toBe(false)
  })
})
