import CabecalhoTela from '../components/CabecalhoTela'
import { MdLanguage } from 'react-icons/md'
import { IcPrivacyTip, IcShare, IcWhatsapp } from '../components/IconesApp'
import { BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
import { useToast } from '../components/Toast/useToast'
import logoApp from '../assets/logo-app.png'
import './Sobre.css'

const NUMERO_WHATSAPP = '5582999426613'

function abrir(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Sobre — mesmo layout do app Android (SobreScreen.kt): cartão grafite com
 * o ícone e a versão, e as ações do app num bloco branco. "Avaliar na loja"
 * fica de fora: o portal web não está numa loja.
 */
export default function Sobre() {
  const { toast } = useToast()

  async function compartilhar() {
    const dados = {
      title: 'Indicar o app',
      text: 'Acompanhe seus boletos, consumo e suporte da HOTNET pelo celular:',
      url: window.location.origin,
    }
    try {
      if (navigator.share) {
        await navigator.share(dados)
      } else {
        await navigator.clipboard.writeText(`${dados.text} ${dados.url}`)
        toast('Link copiado.', 'sucesso')
      }
    } catch {
      // Compartilhamento cancelado pelo cliente: nada a fazer.
    }
  }

  return (
    <div className="sobre-tela tela-entrada">
      <CabecalhoTela titulo="Sobre" subtitulo="Portal do cliente HOTNET." />

      <section className="cartao-destaque sobre-cartao">
        <span className="sobre-logo-circulo">
          <img src={logoApp} alt="" className="sobre-logo" />
        </span>
        <div>
          <strong className="sobre-nome">HOTNET</strong>
          {__APP_VERSION__ && <span className="sobre-versao">Versão {__APP_VERSION__}</span>}
        </div>
      </section>

      <RotuloGrupo>O app</RotuloGrupo>
      <BlocoBranco>
        <LinhaItem icone={IcShare} tom="primaria" titulo="Compartilhar o app" onClick={compartilhar} />
        <LinhaItem
          icone={IcWhatsapp}
          tom="primaria"
          titulo="Falar com a gente"
          onClick={() =>
            abrir(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent('Olá, tenho uma dúvida sobre o portal do cliente HOTNET.')}`)
          }
        />
        <LinhaItem icone={MdLanguage} tom="primaria" titulo="Site da HOTNET" onClick={() => abrir('https://hotnet.net.br')} />
        <LinhaItem
          icone={IcPrivacyTip}
          tom="primaria"
          titulo="Política de privacidade"
          onClick={() => abrir('https://controllr.hotnet.net.br/policies/privacy')}
        />
      </BlocoBranco>
    </div>
  )
}
