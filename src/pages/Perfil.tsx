import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaWhatsapp } from 'react-icons/fa'
import {
  LuArrowDownToLine,
  LuChartColumn,
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

  useEffect(() => {
    let cancelado = false
    buscarDadosCliente(cpf)
      .then((cliente) => {
        if (cancelado) return
        setNome(cliente.client_complete_name?.trim() || null)
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
        <span className="perfil-avatar" aria-hidden="true">
          {inicial}
        </span>
        <div className="perfil-identidade">
          <strong>{nome ?? 'Cliente HOTNET'}</strong>
          {documentoMascarado && <span>{documentoMascarado}</span>}
        </div>
      </div>

      <RotuloGrupo>Minha conta</RotuloGrupo>
      <BlocoBranco>
        <LinhaItem icone={LuIdCard} titulo="Meus dados" onClick={() => ir('/cadastro')} />
        <LinhaItem icone={LuFileText} titulo="Contratos" onClick={() => ir('/contratos')} />
        <LinhaItem icone={LuChartColumn} titulo="Consumo" onClick={() => ir('/consumo')} />
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
