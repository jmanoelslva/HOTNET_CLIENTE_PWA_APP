import { Link, useNavigate } from 'react-router-dom'
import { MdArrowBack } from 'react-icons/md'
import './VoltarInicio.css'

interface Props {
  to?: string
  label?: string
  /** Volta para a tela anterior (telas que abrem de vários lugares). */
  anterior?: boolean
}

/** Link de volta no topo das telas internas (padrão: para o Início). */
export default function VoltarInicio({ to = '/', label = 'Início', anterior = false }: Props) {
  const navigate = useNavigate()
  if (anterior) {
    return (
      <button
        type="button"
        className="voltar-inicio"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/', { viewTransition: true }))}
      >
        <MdArrowBack size={18} />
        Voltar
      </button>
    )
  }
  return (
    <Link to={to} className="voltar-inicio" viewTransition>
      <MdArrowBack size={18} />
      {label}
    </Link>
  )
}
