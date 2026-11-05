import { beforeEach, describe, expect, it } from 'vitest'
import { conferirPin, definirPin, marcarSaidaDoApp, pinAtivo, pinValido, precisaDesbloquear, removerPin } from './pinApp'

const DOC = '25936057070'

describe('PIN do app', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('aceita só 4 dígitos', () => {
    expect(pinValido('1234')).toBe(true)
    expect(pinValido('123')).toBe(false)
    expect(pinValido('12a4')).toBe(false)
  })

  it('guarda o hash, confere e conta as tentativas', async () => {
    await definirPin(DOC, '4321')
    expect(pinAtivo(DOC)).toBe(true)
    expect(localStorage.getItem(`hotnet-pin-${DOC}`)).not.toContain('4321')
    expect(await conferirPin(DOC, '4321')).toEqual({ ok: true, restantes: 5 })
    expect((await conferirPin(DOC, '0000')).restantes).toBe(4)
    removerPin(DOC)
    expect(pinAtivo(DOC)).toBe(false)
  })

  it('volta a bloquear depois de 5 minutos fora', async () => {
    await definirPin(DOC, '4321')
    expect(precisaDesbloquear()).toBe(false)
    marcarSaidaDoApp()
    expect(precisaDesbloquear(Date.now() + 4 * 60 * 1000)).toBe(false)
    expect(precisaDesbloquear(Date.now() + 6 * 60 * 1000)).toBe(true)
  })
})
