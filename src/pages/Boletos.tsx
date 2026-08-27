import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  SessaoExpiradaError,
  informarPagamento,
  listarBoletos,
  urlImpressaoBoleto,
  type FaturaDto,
} from '../api/client'
import './Boletos.css'

// Chave PIX (CNPJ) de fallback — mostrada quando o boleto não traz código
// de barras/PIX próprio (ex: contas antigas), igual ao app Android.
const CNPJ_FALLBACK = '17.659.900/0001-48'
const LIMITE_PAGOS_PADRAO = 3

type FiltroStatus = 'aberto' | 'pagos'

function formatarValor(valorBruto: string | number | null | undefined): string {
  const valor = typeof valorBruto === 'number' ? valorBruto : Number.parseFloat(String(valorBruto ?? '0').replace(',', '.'))
  const valorFinal = Number.isFinite(valor) ? valor : 0
  return valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatarData(data: string | null | undefined): string {
  if (!data) return ''
  const soData = data.split(' ')[0]
  const partes = soData.split('-')
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
  return soData
}

/**
 * Valor com multa + juros somados (fórmula padrão de boleto/Febraban:
 * multa fixa + juros simples ao dia, ambos sobre o valor original) — só
 * calculado pra boletos vencidos com as duas taxas presentes, igual ao
 * Fatura.calcularValorComEncargos() do app Android.
 */
function calcularValorComEncargos(fatura: FaturaDto): number | null {
  const dias = Number.parseInt(fatura.days_late ?? '', 10)
  if (!Number.isFinite(dias) || dias <= 0) return null
  const valorOriginal = Number.parseFloat((fatura.invoice_amount_document ?? '').replace(',', '.'))
  const multaPercentual = Number.parseFloat(fatura.invoice_rate_fine ?? '')
  const jurosDiaPercentual = Number.parseFloat(fatura.invoice_rate_interest ?? '')
  if (!Number.isFinite(valorOriginal) || !Number.isFinite(multaPercentual) || !Number.isFinite(jurosDiaPercentual)) {
    return null
  }
  const multa = valorOriginal * (multaPercentual / 100)
  const juros = valorOriginal * (jurosDiaPercentual / 100) * dias
  return valorOriginal + multa + juros
}

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

export default function Boletos() {
  const [faturas, setFaturas] = useState<FaturaDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('aberto')
  const [filtroContrato, setFiltroContrato] = useState<number | null>(null)
  const [mostrarTodosPagos, setMostrarTodosPagos] = useState(false)

  const [copiado, setCopiado] = useState<string | null>(null)
  const [qrCodeAberto, setQrCodeAberto] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<FaturaDto | null>(null)
  const [informando, setInformando] = useState<number | null>(null)
  const [informados, setInformados] = useState<Set<number>>(new Set())

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const resposta = await listarBoletos()
      if (resposta.success) {
        setFaturas(resposta.results ?? [])
      } else {
        setErro(resposta.message ?? 'Não foi possível carregar os boletos.')
      }
    } catch (excecao) {
      if (excecao instanceof SessaoExpiradaError) {
        setErro('Sua sessão expirou. Faça login novamente.')
      } else if (excecao instanceof ApiError) {
        setErro(excecao.message)
      } else {
        setErro('Não foi possível conectar. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }

  const contratos = useMemo(() => {
    const mapa = new Map<number, number>()
    for (const fatura of faturas) {
      if (fatura.contract_pk != null) {
        mapa.set(fatura.contract_pk, fatura.contract_number ?? fatura.contract_pk)
      }
    }
    return [...mapa.entries()].sort((a, b) => a[1] - b[1])
  }, [faturas])

  const faturasFiltradas = useMemo(() => {
    const porContrato = filtroContrato != null ? faturas.filter((f) => f.contract_pk === filtroContrato) : faturas
    return filtroStatus === 'aberto'
      ? porContrato.filter((f) => !f.invoice_date_credit)
      : porContrato.filter((f) => !!f.invoice_date_credit)
  }, [faturas, filtroContrato, filtroStatus])

  const faturasExibidas =
    filtroStatus === 'aberto' || mostrarTodosPagos ? faturasFiltradas : faturasFiltradas.slice(0, LIMITE_PAGOS_PADRAO)

  function trocarStatus(status: FiltroStatus) {
    setFiltroStatus(status)
    setMostrarTodosPagos(false)
  }

  async function aoCopiar(chave: string, valor: string | null | undefined) {
    const usandoFallback = !valor
    const texto = valor || CNPJ_FALLBACK
    const ok = await copiarTexto(texto)
    if (ok) {
      setCopiado(chave)
      setTimeout(() => setCopiado((atual) => (atual === chave ? null : atual)), 1500)
      if (usandoFallback) {
        window.alert('Você copiou os dados da empresa (CNPJ). Após realizar o pagamento, envie o comprovante para o nosso WhatsApp.')
      }
    }
  }

  async function confirmarInformarPagamento() {
    const fatura = confirmando
    if (!fatura || fatura.contract_pk == null) return
    setConfirmando(null)
    setInformando(fatura.invoice_pk)
    try {
      const resposta = await informarPagamento(fatura.invoice_pk, fatura.contract_pk)
      if (resposta.success) {
        setInformados((atual) => new Set(atual).add(fatura.invoice_pk))
      } else {
        window.alert(resposta.message ?? 'Erro ao informar pagamento.')
      }
    } catch {
      window.alert('Não foi possível informar o pagamento agora. Tente novamente.')
    } finally {
      setInformando(null)
    }
  }

  return (
    <div className="boletos-tela">
      <header className="boletos-cabecalho">
        <h1>Boletos</h1>
        <p>Acompanhe seus boletos em aberto e pagos.</p>
      </header>

      <div className="boletos-abas">
        <button
          className={`aba-chip aba-aberto ${filtroStatus === 'aberto' ? 'ativa' : ''}`}
          onClick={() => trocarStatus('aberto')}
        >
          Em aberto
        </button>
        <button
          className={`aba-chip aba-pagos ${filtroStatus === 'pagos' ? 'ativa' : ''}`}
          onClick={() => trocarStatus('pagos')}
        >
          Pagos
        </button>
      </div>

      {contratos.length > 1 && (
        <select
          className="boletos-filtro-contrato"
          value={filtroContrato ?? ''}
          onChange={(evento) => setFiltroContrato(evento.target.value ? Number(evento.target.value) : null)}
        >
          <option value="">Contratos: Todos</option>
          {contratos.map(([pk, numero]) => (
            <option key={pk} value={pk}>
              Contrato {numero}
            </option>
          ))}
        </select>
      )}

      {carregando && <p className="boletos-status">Carregando boletos…</p>}

      {!carregando && erro && (
        <div className="boletos-status">
          <p>{erro}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {!carregando && !erro && faturasFiltradas.length === 0 && (
        <p className="boletos-status">
          {filtroStatus === 'aberto' ? 'Nenhum boleto em aberto.' : 'Nenhum boleto pago.'}
        </p>
      )}

      {!carregando && !erro && faturasExibidas.length > 0 && (
        <ul className="boletos-lista">
          {faturasExibidas.map((fatura) => {
            const paga = !!fatura.invoice_date_credit
            const dias = Number.parseInt(fatura.days_late ?? '', 10) || 0
            const vencida = !paga && dias > 0
            const valorAtualizado = vencida ? calcularValorComEncargos(fatura) : null
            const jaInformado = informados.has(fatura.invoice_pk) || fatura.obs_pk != null

            return (
              <li key={fatura.invoice_pk} className="boleto-card">
                <div className="boleto-topo">
                  <span className="boleto-titulo">Boleto #{fatura.invoice_pk}</span>
                  <span
                    className={`boleto-badge ${paga ? 'badge-paga' : vencida ? 'badge-vencida' : 'badge-em-dia'}`}
                  >
                    {paga ? 'PAGA' : vencida ? 'VENCIDA' : 'EM DIA'}
                  </span>
                </div>

                <p className="boleto-vencimento" style={vencida ? { color: '#f44336' } : undefined}>
                  Vencimento: {formatarData(fatura.invoice_date_due)}
                </p>

                {paga ? (
                  <p className="boleto-aviso boleto-aviso-paga">✅ Pago em {formatarData(fatura.invoice_date_credit)}</p>
                ) : (
                  <>
                    {vencida && (
                      <p className="boleto-aviso boleto-aviso-vencida">
                        {dias === 1 ? 'Venceu há 1 dia' : `Venceu há ${dias} dias`}
                      </p>
                    )}

                    {valorAtualizado != null ? (
                      <>
                        <span className="boleto-label-valor">Valor atualizado</span>
                        <p className="boleto-valor">R$ {formatarValor(valorAtualizado)}</p>
                        <p className="boleto-valor-original">Original: R$ {formatarValor(fatura.invoice_amount_document)}</p>
                        <p className="boleto-taxas">
                          Multa de {fatura.invoice_rate_fine?.replace('.', ',')}% + juros de{' '}
                          {fatura.invoice_rate_interest?.replace('.', ',')}% ao dia ({dias}d de atraso)
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="boleto-label-valor">Valor total</span>
                        <p className="boleto-valor">R$ {formatarValor(fatura.invoice_amount_document)}</p>
                      </>
                    )}
                  </>
                )}

                {fatura.contract_number != null && (
                  <p className="boleto-contrato">Contrato {fatura.contract_number}</p>
                )}

                {!paga && (
                  <div className="boleto-acoes">
                    <button onClick={() => aoCopiar(`barcode-${fatura.invoice_pk}`, fatura.invoice_barcode)}>
                      {copiado === `barcode-${fatura.invoice_pk}` ? '✓ Copiado!' : 'Copiar código de barras'}
                    </button>
                    <button onClick={() => aoCopiar(`pix-${fatura.invoice_pk}`, fatura.invoice_qrcode)}>
                      {copiado === `pix-${fatura.invoice_pk}` ? '✓ Copiado!' : 'Copiar PIX'}
                    </button>
                    {fatura.invoice_qrcode_image && (
                      <button onClick={() => setQrCodeAberto(fatura.invoice_qrcode_image!)}>Ver QR Code</button>
                    )}
                    <button onClick={() => window.open(urlImpressaoBoleto(fatura.invoice_pk), '_blank')}>
                      Ver boleto em PDF
                    </button>
                    {!jaInformado && fatura.contract_pk != null && (
                      <button
                        className="boleto-btn-informar"
                        disabled={informando === fatura.invoice_pk}
                        onClick={() => setConfirmando(fatura)}
                      >
                        {informando === fatura.invoice_pk ? 'Enviando…' : 'Informar pagamento'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {filtroStatus === 'pagos' && !mostrarTodosPagos && faturasExibidas.length < faturasFiltradas.length && (
        <button className="boletos-ver-mais" onClick={() => setMostrarTodosPagos(true)}>
          Ver mais boletos pagos ({faturasFiltradas.length - faturasExibidas.length})
        </button>
      )}

      {qrCodeAberto && (
        <div className="boletos-modal-fundo" onClick={() => setQrCodeAberto(null)}>
          <div className="boletos-modal" onClick={(evento) => evento.stopPropagation()}>
            <img src={qrCodeAberto} alt="QR Code do PIX" />
            <button onClick={() => setQrCodeAberto(null)}>Fechar</button>
          </div>
        </div>
      )}

      {confirmando && (
        <div className="boletos-modal-fundo" onClick={() => setConfirmando(null)}>
          <div className="boletos-modal boletos-modal-confirmar" onClick={(evento) => evento.stopPropagation()}>
            <h2>Informar pagamento</h2>
            <p>
              Deseja informar o pagamento deste boleto para liberação temporária da conexão? Para pagamentos com
              boleto, a compensação poderá ocorrer em até 72h úteis.
            </p>
            <div className="boletos-modal-acoes">
              <button onClick={() => setConfirmando(null)}>Cancelar</button>
              <button className="boleto-btn-informar" onClick={confirmarInformarPagamento}>
                Sim, informar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
