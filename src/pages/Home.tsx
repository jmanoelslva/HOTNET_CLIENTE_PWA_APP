import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdAccountCircle,
  MdAddBox,
  MdBadge,
  MdDataUsage,
  MdDescription,
  MdGetApp,
  MdHelp,
  MdInfoOutline,
  MdIosShare,
  MdLogout,
  MdPayments,
  MdSupportAgent,
  MdWifi,
} from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
import { useSessao } from '../auth/SessionContext'
import { buscarDadosCliente } from '../api/cadastro'
import { buscarContratos } from '../api/contratos'
import { buscarConsumoDoMes, buscarSessaoAtualPorCpe, type ConsumoPorContrato } from '../api/consumo'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import { CORES, comAlpha } from '../utils/cores'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useToast } from '../components/Toast/ToastContext'
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
  const { toast } = useToast()
  const { podeInstalarNativo, podeInstalarIos, instalar } = usePwaInstall()
  const [nomeExibido, setNomeExibido] = useState('Cliente')
  const [menuAvatarAberto, setMenuAvatarAberto] = useState(false)
  const [instrucaoIosAberta, setInstrucaoIosAberta] = useState(false)

  const [consumoContratos, setConsumoContratos] = useState<ConsumoPorContrato[]>([])
  const [cpePkSelecionado, setCpePkSelecionado] = useState<number | null>(null)
  const [planoSemConsumo, setPlanoSemConsumo] = useState<string | null>(null)
  const [online, setOnline] = useState<boolean | null | undefined>(undefined)

  useEffect(() => {
    buscarDadosCliente(cpf)
      .then((cliente) => {
        const primeiroNome = cliente.client_complete_name?.trim().split(' ')[0]
        if (primeiroNome) {
          setNomeExibido(primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase())
        }
      })
      .catch(() => {})
  }, [cpf])

  useEffect(() => {
    buscarConsumoDoMes(new Date().getFullYear(), new Date().getMonth() + 1)
      .then((dados) => {
        setConsumoContratos(dados)
        if (dados.length > 0) {
          setCpePkSelecionado(dados[0].cpePk)
        } else {
          // Sem consumo registrado ainda (ex: cliente novo) — cai pra lista
          // de contratos só pro nome do plano, sem indicador de conexão
          // (sem cpePk não dá pra checar a sessão).
          buscarContratos()
            .then((contratos) => setPlanoSemConsumo(contratos[0]?.plano ?? null))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  const contratoSelecionado = consumoContratos.find((c) => c.cpePk === cpePkSelecionado) ?? null

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

  async function aoClicarInstalar() {
    setMenuAvatarAberto(false)
    if (podeInstalarNativo) {
      const resultado = await instalar()
      if (resultado === 'accepted') toast('App instalado!', 'sucesso')
      return
    }
    // iOS Safari não tem prompt nativo de instalação — só o passo manual.
    // Um toast (alguns segundos, some sozinho) é fácil de perder logo após
    // fechar o menu do avatar; o passo a passo fica num modal que só some
    // quando o cliente fechar, dando tempo de ler antes de ir até o Safari.
    setInstrucaoIosAberta(true)
  }

  const corStatus = online === true ? CORES.sucessoVivo : online === false ? CORES.erro : CORES.textoFraco

  return (
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
                {(podeInstalarNativo || podeInstalarIos) && (
                  <button onClick={aoClicarInstalar}>
                    <MdGetApp size={18} /> Instalar app
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuAvatarAberto(false)
                    navigate('/sobre')
                  }}
                >
                  <MdInfoOutline size={18} /> Sobre
                </button>
                <button className="home-avatar-menu-sair" onClick={sair}>
                  <MdLogout size={18} /> Sair
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {(contratoSelecionado || planoSemConsumo) && (
        <div className="home-card-status">
          <div className="home-card-status-topo">
            <span className="home-indicador" style={{ background: corStatus }}>
              <MdWifi size={22} color={CORES.branco} />
            </span>
            <div className="home-card-status-textos">
              <span className="home-plano-nome">
                {contratoSelecionado?.planoNome ?? planoSemConsumo ?? 'Plano não informado'}
              </span>
              <p className="home-status-texto" style={{ color: corStatus }}>
                {online === true
                  ? 'Sua conexão está normal!'
                  : online === false
                    ? 'Sua conexão está fora do ar!'
                    : contratoSelecionado
                      ? 'Verificando conexão…'
                      : 'Status indisponível'}
              </p>
              <p className="home-status-resumo">
                {online === true
                  ? 'Tudo funcionando como deve!'
                  : online === false
                    ? 'Verifique seu roteador ou modem.'
                    : 'Não foi possível verificar sua conexão agora.'}
              </p>
            </div>
          </div>
          {consumoContratos.length > 1 && (
            <select
              className="home-seletor-contrato"
              value={cpePkSelecionado ?? ''}
              onChange={(evento) => setCpePkSelecionado(Number(evento.target.value))}
            >
              {consumoContratos.map((c) => (
                <option key={c.cpePk} value={c.cpePk}>
                  {c.planoNome ?? 'Plano não informado'}
                  {c.contractNumber != null ? ` (Contrato ${c.contractNumber})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="home-menu">
        {ITENS_MENU.map((item) => (
          <Link key={item.to} to={item.to} className="home-menu-item">
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
        <a href="https://hotnet.net.br/policies/privacy" target="_blank" rel="noreferrer">
          Política de Privacidade
        </a>
      </footer>
      </div>

      {instrucaoIosAberta && (
        <div className="home-modal-fundo" onClick={() => setInstrucaoIosAberta(false)}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Instalar o app</h2>
            <ol className="home-instrucao-ios">
              <li>
                Toque no ícone de compartilhar <MdIosShare size={16} /> na barra do Safari
              </li>
              <li>
                Escolha <strong>"Adicionar à Tela de Início"</strong> <MdAddBox size={16} />
              </li>
            </ol>
            <p className="home-instrucao-ios-obs">
              Só funciona pelo Safari — não abre pelo app do WhatsApp, Instagram ou outro navegador
              (Chrome, Firefox etc).
            </p>
            <button onClick={() => setInstrucaoIosAberta(false)}>Entendi</button>
          </div>
        </div>
      )}
    </div>
  )
}
