import { useEffect, useState } from 'react'
import { MdClose, MdPrint, MdShare } from 'react-icons/md'
import { listarDetalhesFatura, listarItensContrato, urlImpressaoBoleto, type FaturaDto } from '../api/client'
import { buscarDadosCliente } from '../api/cadastro'
import { useToast } from './Toast/useToast'
import Skeleton from './Skeleton'
import { abrirEImprimir } from '../utils/impressao'
import {
  EMPRESA_RECIBO,
  descricaoLinha,
  formatarCentavosComSinal,
  formatarReais,
  linhasDemonstrativo,
  montarDadosRecibo,
  numeroRecibo,
  paraCentavos,
  rotuloDocumento,
  textoRecibo,
  valorPorExtenso,
  type DadosRecibo,
  type ItemRecibo,
} from '../utils/recibo'
import logoHotnet from '../assets/logo-hotnet.png'
import './ReciboModal.css'

async function itensDaFatura(invoicePk: number): Promise<ItemRecibo[]> {
  try {
    const resposta = await listarDetalhesFatura(invoicePk)
    if (resposta.success !== true) return []
    return (resposta.results ?? []).flatMap((dto) => {
      const nome = dto.invoice_details_name?.trim()
      if (!nome) return []
      return [
        {
          nome,
          valorCentavos: paraCentavos(dto.invoice_details_amount) ?? 0,
          descontoCentavos: paraCentavos(dto.invoice_details_discount) ?? 0,
          outrosCentavos: paraCentavos(dto.invoice_details_others) ?? 0,
        },
      ]
    })
  } catch {
    return []
  }
}

async function planoDoContrato(contractPk: number | undefined): Promise<string | null> {
  if (contractPk == null) return null
  try {
    const resposta = await listarItensContrato(contractPk)
    if (!resposta.success) return null
    const plano = (resposta.results ?? []).find((dto) => !(dto.item_rent === true || dto.item_type === 5))
    return plano?.item_name ?? plano?.plan_name ?? null
  } catch {
    return null
  }
}

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Página do recibo pra impressão/"Salvar como PDF" do navegador (texto real, não imagem). */
function htmlParaImpressao(d: DadosRecibo): string {
  const e = escaparHtml
  // A aba nova é about:blank: o logo precisa do endereço completo do portal.
  const logo = new URL(logoHotnet, window.location.href).href
  const doc = d.documentoMascarado ? `, ${rotuloDocumento(d.documentoMascarado)} ${e(d.documentoMascarado)}` : ''
  const linhas = linhasDemonstrativo(d)
    .map((l) => `<tr><td>${e(descricaoLinha(l))}</td><td class="v">${e(formatarCentavosComSinal(l.centavos))}</td></tr>`)
    .join('')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo ${numeroRecibo(d)}</title>
<style>
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#222;margin:32px;max-width:640px}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.faixa{height:8px;border-radius:4px;background:linear-gradient(90deg,#d94a38,#f28f3b);margin-bottom:16px}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #d94a38;padding-bottom:12px}
.marca{display:flex;gap:12px;align-items:center}.marca img{width:56px;height:56px;object-fit:contain}
h1{font-size:18px;margin:0}small{color:#666;display:block;font-size:11px}
.titulo{text-align:right}.titulo b{color:#d94a38;text-transform:uppercase;display:block}
p{line-height:1.6;font-size:14px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
td{padding:6px 0;border-bottom:1px solid #eee}.v{text-align:right;font-variant-numeric:tabular-nums}
.total td{font-weight:800;font-size:15px;border-bottom:0}.total .v{color:#d94a38}
.info{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px;font-size:12px}
.info div{border:1px solid #eee;border-radius:8px;padding:6px 8px}.info span{color:#777;display:block;font-size:10px;text-transform:uppercase}
</style></head><body>
<div class="faixa"></div>
<header><div class="marca"><img id="logo" src="${e(logo)}" alt="HOTNET"><div><h1>${e(EMPRESA_RECIBO.nome)}</h1><small>${e(EMPRESA_RECIBO.responsavel)} · CNPJ ${e(EMPRESA_RECIBO.cnpj)}</small>
<small>${e(EMPRESA_RECIBO.endereco)} · ${e(EMPRESA_RECIBO.cidade)}</small></div></div>
<div class="titulo"><b>Recibo de pagamento</b>Nº ${numeroRecibo(d)}<small>Via do cliente</small></div></header>
<p>Recebemos de <b>${e(d.clienteNome?.toUpperCase() ?? 'TITULAR DO CONTRATO')}</b>${doc}, a importância de
<b>${e(formatarReais(d.pagoCentavos))} (${e(valorPorExtenso(d.pagoCentavos))})</b>, referente à mensalidade${
    d.contratoNumero != null ? ` do contrato nº ${d.contratoNumero}` : ''
  } com vencimento em ${e(d.vencimento)}, dando plena quitação deste valor.</p>
<div class="info"><div><span>Cobrança</span>${numeroRecibo(d)}</div><div><span>Vencimento</span>${e(d.vencimento)}</div>
<div><span>Data de crédito</span>${e(d.dataCredito)}</div><div><span>Contrato</span>${d.contratoNumero != null ? `Nº ${d.contratoNumero}` : '—'}</div></div>
<table>${linhas}<tr><td>Valor do título</td><td class="v">${e(formatarReais(d.tituloCentavos))}</td></tr>
<tr class="total"><td>Valor pago</td><td class="v">${e(formatarReais(d.pagoCentavos))}</td></tr></table>
<p><small>Emitido pelo portal HOTNET em ${new Date().toLocaleDateString('pt-BR')}.</small></p>
</body></html>`
}

interface Props {
  fatura: FaturaDto
  cpf: string | null
  onFechar: () => void
}

/**
 * Recibo de pagamento de uma fatura paga (Boletos → Pagos → "Recibo"). Mesmo conteúdo do recibo
 * do app Android: demonstrativo, valor por extenso, CPF/CNPJ mascarado.
 */
export default function ReciboModal({ fatura, cpf, onFechar }: Props) {
  const { toast } = useToast()
  const [dados, setDados] = useState<DadosRecibo | null | undefined>(undefined)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const [itens, cliente] = await Promise.all([
        itensDaFatura(fatura.invoice_pk),
        buscarDadosCliente(cpf).catch(() => null),
      ])
      const plano = itens.length === 0 ? await planoDoContrato(fatura.contract_pk) : null
      const documento = cliente?.client_doc1 ?? cpf
      if (!cancelado) setDados(montarDadosRecibo(fatura, cliente?.client_complete_name ?? null, documento, plano, itens))
    })()
    return () => {
      cancelado = true
    }
  }, [fatura, cpf])

  async function compartilhar(d: DadosRecibo) {
    const texto = textoRecibo(d)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Recibo HOTNET ${numeroRecibo(d)}`, text: texto })
        return
      } catch (excecao) {
        // Cancelado pela pessoa: não faz nada. Outro erro: cai pra cópia.
        if (excecao instanceof DOMException && excecao.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(texto)
      toast('Recibo copiado. Cole no WhatsApp ou e-mail.', 'sucesso')
    } catch {
      toast('Não foi possível compartilhar o recibo agora.')
    }
  }

  function imprimir(d: DadosRecibo) {
    const janela = window.open('', '_blank')
    if (!janela) {
      toast('O navegador bloqueou a nova aba. Libere pop-ups para este site e tente de novo.')
      return
    }
    janela.document.open()
    // Todo texto vindo do servidor passa por escaparHtml em htmlParaImpressao; o resto são
    // números e textos fixos do próprio portal.
    janela.document.write(htmlParaImpressao(d))
    janela.document.close()
    janela.focus()
    // Só imprime depois do logo carregar: antes, a impressão abria e o PDF saía sem ele.
    const imagem = janela.document.getElementById('logo') as HTMLImageElement | null
    let impresso = false
    const imprimirUmaVez = () => {
      if (impresso) return
      impresso = true
      janela.print()
    }
    if (!imagem || imagem.complete) {
      imprimirUmaVez()
    } else {
      imagem.addEventListener('load', imprimirUmaVez, { once: true })
      imagem.addEventListener('error', imprimirUmaVez, { once: true })
      // Rede lenta: não deixa a pessoa esperando para sempre.
      window.setTimeout(imprimirUmaVez, 3000)
    }
  }

  return (
    <div className="recibo-fundo" onClick={onFechar}>
      <div className="recibo-modal" role="dialog" aria-modal="true" aria-labelledby="recibo-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="recibo-barra">
          <h2 id="recibo-titulo">Recibo</h2>
          <button className="recibo-fechar" onClick={onFechar} aria-label="Fechar recibo">
            <MdClose size={22} />
          </button>
        </div>

        {dados === undefined && (
          <div className="recibo-card">
            <Skeleton width="50%" height={14} />
            <Skeleton width="40%" height={30} />
            <Skeleton width="80%" height={12} />
            <Skeleton width="70%" height={12} />
          </div>
        )}

        {dados === null && <p className="recibo-erro">Não foi possível montar o recibo deste boleto.</p>}

        {dados && (
          <>
            <div className="recibo-card">
              <div className="recibo-topo">
                <span className="recibo-rotulo">Cobrança nº {numeroRecibo(dados)}</span>
                <span className="recibo-selo">Pago</span>
              </div>
              <div className="recibo-valor">{formatarReais(dados.pagoCentavos)}</div>
              <p className="recibo-extenso">
                {valorPorExtenso(dados.pagoCentavos)} · pago em {dados.dataCredito}
              </p>
              {linhasDemonstrativo(dados).map((linha, i) => (
                <div className="recibo-linha" key={i}>
                  <span>{descricaoLinha(linha)}</span>
                  <span>{formatarCentavosComSinal(linha.centavos)}</span>
                </div>
              ))}
              <hr />
              <div className="recibo-linha recibo-linha-total">
                <span>Valor pago</span>
                <span>{formatarReais(dados.pagoCentavos)}</span>
              </div>
              <hr />
              <div className="recibo-linha">
                <span>Vencimento</span>
                <span>{dados.vencimento}</span>
              </div>
              {dados.contratoNumero != null && (
                <div className="recibo-linha">
                  <span>Contrato</span>
                  <span>Nº {dados.contratoNumero}</span>
                </div>
              )}
              <div className="recibo-linha">
                <span>Cliente</span>
                <span>
                  {dados.clienteNome ?? 'Titular do contrato'}
                  {dados.documentoMascarado && (
                    <>
                      <br />
                      <span aria-label={`${rotuloDocumento(dados.documentoMascarado)} parcialmente oculto`}>
                        {rotuloDocumento(dados.documentoMascarado)} {dados.documentoMascarado}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="recibo-acoes">
              <button className="recibo-btn-primario" onClick={() => compartilhar(dados)}>
                <MdShare size={18} /> Compartilhar
              </button>
              <button className="recibo-btn-borda" onClick={() => imprimir(dados)}>
                <MdPrint size={18} /> Imprimir / PDF
              </button>
            </div>
            <button
              className="recibo-sistema"
              onClick={() =>
                abrirEImprimir(urlImpressaoBoleto(dados.invoicePk, true), () =>
                  toast('Não foi possível abrir o recibo do sistema agora. Tente novamente.'),
                )
              }
            >
              Ver recibo do sistema
            </button>
            <p className="recibo-nota">Recibo gerado com os dados do sistema HOTNET.</p>
          </>
        )}
      </div>
    </div>
  )
}
