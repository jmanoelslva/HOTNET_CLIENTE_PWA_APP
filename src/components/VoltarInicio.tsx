import { Link } from 'react-router-dom'
import './VoltarInicio.css'

/** Link de volta pro painel principal — usado no topo das telas internas. */
export default function VoltarInicio() {
  return (
    <Link to="/" className="voltar-inicio">
      ← Início
    </Link>
  )
}
