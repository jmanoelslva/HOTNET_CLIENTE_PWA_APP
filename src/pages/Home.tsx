import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdAccountCircle,
  MdBlock,
  MdBuild,
  MdCheckCircle,
  MdLock,
  MdBadge,
  MdDarkMode,
  MdDataUsage,
  MdDescription,
  MdGetApp,
  MdHelp,
  MdInfoOutline,
  MdKey,
  MdLightMode,
  MdLogout,
  MdPayments,
  MdSpeed,
  MdSupportAgent,
  MdWifi,
} from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
import { useSessao } from '../auth/useSessao'
import { buscarDadosCliente } from '../api/cadastro'
import { buscarContratos, type Contrato } from '../api/contratos'
import { buscarConsumoDoMes, buscarSessaoAtualPorCpe, totalBytes, vincularContratos, type ConsumoPorContrato } from '../api/consumo'
import { contarBoletosAtrasados, situacaoDosContratos } from '../api/situacao'
import ChecklistConexao from '../components/ChecklistConexao'
import { formatarBytes } from '../utils/formatacao'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import { CORES, comAlpha } from '../utils/cores'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useTema } from '../hooks/useTema'
import ModalInstalarIos from '../components/ModalInstalarIos'
import ModalConfirmarLogout from '../components/ModalConfirmarLogout'
import PullToRefresh from '../components/PullToRefresh'
import logoHotnet from '../assets/logo-hotnet.png'
import './Home.css'

function saudacaoPorHorario(primeiroNome: string): string {
  const hora = new Date().getHours()
  const periodo = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
  return `${periodo}, ${primeiroNome}!`
}

const ITENS_MENU = [
  { to: '/boletos', Icone: MdPayments, cor: CORES.boletos, label: 'Boletos' },
  { to: '/contratos', Icone: MdDescription, cor: CORES.contratos, label: 'Contratos' },
  { to: '/consumo', Icone: MdDataUsage, cor: CORES.consumo, label: 'Consumo' },
  { to: '/suporte', Icone: MdSupportAgent, cor: CORES.suporte, label: 'Suporte' },
  { to: '/cadastro', Icone: MdBadge, cor: CORES.dados, label: 'Meus dados' },
  { to: '/faq', Icone: MdHelp, cor: CORES.ajuda, label: 'Ajuda' },
]

export default function Home() {
  const { cpf, sair } = useSessao()
  const navigate = useNavigate()
  const { podeInstalar, aoClicarInstalar, modalIosAberto, fecharModalIos } = usePwaInstall()
  const { tema, alternarTema } = useTema()
  const [nomeExibido, setNomeExibido] = useState('Cliente')
  const [menuAvatarAberto, setMenuAvatarAberto] = useState(false)
  const [confirmarSairAberto, setConfirmarSairAberto] = useState(false)

  const [consumoContratos, setConsumoContratos] = useState<ConsumoPorContrato[]>([])
  const [cpePkSelecionado, setCpePkSelecionado] = useState<number | null>(null)
  const [planoSemConsumo, setPlanoSemConsumo] = useState<string | null>(null)
  const [online, setOnline] = useState<boolean | null | undefined>(undefined)
  // Contratos (status e número): situação da conta no cartão de conexão.
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [checklistAberto, setChecklistAberto] = useState(false)
  const [boletosAtrasados, setBoletosAtrasados] = useState<number | null>(null)

  useEffect(() => {
    carregarNome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpf])

  useEffect(() => {
    carregarConsumo()
  }, [])

  async function carregarNome() {
    try {
      const cliente = await buscarDadosCliente(cpf)
      const primeiroNome = cliente.client_complete_name?.trim().split(' ')[0]
      if (primeiroNome) {
        setNomeExibido(primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase())
      }
    } catch {
      // Falha silenciosa: saudação cai pro nome genérico ("Cliente") já no
      // estado inicial, não é crítico o bastante pra bloquear a Home.
    }
  }

  async function carregarConsumo() {
    try {
      // Contratos em paralelo: dão o status (bloqueado/cancelado) e o número de cada conexão.
      // Falha neles não esconde o cartão, só tira a situação da conta.
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
        // Sem consumo registrado ainda (ex: cliente novo, bloqueado ou cancelado) — o plano e a
        // situação vêm só dos contratos, sem indicador de conexão (sem cpePk não dá pra checar).
        setPlanoSemConsumo(listaContratos.find((c) => c.podeVerDados)?.plano ?? listaContratos[0]?.plano ?? null)
      }
    } catch {
      // Falha silenciosa: sem card de status, mas o resto da Home
      // (menu, WhatsApp) continua utilizável.
    }
  }

  // Usado pelo pull-to-refresh — reaproveita as mesmas buscas dos efeitos
  // de carga inicial. A checagem de sessão (efeito abaixo) roda sozinha em
  // seguida, reagindo à troca de contratoSelecionado causada por aqui.
  async function atualizar() {
    await Promise.all([carregarNome(), carregarConsumo()])
  }

  const contratoSelecionado = consumoContratos.find((c) => c.cpePk === cpePkSelecionado) ?? null

  // contract_status da conexão mostrada: pelo contrato vinculado; sem vínculo, a situação única
  // dos contratos (mesma regra do Suporte). 4 = bloqueado, 5 = cancelado.
  const statusContrato =
    (contratoSelecionado?.contractPk != null
      ? contratos.find((c) => c.id === contratoSelecionado.contractPk)?.status
      : undefined) ?? situacaoDosContratos(contratos)
  const bloqueada = statusContrato === 4
  const cancelada = statusContrato === 5

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

  async function aoClicarWhatsapp() {
    try {
      const cliente = await buscarDadosCliente(cpf)
      abrirWhatsappSuporte(cliente.client_complete_name ?? null, cpf)
    } catch {
      abrirWhatsappSuporte(null, cpf)
    }
  }

  async function aoClicarInstalarMenu() {
    setMenuAvatarAberto(false)
    await aoClicarInstalar()
  }

  function abrirDiagnostico() {
    setBoletosAtrasados(null)
    setChecklistAberto(true)
    contarBoletosAtrasados().then(setBoletosAtrasados)
  }

  const cartao = (() => {
    if (bloqueada) {
      return {
        selo: { texto: 'Bloqueada', Icone: MdLock, cor: CORES.erro },
        titulo: 'Conexão bloqueada',
        descricao: 'Identificamos um boleto em aberto neste contrato. Após a confirmação do pagamento, a conexão é liberada.',
        IconeConexao: MdLock,
        corIcone: CORES.erro,
      }
    }
    if (cancelada) {
      return {
        selo: { texto: 'Cancelada', Icone: MdBlock, cor: CORES.textoFraco },
        titulo: 'Contrato cancelado',
        descricao: 'Seu contrato foi cancelado. Fale com a gente se tiver alguma dúvida.',
        IconeConexao: MdBlock,
        corIcone: CORES.textoFraco,
      }
    }
    const selo = statusContrato != null ? { texto: 'Conta ativa', Icone: MdCheckCircle, cor: CORES.sucessoVivo } : null
    if (online === true) {
      return { selo, titulo: 'Conectado agora', descricao: 'Sua internet está funcionando normalmente.', IconeConexao: MdWifi, corIcone: CORES.sucessoVivo }
    }
    if (online === false) {
      return { selo, titulo: 'Sem conexão agora', descricao: 'Não detectamos conexão ativa. Confira se o roteador está ligado.', IconeConexao: MdWifi, corIcone: CORES.textoFraco }
    }
    if (online === undefined && contratoSelecionado) {
      return { selo, titulo: 'Verificando conexão…', descricao: 'Consultando o status da sua conexão.', IconeConexao: MdWifi, corIcone: CORES.textoFraco }
    }
    return {
      selo: null,
      titulo: 'Não foi possível verificar',
      descricao: 'Não conseguimos consultar sua conexão agora. Confira a internet do aparelho e puxe para atualizar.',
      IconeConexao: MdWifi,
      corIcone: CORES.textoFraco,
    }
  })()
  const mostrarTesteVelocidade = online === true && !bloqueada && !cancelada
  const usoDoMes = contratoSelecionado ? totalBytes(contratoSelecionado) : 0
  const nomeMes = new Date().toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <PullToRefresh aoAtualizar={atualizar}>
    <div className="home-tela tela-entrada">
      <div className="home-conteudo">
      <header
        className="home-cabecalho"
        style={{ background: comAlpha(CORES.primaria, 8), borderColor: comAlpha(CORES.primaria, 20) }}
      >
        <img src={logoHotnet} alt="HOTNET" className="home-header-logo" />

        <div className="home-header-saudacao">
          <span className="home-saudacao">{saudacaoPorHorario(nomeExibido)}</span>
          <p className="home-subtitulo">O que você precisa hoje?</p>
        </div>

        <div className="home-avatar-wrapper">
          <button
            className="home-avatar"
            onClick={() => setMenuAvatarAberto((v) => !v)}
            aria-label="Menu do usuário"
          >
            <MdAccountCircle size={26} />
          </button>
          {menuAvatarAberto && (
            <>
              <div className="home-avatar-menu-fundo" onClick={() => setMenuAvatarAberto(false)} />
              <div className="home-avatar-menu">
                {podeInstalar && (
                  <button onClick={aoClicarInstalarMenu}>
                    <MdGetApp size={18} /> Instalar app
                  </button>
                )}
                <button onClick={alternarTema}>
                  {tema === 'dark' ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
                  {tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
                </button>
                <button
                  onClick={() => {
                    setMenuAvatarAberto(false)
                    navigate('/alterar-senha', { viewTransition: true })
                  }}
                >
                  <MdKey size={18} /> Alterar senha
                </button>
                <button
                  onClick={() => {
                    setMenuAvatarAberto(false)
                    navigate('/sobre', { viewTransition: true })
                  }}
                >
                  <MdInfoOutline size={18} /> Sobre
                </button>
                <button
                  className="home-avatar-menu-sair"
                  onClick={() => {
                    setMenuAvatarAberto(false)
                    setConfirmarSairAberto(true)
                  }}
                >
                  <MdLogout size={18} /> Sair
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {(contratoSelecionado || planoSemConsumo || contratos.length > 0) && (
        <section className={`home-conexao ${bloqueada ? 'home-conexao-alerta' : ''}`} aria-label="Sua conexão">
          {consumoContratos.length > 1 && (
            <select
              className="home-conexao-seletor"
              aria-label="Contrato mostrado"
              value={cpePkSelecionado ?? ''}
              onChange={(evento) => setCpePkSelecionado(Number(evento.target.value))}
            >
              {consumoContratos.map((c) => (
                <option key={c.cpePk} value={c.cpePk}>
                  {c.contractNumber != null ? `Contrato ${c.contractNumber}` : `Conexão ${c.cpePk}`}
                  {c.planoNome ? ` · ${c.planoNome}` : ''}
                </option>
              ))}
            </select>
          )}
          <div className="home-conexao-topo">
            <span className="home-conexao-rotulo">Sua conexão</span>
            {cartao.selo && (
              <span className="home-conexao-selo">
                <cartao.selo.Icone size={14} color={cartao.selo.cor} aria-hidden="true" />
                {cartao.selo.texto}
              </span>
            )}
          </div>
          <div className="home-conexao-estado" aria-live="polite">
            <span className="home-conexao-icone">
              <cartao.IconeConexao size={26} color={cartao.corIcone} aria-hidden="true" />
            </span>
            <div className="home-conexao-textos">
              <p className="home-conexao-titulo">{cartao.titulo}</p>
              <p className="home-conexao-descricao">{cartao.descricao}</p>
            </div>
          </div>
          <div className="home-conexao-blocos">
            <div className="home-conexao-bloco">
              <span>Plano</span>
              <strong>{contratoSelecionado?.planoNome ?? planoSemConsumo ?? '—'}</strong>
            </div>
            <div className="home-conexao-bloco">
              <span>Uso em {nomeMes}</span>
              <strong>{usoDoMes > 0 ? formatarBytes(usoDoMes) : '—'}</strong>
            </div>
          </div>
          {bloqueada && (
            <button
              className="home-conexao-acao"
              onClick={() => navigate('/boletos', { state: { filtro: 'atrasados' }, viewTransition: true })}
            >
              <MdPayments size={18} aria-hidden="true" /> Ver boletos em atraso
            </button>
          )}
          {cancelada && (
            <button className="home-conexao-acao home-conexao-acao-whatsapp" onClick={aoClicarWhatsapp}>
              <FaWhatsapp size={18} aria-hidden="true" /> Falar no WhatsApp
            </button>
          )}
          <div className="home-conexao-secundarias">
            {mostrarTesteVelocidade && (
              <a className="home-conexao-secundaria" href="https://fast.com" target="_blank" rel="noopener noreferrer">
                <MdSpeed size={18} aria-hidden="true" /> Teste de velocidade
              </a>
            )}
            {!cancelada && (
              <button className="home-conexao-secundaria" onClick={abrirDiagnostico}>
                <MdBuild size={18} aria-hidden="true" /> Diagnóstico
              </button>
            )}
          </div>
        </section>
      )}

      <div className="home-menu">
        {ITENS_MENU.map((item) => (
          <Link key={item.to} to={item.to} className="home-menu-item" viewTransition>
            <span className="home-menu-icone" style={{ background: item.cor }}>
              <item.Icone size={26} color={CORES.branco} />
            </span>
            <span className="home-menu-label">{item.label}</span>
          </Link>
        ))}
      </div>

      <button className="home-whatsapp" onClick={aoClicarWhatsapp}>
        <FaWhatsapp size={20} /> Falar com a gente no WhatsApp
      </button>

      <footer className="home-rodape">
        <a href="https://controllr.hotnet.net.br/policies/privacy" target="_blank" rel="noreferrer">
          Política de Privacidade
        </a>
      </footer>
      </div>

      {checklistAberto && (
        <ChecklistConexao
          boletosAtrasados={boletosAtrasados}
          contratoStatus={statusContrato}
          onVerBoletos={() => navigate('/boletos', { viewTransition: true })}
          onFechar={() => setChecklistAberto(false)}
          onContinuar={(passos) => navigate('/suporte', { state: { abrirNovoChamado: true, passos }, viewTransition: true })}
          onWhatsapp={() => {
            setChecklistAberto(false)
            aoClicarWhatsapp()
          }}
        />
      )}

      <ModalInstalarIos aberto={modalIosAberto} onFechar={fecharModalIos} />
      <ModalConfirmarLogout
        aberto={confirmarSairAberto}
        onCancelar={() => setConfirmarSairAberto(false)}
        onConfirmar={() => {
          setConfirmarSairAberto(false)
          sair()
        }}
      />
    </div>
    </PullToRefresh>
  )
}
