import { useEffect, useState } from 'react'
import { MdAdd, MdKeyboardArrowRight } from 'react-icons/md'
import { IcCampaign, IcCheckCircle, IcClose, IcConstruction, IcPayments, IcSell, IcSupportAgent, IcSwapHoriz, IcWarning, IcWhatsapp } from '../components/IconesApp'
import { useLocation, useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'
import { useSessao } from '../auth/useSessao'
import {
  buscarCategorias,
  buscarChamados,
  chamadoResolvido,
  abrirChamado as apiAbrirChamado,
  type ChamadoCriado,
} from '../api/suporte'
import { buscarContratos } from '../api/contratos'
import { buscarDadosCliente } from '../api/cadastro'
import { contarBoletosAtrasados, situacaoDosContratos } from '../api/situacao'
import ChecklistConexao from '../components/ChecklistConexao'
import NovoChamado from '../components/NovoChamado'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import type { CategoriaDto, TicketDto } from '../api/client'
import CabecalhoTela from '../components/CabecalhoTela'
import { AbasPilula } from '../components/PadraoTelas'
import { useToast } from '../components/Toast/useToast'
import Skeleton from '../components/Skeleton'
import EstadoVazio from '../components/EstadoVazio'
import PullToRefresh from '../components/PullToRefresh'
import { CORES } from '../utils/cores'
import './Suporte.css'

const TAMANHO_PAGINA = 20

type Aba = 'abertos' | 'resolvidos'

// Ícone de cada categoria pelo nome exato configurado no painel do
// Controllr (não é lista fixa) — categoria desconhecida cai no padrão.
const ICONE_PADRAO = IcSupportAgent
const ICONES_CATEGORIA: Record<string, IconType> = {
  'suporte técnico': IcSupportAgent,
  'financeiro e pagamentos': IcPayments,
  'vendas e comercial': IcSell,
  'alteração de plano': IcSwapHoriz,
  'reclamação': IcWarning,
  cancelamento: IcClose,
  'ouvidoria e adminstrativo': IcCampaign,
  'ouvidoria e administrativo': IcCampaign,
  instalação: IcConstruction,
}

function iconeParaCategoria(nome: string): IconType {
  return ICONES_CATEGORIA[nome.trim().toLowerCase()] ?? ICONE_PADRAO
}

// Uma cor por categoria (reaproveitando a mesma paleta usada nos badges
// do menu/Faq), pra bater o olho na categoria sem precisar ler o texto —
// categoria desconhecida cai numa cor neutra.
const COR_PADRAO_CATEGORIA = CORES.textoDesabilitado
const CORES_CATEGORIA: Record<string, string> = {
  'suporte técnico': CORES.suporte,
  'financeiro e pagamentos': CORES.boletos,
  'vendas e comercial': CORES.dados,
  'alteração de plano': CORES.consumo,
  'reclamação': CORES.erro,
  cancelamento: CORES.contratos,
  'ouvidoria e adminstrativo': CORES.ajuda,
  'ouvidoria e administrativo': CORES.ajuda,
  instalação: CORES.primaria,
}

function corParaCategoria(nome: string): string {
  return CORES_CATEGORIA[nome.trim().toLowerCase()] ?? COR_PADRAO_CATEGORIA
}

function formatarData(data: string | null | undefined): string | null {
  if (!data) return null
  const soData = data.split(' ')[0]
  const partes = soData.split('-')
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
  return soData
}

export default function Suporte() {
  const { cpf } = useSessao()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [chamados, setChamados] = useState<TicketDto[]>([])
  const [totalNoServidor, setTotalNoServidor] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>('abertos')

  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const [checklistAberto, setChecklistAberto] = useState(false)
  const [novoChamadoAberto, setNovoChamadoAberto] = useState(false)
  // Passos marcados no checklist de conexão: vão junto no texto do chamado.
  const [passosFeitos, setPassosFeitos] = useState<string[]>([])
  const [contratoStatus, setContratoStatus] = useState<number | null>(null)
  const [boletosAtrasados, setBoletosAtrasados] = useState<number | null>(null)
  const location = useLocation()

  useEffect(() => {
    carregar()
    carregarCategorias()
    // Todos os contratos cancelados: atendimento só pelo WhatsApp (checklist e novo chamado).
    buscarContratos()
      .then((contratos) => setContratoStatus(situacaoDosContratos(contratos)))
      .catch(() => setContratoStatus(null))
    // "Diagnóstico" da Início → "abrir chamado": já chega no formulário, com os passos feitos.
    const vindoDaInicio = location.state as { abrirNovoChamado?: boolean; passos?: string[] } | null
    if (vindoDaInicio?.abrirNovoChamado) {
      abrirNovoChamado(vindoDaInicio.passos ?? [])
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregarCategorias() {
    try {
      setCategorias(await buscarCategorias())
    } catch {
      // abrirDialog() tenta de novo na próxima vez que o cliente tocar em "Novo chamado"
    }
  }

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const pagina = await buscarChamados(0, TAMANHO_PAGINA)
      setChamados(pagina.chamados)
      setTotalNoServidor(pagina.total)
    } catch {
      setErro('Não foi possível carregar os chamados. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarMais() {
    setCarregandoMais(true)
    try {
      const pagina = await buscarChamados(chamados.length, TAMANHO_PAGINA)
      setChamados((atual) => [...atual, ...pagina.chamados])
      setTotalNoServidor(pagina.total)
    } catch {
      toast('Não foi possível carregar mais chamados.')
    } finally {
      setCarregandoMais(false)
    }
  }

  const filtrados = chamados.filter((c) => (aba === 'resolvidos' ? chamadoResolvido(c) : !chamadoResolvido(c)))
  // O backend não filtra por status (a paginação é sobre TODOS os chamados,
  // ver buscarChamados) — a aba filtra só o que já foi carregado. Por isso,
  // uma aba vazia não significa necessariamente "não existe": pode ser só
  // que os chamados desse tipo ainda não foram trazidos do servidor.
  const haMaisParaCarregar = chamados.length < totalNoServidor

  function abrirChecklist() {
    setBoletosAtrasados(null)
    setChecklistAberto(true)
    contarBoletosAtrasados().then(setBoletosAtrasados)
  }

  function abrirNovoChamado(passos: string[]) {
    if (categorias.length === 0) carregarCategorias()
    setPassosFeitos(passos)
    setNovoChamadoAberto(true)
  }

  async function enviarChamado(categoriaPk: number, assunto: string, descricao: string): Promise<ChamadoCriado | null> {
    try {
      const criado = await apiAbrirChamado(cpf, categoriaPk, assunto, descricao)
      carregar()
      return criado
    } catch (excecao) {
      toast(excecao instanceof Error ? excecao.message : 'Não foi possível abrir o chamado.')
      return null
    }
  }

  async function falarNoWhatsapp() {
    try {
      const cliente = await buscarDadosCliente(cpf)
      abrirWhatsappSuporte(cliente.client_complete_name ?? null, cpf)
    } catch {
      abrirWhatsappSuporte(null, cpf)
    }
  }

  return (
    <PullToRefresh aoAtualizar={carregar}>
    <div className="suporte-tela tela-entrada">
      <CabecalhoTela titulo="Suporte" subtitulo="Fale com a equipe HOTNET." />

      {/* Atalhos no topo (AtalhoSuporte do app Android), no lugar do botão flutuante. */}
      <div className="suporte-atalhos">
        <button type="button" className="suporte-atalho" onClick={abrirChecklist} aria-label="Novo chamado">
          <span className="suporte-atalho-icone novo" aria-hidden="true">
            <MdAdd size={18} />
          </span>
          <strong>Novo chamado</strong>
          <span>Acompanhe pelo app</span>
        </button>
        <button type="button" className="suporte-atalho" onClick={falarNoWhatsapp}>
          <span className="suporte-atalho-icone whatsapp" aria-hidden="true">
            <IcWhatsapp size={18} />
          </span>
          <strong>WhatsApp</strong>
          <span>Resposta rápida</span>
        </button>
      </div>

      <div className="suporte-abas-pilula">
        <AbasPilula<Aba>
          rotulo="Chamados"
          opcoes={[
            { valor: 'abertos', rotulo: 'Abertos', contador: chamados.filter((c) => !chamadoResolvido(c)).length },
            { valor: 'resolvidos', rotulo: 'Resolvidos' },
          ]}
          selecionada={aba}
          onSelecionar={setAba}
        />
      </div>

      {carregando && (
        <ul className="suporte-lista">
          {[0, 1, 2].map((indice) => (
            <li key={indice} className="ticket-card">
              <Skeleton width="60%" height={15} />
              <Skeleton width="40%" height={12} />
              <Skeleton width="50%" height={12} />
            </li>
          ))}
        </ul>
      )}

      {!carregando && erro && (
        <div className="suporte-status">
          <p>{erro}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {!carregando && !erro && filtrados.length === 0 && !haMaisParaCarregar && (
        aba === 'resolvidos' ? (
          <EstadoVazio icone={IcSupportAgent} titulo="Nenhum chamado resolvido ainda" />
        ) : (
          <EstadoVazio icone={IcCheckCircle} tom="sucesso" titulo="Você não tem chamados em aberto" />
        )
      )}

      {!carregando && !erro && filtrados.length === 0 && haMaisParaCarregar && (
        <div className="suporte-status">
          <p>
            Nenhum chamado {aba === 'resolvidos' ? 'resolvido' : 'em aberto'} entre os já carregados — toque em
            "Carregar mais" abaixo para continuar procurando.
          </p>
        </div>
      )}

      {!carregando && !erro && filtrados.length > 0 && (
        <ul className="suporte-lista">
          {filtrados.map((chamado) => {
            const resolvido = chamadoResolvido(chamado)
            return (
              <li key={chamado.ticket_pk}>
                <button
                  type="button"
                  className="ticket-card"
                  onClick={() => navigate(`/suporte/${chamado.ticket_pk}`, { state: { chamado }, viewTransition: true })}
                >
                  {(() => {
                    const IconeCategoria = iconeParaCategoria(chamado.category_name ?? '')
                    return (
                      <span className="ticket-topo">
                        <span className="ticket-icone" aria-hidden="true">
                          <IconeCategoria size={18} />
                        </span>
                        <span className="ticket-textos">
                          <strong className="ticket-assunto">{chamado.ticket_title ?? 'Sem título'}</strong>
                          <span className="ticket-meta">
                            {chamado.category_name ?? 'Categoria não informada'} · Protocolo{' '}
                            {chamado.ticket_protocol ?? chamado.ticket_pk}
                          </span>
                        </span>
                        <span className={`ticket-estado ${resolvido ? 'resolvido' : 'aberto'}`}>
                          {resolvido ? 'Resolvido' : 'Em aberto'}
                        </span>
                      </span>
                    )
                  })()}
                  <span className="ticket-rodape">
                    <span>
                      {resolvido
                        ? `Aberto em ${formatarData(chamado.ticket_date_create) ?? '—'} · Resolvido em ${formatarData(chamado.ticket_date_close) ?? '—'}`
                        : `Aberto em ${formatarData(chamado.ticket_date_create) ?? '—'}`}
                    </span>
                    <span className="ticket-ver">
                      Ver conversa <MdKeyboardArrowRight size={18} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!carregando && !erro && haMaisParaCarregar && (
        <button className="suporte-carregar-mais" onClick={carregarMais} disabled={carregandoMais}>
          {carregandoMais ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}

      {checklistAberto && (
        <ChecklistConexao
          boletosAtrasados={boletosAtrasados}
          contratoStatus={contratoStatus}
          onVerBoletos={() => navigate('/boletos', { viewTransition: true })}
          onFechar={() => setChecklistAberto(false)}
          onContinuar={(passos) => {
            setChecklistAberto(false)
            abrirNovoChamado(passos)
          }}
          onWhatsapp={() => {
            setChecklistAberto(false)
            falarNoWhatsapp()
          }}
        />
      )}

      {novoChamadoAberto && (
        <NovoChamado
          categorias={categorias}
          contratoStatus={contratoStatus}
          passosFeitos={passosFeitos}
          iconeDaCategoria={iconeParaCategoria}
          corDaCategoria={corParaCategoria}
          onEnviar={enviarChamado}
          onVerConversa={(criado, assunto, categoria) =>
            navigate(`/suporte/${criado.ticketPk}`, {
              state: {
                chamado: {
                  ticket_pk: criado.ticketPk ?? undefined,
                  ticket_title: assunto,
                  ticket_protocol: criado.protocolo ?? undefined,
                  category_name: categoria ?? undefined,
                },
              },
              viewTransition: true,
            })
          }
          onVerBoletos={() => navigate('/boletos', { viewTransition: true })}
          onWhatsapp={() => {
            setNovoChamadoAberto(false)
            falarNoWhatsapp()
          }}
          onFechar={() => setNovoChamadoAberto(false)}
        />
      )}
    </div>
    </PullToRefresh>
  )
}
