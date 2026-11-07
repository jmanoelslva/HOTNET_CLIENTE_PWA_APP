import { describe, expect, it } from 'vitest'
import { descricaoDocumento, tituloDaTela } from './acessibilidade'

describe('descricaoDocumento', () => {
  it('fala só o final do CPF mascarado', () => {
    expect(descricaoDocumento('***.570.***-70')).toBe('CPF terminado em 7 0')
    expect(descricaoDocumento('25936057070')).toBe('CPF terminado em 7 0')
  })

  it('reconhece CNPJ pela barra ou pelos 14 dígitos', () => {
    expect(descricaoDocumento('52.976.051/0001-57')).toBe('CNPJ terminado em 5 7')
    expect(descricaoDocumento('52976051000157')).toBe('CNPJ terminado em 5 7')
  })
})

describe('tituloDaTela', () => {
  it('dá nome às telas, inclusive ao chat do chamado', () => {
    expect(tituloDaTela('/')).toBe('Início')
    expect(tituloDaTela('/suporte')).toBe('Suporte')
    expect(tituloDaTela('/suporte/123')).toBe('Chamado')
    expect(tituloDaTela('/rota-desconhecida')).toBe('HOTNET')
  })
})
