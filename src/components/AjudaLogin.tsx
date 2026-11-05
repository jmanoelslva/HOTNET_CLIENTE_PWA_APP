import { useState } from 'react'
import { MdKeyboardArrowRight } from 'react-icons/md'
import DialogoHotnet from './DialogoHotnet'
import { IcHelp, IcLock, IcWhatsapp } from './IconesApp'

/**
 * "Não consigo entrar?" — mesmo diálogo do app Android (AjudaLoginDialog):
 * três opções; as duas primeiras explicam e levam ao WhatsApp.
 */
export default function AjudaLogin({ aberto, onFechar, onWhatsapp }: { aberto: boolean; onFechar: () => void; onWhatsapp: (esqueciSenha: boolean) => void }) {
  const [etapa, setEtapa] = useState<0 | 1 | 2>(0)
  const fechar = () => {
    setEtapa(0)
    onFechar()
  }
  const titulo = etapa === 1 ? 'Esqueci minha senha' : etapa === 2 ? 'Não consigo acessar' : 'Como podemos ajudar?'
  const texto =
    etapa === 1
      ? 'O escritório pode voltar a sua senha para a senha padrão. Depois, é só entrar de novo e, se quiser, criar uma senha nova no app.'
      : etapa === 2
        ? 'Digite o CPF ou CNPJ só com números. No primeiro acesso, a senha é esse mesmo número. Se você já criou uma senha, use a sua.'
        : undefined

  const opcao = (Icone: typeof IcHelp, t: string, d: string, onClick: () => void, whatsapp = false) => (
    <button type="button" className="dialogo-opcao" onClick={onClick}>
      <span className={`dialogo-opcao-icone ${whatsapp ? 'whatsapp' : ''}`} aria-hidden="true">
        <Icone size={20} />
      </span>
      <span className="dialogo-opcao-textos">
        <strong>{t}</strong>
        <small>{d}</small>
      </span>
      <MdKeyboardArrowRight size={22} aria-hidden="true" />
    </button>
  )

  return (
    <DialogoHotnet
      aberto={aberto}
      onFechar={fechar}
      titulo={titulo}
      texto={texto}
      icone={IcHelp}
      acoes={
        etapa === 0 ? (
          <button type="button" className="botao-contorno" onClick={fechar}>
            Fechar
          </button>
        ) : (
          <>
            <button type="button" className="botao-primario" onClick={() => onWhatsapp(etapa === 1)}>
              <IcWhatsapp size={18} /> {etapa === 1 ? 'Pedir pelo WhatsApp' : 'Falar no WhatsApp'}
            </button>
            <button type="button" className="botao-contorno" onClick={() => setEtapa(0)}>
              Voltar
            </button>
          </>
        )
      }
    >
      {etapa === 0 && (
        <>
          {opcao(IcLock, 'Esqueci minha senha', 'Veja como entrar de novo', () => setEtapa(1))}
          {opcao(IcHelp, 'Não consigo acessar', 'Dúvidas sobre usuário e senha', () => setEtapa(2))}
          {opcao(IcWhatsapp, 'Falar no WhatsApp', 'Já vai com seu nome e CPF', () => onWhatsapp(false), true)}
        </>
      )}
    </DialogoHotnet>
  )
}
