import { NavLink } from 'react-router-dom'
import { MdDataUsage, MdDescription, MdHome, MdPayments, MdSupportAgent } from 'react-icons/md'
import { CORES } from '../utils/cores'
import './BottomNav.css'

const ITENS = [
  { to: '/', icone: MdHome, cor: CORES.primaria, label: 'Início', fim: true },
  { to: '/boletos', icone: MdPayments, cor: CORES.boletos, label: 'Boletos' },
  { to: '/contratos', icone: MdDescription, cor: CORES.contratos, label: 'Contratos' },
  { to: '/consumo', icone: MdDataUsage, cor: CORES.consumo, label: 'Consumo' },
  { to: '/suporte', icone: MdSupportAgent, cor: CORES.suporte, label: 'Suporte' },
]

/**
 * Barra de navegação fixa no rodapé, sempre visível nas telas
 * autenticadas — acesso rápido às telas mais usadas, como em um app
 * nativo, em vez de depender só do link "Início" no topo de cada tela.
 */
export default function BottomNav() {
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
    </nav>
  )
}
