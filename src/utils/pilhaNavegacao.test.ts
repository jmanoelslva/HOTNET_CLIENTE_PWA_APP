import { beforeEach, describe, expect, it } from 'vitest'
import { nivelDaTela, planoTrocaDeAba, registrarTela } from './pilhaNavegacao'

describe('pilha de navegação', () => {
  beforeEach(() => sessionStorage.clear())

  it('conta os níveis a partir do Início', () => {
    registrarTela('a', '/', 'PUSH')
    registrarTela('b', '/perfil', 'PUSH')
    registrarTela('c', '/cadastro', 'PUSH')
    expect(nivelDaTela('a', '/')).toBe(0)
    expect(nivelDaTela('b', '/perfil')).toBe(1)
    expect(nivelDaTela('c', '/cadastro')).toBe(2)
  })

  it('troca de aba volta até o nível 1 e substitui; Início volta tudo', () => {
    expect(planoTrocaDeAba(0, '/boletos')).toEqual({ voltar: 0, substituir: false })
    expect(planoTrocaDeAba(1, '/suporte')).toEqual({ voltar: 0, substituir: true })
    expect(planoTrocaDeAba(3, '/boletos')).toEqual({ voltar: 2, substituir: true })
    expect(planoTrocaDeAba(2, '/')).toEqual({ voltar: 2, substituir: false })
  })
})
