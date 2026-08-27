import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  MdAdd,
  MdCampaign,
  MdClose,
  MdConstruction,
  MdExpandMore,
  MdPayments,
  MdSell,
  MdSupportAgent,
  MdSwapHoriz,
  MdWarning,
} from 'react-icons/md'
import { useSessao } from '../auth/SessionContext'
import { buscarCategorias, buscarChamados, chamadoResolvido, abrirChamado as apiAbrirChamado } from '../api/suporte'
import type { CategoriaDto, TicketDto } from '../api/client'
import VoltarInicio from '../components/VoltarInicio'
import CabecalhoTela from '../components/CabecalhoTela'
import { useToast } from '../components/Toast/ToastContext'
import './Suporte.css'

const TAMANHO_PAGINA = 20

type Aba = 'abertos' | 'resolvidos'

// Ícone de cada categoria pelo nome exato configurado no painel do
// Controllr (não é lista fixa) — categoria desconhecida cai no padrão.
const ICONE_PADRAO = MdSupportAgent
const ICONES_CATEGORIA: Record<string, IconType> = {
  'suporte técnico': MdSupportAgent,
  'financeiro e pagamentos': MdPayments,
  'vendas e comercial': MdSell,
  'alteração de plano': MdSwapHoriz,
  'reclamação': MdWarning,
  cancelamento: MdClose,
  'ouvidoria e adminstrativo': MdCampaign,
  'ouvidoria e administrativo': MdCampaign,
  instalação: MdConstruction,
}

function iconeParaCategoria(nome: string): IconType {
  return ICONES_CATEGORIA[nome.trim().toLowerCase()] ?? ICONE_PADRAO
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
  const [dialogAberto, setDialogAberto] = useState(false)
  const [categoriaPk, setCategoriaPk] = useState<number | null>(null)
  const [categoriaMenuAberto, setCategoriaMenuAberto] = useState(false)
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    carregar()
    buscarCategorias().then(setCategorias).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function abrirDialog() {
    if (categorias.length === 0) {
      toast('Categorias não carregadas ainda, tente novamente em instantes.')
    }
    setCategoriaPk(categorias[0]?.category_pk ?? null)
    setCategoriaMenuAberto(false)
    setAssunto('')
    setDescricao('')
    setDialogAberto(true)
  }

  async function enviarChamado() {
    if (categoriaPk == null || !assunto.trim() || !descricao.trim()) {
      toast('Preencha categoria, assunto e descrição.')
      return
    }
    setEnviando(true)
    try {
      const mensagem = await apiAbrirChamado(cpf, categoriaPk, assunto.trim(), descricao.trim())
      toast(mensagem, 'sucesso')
      setDialogAberto(false)
      carregar()
    } catch (excecao) {
      toast(excecao instanceof Error ? excecao.message : 'Não foi possível abrir o chamado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="suporte-tela">
      <VoltarInicio />
      <CabecalhoTela icone={MdSupportAgent} cor="#0f8a45" titulo="Suporte" subtitulo="Seus chamados de suporte." />

      <div className="suporte-abas">
        <button className={`aba-chip aba-abertos ${aba === 'abertos' ? 'ativa' : ''}`} onClick={() => setAba('abertos')}>
          Abertos
        </button>
        <button
          className={`aba-chip aba-resolvidos ${aba === 'resolvidos' ? 'ativa' : ''}`}
          onClick={() => setAba('resolvidos')}
        >
          Resolvidos
        </button>
      </div>

      {carregando && <p className="suporte-status">Carregando chamados…</p>}

      {!carregando && erro && (
        <div className="suporte-status">
          <p>{erro}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {!carregando && !erro && filtrados.length === 0 && (
        <p className="suporte-status">
          {aba === 'resolvidos' ? 'Nenhum chamado resolvido ainda.' : 'Você não tem chamados em aberto.'}
        </p>
      )}

      {!carregando && !erro && filtrados.length > 0 && (
        <ul className="suporte-lista">
          {filtrados.map((chamado) => {
            const resolvido = chamadoResolvido(chamado)
            return (
              <li
                key={chamado.ticket_pk}
                className="ticket-card"
                onClick={() => navigate(`/suporte/${chamado.ticket_pk}`, { state: { chamado } })}
              >
                <div className="ticket-topo">
                  <span className="ticket-assunto">{chamado.ticket_title ?? `Chamado #${chamado.ticket_pk ?? '-'}`}</span>
                  <span className={`ticket-status-badge ${resolvido ? 'badge-fechado' : 'badge-aberto'}`}>
                    {resolvido ? 'Fechado' : 'Aberto'}
                  </span>
                </div>
                {chamado.ticket_protocol && <p className="ticket-protocolo">Protocolo: {chamado.ticket_protocol}</p>}
                <p className="ticket-categoria">
                  {(() => {
                    const IconeCategoria = iconeParaCategoria(chamado.category_name ?? '')
                    return <IconeCategoria className="ticket-categoria-icone" />
                  })()}{' '}
                  {chamado.category_name ?? 'Categoria não informada'}
                </p>
                <p className="ticket-data">Aberto em {formatarData(chamado.ticket_date_create) ?? 'data não informada'}</p>
                {resolvido && <p className="ticket-data">Fechado em {formatarData(chamado.ticket_date_close) ?? '-'}</p>}
                {chamado.ticket_desc && <p className="ticket-descricao">{chamado.ticket_desc}</p>}
              </li>
            )
          })}
        </ul>
      )}

      {!carregando && !erro && chamados.length < totalNoServidor && (
        <button className="suporte-carregar-mais" onClick={carregarMais} disabled={carregandoMais}>
          {carregandoMais ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}

      <button className="suporte-fab" onClick={() => setChecklistAberto(true)} aria-label="Novo chamado">
        <MdAdd size={28} />
      </button>

      {checklistAberto && (
        <div className="suporte-modal-fundo" onClick={() => setChecklistAberto(false)}>
          <div className="suporte-checklist" onClick={(evento) => evento.stopPropagation()}>
            <MdSupportAgent size={48} color="#f28f3b" className="suporte-checklist-icone" />
            <h2>Antes de abrir o chamado</h2>
            <p>Esses passos resolvem boa parte dos problemas rapidinho</p>

            <div className="suporte-checklist-itens">
              <div className="suporte-checklist-item">
                <span>🔌</span>
                <div>
                  <strong>Já reiniciou o roteador?</strong>
                  <p>Desligue por 10 segundos e ligue de novo</p>
                </div>
              </div>
              <div className="suporte-checklist-item">
                <span>🔗</span>
                <div>
                  <strong>Os cabos estão bem conectados?</strong>
                  <p>Confira se nenhum fio está solto</p>
                </div>
              </div>
              <div className="suporte-checklist-item">
                <span>📱</span>
                <div>
                  <strong>Testou em outro aparelho?</strong>
                  <p>Ajuda a saber se é só um aparelho ou a rede toda</p>
                </div>
              </div>
            </div>

            <button
              className="suporte-btn-primario suporte-checklist-continua"
              onClick={() => {
                setChecklistAberto(false)
                abrirDialog()
              }}
            >
              Continua sem funcionar
            </button>
            <button className="suporte-checklist-resolvido" onClick={() => setChecklistAberto(false)}>
              Resolvido, obrigado
            </button>
          </div>
        </div>
      )}

      {dialogAberto && (
        <div className="suporte-modal-fundo" onClick={() => setDialogAberto(false)}>
          <div className="suporte-modal" onClick={(evento) => evento.stopPropagation()}>
            <h2>Novo chamado</h2>

            <label>Categoria</label>
            {(() => {
              const categoriaSelecionada = categorias.find((c) => c.category_pk === categoriaPk) ?? null
              const IconeSelecionado = iconeParaCategoria(categoriaSelecionada?.category_name ?? '')
              return (
                <div className="suporte-dropdown-wrapper">
                  <button
                    type="button"
                    className="suporte-dropdown-btn"
                    onClick={() => setCategoriaMenuAberto((v) => !v)}
                  >
                    <span className="suporte-dropdown-btn-conteudo">
                      <IconeSelecionado className="suporte-dropdown-icone" />
                      {categoriaSelecionada?.category_name ?? 'Selecione uma categoria'}
                    </span>
                    <MdExpandMore />
                  </button>
                  {categoriaMenuAberto && (
                    <>
                      <div className="suporte-dropdown-fundo" onClick={() => setCategoriaMenuAberto(false)} />
                      <div className="suporte-dropdown-lista">
                        {categorias.map((categoria) => {
                          const Icone = iconeParaCategoria(categoria.category_name ?? '')
                          return (
                            <button
                              type="button"
                              key={categoria.category_pk}
                              className="suporte-dropdown-item"
                              onClick={() => {
                                setCategoriaPk(categoria.category_pk)
                                setCategoriaMenuAberto(false)
                              }}
                            >
                              <Icone className="suporte-dropdown-icone" />
                              {categoria.category_name ?? `Categoria ${categoria.category_pk}`}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            <label>Assunto</label>
            <input
              value={assunto}
              onChange={(evento) => setAssunto(evento.target.value)}
              placeholder="Resuma o problema em poucas palavras"
              maxLength={120}
            />

            <label>Descrição</label>
            <textarea
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              placeholder="Descreva o problema com detalhes"
              rows={4}
            />

            <div className="suporte-modal-acoes">
              <button onClick={() => setDialogAberto(false)}>Cancelar</button>
              <button className="suporte-btn-primario" disabled={enviando} onClick={enviarChamado}>
                {enviando ? 'Enviando…' : 'Enviar chamado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
