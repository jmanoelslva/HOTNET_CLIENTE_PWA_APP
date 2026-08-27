import { Link } from 'react-router-dom'
import { useSessao } from '../auth/SessionContext'

export default function Home() {
  const { sair } = useSessao()

  return (
    <div style={{ padding: 32 }}>
      <h1>Área do cliente</h1>
      <p>Login realizado com sucesso. As telas de contratos, consumo e suporte entram aqui, uma de cada vez.</p>
      <p>
        <Link to="/boletos">Ver boletos</Link>
      </p>
      <button onClick={sair}>Sair</button>
    </div>
  )
}
