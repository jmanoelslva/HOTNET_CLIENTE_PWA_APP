import { describe, expect, it } from 'vitest'
import { decidirVersao } from './atualizacaoApp'

describe('decidirVersao', () => {
  it('em dia quando o build é o publicado ou não há informação', () => {
    expect(decidirVersao('20261105.1931', '20261105.1931', null)).toBe('em-dia')
    expect(decidirVersao('20261105.1931', null, null)).toBe('em-dia')
    expect(decidirVersao('', '20261105.1931', null)).toBe('em-dia')
  })

  it('limpa o cache quando o publicado é outro', () => {
    expect(decidirVersao('20261101.1000', '20261105.1931', null)).toBe('limpar')
  })

  it('não limpa de novo para o mesmo build na mesma sessão', () => {
    expect(decidirVersao('20261101.1000', '20261105.1931', '20261105.1931')).toBe('aguardar')
    expect(decidirVersao('20261101.1000', '20261106.0800', '20261105.1931')).toBe('limpar')
  })
})
