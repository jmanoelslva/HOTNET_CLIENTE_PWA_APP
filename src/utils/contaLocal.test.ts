import { beforeEach, describe, expect, it } from 'vitest'
import {
  adiarLembreteSenha,
  contasSalvas,
  ehSenhaPadrao,
  esquecerConta,
  lembrarConta,
  marcarSenhaPadrao,
  mostrarLembreteSenha,
  usaSenhaPadrao,
} from './contaLocal'

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

describe('lembrete da senha padrão', () => {
  beforeEach(() => localStorage.clear())

  it('"Agora não" esconde por 30 dias e volta depois, se a senha continuar a padrão', () => {
    const agora = Date.UTC(2026, 10, 6)
    marcarSenhaPadrao('11111111111', true)
    expect(mostrarLembreteSenha('11111111111', agora)).toBe(true)
    adiarLembreteSenha('11111111111', agora)
    expect(mostrarLembreteSenha('11111111111', agora + 29 * 86_400_000)).toBe(false)
    expect(mostrarLembreteSenha('11111111111', agora + 31 * 86_400_000)).toBe(true)
    marcarSenhaPadrao('11111111111', false)
    expect(mostrarLembreteSenha('11111111111', agora + 31 * 86_400_000)).toBe(false)
  })
})
