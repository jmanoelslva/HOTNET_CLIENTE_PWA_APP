import { FaWhatsapp } from 'react-icons/fa'
import VoltarInicio from '../components/VoltarInicio'
import logoHotnet from '../assets/logo-hotnet.png'
import './Sobre.css'

function abrirWhatsappSobre() {
  const numero = '5582999426613'
  const mensagem = 'Olá, tenho uma dúvida sobre o portal do cliente HOTNET.'
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer')
}

export default function Sobre() {
  return (
    <div className="sobre-tela">
      <VoltarInicio />

      <div className="sobre-card">
        <img src={logoHotnet} alt="HOTNET" className="sobre-logo" />

        <p className="sobre-descricao">
          Este é o portal do cliente HOTNET na web: acompanhe seus boletos, contratos, consumo de internet e
          chamados de suporte direto pelo navegador, sem precisar instalar nenhum aplicativo.
        </p>

        <button className="sobre-whatsapp" onClick={abrirWhatsappSobre}>
          <FaWhatsapp size={18} /> Falar com a gente
        </button>

        <a className="sobre-link" href="https://hotnet.net.br/policies/privacy" target="_blank" rel="noreferrer">
          Política de Privacidade
        </a>
      </div>
    </div>
  )
}
