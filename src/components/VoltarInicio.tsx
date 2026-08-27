import { Link } from 'react-router-dom'
import { MdArrowBack } from 'react-icons/md'
import './VoltarInicio.css'

/** Link de volta pro painel principal — usado no topo das telas internas. */
export default function VoltarInicio() {
  return (
    <Link to="/" className="voltar-inicio">
      <MdArrowBack size={16} />
      Início
    </Link>
  )
}
