import { useEffect, useState } from 'react'
import { useFecharComVoltar } from '../hooks/useFecharComVoltar'
import { compartilharPdf, pdfRecibo } from '../utils/pdfDocumentos'
import { IcClose, IcDownload, IcShare } from './IconesApp'
import { listarDetalhesFatura, listarItensContrato, urlImpressaoBoleto, type FaturaDto } from '../api/client'
import { buscarDadosCliente } from '../api/cadastro'
import { useToast } from './Toast/useToast'
import Skeleton from './Skeleton'
import { abrirEImprimir } from '../utils/impressao'
import {
  descricaoLinha,
  formatarCentavosComSinal,
  formatarReais,
  linhasDemonstrativo,
  montarDadosRecibo,
  numeroRecibo,
  paraCentavos,
  rotuloDocumento,
  valorPorExtenso,
  type DadosRecibo,
  type ItemRecibo,
} from '../utils/recibo'
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
  useFecharComVoltar(true, onFechar)
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

  const [gerando, setGerando] = useState(false)

  /** Recibo em PDF de verdade, como o app: compartilha o arquivo ou baixa. */
  async function enviarPdf(d: DadosRecibo, modo: 'compartilhar' | 'salvar') {
    setGerando(true)
    try {
      const blob = await pdfRecibo(d)
      const nome = `recibo-hotnet-${numeroRecibo(d)}.pdf`
      if (modo === 'salvar') {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = nome
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
        toast('Recibo salvo em PDF.', 'sucesso')
      } else if ((await compartilharPdf(blob, nome, `Recibo HOTNET ${numeroRecibo(d)}`)) === 'baixado') {
        toast('Recibo salvo em PDF.', 'sucesso')
      }
    } catch (erro) {
      console.error('[recibo pdf]', erro)
      toast('Não foi possível gerar o PDF do recibo. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="recibo-fundo" onClick={onFechar}>
      <div className="recibo-modal" role="dialog" aria-modal="true" aria-labelledby="recibo-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="recibo-barra">
          <h2 id="recibo-titulo">Recibo</h2>
          <button className="recibo-fechar" onClick={onFechar} aria-label="Fechar recibo">
            <IcClose size={22} />
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
              <button className="recibo-btn-primario" disabled={gerando} onClick={() => enviarPdf(dados, 'compartilhar')}>
                <IcShare size={18} /> {gerando ? 'Gerando PDF…' : 'Compartilhar'}
              </button>
              <button className="recibo-btn-borda" disabled={gerando} onClick={() => enviarPdf(dados, 'salvar')}>
                <IcDownload size={18} /> Salvar PDF
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
