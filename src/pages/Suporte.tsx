import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessao } from '../auth/SessionContext'
import { buscarCategorias, buscarChamados, chamadoResolvido, abrirChamado as apiAbrirChamado } from '../api/suporte'
import type { CategoriaDto, TicketDto } from '../api/client'
import './Suporte.css'

const TAMANHO_PAGINA = 20

type Aba = 'abertos' | 'resolvidos'

// Ícone de cada categoria pelo nome exato configurado no painel do
// Controllr (não é lista fixa) — categoria desconhecida cai no padrão.
const ICONE_PADRAO = '🎧'
const ICONES_CATEGORIA: Record<string, string> = {
  'suporte técnico': '🎧',
  'financeiro e pagamentos': '💳',
  'vendas e comercial': '🛒',
  'alteração de plano': '🔄',
  'reclamação': '⚠️',
  cancelamento: '✖️',
  'ouvidoria e adminstrativo': '📢',
  'ouvidoria e administrativo': '📢',
  instalação: '🛠️',
}

function iconeParaCategoria(nome: string): string {
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

  const [chamados, setChamados] = useState<TicketDto[]>([])
  const [totalNoServidor, setTotalNoServidor] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>('abertos')

  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)
  const [categoriaPk, setCategoriaPk] = useState<number | null>(null)
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
      window.alert('Não foi possível carregar mais chamados.')
    } finally {
      setCarregandoMais(false)
    }
  }

  const filtrados = chamados.filter((c) => (aba === 'resolvidos' ? chamadoResolvido(c) : !chamadoResolvido(c)))

  function abrirDialog() {
    if (categorias.length === 0) {
      window.alert('Categorias não carregadas ainda, tente novamente em instantes.')
    }
    setCategoriaPk(categorias[0]?.category_pk ?? null)
    setAssunto('')
    setDescricao('')
    setDialogAberto(true)
  }

  async function enviarChamado() {
    if (categoriaPk == null || !assunto.trim() || !descricao.trim()) {
      window.alert('Preencha categoria, assunto e descrição.')
      return
    }
    setEnviando(true)
    try {
      const mensagem = await apiAbrirChamado(cpf, categoriaPk, assunto.trim(), descricao.trim())
      window.alert(mensagem)
      setDialogAberto(false)
      carregar()
    } catch (excecao) {
      window.alert(excecao instanceof Error ? excecao.message : 'Não foi possível abrir o chamado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="suporte-tela">
      <header className="suporte-cabecalho">
        <h1>Suporte</h1>
        <p>Seus chamados de suporte.</p>
      </header>

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
                  {iconeParaCategoria(chamado.category_name ?? '')} {chamado.category_name ?? 'Categoria não informada'}
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

      <button className="suporte-fab" onClick={abrirDialog} aria-label="Novo chamado">
        +
      </button>

      {dialogAberto && (
        <div className="suporte-modal-fundo" onClick={() => setDialogAberto(false)}>
          <div className="suporte-modal" onClick={(evento) => evento.stopPropagation()}>
            <h2>Novo chamado</h2>

            <label>Categoria</label>
            <select value={categoriaPk ?? ''} onChange={(evento) => setCategoriaPk(Number(evento.target.value))}>
              {categorias.map((categoria) => (
                <option key={categoria.category_pk} value={categoria.category_pk}>
                  {iconeParaCategoria(categoria.category_name ?? '')} {categoria.category_name ?? `Categoria ${categoria.category_pk}`}
                </option>
              ))}
            </select>

            <label>Assunto</label>
            <input value={assunto} onChange={(evento) => setAssunto(evento.target.value)} maxLength={120} />

            <label>Descrição</label>
            <textarea value={descricao} onChange={(evento) => setDescricao(evento.target.value)} rows={4} />

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
