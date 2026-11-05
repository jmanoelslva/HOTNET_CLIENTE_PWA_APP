import { useEffect, useMemo, useState } from 'react'
import { IcBarcode, IcCheckCircle, IcDescription, IcDownload, IcPayments, IcPix, IcQrCodeScanner, IcReceiptLong, IcTask } from '../components/IconesApp'
import { useLocation, useNavigate } from 'react-router-dom'
import CabecalhoTela from '../components/CabecalhoTela'
import { mostrarAvisoCopiado } from '../utils/avisoCopiado'
import { AbasPilula, BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
import Skeleton from '../components/Skeleton'
import EstadoVazio from '../components/EstadoVazio'
import PullToRefresh from '../components/PullToRefresh'
import { useToast } from '../components/Toast/useToast'
import ReciboModal from '../components/ReciboModal'
import { useSessao } from '../auth/useSessao'
import { abrirEImprimir } from '../utils/impressao'
import { estaVencida } from '../utils/faturas'
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

type FiltroStatus = 'aberto' | 'atrasados' | 'pagos'

function formatarContagem(qtd: number): string {
  return qtd > 99 ? '99+' : String(qtd)
}

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

/**
 * invoice_qrcode_image pode vir com ou sem o prefixo "data:image/...;base64,". Só aceita
 * imagem em base64: qualquer outra coisa vira uma imagem inválida e cai no aviso de
 * "QR Code indisponível" (antes aparecia o ícone de imagem quebrada).
 */
function srcQrCode(valor: string): string {
  const texto = valor.trim()
  if (/^data:image\/[a-z+]+;base64,/i.test(texto)) return texto
  return `data:image/png;base64,${texto}`
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
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { cpf } = useSessao()
  const estadoNavegacao = location.state as { contratoPk?: number; filtro?: FiltroStatus } | null
  const contratoPreSelecionado = estadoNavegacao?.contratoPk ?? null

  const [faturas, setFaturas] = useState<FaturaDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // "Ver boletos em atraso" (cartão de conexão bloqueada na Início) abre direto na aba Atrasado.
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>(estadoNavegacao?.filtro ?? 'aberto')
  const [filtroContrato, setFiltroContrato] = useState<number | null>(contratoPreSelecionado)
  const [mostrarTodosPagos, setMostrarTodosPagos] = useState(false)

  const [copiado, setCopiado] = useState<string | null>(null)
  const [qrCodeAberto, setQrCodeAberto] = useState<string | null>(null)
  // Imagem do QR não carregou (base64 inválido): mostra o aviso em vez da imagem quebrada.
  const [qrIndisponivel, setQrIndisponivel] = useState(false)
  const [confirmando, setConfirmando] = useState<FaturaDto | null>(null)
  const [reciboAberto, setReciboAberto] = useState<FaturaDto | null>(null)
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

  const porContrato = useMemo(
    () => (filtroContrato != null ? faturas.filter((f) => f.contract_pk === filtroContrato) : faturas),
    [faturas, filtroContrato],
  )

  // Contagens pras abas — respeitam o filtro de contrato, não o de status.
  const contagens = useMemo(
    () => ({
      aberto: porContrato.filter((f) => !f.invoice_date_credit && !estaVencida(f)).length,
      atrasados: porContrato.filter(estaVencida).length,
      pagos: porContrato.filter((f) => !!f.invoice_date_credit).length,
    }),
    [porContrato],
  )

  const faturasFiltradas = useMemo(() => {
    switch (filtroStatus) {
      case 'aberto':
        return porContrato.filter((f) => !f.invoice_date_credit && !estaVencida(f))
      case 'atrasados':
        return porContrato.filter(estaVencida)
      case 'pagos':
        return porContrato.filter((f) => !!f.invoice_date_credit)
    }
  }, [porContrato, filtroStatus])

  const faturasExibidas =
    filtroStatus === 'aberto' || mostrarTodosPagos ? faturasFiltradas : faturasFiltradas.slice(0, LIMITE_PAGOS_PADRAO)

  function trocarStatus(status: FiltroStatus) {
    setFiltroStatus(status)
    setMostrarTodosPagos(false)
  }

  function fecharQrCode() {
    setQrCodeAberto(null)
    setQrIndisponivel(false)
  }

  async function aoCopiar(chave: string, valor: string | null | undefined) {
    const usandoFallback = !valor
    const texto = valor || CNPJ_FALLBACK
    const ok = await copiarTexto(texto)
    if (ok) {
      setCopiado(chave)
      mostrarAvisoCopiado(
        usandoFallback ? 'Chave Pix copiada' : chave.startsWith('barcode') ? 'Código de barras copiado' : 'Código Pix copiado',
        'Cole no app do seu banco',
      )
      setTimeout(() => setCopiado((atual) => (atual === chave ? null : atual)), 1500)
      if (usandoFallback) {
        toast(
          'Você copiou os dados da empresa (CNPJ). Após realizar o pagamento, envie o comprovante para o nosso WhatsApp.',
          'info',
        )
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
        toast('Pagamento informado com sucesso! Sua conexão será liberada.', 'sucesso')
      } else {
        toast(resposta.message ?? 'Erro ao informar pagamento.')
      }
    } catch {
      toast('Não foi possível informar o pagamento agora. Tente novamente.')
    } finally {
      setInformando(null)
    }
  }

  return (
    <PullToRefresh aoAtualizar={carregar}>
    <div className="boletos-tela tela-entrada">
      <CabecalhoTela titulo="Boletos" subtitulo="Acompanhe seus boletos em aberto e pagos." />

      <div className="boletos-abas">
        <button
          className={`aba-chip aba-aberto ${filtroStatus === 'aberto' ? 'ativa' : ''}`}
          onClick={() => trocarStatus('aberto')}
        >
          <span className="aba-chip-texto">Em aberto</span>
          {contagens.aberto > 0 && <span className="aba-chip-contagem">{formatarContagem(contagens.aberto)}</span>}
        </button>
        <button
          className={`aba-chip aba-atrasados ${filtroStatus === 'atrasados' ? 'ativa' : ''}`}
          onClick={() => trocarStatus('atrasados')}
        >
          <span className="aba-chip-texto">Atrasado</span>
          {contagens.atrasados > 0 && (
            <span className="aba-chip-contagem">{formatarContagem(contagens.atrasados)}</span>
          )}
        </button>
        <button
          className={`aba-chip aba-pagos ${filtroStatus === 'pagos' ? 'ativa' : ''}`}
          onClick={() => trocarStatus('pagos')}
        >
          <span className="aba-chip-texto">Pago</span>
          {contagens.pagos > 0 && <span className="aba-chip-contagem">{formatarContagem(contagens.pagos)}</span>}
        </button>
      </div>

      {contratos.length > 1 && (
        <div className="boletos-seletor-contrato">
          <AbasPilula<string>
            rotulo="Contrato"
            opcoes={[
              { valor: 'todos', rotulo: 'Todos' },
              ...contratos.map(([pk, numero]) => ({ valor: String(pk), rotulo: `Nº ${numero}` })),
            ]}
            selecionada={filtroContrato != null ? String(filtroContrato) : 'todos'}
            onSelecionar={(v) => setFiltroContrato(v === 'todos' ? null : Number(v))}
          />
        </div>
      )}

      {carregando && (
        <ul className="boletos-lista boletos-esqueleto">
          {[0, 1].map((indice) => (
            <li key={indice} className="cartao-destaque">
              <Skeleton width="55%" height={16} />
              <Skeleton width="35%" height={12} />
              <Skeleton width="45%" height={24} />
              <Skeleton width="30%" height={12} />
            </li>
          ))}
        </ul>
      )}

      {!carregando && erro && (
        <div className="boletos-status">
          <p>{erro}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {!carregando && !erro && faturasFiltradas.length === 0 && (
        <EstadoVazio
          icone={IcPayments}
          titulo={
            filtroStatus === 'aberto'
              ? 'Nenhum boleto em aberto'
              : filtroStatus === 'atrasados'
                ? 'Nenhum boleto atrasado'
                : 'Nenhum boleto pago'
          }
          subtitulo={filtroStatus !== 'pagos' ? 'Você está em dia por aqui.' : undefined}
        />
      )}

      {!carregando && !erro && faturasExibidas.length > 0 && filtroStatus !== 'pagos' && (
        <div className="boletos-lista">
          {faturasExibidas.map((fatura) => {
            const dias = Number.parseInt(fatura.days_late ?? '', 10) || 0
            const vencida = estaVencida(fatura)
            const valorAtualizado = vencida ? calcularValorComEncargos(fatura) : null
            const jaInformado = informados.has(fatura.invoice_pk) || fatura.obs_pk != null
            const pixCopiado = copiado === `pix-${fatura.invoice_pk}`

            // Cartão grafite do boleto (FaturaItem + CartaoDestaque do app Android).
            return (
              <section key={fatura.invoice_pk} className="cartao-destaque boleto-cartao" aria-label={`Boleto ${fatura.invoice_pk}`}>
                <div className="boleto-cartao-topo">
                  <span className="cartao-destaque-rotulo">
                    {vencida ? 'Boleto atrasado' : 'Boleto em aberto'}
                    {fatura.contract_number != null && contratos.length > 1 ? ` · Contrato ${fatura.contract_number}` : ''}
                  </span>
                  {fatura.contract_number != null && (
                    <button
                      type="button"
                      className="boleto-cartao-contrato"
                      onClick={() => navigate('/contratos', { state: { contratoPk: fatura.contract_pk }, viewTransition: true })}
                      aria-label={`Ver contrato ${fatura.contract_number}`}
                    >
                      <IcDescription size={16} />
                    </button>
                  )}
                </div>
                <strong className="boleto-cartao-valor">R$ {formatarValor(valorAtualizado ?? fatura.invoice_amount_document)}</strong>
                <span className={`etiqueta-destaque boleto-cartao-prazo ${vencida ? 'atrasado' : ''}`}>
                  {vencida
                    ? `Venceu em ${formatarData(fatura.invoice_date_due)} · há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
                    : `Vence em ${formatarData(fatura.invoice_date_due)}`}
                </span>
                {valorAtualizado != null && (
                  <span className="boleto-cartao-encargos">
                    Original R$ {formatarValor(fatura.invoice_amount_document)} + multa de{' '}
                    {fatura.invoice_rate_fine?.replace('.', ',')}% e juros de {fatura.invoice_rate_interest?.replace('.', ',')}% ao dia
                  </span>
                )}

                <button
                  type="button"
                  className={`boleto-cartao-pix ${pixCopiado ? 'copiado' : ''}`}
                  onClick={() => aoCopiar(`pix-${fatura.invoice_pk}`, fatura.invoice_qrcode)}
                >
                  {pixCopiado ? <IcCheckCircle size={18} /> : <IcPix size={18} />}
                  {pixCopiado ? 'Código Pix copiado' : 'Copiar código Pix'}
                </button>

                <div className="boleto-cartao-secundarios">
                  {fatura.invoice_qrcode_image && (
                    <button type="button" onClick={() => setQrCodeAberto(fatura.invoice_qrcode_image!)}>
                      <IcQrCodeScanner size={18} /> QR Code
                    </button>
                  )}
                  <button type="button" onClick={() => aoCopiar(`barcode-${fatura.invoice_pk}`, fatura.invoice_barcode)}>
                    <IcBarcode size={18} /> {copiado === `barcode-${fatura.invoice_pk}` ? 'Copiado' : 'Código de barras'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      abrirEImprimir(urlImpressaoBoleto(fatura.invoice_pk), () =>
                        toast('Não foi possível abrir o boleto agora. Tente novamente.'),
                      )
                    }
                  >
                    <IcDownload size={18} /> PDF
                  </button>
                </div>

                {!jaInformado && fatura.contract_pk != null && (
                  <button
                    type="button"
                    className="boleto-cartao-ja-paguei"
                    disabled={informando === fatura.invoice_pk}
                    onClick={() => setConfirmando(fatura)}
                  >
                    {informando === fatura.invoice_pk ? 'Enviando…' : 'Já paguei este boleto'}
                  </button>
                )}
              </section>
            )
          })}
        </div>
      )}

      {!carregando && !erro && faturasExibidas.length > 0 && filtroStatus === 'pagos' && (
        <>
          {/* Atalho da declaração anual (como na aba Pagos do app Android). */}
          <BlocoBranco>
            <LinhaItem icone={IcTask} tom="primaria" titulo="Declaração de quitação" onClick={() => navigate('/quitacao', { viewTransition: true })} />
          </BlocoBranco>
          <RotuloGrupo>Últimos pagos</RotuloGrupo>
          <div className="bloco-branco">
            {faturasExibidas.map((fatura, i) => (
              <div key={fatura.invoice_pk} className={`linha-item boleto-pago ${i > 0 ? 'com-divisoria' : ''}`}>
                <span className="linha-item-icone boleto-pago-icone" aria-hidden="true">
                  <IcCheckCircle size={18} />
                </span>
                <span className="linha-item-textos">
                  <span className="linha-item-titulo">R$ {formatarValor(fatura.invoice_amount_paid || fatura.invoice_amount_document)}</span>
                  <span className="linha-item-rotulo">
                    Pago em {formatarData(fatura.invoice_date_credit)}
                    {fatura.contract_number != null && contratos.length > 1 ? ` · Contrato ${fatura.contract_number}` : ''}
                  </span>
                </span>
                <button type="button" className="botao-contorno boleto-pago-recibo" onClick={() => setReciboAberto(fatura)}>
                  <IcReceiptLong size={16} /> Recibo
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {filtroStatus === 'pagos' && !mostrarTodosPagos && faturasExibidas.length < faturasFiltradas.length && (
        <button className="boletos-ver-mais" onClick={() => setMostrarTodosPagos(true)}>
          Ver mais boletos pagos ({faturasFiltradas.length - faturasExibidas.length})
        </button>
      )}

      {reciboAberto && <ReciboModal fatura={reciboAberto} cpf={cpf} onFechar={() => setReciboAberto(null)} />}

      {qrCodeAberto && (
        <div className="boletos-modal-fundo" onClick={() => fecharQrCode()}>
          <div className="boletos-modal" onClick={(evento) => evento.stopPropagation()}>
            {qrIndisponivel ? (
              <p className="boletos-qr-indisponivel">QR Code indisponível no momento. Use o Pix copia e cola.</p>
            ) : (
              <img src={srcQrCode(qrCodeAberto)} alt="QR Code do PIX" onError={() => setQrIndisponivel(true)} />
            )}
            <button onClick={() => fecharQrCode()}>Fechar</button>
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
    </PullToRefresh>
  )
}
