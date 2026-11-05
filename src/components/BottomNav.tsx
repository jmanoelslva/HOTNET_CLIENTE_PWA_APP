import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'
import { LuCircleUser, LuHouse, LuReceiptText, LuHeadset } from 'react-icons/lu'
import { SiPix } from 'react-icons/si'
import './BottomNav.css'

interface Item {
  to: string
  icone: IconType
  label: string
  fim?: boolean
}

const ESQUERDA: Item[] = [
  { to: '/', icone: LuHouse, label: 'Início', fim: true },
  { to: '/boletos', icone: LuReceiptText, label: 'Boletos' },
]

const DIREITA: Item[] = [
  { to: '/suporte', icone: LuHeadset, label: 'Suporte' },
  { to: '/perfil', icone: LuCircleUser, label: 'Perfil' },
]

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

  // "Pagar" abre os boletos em aberto (no app Android: a aba do mais urgente).
  function pagar() {
    navigate('/boletos', { state: { filtro: 'aberto' }, viewTransition: true })
  }

  function renderItem(item: Item) {
    const ativo = item.fim ? location.pathname === item.to : location.pathname.startsWith(item.to)
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.fim}
        viewTransition
        className={`bottom-nav-item ${ativo ? 'ativo' : ''}`}
      >
        <span className="bottom-nav-pilula">
          <item.icone size={22} aria-hidden="true" />
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
          <SiPix size={22} />
        </span>
        <span className="bottom-nav-rotulo" aria-hidden="true">
          Pagar
        </span>
      </button>
      {DIREITA.map(renderItem)}
    </nav>
  )
}
