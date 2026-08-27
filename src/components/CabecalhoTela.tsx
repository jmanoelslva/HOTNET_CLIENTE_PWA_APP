import type { IconType } from 'react-icons'
import './CabecalhoTela.css'

interface Props {
  icone: IconType
  cor: string
  titulo: string
  subtitulo: string
}

/**
 * Cabeçalho padrão das telas internas: ícone colorido + título na mesma
 * cor — a mesma cor do badge dessa tela no menu da Home, pra manter a
 * identidade visual entre o card do menu e a tela que ele abre.
 */
export default function CabecalhoTela({ icone: Icone, cor, titulo, subtitulo }: Props) {
  return (
    <header className="cabecalho-tela" style={{ background: `${cor}14`, borderColor: `${cor}33` }}>
      <span className="cabecalho-tela-icone" style={{ background: cor }}>
        <Icone size={24} color="#ffffff" />
      </span>
      <div>
        <h1 style={{ color: cor }}>{titulo}</h1>
        <p>{subtitulo}</p>
      </div>
    </header>
  )
}
