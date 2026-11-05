import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaWhatsapp } from 'react-icons/fa'
import {
  LuArrowDownToLine,
  LuCamera,
  LuChartColumn,
  LuFileCheck,
  LuCircleHelp,
  LuFileText,
  LuIdCard,
  LuInfo,
  LuKeyRound,
  LuLogOut,
  LuMonitorSmartphone,
  LuMoon,
  LuSun,
} from 'react-icons/lu'
import { useSessao } from '../auth/useSessao'
import { buscarDadosCliente } from '../api/cadastro'
import { useModoTema } from '../hooks/useTema'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import { mascararDocumento } from '../utils/recibo'
import { nomeParaExibir } from '../utils/formatacao'
import { fotoDaConta, prepararFoto, salvarFoto } from '../utils/contaLocal'
import { useToast } from '../components/Toast/useToast'
import CabecalhoTela from '../components/CabecalhoTela'
import ModalConfirmarLogout from '../components/ModalConfirmarLogout'
import ModalInstalarIos from '../components/ModalInstalarIos'
import { AbasPilula, BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
import type { ModoTema } from '../utils/tema'
import './Perfil.css'

/**
 * Perfil — mesma organização da tela Conta do app Android (conta/
 * ContaScreen.kt): cabeçalho com a inicial do nome e grupos Minha conta,
 * Preferências e Ajuda, com "Sair da conta" à parte, em vermelho.
 */
export default function Perfil() {
  const { cpf, sair } = useSessao()
  const navigate = useNavigate()
  const { modo, definirModo } = useModoTema()
  const { podeInstalar, aoClicarInstalar, modalIosAberto, fecharModalIos } = usePwaInstall()
  const [nome, setNome] = useState<string | null>(null)
  const [documento, setDocumento] = useState<string | null>(null)
  const [confirmarSair, setConfirmarSair] = useState(false)
  const [foto, setFoto] = useState(() => fotoDaConta(cpf))
  const entradaFoto = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo || !cpf) return
    try {
      const dataUrl = await prepararFoto(arquivo)
      salvarFoto(cpf, dataUrl)
      setFoto(dataUrl)
    } catch {
      toast('Não foi possível usar essa imagem. Tente outra.')
    }
  }

  useEffect(() => {
    let cancelado = false
    buscarDadosCliente(cpf)
      .then((cliente) => {
        if (cancelado) return
        setNome(cliente.client_complete_name?.trim() ? nomeParaExibir(cliente.client_complete_name) : null)
        setDocumento(cliente.client_doc1 ?? cpf)
      })
      .catch(() => {
        if (!cancelado) setDocumento(cpf)
      })
    return () => {
      cancelado = true
    }
  }, [cpf])

  function ir(rota: string) {
    navigate(rota, { viewTransition: true })
  }

  const inicial = (nome ?? 'C').charAt(0).toUpperCase()
  const documentoMascarado = mascararDocumento(documento)

  return (
    <div className="perfil-tela tela-entrada">
      <CabecalhoTela titulo="Perfil" subtitulo="Seus dados, preferências e ajuda." />

      <div className="perfil-cabecalho">
        {/* Foto só neste aparelho, como no app Android. */}
        <button
          type="button"
          className="perfil-avatar"
          onClick={() => entradaFoto.current?.click()}
          aria-label={foto ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
        >
          {foto ? <img src={foto} alt="" /> : inicial}
          <span className="perfil-avatar-camera" aria-hidden="true">
            <LuCamera size={14} />
          </span>
        </button>
        <input
          ref={entradaFoto}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            escolherFoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <div className="perfil-identidade">
          <strong>{nome ?? 'Cliente HOTNET'}</strong>
          {documentoMascarado && <span>{documentoMascarado}</span>}
          {foto && (
            <button
              type="button"
              className="perfil-remover-foto"
              onClick={() => {
                if (cpf) salvarFoto(cpf, null)
                setFoto(null)
              }}
            >
              Remover foto
            </button>
          )}
        </div>
      </div>

      <RotuloGrupo>Minha conta</RotuloGrupo>
      <BlocoBranco>
        <LinhaItem icone={LuIdCard} titulo="Meus dados" onClick={() => ir('/cadastro')} />
        <LinhaItem icone={LuFileText} titulo="Contratos" onClick={() => ir('/contratos')} />
        <LinhaItem icone={LuChartColumn} titulo="Consumo" onClick={() => ir('/consumo')} />
        <LinhaItem icone={LuFileCheck} titulo="Declaração de quitação" onClick={() => ir('/quitacao')} />
      </BlocoBranco>

      <RotuloGrupo>Preferências</RotuloGrupo>
      <BlocoBranco>
        <div className="perfil-aparencia">
          <div className="perfil-aparencia-topo">
            <span className="linha-item-icone linha-item-icone-neutra" aria-hidden="true">
              <LuMoon size={18} />
            </span>
            <strong>Aparência</strong>
          </div>
          <AbasPilula<ModoTema>
            rotulo="Aparência"
            opcoes={[
              { valor: 'sistema', rotulo: 'Sistema', icone: LuMonitorSmartphone },
              { valor: 'light', rotulo: 'Claro', icone: LuSun },
              { valor: 'dark', rotulo: 'Escuro', icone: LuMoon },
            ]}
            selecionada={modo}
            onSelecionar={definirModo}
          />
        </div>
        <LinhaItem icone={LuKeyRound} titulo="Alterar senha" onClick={() => ir('/alterar-senha')} />
        {podeInstalar && <LinhaItem icone={LuArrowDownToLine} titulo="Instalar o app" onClick={aoClicarInstalar} />}
      </BlocoBranco>

      <RotuloGrupo>Ajuda</RotuloGrupo>
      <BlocoBranco>
        <LinhaItem icone={LuCircleHelp} titulo="Dúvidas frequentes" onClick={() => ir('/faq')} />
        <LinhaItem icone={FaWhatsapp} titulo="Falar no WhatsApp" onClick={() => abrirWhatsappSuporte(nome, cpf)} />
        <LinhaItem icone={LuInfo} titulo="Sobre" detalhe={__APP_VERSION__ || undefined} onClick={() => ir('/sobre')} />
      </BlocoBranco>

      <BlocoBranco className="perfil-sair">
        <LinhaItem icone={LuLogOut} titulo="Sair da conta" tom="perigo" comSeta={false} onClick={() => setConfirmarSair(true)} />
      </BlocoBranco>

      <ModalInstalarIos aberto={modalIosAberto} onFechar={fecharModalIos} />
      <ModalConfirmarLogout
        aberto={confirmarSair}
        onCancelar={() => setConfirmarSair(false)}
        onConfirmar={() => {
          setConfirmarSair(false)
          sair()
        }}
      />
    </div>
  )
}
