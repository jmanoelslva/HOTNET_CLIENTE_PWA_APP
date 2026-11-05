import { beforeAll, describe, expect, it } from 'vitest'
import { pdfQuitacao, pdfRecibo } from './pdfDocumentos'

// jsdom não carrega imagens: o logotipo cai no caminho "sem logo".
beforeAll(() => {
  class ImagemFalsa {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_: string) {
      setTimeout(() => this.onerror?.(), 0)
    }
  }
  ;(globalThis as unknown as { Image: unknown }).Image = ImagemFalsa
})

async function cabecalhoPdf(blob: Blob): Promise<string> {
  return new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5))
}

describe('PDFs', () => {
  it('gera o recibo em PDF', async () => {
    const blob = await pdfRecibo({
      invoicePk: 123,
      clienteNome: 'Maria Silva',
      documentoMascarado: '***.360.570-**',
      contratoNumero: 77,
      plano: '300 MEGA',
      vencimento: '10/10/2026',
      dataCredito: '09/10/2026',
      tituloCentavos: 9990,
      pagoCentavos: 9990,
      itens: [],
    })
    expect(await cabecalhoPdf(blob)).toBe('%PDF-')
    expect(blob.size).toBeGreaterThan(1500)
  })

  it('gera a declaração com várias páginas quando há muitas cobranças', async () => {
    const linhas = Array.from({ length: 40 }, (_, i) => ({
      numero: String(i).padStart(8, '0'),
      vencimento: '10/01/2025',
      pagamento: '09/01/2025',
      pagoCentavos: 5000,
    }))
    const blob = await pdfQuitacao({ clienteNome: 'Maria', documentoMascarado: null, contratoNumero: 1, ano: 2025, linhas, totalCentavos: 200000 })
    expect(await cabecalhoPdf(blob)).toBe('%PDF-')
    const texto = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()))
    expect((texto.match(/\/Type \/Page\b/g) ?? []).length).toBe(2)
  })
})
