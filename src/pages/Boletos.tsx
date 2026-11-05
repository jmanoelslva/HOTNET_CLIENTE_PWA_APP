import { useEffect, useMemo, useState } from 'react'
import { MdKeyboardArrowRight } from 'react-icons/md'
import { IcCheckCircle, IcDescription, IcPayments, IcTask } from '../components/IconesApp'
import { useLocation, useNavigate } from 'react-router-dom'
import CabecalhoTela from '../components/CabecalhoTela'
import CartaoBoleto from '../components/CartaoBoleto'
import FolhaConfirmar from '../components/FolhaConfirmar'
import FolhaQrCode from '../components/FolhaQrCode'
import { AbasPilula, BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
import Skeleton from '../components/Skeleton'
import EstadoVazio from '../components/EstadoVazio'
import PullToRefresh from '../components/PullToRefresh'
import { useToast } from '../components/Toast/useToast'
import ReciboModal from '../components/ReciboModal'
import { useSessao } from '../auth/useSessao'
import { abrirEImprimir } from '../utils/impressao'
import { abaDoPagamento, estaVencida, formatarDataBr, formatarMoeda, textoVencimento, valorAtual } from '../utils/faturas'
import {
  ApiError,
  SessaoExpiradaError,
  informarPagamento,
  listarBoletos,
  urlImpressaoBoleto,
  type FaturaDto,
} from '../api/client'
import './Boletos.css'

const LIMITE_PAGOS_PADRAO = 3

type FiltroStatus = 'aberto' | 'atrasados' | 'pagos'

function formatarContagem(qtd: number): string {
  return qtd > 99 ? '99+' : String(qtd)
}

export default function Boletos() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { cpf } = useSessao()
  const estadoNavegacao = location.state as { contratoPk?: number; filtro?: FiltroStatus; pagar?: boolean } | null
  const contratoPreSelecionado = estadoNavegacao?.contratoPk ?? null

  const [faturas, setFaturas] = useState<FaturaDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // "Ver boletos em atraso" (cartão de conexão bloqueada na Início) abre direto na aba Atrasado.
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>(estadoNavegacao?.filtro ?? 'aberto')
  const [filtroContrato, setFiltroContrato] = useState<number | null>(contratoPreSelecionado)
  const [mostrarTodosPagos, setMostrarTodosPagos] = useState(false)

  const [qrCodeAberto, setQrCodeAberto] = useState<string | null>(null)
  const [abertaPk, setAbertaPk] = useState<number | null>(null)
  const [confirmando, setConfirmando] = useState<FaturaDto | null>(null)
  const [reciboAberto, setReciboAberto] = useState<FaturaDto | null>(null)
  const [informados, setInformados] = useState<Set<number>>(new Set())
  // Botão Pagar: a aba sai das faturas, então só é escolhida depois que elas chegam; cada
  // toque (location.key novo, mesmo com a tela já aberta) escolhe de novo, uma vez.
  const pedidoPagar = estadoNavegacao?.pagar ? location.key : null
  const [pagarAtendido, setPagarAtendido] = useState<string | null>(null)
  if (pedidoPagar && pedidoPagar !== pagarAtendido && !carregando) {
    setPagarAtendido(pedidoPagar)
    setFiltroContrato(null)
    setMostrarTodosPagos(false)
    setFiltroStatus(abaDoPagamento(faturas))
  }

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

  // Na aba Atrasados, os boletos ainda a vencer aparecem embaixo: o atrasado é o "próximo"
  // a pagar e os demais seguem na sequência, sem precisar trocar de aba.
  const aVencer = useMemo(
    () =>
      porContrato
        .filter((f) => !f.invoice_date_credit && !estaVencida(f))
        .sort((x, y) => (x.invoice_date_due ?? '').localeCompare(y.invoice_date_due ?? '')),
    [porContrato],
  )

  const faturasExibidas =
    filtroStatus === 'aberto' || mostrarTodosPagos ? faturasFiltradas : faturasFiltradas.slice(0, LIMITE_PAGOS_PADRAO)

  function trocarStatus(status: FiltroStatus) {
    setFiltroStatus(status)
    setMostrarTodosPagos(false)
  }

  async function confirmarInformarPagamento() {
    const fatura = confirmando
    if (!fatura || fatura.contract_pk == null) return
    setConfirmando(null)
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
    }
  }

  return (
    <PullToRefresh aoAtualizar={carregar}>
    <div className="boletos-tela tela-entrada">
      <CabecalhoTela titulo="Boletos" subtitulo="Pague, consulte e baixe seus recibos." />

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

      {!carregando && !erro && faturasExibidas.length > 0 && filtroStatus !== 'pagos' && (() => {
        // Como no app: o mais urgente em cartão grafite; os demais compactos, que abrem ao tocar.
        const ordenadas = [...faturasExibidas].sort((x, y) => (x.invoice_date_due ?? '').localeCompare(y.invoice_date_due ?? ''))
        const [destaque, ...demais] = ordenadas
        const cartao = (fatura: FaturaDto) => (
          <CartaoBoleto
            key={fatura.invoice_pk}
            fatura={fatura}
            variante="boletos"
            jaInformado={informados.has(fatura.invoice_pk) || fatura.obs_pk != null}
            onVerContrato={() => navigate('/contratos', { state: { contratoPk: fatura.contract_pk }, viewTransition: true })}
            onQrCode={setQrCodeAberto}
            onJaPaguei={() => setConfirmando(fatura)}
            onImprimir={() =>
              abrirEImprimir(urlImpressaoBoleto(fatura.invoice_pk), () => toast('Não foi possível abrir o boleto agora. Tente novamente.'))
            }
          />
        )
        const compactaOuCartao = (fatura: FaturaDto) =>
          abertaPk === fatura.invoice_pk ? (
            cartao(fatura)
          ) : (
            <button key={fatura.invoice_pk} type="button" className="fatura-compacta" onClick={() => setAbertaPk(fatura.invoice_pk)}>
              <span className="fatura-compacta-textos">
                <strong>{formatarMoeda(valorAtual(fatura))}</strong>
                <span className={estaVencida(fatura) ? 'atrasada' : ''}>
                  {textoVencimento(fatura)}
                  {fatura.contract_number != null ? ` · Contrato ${fatura.contract_number}` : ''}
                </span>
              </span>
              <MdKeyboardArrowRight size={24} aria-hidden="true" />
            </button>
          )
        return (
          <div className="boletos-lista">
            {cartao(destaque)}
            {demais.length > 0 && <RotuloGrupo>{filtroStatus === 'atrasados' ? 'Outros atrasados' : 'Próximos'}</RotuloGrupo>}
            {demais.map(compactaOuCartao)}
            {filtroStatus === 'atrasados' && aVencer.length > 0 && (
              <>
                <RotuloGrupo>A vencer</RotuloGrupo>
                {aVencer.map(compactaOuCartao)}
              </>
            )}
          </div>
        )
      })()}

      {!carregando && !erro && faturasExibidas.length > 0 && filtroStatus === 'pagos' && (
        <>
          {/* Atalho da declaração anual (como na aba Pagos do app Android). */}
          <BlocoBranco>
            <LinhaItem icone={IcTask} tom="primaria" titulo="Declaração de quitação" onClick={() => navigate('/quitacao', { viewTransition: true })} />
          </BlocoBranco>
          <RotuloGrupo>Últimos pagos</RotuloGrupo>
          <div className="bloco-branco">
            {faturasExibidas.map((fatura, i) => (
              <div key={fatura.invoice_pk} className={`fatura-paga ${i > 0 ? 'com-divisoria' : ''}`}>
                <span className="fatura-paga-textos">
                  <span className="fatura-paga-topo">
                    <strong>{formatarMoeda(Number.parseFloat((fatura.invoice_amount_paid || fatura.invoice_amount_document || '0').replace(',', '.')) || 0)}</strong>
                    <span className="fatura-paga-selo">Pago</span>
                  </span>
                  <span className="fatura-paga-data">Pago em {formatarDataBr(fatura.invoice_date_credit)}</span>
                </span>
                <button
                  type="button"
                  className="fatura-paga-recibo"
                  onClick={() => setReciboAberto(fatura)}
                  aria-label={`Recibo do pagamento de ${formatarDataBr(fatura.invoice_date_credit)}`}
                >
                  <IcDescription size={16} /> Recibo
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

      {qrCodeAberto && <FolhaQrCode imagem={qrCodeAberto} onFechar={() => setQrCodeAberto(null)} />}

      <FolhaConfirmar
        aberto={confirmando != null}
        titulo="Informar pagamento"
        texto="Confirma que já pagou este boleto? Isso libera sua conexão temporariamente enquanto o pagamento é processado."
        icone={IcCheckCircle}
        confirmar="Sim, já paguei"
        onCancelar={() => setConfirmando(null)}
        onConfirmar={confirmarInformarPagamento}
      />
    </div>
    </PullToRefresh>
  )
}
