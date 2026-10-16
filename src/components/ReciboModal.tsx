import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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

/**
 * Recibo em folha (impressão/"Salvar como PDF" do navegador, texto real). Fica no próprio
 * documento, escondido na tela e mostrado só na impressão (ReciboModal.css): imprimir uma aba
 * nova escrita por script falhava no Chrome do Android (logo no tamanho original, sem estilo).
 */
function ReciboImpressao({ d }: { d: DadosRecibo }) {
  return (
    <div className="recibo-impressao" aria-hidden="true">
      <div className="ri-faixa" />
      <header className="ri-topo">
        <div className="ri-marca">
          <img src={logoHotnet} alt="" width={56} height={56} />
          <div>
            <h1>{EMPRESA_RECIBO.nome}</h1>
            <small>
              {EMPRESA_RECIBO.responsavel} · CNPJ {EMPRESA_RECIBO.cnpj}
            </small>
            <small>
              {EMPRESA_RECIBO.endereco} · {EMPRESA_RECIBO.cidade}
            </small>
          </div>
        </div>
        <div className="ri-titulo">
          <b>Recibo de pagamento</b>
          Nº {numeroRecibo(d)}
          <small>Via do cliente</small>
        </div>
      </header>
      <p className="ri-corpo">
        Recebemos de <b>{d.clienteNome?.toUpperCase() ?? 'TITULAR DO CONTRATO'}</b>
        {d.documentoMascarado ? `, ${rotuloDocumento(d.documentoMascarado)} ${d.documentoMascarado}` : ''}, a importância de{' '}
        <b>
          {formatarReais(d.pagoCentavos)} ({valorPorExtenso(d.pagoCentavos)})
        </b>
        , referente à mensalidade{d.contratoNumero != null ? ` do contrato nº ${d.contratoNumero}` : ''} com vencimento em{' '}
        {d.vencimento}, dando plena quitação deste valor.
      </p>
      <div className="ri-info">
        <div>
          <span>Cobrança</span>
          {numeroRecibo(d)}
        </div>
        <div>
          <span>Vencimento</span>
          {d.vencimento}
        </div>
        <div>
          <span>Data de crédito</span>
          {d.dataCredito}
        </div>
        <div>
          <span>Contrato</span>
          {d.contratoNumero != null ? `Nº ${d.contratoNumero}` : '—'}
        </div>
      </div>
      <table className="ri-tabela">
        <tbody>
          {linhasDemonstrativo(d).map((l, i) => (
            <tr key={i}>
              <td>{descricaoLinha(l)}</td>
              <td className="ri-valor">{formatarCentavosComSinal(l.centavos)}</td>
            </tr>
          ))}
          <tr>
            <td>Valor do título</td>
            <td className="ri-valor">{formatarReais(d.tituloCentavos)}</td>
          </tr>
          <tr className="ri-total">
            <td>Valor pago</td>
            <td className="ri-valor">{formatarReais(d.pagoCentavos)}</td>
          </tr>
        </tbody>
      </table>
      <small className="ri-rodape">Emitido pelo portal HOTNET em {new Date().toLocaleDateString('pt-BR')}.</small>
    </div>
  )
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

  function imprimir() {
    // Na impressão, ReciboModal.css esconde o portal inteiro e mostra só .recibo-impressao.
    const limpar = () => {
      document.body.classList.remove('imprimindo-recibo')
      window.removeEventListener('afterprint', limpar)
    }
    document.body.classList.add('imprimindo-recibo')
    window.addEventListener('afterprint', limpar)
    window.print()
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
              <button className="recibo-btn-borda" onClick={imprimir}>
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
      {/* Filho direto do body: a regra de impressão esconde todo o resto da página. */}
      {dados && createPortal(<ReciboImpressao d={dados} />, document.body)}
    </div>
  )
}
