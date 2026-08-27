import { describe, expect, it } from 'vitest'
import { comAlpha } from './cores'

describe('comAlpha', () => {
  it('gera um color-mix com a porcentagem informada', () => {
    expect(comAlpha('#f28f3b', 20)).toBe('color-mix(in srgb, #f28f3b 20%, transparent)')
  })

  it('aceita um token var() do mesmo jeito que um hex', () => {
    expect(comAlpha('var(--cor-primaria)', 8)).toBe('color-mix(in srgb, var(--cor-primaria) 8%, transparent)')
  })
})
