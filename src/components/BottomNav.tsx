import { useEffect, useRef, type MouseEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { MdHome, MdOutlineHome, MdOutlinePayments, MdOutlineSupportAgent, MdPayments, MdSupportAgent } from 'react-icons/md'
import { IcPix } from './IconesApp'
import { useSessao } from '../auth/useSessao'
import { contasSalvas, fotoDaConta } from '../utils/contaLocal'
import { nivelDaTela, planoTrocaDeAba } from '../utils/pilhaNavegacao'
import type { IconType } from 'react-icons'
import './BottomNav.css'

interface Item {
  to: string
  icone: IconType
  iconeAtivo: IconType
  label: string
  fim?: boolean
}

const ESQUERDA: Item[] = [
  { to: '/', icone: MdOutlineHome, iconeAtivo: MdHome, label: 'Início', fim: true },
  { to: '/boletos', icone: MdOutlinePayments, iconeAtivo: MdPayments, label: 'Boletos' },
]

const DIREITA: Item[] = [{ to: '/suporte', icone: MdOutlineSupportAgent, iconeAtivo: MdSupportAgent, label: 'Suporte' }]

/** Aba Perfil com a foto ou a inicial, como o AvatarAba do app Android. */
function AvatarAba({ ativo }: { ativo: boolean }) {
  const { cpf } = useSessao()
  const foto = fotoDaConta(cpf)
  return (
    <span className={`bottom-nav-avatar ${ativo ? 'ativo' : ''}`} aria-hidden="true">
      {foto ? <img src={foto} alt="" /> : (contasSalvas().find((c) => c.documento === cpf)?.nome ?? 'C').charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * Barra de navegação igual à do app Android (ui/navigation/BottomNav.kt):
 * Início, Boletos, Pagar (botão laranja no centro, com o símbolo do PIX),
 * Suporte e Perfil. A aba ativa ganha a pílula laranja-clara atrás do
 * ícone, como a NavigationBar do Material 3. Contratos, Consumo, dados e
 * sair ficam no Perfil, como no app.
 */
export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  // Troca de aba que espera o "voltar" do histórico terminar.
  const pendente = useRef<{ to: string; state?: unknown } | null>(null)

  useEffect(() => {
    const p = pendente.current
    if (!p) return
    pendente.current = null
    if (location.pathname !== p.to || p.state) navigate(p.to, { replace: true, state: p.state })
  }, [location.key, navigate, location.pathname])

  /**
   * Abas como no app Android: ficam sempre logo acima do Início, então o
   * voltar de qualquer aba leva ao Início e, dele, sai do app — sem passar
   * por todas as telas abertas antes.
   */
  function irParaAba(evento: MouseEvent | null, to: string, state?: unknown) {
    evento?.preventDefault()
    if (to === location.pathname && !state) return
    const { voltar, substituir } = planoTrocaDeAba(nivelDaTela(location.key, location.pathname), to)
    if (voltar > 0) {
      if (to !== '/') pendente.current = { to, state }
      navigate(-voltar)
      return
    }
    navigate(to, { replace: substituir, state, viewTransition: true })
  }

  // "Pagar" abre Boletos na aba do mais urgente (Atrasados, senão Em aberto), todos os contratos.
  function pagar() {
    irParaAba(null, '/boletos', { pagar: true })
  }

  function renderItem(item: Item) {
    const ativo = item.fim ? location.pathname === item.to : location.pathname.startsWith(item.to)
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.fim}
        onClick={(e) => irParaAba(e, item.to)}
        className={`bottom-nav-item ${ativo ? 'ativo' : ''}`}
      >
        <span className="bottom-nav-pilula">
          {ativo ? <item.iconeAtivo size={24} aria-hidden="true" /> : <item.icone size={24} aria-hidden="true" />}
        </span>
        <span className="bottom-nav-rotulo">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {ESQUERDA.map(renderItem)}
      <button type="button" className="bottom-nav-item bottom-nav-pagar" onClick={pagar} aria-label="Pagar o próximo boleto">
        <span className="bottom-nav-pagar-botao" aria-hidden="true">
          <IcPix size={22} />
        </span>
        <span className="bottom-nav-rotulo" aria-hidden="true">
          Pagar
        </span>
      </button>
      {DIREITA.map(renderItem)}
      <NavLink
        to="/perfil"
        onClick={(e) => irParaAba(e, '/perfil')}
        className={`bottom-nav-item ${location.pathname.startsWith('/perfil') ? 'ativo' : ''}`}
      >
        <span className="bottom-nav-pilula">
          <AvatarAba ativo={location.pathname.startsWith('/perfil')} />
        </span>
        <span className="bottom-nav-rotulo">Perfil</span>
      </NavLink>
    </nav>
  )
}
