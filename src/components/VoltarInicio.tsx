import { Link } from 'react-router-dom'
import { LuArrowLeft } from 'react-icons/lu'
import './VoltarInicio.css'

interface Props {
  to?: string
  label?: string
}

/** Link de volta — usado no topo das telas internas (padrão: pro painel principal). */
export default function VoltarInicio({ to = '/', label = 'Início' }: Props) {
  return (
    <Link to={to} className="voltar-inicio" viewTransition>
      <LuArrowLeft size={16} />
      {label}
    </Link>
  )
}
