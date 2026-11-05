import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LuBan,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCircleCheck,
  LuCircleHelp,
  LuChartColumn,
  LuGauge,
  LuHeadset,
  LuLock,
  LuReceipt,
  LuReceiptText,
  LuWifiOff,
  LuWrench,
} from 'react-icons/lu'
import { FaWhatsapp } from 'react-icons/fa'
import { SiPix } from 'react-icons/si'
import { useSessao } from '../auth/useSessao'
import { buscarDadosCliente } from '../api/cadastro'
import { buscarContratos, type Contrato } from '../api/contratos'
import { buscarConsumoDoMes, buscarSessaoAtualPorCpe, totalBytes, vincularContratos, type ConsumoPorContrato } from '../api/consumo'
import { contarBoletosAtrasados, situacaoDosContratos } from '../api/situacao'
import { listarBoletos, type FaturaDto } from '../api/client'
import ChecklistConexao from '../components/ChecklistConexao'
import { useToast } from '../components/Toast/useToast'
import { formatarBytes } from '../utils/formatacao'
import { estaVencida } from '../utils/faturas'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import PullToRefresh from '../components/PullToRefresh'
import './Home.css'

// Chave PIX (CNPJ) quando o boleto não traz código próprio (mesma de Boletos).
const CNPJ_FALLBACK = '17.659.900/0001-48'

function saudacaoPorHorario(primeiroNome: string): string {
  const hora = new Date().getHours()
  const periodo = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
  return `${periodo}, ${primeiroNome}!`
}

function formatarValor(valorBruto: string | undefined): string {
  const valor = Number.parseFloat(String(valorBruto ?? '0').replace(',', '.'))
  return (Number.isFinite(valor) ? valor : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data: string | undefined): string {
  const partes = (data ?? '').split(' ')[0].split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : ''
}

/** Boleto mais urgente: o atrasado mais antigo; senão, o em aberto que vence primeiro. */
function boletoMaisUrgente(faturas: FaturaDto[]): FaturaDto | null {
  const abertas = faturas
    .filter((f) => !f.invoice_date_credit)
    .sort((a, b) => (a.invoice_date_due ?? '').localeCompare(b.invoice_date_due ?? ''))
  return abertas.find(estaVencida) ?? abertas[0] ?? null
}

function ultimoPagamento(faturas: FaturaDto[]): string | null {
  const datas = faturas.map((f) => f.invoice_date_credit).filter((d): d is string => !!d)
  return datas.sort().at(-1) ?? null
}

type EstadoConexao = 'online' | 'offline' | 'verificando' | 'indisponivel' | 'bloqueado' | 'cancelado'

const TITULO: Record<EstadoConexao, string> = {
  online: 'Internet funcionando',
  offline: 'Sem conexão agora',
  verificando: 'Verificando conexão',
  indisponivel: 'Não foi possível verificar',
  bloqueado: 'Conexão bloqueada',
  cancelado: 'Contrato cancelado',
}

const DESCRICAO: Record<EstadoConexao, string> = {
  online: 'Sua internet está funcionando normalmente.',
  offline: 'Não detectamos conexão ativa. Confira se o roteador está ligado.',
  verificando: 'Verificando os detalhes da sua conexão.',
  indisponivel: 'Não conseguimos consultar sua conexão agora. Confira a internet do celular e puxe para atualizar.',
  bloqueado: 'Identificamos um boleto em aberto neste contrato. Após a confirmação do pagamento, a conexão é liberada.',
  cancelado: 'Seu contrato foi cancelado. Fale com a gente se tiver alguma dúvida.',
}

/**
 * Início — mesma ordem do app Android (MainScreen.kt + InicioResumo.kt):
 * saudação com a inicial, faixa da conexão (abre os detalhes ao tocar),
 * cartão grafite do próximo boleto com o PIX, acesso rápido em círculos e
 * o cartão do WhatsApp.
 */
export default function Home() {
  const { cpf } = useSessao()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [nomeExibido, setNomeExibido] = useState('Cliente')
  const [nomeCompleto, setNomeCompleto] = useState<string | null>(null)

  const [consumoContratos, setConsumoContratos] = useState<ConsumoPorContrato[]>([])
  const [cpePkSelecionado, setCpePkSelecionado] = useState<number | null>(null)
  const [planoSemConsumo, setPlanoSemConsumo] = useState<string | null>(null)
  const [online, setOnline] = useState<boolean | null | undefined>(undefined)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [faturas, setFaturas] = useState<FaturaDto[] | null>(null)
  const [detalhesAbertos, setDetalhesAbertos] = useState(false)
  const [pixCopiado, setPixCopiado] = useState(false)
  const [checklistAberto, setChecklistAberto] = useState(false)
  const [boletosAtrasados, setBoletosAtrasados] = useState<number | null>(null)

  useEffect(() => {
    carregarNome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpf])

  useEffect(() => {
    carregarConsumo()
    carregarFaturas()
  }, [])

  async function carregarNome() {
    try {
      const cliente = await buscarDadosCliente(cpf)
      const completo = cliente.client_complete_name?.trim() ?? ''
      const primeiroNome = completo.split(' ')[0]
      if (primeiroNome) {
        setNomeExibido(primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase())
        setNomeCompleto(completo)
      }
    } catch {
      // Saudação fica com "Cliente": não bloqueia a Início.
    }
  }

  async function carregarConsumo() {
    try {
      // Contratos em paralelo: dão o status (bloqueado/cancelado) e o número de cada conexão.
      const [consumo, listaContratos] = await Promise.all([
        buscarConsumoDoMes(new Date().getFullYear(), new Date().getMonth() + 1),
        buscarContratos().catch(() => [] as Contrato[]),
      ])
      const dados = vincularContratos(consumo, listaContratos)
      setContratos(listaContratos)
      setConsumoContratos(dados)
      if (dados.length > 0) {
        setCpePkSelecionado((atual) => (dados.some((c) => c.cpePk === atual) ? atual : dados[0].cpePk))
      } else {
        // Sem consumo registrado (cliente novo, bloqueado ou cancelado): plano e situação só dos contratos.
        setPlanoSemConsumo(listaContratos.find((c) => c.podeVerDados)?.plano ?? listaContratos[0]?.plano ?? null)
      }
    } catch {
      // Sem faixa de conexão, mas o resto da Início continua utilizável.
    }
  }

  async function carregarFaturas() {
    try {
      const resposta = await listarBoletos()
      setFaturas(resposta.success ? (resposta.results ?? []) : [])
    } catch {
      setFaturas([])
    }
  }

  async function atualizar() {
    await Promise.all([carregarNome(), carregarConsumo(), carregarFaturas()])
  }

  const contratoSelecionado = consumoContratos.find((c) => c.cpePk === cpePkSelecionado) ?? null

  // contract_status da conexão mostrada (4 = bloqueado, 5 = cancelado).
  const statusContrato =
    (contratoSelecionado?.contractPk != null
      ? contratos.find((c) => c.id === contratoSelecionado.contractPk)?.status
      : undefined) ?? situacaoDosContratos(contratos)

  useEffect(() => {
    if (!contratoSelecionado) return
    setOnline(undefined)
    let cancelado = false
    buscarSessaoAtualPorCpe(contratoSelecionado.cpePk)
      .then((sessao) => {
        if (!cancelado) setOnline(sessao != null)
      })
      .catch(() => {
        if (!cancelado) setOnline(null)
      })
    return () => {
      cancelado = true
    }
  }, [contratoSelecionado])

  const estado: EstadoConexao =
    statusContrato === 4
      ? 'bloqueado'
      : statusContrato === 5
        ? 'cancelado'
        : online === true
          ? 'online'
          : online === false
            ? 'offline'
            : online === undefined && contratoSelecionado
              ? 'verificando'
              : 'indisponivel'
  const temConexao = contratoSelecionado != null || planoSemConsumo != null || contratos.length > 0
  const problema = estado === 'bloqueado' || estado === 'offline' || estado === 'cancelado'

  const plano = contratoSelecionado?.planoNome ?? planoSemConsumo
  const usoDoMes = contratoSelecionado ? totalBytes(contratoSelecionado) : 0
  const nomeMes = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  const resumo =
    estado !== 'online'
      ? DESCRICAO[estado]
      : plano && usoDoMes > 0
        ? `${plano} · ${formatarBytes(usoDoMes)} em ${nomeMes}`
        : 'Toque para ver os detalhes'

  const boleto = faturas ? boletoMaisUrgente(faturas) : null
  const pagoEm = faturas ? ultimoPagamento(faturas) : null

  async function aoClicarWhatsapp() {
    abrirWhatsappSuporte(nomeCompleto, cpf)
  }

  function abrirDiagnostico() {
    setBoletosAtrasados(null)
    setChecklistAberto(true)
    contarBoletosAtrasados().then(setBoletosAtrasados)
  }

  function ir(rota: string, state?: unknown) {
    navigate(rota, { state, viewTransition: true })
  }

  async function copiarPix(fatura: FaturaDto) {
    const codigo = fatura.invoice_qrcode || null
    try {
      await navigator.clipboard.writeText(codigo ?? CNPJ_FALLBACK)
    } catch {
      toast('Não foi possível copiar. Abra o boleto em Boletos.')
      return
    }
    if (codigo) {
      setPixCopiado(true)
      setTimeout(() => setPixCopiado(false), 2500)
      toast('Código Pix copiado. Cole no app do seu banco.', 'sucesso')
    } else {
      toast(
        'Você copiou a chave Pix (CNPJ). Após realizar o pagamento, envie o comprovante para o nosso WhatsApp.',
        'info',
      )
    }
  }

  const atalhos = [
    { titulo: 'Velocidade', descricao: 'Teste de velocidade', Icone: LuGauge, tom: 'primaria', acao: () => window.open('https://fast.com', '_blank', 'noopener,noreferrer') },
    { titulo: 'Consumo', descricao: 'Uso da internet', Icone: LuChartColumn, tom: 'terciaria', acao: () => ir('/consumo') },
    { titulo: 'Recibos', descricao: 'Boletos pagos', Icone: LuReceipt, tom: 'primaria', acao: () => ir('/boletos', { filtro: 'pagos' }) },
    { titulo: 'Chamado', descricao: 'Abrir um novo chamado', Icone: LuHeadset, tom: 'terciaria', acao: () => ir('/suporte', { abrirNovoChamado: true }) },
    { titulo: 'Dúvidas', descricao: 'Perguntas frequentes', Icone: LuCircleHelp, tom: 'primaria', acao: () => ir('/faq') },
  ] as const

  return (
    <PullToRefresh aoAtualizar={atualizar}>
      <div className="home-tela tela-entrada">
        <header className="home-cabecalho">
          <button type="button" className="home-avatar" onClick={() => ir('/perfil')} aria-label="Abrir o Perfil">
            {nomeExibido.charAt(0).toUpperCase()}
          </button>
          <div className="home-cabecalho-textos">
            <span className="home-saudacao">{saudacaoPorHorario(nomeExibido)}</span>
            <span className="home-subtitulo">O que você precisa hoje?</span>
          </div>
        </header>

        {consumoContratos.length > 1 && (
          <div className="home-seletor" role="tablist" aria-label="Conexão por contrato">
            {consumoContratos.map((c) => (
              <button
                key={c.cpePk}
                type="button"
                role="tab"
                aria-selected={c.cpePk === cpePkSelecionado}
                className={`home-seletor-item ${c.cpePk === cpePkSelecionado ? 'ativo' : ''}`}
                onClick={() => setCpePkSelecionado(c.cpePk)}
              >
                Nº {c.contractNumber ?? c.cpePk}
              </button>
            ))}
          </div>
        )}

        {temConexao &&
          (problema ? (
            <section
              className={`home-faixa-problema ${estado === 'cancelado' ? 'neutra' : ''}`}
              aria-live="polite"
              aria-label="Sua conexão"
            >
              <div className="home-faixa-problema-topo">
                {estado === 'bloqueado' ? <LuLock size={22} aria-hidden="true" /> : estado === 'cancelado' ? <LuBan size={22} aria-hidden="true" /> : <LuWifiOff size={22} aria-hidden="true" />}
                <div>
                  <strong>{TITULO[estado]}</strong>
                  <p>{DESCRICAO[estado]}</p>
                </div>
              </div>
              {estado === 'bloqueado' && (
                <button type="button" className="botao-primario" onClick={() => ir('/boletos', { filtro: 'atrasados' })}>
                  <LuReceiptText size={18} aria-hidden="true" /> Pagar agora
                </button>
              )}
              {estado === 'offline' && (
                <button type="button" className="botao-primario" onClick={abrirDiagnostico}>
                  Fazer diagnóstico
                </button>
              )}
              {estado === 'cancelado' && (
                <button type="button" className="botao-primario" onClick={aoClicarWhatsapp}>
                  Falar no WhatsApp
                </button>
              )}
            </section>
          ) : (
            <section className="home-faixa" aria-label="Sua conexão">
              <button
                type="button"
                className="home-faixa-topo"
                onClick={() => setDetalhesAbertos((v) => !v)}
                aria-expanded={detalhesAbertos}
              >
                <span className={`home-faixa-ponto ${estado}`} aria-hidden="true" />
                <span className="home-faixa-textos" aria-live="polite">
                  <strong>{TITULO[estado]}</strong>
                  <span>{resumo}</span>
                </span>
                <LuChevronDown size={22} className={`home-faixa-seta ${detalhesAbertos ? 'aberta' : ''}`} aria-hidden="true" />
              </button>
              {detalhesAbertos && (
                <div className="home-faixa-detalhes">
                  <div className="home-blocos">
                    <div className="home-bloco">
                      <span>Plano</span>
                      <strong>{plano ?? '—'}</strong>
                    </div>
                    <div className="home-bloco">
                      <span>Uso em {nomeMes}</span>
                      <strong>{usoDoMes > 0 ? formatarBytes(usoDoMes) : '—'}</strong>
                    </div>
                  </div>
                  <div className="home-faixa-botoes">
                    {estado === 'online' && (
                      <a className="botao-contorno" href="https://fast.com" target="_blank" rel="noopener noreferrer">
                        <LuGauge size={18} aria-hidden="true" /> Testar velocidade
                      </a>
                    )}
                    <button type="button" className="botao-contorno" onClick={abrirDiagnostico}>
                      <LuWrench size={18} aria-hidden="true" /> Diagnóstico
                    </button>
                  </div>
                </div>
              )}
            </section>
          ))}

        {boleto ? (
          <section className="home-boleto" aria-label="Próximo boleto">
            <span className="home-boleto-rotulo">
              {estaVencida(boleto) ? 'Boleto atrasado' : 'Próximo boleto'}
              {boleto.contract_number != null && contratos.length > 1 ? ` · Contrato ${boleto.contract_number}` : ''}
            </span>
            <strong className="home-boleto-valor">{formatarValor(boleto.invoice_amount_document)}</strong>
            <span className={`home-boleto-prazo ${estaVencida(boleto) ? 'atrasado' : ''}`}>
              {estaVencida(boleto) ? `Venceu em ${formatarData(boleto.invoice_date_due)}` : `Vence em ${formatarData(boleto.invoice_date_due)}`}
            </span>
            <button type="button" className={`home-boleto-pix ${pixCopiado ? 'copiado' : ''}`} onClick={() => copiarPix(boleto)}>
              {pixCopiado ? <LuCheck size={18} aria-hidden="true" /> : <SiPix size={18} aria-hidden="true" />}
              {pixCopiado ? 'Código Pix copiado' : 'Copiar código Pix'}
            </button>
            <button
              type="button"
              className="home-boleto-secundario"
              onClick={() => ir('/boletos', { filtro: estaVencida(boleto) ? 'atrasados' : 'aberto', contratoPk: boleto.contract_pk })}
            >
              <LuReceiptText size={18} aria-hidden="true" /> Ver boletos
            </button>
          </section>
        ) : (
          pagoEm && (
            <button type="button" className="home-em-dia" onClick={() => ir('/boletos', { filtro: 'pagos' })}>
              <span className="home-em-dia-icone" aria-hidden="true">
                <LuCircleCheck size={22} />
              </span>
              <span className="home-em-dia-textos">
                <strong>Tudo em dia</strong>
                <span>Último pagamento em {formatarData(pagoEm)}</span>
              </span>
              <span className="home-em-dia-acao">
                Ver recibos <LuChevronRight size={18} aria-hidden="true" />
              </span>
            </button>
          )
        )}

        <section className="home-atalhos" aria-labelledby="home-atalhos-titulo">
          <h2 id="home-atalhos-titulo">Acesso rápido</h2>
          <div className="home-atalhos-grade">
            {atalhos.map((a) => (
              <button key={a.titulo} type="button" className="home-atalho" onClick={a.acao} aria-label={`${a.titulo}. ${a.descricao}`}>
                <span className={`home-atalho-icone ${a.tom}`} aria-hidden="true">
                  <a.Icone size={24} />
                </span>
                <span className="home-atalho-titulo" aria-hidden="true">
                  {a.titulo}
                </span>
              </button>
            ))}
          </div>
        </section>

        <button type="button" className="home-whatsapp" onClick={aoClicarWhatsapp}>
          <span className="home-whatsapp-icone" aria-hidden="true">
            <FaWhatsapp size={22} />
          </span>
          <span className="home-whatsapp-textos">
            <strong>Fale com a gente no WhatsApp</strong>
            <span>Atendimento HOTNET</span>
          </span>
          <span className="home-whatsapp-chamar">Chamar</span>
        </button>

        {checklistAberto && (
          <ChecklistConexao
            boletosAtrasados={boletosAtrasados}
            contratoStatus={statusContrato}
            onVerBoletos={() => ir('/boletos')}
            onFechar={() => setChecklistAberto(false)}
            onContinuar={(passos) => ir('/suporte', { abrirNovoChamado: true, passos })}
            onWhatsapp={() => {
              setChecklistAberto(false)
              aoClicarWhatsapp()
            }}
          />
        )}
      </div>
    </PullToRefresh>
  )
}
