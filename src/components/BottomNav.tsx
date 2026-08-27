import { NavLink } from 'react-router-dom'
import { MdDescription, MdHome, MdLogout, MdPayments, MdSupportAgent } from 'react-icons/md'
import { useSessao } from '../auth/SessionContext'
import { CORES } from '../utils/cores'
import './BottomNav.css'

const ITENS = [
  { to: '/', icone: MdHome, cor: CORES.primaria, label: 'Início', fim: true },
  { to: '/boletos', icone: MdPayments, cor: CORES.boletos, label: 'Boletos' },
  { to: '/contratos', icone: MdDescription, cor: CORES.contratos, label: 'Contratos' },
  { to: '/suporte', icone: MdSupportAgent, cor: CORES.suporte, label: 'Suporte' },
]

/**
 * Barra de navegação fixa no rodapé, sempre visível nas telas
 * autenticadas — acesso rápido às telas mais usadas, como em um app
 * nativo, em vez de depender só do link "Início" no topo de cada tela.
 * O botão "Sair" aqui é um atalho a mais pro mesmo sair() do menu do
 * avatar (Home.tsx) — os dois continuam existindo lado a lado.
 */
export default function BottomNav() {
  const { sair } = useSessao()

  return (
    <nav className="bottom-nav">
      {ITENS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.fim}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'ativo' : ''}`}
          style={({ isActive }) => ({ color: isActive ? item.cor : undefined })}
        >
          <item.icone size={22} />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button type="button" className="bottom-nav-item" onClick={sair}>
        <MdLogout size={22} />
        <span>Sair</span>
      </button>
    </nav>
  )
}
