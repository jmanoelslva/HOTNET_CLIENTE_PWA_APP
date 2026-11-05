import { useState } from 'react'
import { MdKey } from 'react-icons/md'
import { IcLock, IcPrivacyTip } from '../components/IconesApp'
import { useNavigate } from 'react-router-dom'
import { useSessao } from '../auth/useSessao'
import CabecalhoTela from '../components/CabecalhoTela'
import TecladoPin from '../components/TecladoPin'
import { BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
import { useToast } from '../components/Toast/useToast'
import { conferirPin, definirPin, pinAtivo, removerPin } from '../utils/pinApp'
import './Seguranca.css'

type Etapa =
  | { tipo: 'inicio' }
  | { tipo: 'conferir'; depois: 'alterar' | 'desligar' }
  | { tipo: 'criar'; primeiro: string | null }

/**
 * Segurança — mesma ideia da tela do app Android (security/SegurancaScreen.kt):
 * liga a proteção do app neste aparelho. No navegador não há biometria do
 * sistema para o portal, então é sempre o "PIN do app" de 4 dígitos.
 */
export default function Seguranca() {
  const { cpf } = useSessao()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [ativo, setAtivo] = useState(() => pinAtivo(cpf))
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'inicio' })
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function ir(nova: Etapa) {
    setEtapa(nova)
    setPin('')
    setErro(null)
  }

  async function aoCompletar(valor: string) {
    if (!cpf) return
    if (etapa.tipo === 'conferir') {
      const { ok, restantes } = await conferirPin(cpf, valor)
      if (!ok) {
        setPin('')
        setErro(restantes > 0 ? `PIN incorreto. ${restantes} tentativa(s) restante(s).` : 'PIN incorreto.')
        return
      }
      if (etapa.depois === 'desligar') {
        removerPin(cpf)
        setAtivo(false)
        toast('Proteção do app desligada.', 'sucesso')
        ir({ tipo: 'inicio' })
      } else {
        ir({ tipo: 'criar', primeiro: null })
      }
      return
    }
    if (etapa.tipo === 'criar') {
      if (etapa.primeiro == null) {
        ir({ tipo: 'criar', primeiro: valor })
        return
      }
      if (etapa.primeiro !== valor) {
        setEtapa({ tipo: 'criar', primeiro: null })
        setPin('')
        setErro('Os PINs não coincidem. Comece de novo.')
        return
      }
      await definirPin(cpf, valor)
      setAtivo(true)
      toast('Proteção do app ligada.', 'sucesso')
      ir({ tipo: 'inicio' })
    }
  }

  if (etapa.tipo !== 'inicio') {
    const titulo =
      etapa.tipo === 'conferir' ? 'Digite seu PIN atual' : etapa.primeiro == null ? 'Crie um PIN de 4 dígitos' : 'Confirme o PIN'
    return (
      <div className="seguranca-tela seguranca-pin tela-entrada">
        <h1>{titulo}</h1>
        <p>{etapa.tipo === 'criar' ? 'Ele vai ser pedido ao abrir o portal neste aparelho.' : 'Para mudar a proteção do app.'}</p>
        <TecladoPin
          valor={pin}
          onMudar={(v) => {
            setPin(v)
            if (v.length > 0) setErro(null)
          }}
          onCompleto={aoCompletar}
          erro={erro}
        />
        <button type="button" className="seguranca-cancelar" onClick={() => ir({ tipo: 'inicio' })}>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="seguranca-tela tela-entrada">
      <CabecalhoTela titulo="Segurança" subtitulo="Proteja o acesso ao app neste celular." />

      <section className={`cartao-destaque seguranca-estado ${ativo ? 'ligada' : ''}`}>
        <span className="cartao-destaque-rotulo">Proteção do app</span>
        <strong>{ativo ? 'Ligada' : 'Desligada'}</strong>
        <p>Com ela ligada, o portal pede um PIN só deste aparelho ao abrir e depois de 5 minutos fora dele.</p>
        <button
          type="button"
          className={ativo ? 'seguranca-botao-claro' : 'seguranca-botao-laranja'}
          onClick={() => (ativo ? ir({ tipo: 'conferir', depois: 'desligar' }) : ir({ tipo: 'criar', primeiro: null }))}
        >
          {ativo ? 'Desligar proteção' : 'Ligar proteção'}
        </button>
      </section>

      {ativo && (
        <>
          <RotuloGrupo>Opções</RotuloGrupo>
          <BlocoBranco>
            <LinhaItem icone={IcLock} tom="primaria" titulo="Alterar PIN do app" onClick={() => ir({ tipo: 'conferir', depois: 'alterar' })} />
          </BlocoBranco>
        </>
      )}

      <RotuloGrupo>Senha da conta</RotuloGrupo>
      <BlocoBranco>
        <LinhaItem icone={MdKey} tom="primaria" titulo="Alterar senha" onClick={() => navigate('/alterar-senha', { viewTransition: true })} />
      </BlocoBranco>

      <p className="seguranca-nota">
        <IcPrivacyTip size={16} aria-hidden="true" /> O PIN fica só neste aparelho. Se esquecer, é só entrar de novo com CPF ou
        CNPJ e senha.
      </p>
    </div>
  )
}
