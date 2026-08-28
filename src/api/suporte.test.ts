import { describe, expect, it } from 'vitest'
import { descartarPendentesConfirmadas } from './suporte'
import type { OperacaoChamado } from './suporte'

function op(parcial: Partial<OperacaoChamado>): OperacaoChamado {
  return {
    opPk: 1,
    texto: null,
    arquivo: null,
    dataCriacao: null,
    doCliente: false,
    urlAnexo: null,
    ...parcial,
  }
}

// Regressão: DetalheChamado.tsx usava dados.some(...) pra decidir se
// descartava uma pendente — isso removia TODAS as pendentes com o mesmo
// texto de uma vez, mesmo quando só uma foi confirmada pelo servidor.
describe('descartarPendentesConfirmadas', () => {
  it('remove a pendente cujo texto já foi confirmado', () => {
    const pendentes = [op({ opPk: -1, texto: 'oi', doCliente: true })]
    const dados = [op({ opPk: 10, texto: 'oi', doCliente: true })]
    expect(descartarPendentesConfirmadas(pendentes, dados)).toEqual([])
  })

  it('duas pendentes com o mesmo texto: só UMA confirmação remove só UMA pendente', () => {
    const pendentes = [
      op({ opPk: -1, texto: 'oi', doCliente: true }),
      op({ opPk: -2, texto: 'oi', doCliente: true }),
    ]
    const dados = [op({ opPk: 10, texto: 'oi', doCliente: true })]
    const restantes = descartarPendentesConfirmadas(pendentes, dados)
    expect(restantes).toHaveLength(1)
    expect(restantes[0].opPk).toBe(-2)
  })

  it('duas confirmações do mesmo texto removem as duas pendentes', () => {
    const pendentes = [
      op({ opPk: -1, texto: 'oi', doCliente: true }),
      op({ opPk: -2, texto: 'oi', doCliente: true }),
    ]
    const dados = [
      op({ opPk: 10, texto: 'oi', doCliente: true }),
      op({ opPk: 11, texto: 'oi', doCliente: true }),
    ]
    expect(descartarPendentesConfirmadas(pendentes, dados)).toEqual([])
  })

  it('não remove pendente sem confirmação correspondente', () => {
    const pendentes = [op({ opPk: -1, texto: 'oi', doCliente: true })]
    const dados = [op({ opPk: 10, texto: 'outra coisa', doCliente: true })]
    expect(descartarPendentesConfirmadas(pendentes, dados)).toHaveLength(1)
  })

  it('ignora operação da equipe (doCliente: false) com o mesmo texto', () => {
    const pendentes = [op({ opPk: -1, texto: 'oi', doCliente: true })]
    const dados = [op({ opPk: 10, texto: 'oi', doCliente: false })]
    expect(descartarPendentesConfirmadas(pendentes, dados)).toHaveLength(1)
  })
})
