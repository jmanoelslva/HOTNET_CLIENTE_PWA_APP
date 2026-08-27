import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../auth/SessionContext'
import { buscarDadosCliente } from '../api/cadastro'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import './Home.css'

function saudacaoPorHorario(primeiroNome: string): string {
  const hora = new Date().getHours()
  const periodo = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
  return `${periodo}, ${primeiroNome}! 👋`
}

const ITENS_MENU = [
  { to: '/boletos', icone: '💳', label: 'Boletos' },
  { to: '/contratos', icone: '📄', label: 'Contratos' },
  { to: '/consumo', icone: '📊', label: 'Consumo' },
  { to: '/suporte', icone: '🎧', label: 'Suporte' },
  { to: '/cadastro', icone: '👤', label: 'Meus dados' },
  { to: '/faq', icone: '❓', label: 'Ajuda' },
]

export default function Home() {
  const { cpf, sair } = useSessao()
  const [nomeExibido, setNomeExibido] = useState('Cliente')

  useEffect(() => {
    buscarDadosCliente(cpf)
      .then((cliente) => {
        const primeiroNome = cliente.client_complete_name?.trim().split(' ')[0]
        if (primeiroNome) {
          setNomeExibido(primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase())
        }
      })
      .catch(() => {})
  }, [cpf])

  async function aoClicarWhatsapp() {
    try {
      const cliente = await buscarDadosCliente(cpf)
      abrirWhatsappSuporte(cliente.client_complete_name ?? null, cpf)
    } catch {
      abrirWhatsappSuporte(null, cpf)
    }
  }

  return (
    <div className="home-tela">
      <header className="home-cabecalho">
        <span className="home-saudacao">{saudacaoPorHorario(nomeExibido)}</span>
        <p className="home-subtitulo">O que você precisa hoje?</p>
      </header>

      <button className="home-whatsapp" onClick={aoClicarWhatsapp}>
        💬 Falar com a gente no WhatsApp
      </button>

      <div className="home-menu">
        {ITENS_MENU.map((item) => (
          <Link key={item.to} to={item.to} className="home-menu-item">
            <span className="home-menu-icone">{item.icone}</span>
            <span className="home-menu-label">{item.label}</span>
          </Link>
        ))}
      </div>

      <button className="home-sair" onClick={sair}>
        Sair
      </button>
    </div>
  )
}
