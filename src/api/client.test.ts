import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, SessaoExpiradaError, aoExpirarSessao, post } from './client'

function mockFetchUmaVez(resposta: { status: number; ok: boolean; json: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status: resposta.status,
      ok: resposta.ok,
      json: async () => resposta.json,
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  aoExpirarSessao(null)
})

// Mesmo quirk do SessionExpiredInterceptor do app Android (ver client.ts):
// um 401 é normal em /login (senha errada), mas em qualquer outro endpoint
// significa sessão expirada — comportamento crítico o suficiente (afeta
// todo o app) pra merecer teste dedicado.
describe('post — tratamento de 401 e "Login Failure"', () => {
  it('401 em /login é só falha de login normal, não lança SessaoExpiradaError', async () => {
    mockFetchUmaVez({ status: 401, ok: false, json: { success: false, message: 'Authentication failed for user [x]' } })
    const resultado = await post('login', { username: '1', password: '2' })
    expect(resultado).toEqual({ success: false, message: 'Authentication failed for user [x]' })
  })

  it('401 em outro endpoint lança SessaoExpiradaError', async () => {
    mockFetchUmaVez({ status: 401, ok: false, json: { success: false } })
    await expect(post('invoice_ctl/invoice/list', {})).rejects.toBeInstanceOf(SessaoExpiradaError)
  })

  it('200 com "Login Failure" em outro endpoint também é tratado como sessão expirada', async () => {
    mockFetchUmaVez({ status: 200, ok: true, json: { success: false, message: 'Login Failure' } })
    await expect(post('invoice_ctl/invoice/list', {})).rejects.toBeInstanceOf(SessaoExpiradaError)
  })

  it('erro comum (não 401, sem "Login Failure") lança ApiError com a mensagem do servidor', async () => {
    mockFetchUmaVez({ status: 500, ok: false, json: { success: false, message: 'Erro interno' } })
    await expect(post('invoice_ctl/invoice/list', {})).rejects.toThrow(ApiError)
    mockFetchUmaVez({ status: 500, ok: false, json: { success: false, message: 'Erro interno' } })
    await expect(post('invoice_ctl/invoice/list', {})).rejects.toThrow('Erro interno')
  })

  it('resposta de sucesso normal é devolvida sem lançar nada', async () => {
    mockFetchUmaVez({ status: 200, ok: true, json: { success: true, results: [] } })
    const resultado = await post('invoice_ctl/invoice/list', {})
    expect(resultado).toEqual({ success: true, results: [] })
  })
})

// Ouvinte global registrado por SessionContext.tsx — é o que substituiu o
// antigo logout automático de 2min por inatividade: qualquer 401 real
// (sessão expirada pelo lease do Controllr) agora avisa o app inteiro,
// não só a tela que fez a chamada.
describe('post — ouvinte global de sessão expirada (aoExpirarSessao)', () => {
  it('é chamado quando um 401 "de verdade" acontece', async () => {
    const ouvinte = vi.fn()
    aoExpirarSessao(ouvinte)
    mockFetchUmaVez({ status: 401, ok: false, json: { success: false } })
    await expect(post('invoice_ctl/invoice/list', {})).rejects.toBeInstanceOf(SessaoExpiradaError)
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })

  it('NÃO é chamado num 401 em /login (senha errada, não sessão expirada)', async () => {
    const ouvinte = vi.fn()
    aoExpirarSessao(ouvinte)
    mockFetchUmaVez({ status: 401, ok: false, json: { success: false, message: 'Authentication failed' } })
    await post('login', { username: '1', password: '2' })
    expect(ouvinte).not.toHaveBeenCalled()
  })

  it('NÃO é chamado num 401 em session/logout (evita loop: expirou → desloga → logout 401 → "expirou" de novo)', async () => {
    const ouvinte = vi.fn()
    aoExpirarSessao(ouvinte)
    mockFetchUmaVez({ status: 401, ok: false, json: { success: false } })
    await expect(post('session/logout', {})).rejects.toBeInstanceOf(SessaoExpiradaError)
    expect(ouvinte).not.toHaveBeenCalled()
  })
})

describe('post — respostas que não são JSON e falha de rede', () => {
  it('página HTML de erro (proxy fora) vira mensagem amigável, não SyntaxError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 502,
        ok: false,
        json: async () => {
          throw new SyntaxError('Unexpected token <')
        },
      }),
    )
    await expect(post('invoice_ctl/invoice/list', {})).rejects.toThrow('Nosso sistema está com instabilidade')
  })

  it('falha de rede vira aviso de sem conexão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(post('invoice_ctl/invoice/list', {})).rejects.toThrow('Sem conexão com a internet')
  })

  it('"Authentication failed" fora do login também é sessão expirada', async () => {
    mockFetchUmaVez({ status: 200, ok: true, json: { success: false, message: 'Authentication failed for user [x]' } })
    await expect(post('invoice_ctl/invoice/list', {})).rejects.toBeInstanceOf(SessaoExpiradaError)
  })
})
