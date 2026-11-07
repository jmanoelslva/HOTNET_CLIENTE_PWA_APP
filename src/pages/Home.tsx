import { useEffect, useState } from 'react'
import { MdBlock, MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md'
import { IcCheckCircle, IcConstruction, IcDataUsage, IcHelp, IcLock, IcPayments, IcReceiptLong, IcSpeed, IcSupportAgent, IcWhatsapp, IcWifiOff } from '../components/IconesApp'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessao } from '../auth/useSessao'
import { buscarDadosCliente } from '../api/cadastro'
import { buscarContratos, type Contrato } from '../api/contratos'
import { buscarConsumoDoMes, buscarSessaoAtualPorCpe, totalBytes, vincularContratos, type ConsumoPorContrato } from '../api/consumo'
import { contarBoletosAtrasados, situacaoDosContratos } from '../api/situacao'
import { informarPagamento, listarBoletos, type FaturaDto } from '../api/client'
import FolhaConfirmar from '../components/FolhaConfirmar'
import CartaoBoleto from '../components/CartaoBoleto'
import FolhaQrCode from '../components/FolhaQrCode'
import TourInicio from '../components/TourInicio'
import { tourJaVisto } from '../utils/tour'
import { adiarLembreteSenha, fotoDaConta, lembrarConta, mostrarLembreteSenha } from '../utils/contaLocal'
import ChecklistConexao from '../components/ChecklistConexao'
import { useToast } from '../components/Toast/useToast'
import { formatarBytes } from '../utils/formatacao'
import { estaVencida } from '../utils/faturas'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import PullToRefresh from '../components/PullToRefresh'
import './Home.css'

// "Olá, Nome", como main_saudacao_formato do app.
function saudacaoPorHorario(primeiroNome: string): string {
  return `Olá, ${primeiroNome}`
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
  const [checklistAberto, setChecklistAberto] = useState(false)
  const [boletosAtrasados, setBoletosAtrasados] = useState<number | null>(null)
  const [confirmarJaPaguei, setConfirmarJaPaguei] = useState<FaturaDto | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [informados, setInformados] = useState<Set<number>>(new Set())
  const [lembreteSenha, setLembreteSenha] = useState(() => mostrarLembreteSenha(cpf))
  const foto = fotoDaConta(cpf)
  const location = useLocation()
  // Guia da primeira vez (ou "Veja o guia rápido" em Dúvidas).
  const pediuGuia = (location.state as { tour?: boolean } | null)?.tour === true
  const pediuDiagnostico = (location.state as { diagnostico?: boolean } | null)?.diagnostico === true
  const [tourAberto, setTourAberto] = useState(false)

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
        if (cpf) lembrarConta(cpf, completo)
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

  // Abre o guia quando a tela já tem o que mostrar (faixa e atalhos).
  const telaPronta = faturas != null && (contratos.length > 0 || consumoContratos.length > 0)
  useEffect(() => {
    if (!telaPronta || (!pediuGuia && tourJaVisto())) return
    const t = setTimeout(() => setTourAberto(true), 600)
    return () => clearTimeout(t)
  }, [telaPronta, pediuGuia])
  const pagoEm = faturas ? ultimoPagamento(faturas) : null

  async function aoClicarWhatsapp() {
    abrirWhatsappSuporte(nomeCompleto, cpf)
  }

  function abrirDiagnostico() {
    setBoletosAtrasados(null)
    setChecklistAberto(true)
    contarBoletosAtrasados().then(setBoletosAtrasados)
  }

  // "Fazer diagnóstico" vindo do Teste de velocidade.
  useEffect(() => {
    if (!pediuDiagnostico) return
    navigate('.', { replace: true, state: null })
    abrirDiagnostico()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pediuDiagnostico])

  function ir(rota: string, state?: unknown) {
    navigate(rota, { state, viewTransition: true })
  }

  const atalhos = [
    { titulo: 'Velocidade', descricao: 'Teste de velocidade', Icone: IcSpeed, tom: 'primaria', acao: () => ir('/velocidade') },
    { titulo: 'Consumo', descricao: 'Uso da internet', Icone: IcDataUsage, tom: 'terciaria', acao: () => ir('/consumo') },
    { titulo: 'Recibos', descricao: 'Boletos pagos', Icone: IcReceiptLong, tom: 'primaria', acao: () => ir('/boletos', { filtro: 'pagos' }) },
    { titulo: 'Chamado', descricao: 'Abrir um novo chamado', Icone: IcSupportAgent, tom: 'terciaria', acao: () => ir('/suporte', { abrirNovoChamado: true }) },
    { titulo: 'Dúvidas', descricao: 'Perguntas frequentes', Icone: IcHelp, tom: 'primaria', acao: () => ir('/faq') },
  ] as const

  return (
    <PullToRefresh aoAtualizar={atualizar}>
      <div className="home-tela tela-entrada">
        <header className="home-cabecalho topo-fixo">
          <button type="button" className="home-avatar" onClick={() => ir('/perfil')} aria-label="Abrir o Perfil">
            {foto ? <img src={foto} alt="" /> : nomeExibido.charAt(0).toUpperCase()}
          </button>
          <div className="home-cabecalho-textos">
            <h1 className="home-saudacao">{saudacaoPorHorario(nomeExibido)}</h1>
            <span className="home-subtitulo">O que você precisa hoje?</span>
          </div>
        </header>

        {lembreteSenha && (
          <section className="home-lembrete" aria-label="Senha padrão">
            <strong>Sua senha ainda é a padrão</strong>
            <span>Deseja criar uma senha só sua?</span>
            <div className="home-lembrete-acoes">
              <button
                type="button"
                className="botao-contorno"
                onClick={() => {
                  setLembreteSenha(false)
                  if (cpf) adiarLembreteSenha(cpf)
                }}
              >
                Agora não
              </button>
              <button type="button" className="botao-primario" onClick={() => ir('/alterar-senha')}>
                Criar senha
              </button>
            </div>
          </section>
        )}

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
                {estado === 'bloqueado' ? <IcLock size={22} aria-hidden="true" /> : estado === 'cancelado' ? <MdBlock size={22} aria-hidden="true" /> : <IcWifiOff size={22} aria-hidden="true" />}
                <div>
                  <strong>{TITULO[estado]}</strong>
                  <p>{DESCRICAO[estado]}</p>
                </div>
              </div>
              {estado === 'bloqueado' && (
                <button type="button" className="botao-primario" onClick={() => ir('/boletos', { filtro: 'atrasados' })}>
                  <IcPayments size={18} aria-hidden="true" /> Pagar agora
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
                <MdKeyboardArrowDown size={22} className={`home-faixa-seta ${detalhesAbertos ? 'aberta' : ''}`} aria-hidden="true" />
              </button>
              {detalhesAbertos && (
                <div className="home-faixa-detalhes">
                  <p className="sr-only">{`Plano: ${plano ?? 'não informado'}. Uso em ${nomeMes}: ${usoDoMes > 0 ? formatarBytes(usoDoMes) : 'sem dados'}.`}</p>
                  <div className="home-blocos" aria-hidden="true">
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
                      <button type="button" className="botao-contorno" onClick={() => ir('/velocidade')}>
                        <IcSpeed size={18} aria-hidden="true" /> Testar velocidade
                      </button>
                    )}
                    <button type="button" className="botao-contorno" onClick={abrirDiagnostico}>
                      <IcConstruction size={18} aria-hidden="true" /> Diagnóstico
                    </button>
                  </div>
                </div>
              )}
            </section>
          ))}

        {boleto ? (
          <CartaoBoleto
            fatura={boleto}
            variante="inicio"
            mostrarContrato={contratos.length > 1}
            jaInformado={informados.has(boleto.invoice_pk) || boleto.obs_pk != null}
            onVerBoletos={() => ir('/boletos', { filtro: estaVencida(boleto) ? 'atrasados' : 'aberto', contratoPk: boleto.contract_pk })}
            onQrCode={setQrCode}
            onJaPaguei={() => setConfirmarJaPaguei(boleto)}
          />
        ) : (
          pagoEm && (
            <button type="button" className="home-em-dia" onClick={() => ir('/boletos', { filtro: 'pagos' })}>
              <span className="home-em-dia-icone" aria-hidden="true">
                <IcCheckCircle size={22} />
              </span>
              <span className="home-em-dia-textos">
                <strong>Tudo em dia</strong>
                <span>Último pagamento em {formatarData(pagoEm)}</span>
              </span>
              <span className="home-em-dia-acao">
                Ver recibos <MdKeyboardArrowRight size={18} aria-hidden="true" />
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
            <IcWhatsapp size={22} />
          </span>
          <span className="home-whatsapp-textos">
            <strong>Fale com a gente no WhatsApp</strong>
            <span>Atendimento HOTNET</span>
          </span>
          <span className="home-whatsapp-chamar">Chamar</span>
        </button>

        {qrCode && <FolhaQrCode imagem={qrCode} onFechar={() => setQrCode(null)} />}

        {tourAberto && (
          <TourInicio
            onFim={() => {
              setTourAberto(false)
              if (pediuGuia) navigate('.', { replace: true, state: null })
            }}
          />
        )}

        <FolhaConfirmar
          aberto={confirmarJaPaguei != null}
          titulo="Informar pagamento"
          texto="Confirma que já pagou este boleto? Isso libera sua conexão temporariamente enquanto o pagamento é processado."
          icone={IcCheckCircle}
          confirmar="Sim, já paguei"
          onCancelar={() => setConfirmarJaPaguei(null)}
          onConfirmar={async () => {
            const f = confirmarJaPaguei
            setConfirmarJaPaguei(null)
            if (!f || f.contract_pk == null) return
            try {
              const r = await informarPagamento(f.invoice_pk, f.contract_pk)
              if (r.success) {
                setInformados((atual) => new Set(atual).add(f.invoice_pk))
                toast('Pagamento informado! Sua conexão será liberada.', 'sucesso')
              } else {
                toast(r.message ?? 'Não foi possível informar o pagamento.')
              }
            } catch {
              toast('Não foi possível informar o pagamento agora. Tente novamente.')
            }
          }}
        />

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
