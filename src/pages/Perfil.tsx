import { useEffect, useRef, useState } from 'react'
import { MdDarkMode, MdExitToApp, MdGetApp, MdInfo, MdLightMode, MdSettingsBrightness } from 'react-icons/md'
import { IcBadge, IcDataUsage, IcDescription, IcHelp, IcLock, IcPhotoCamera, IcTask, IcWhatsapp } from '../components/IconesApp'
import { useNavigate } from 'react-router-dom'
import { useSessao } from '../auth/useSessao'
import { buscarDadosCliente } from '../api/cadastro'
import { useModoTema } from '../hooks/useTema'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import { mascararDocumento } from '../utils/recibo'
import { descricaoDocumento } from '../utils/acessibilidade'
import { nomeParaExibir } from '../utils/formatacao'
import { FormatoFotoNaoSuportado, fotoDaConta, prepararFoto, salvarFoto } from '../utils/contaLocal'
import { pinAtivo } from '../utils/pinApp'
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
    } catch (erro) {
      console.error('[foto de perfil]', arquivo.type || '(sem tipo)', arquivo.size, erro)
      toast(
        erro instanceof FormatoFotoNaoSuportado
          ? 'Essa foto está em HEIC, formato que o navegador não abre. Escolha uma foto em JPG ou PNG (por exemplo, um print da foto).'
          : 'Não foi possível usar essa imagem. Tente outra foto.',
      )
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
      <CabecalhoTela titulo="Perfil" fixo subtitulo="Seus dados, preferências e ajuda." />

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
            <IcPhotoCamera size={14} />
          </span>
        </button>
        <input
          ref={entradaFoto}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          hidden
          onChange={(e) => {
            escolherFoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <div className="perfil-identidade">
          <strong>{nome ?? 'Cliente HOTNET'}</strong>
          {documentoMascarado && (
            <span>
              <span aria-hidden="true">{documentoMascarado}</span>
              <span className="sr-only">{descricaoDocumento(documento)}</span>
            </span>
          )}
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
        <LinhaItem icone={IcBadge} titulo="Meus dados" onClick={() => ir('/cadastro')} />
        <LinhaItem icone={IcDescription} titulo="Contratos" onClick={() => ir('/contratos')} />
        <LinhaItem icone={IcDataUsage} titulo="Consumo" onClick={() => ir('/consumo')} />
        <LinhaItem icone={IcTask} titulo="Declaração de quitação" onClick={() => ir('/quitacao')} />
      </BlocoBranco>

      <RotuloGrupo>Preferências</RotuloGrupo>
      <BlocoBranco>
        <div className="perfil-aparencia">
          <div className="perfil-aparencia-topo">
            <span className="linha-item-icone linha-item-icone-neutra" aria-hidden="true">
              <MdDarkMode size={18} />
            </span>
            <strong>Aparência</strong>
          </div>
          <AbasPilula<ModoTema>
            rotulo="Aparência"
            opcoes={[
              { valor: 'sistema', rotulo: 'Sistema', icone: MdSettingsBrightness },
              { valor: 'light', rotulo: 'Claro', icone: MdLightMode },
              { valor: 'dark', rotulo: 'Escuro', icone: MdDarkMode },
            ]}
            selecionada={modo}
            onSelecionar={definirModo}
          />
        </div>
        <LinhaItem
          icone={IcLock}
          titulo="Segurança"
          detalhe={pinAtivo(cpf) ? 'Ligada' : 'Desligada'}
          onClick={() => ir('/seguranca')}
        />
        {podeInstalar && <LinhaItem icone={MdGetApp} titulo="Instalar o app" onClick={aoClicarInstalar} />}
      </BlocoBranco>

      <RotuloGrupo>Ajuda</RotuloGrupo>
      <BlocoBranco>
        <LinhaItem icone={IcHelp} titulo="Dúvidas frequentes" onClick={() => ir('/faq')} />
        <LinhaItem icone={IcWhatsapp} titulo="Falar no WhatsApp" onClick={() => abrirWhatsappSuporte(nome, cpf)} />
        <LinhaItem icone={MdInfo} titulo="Sobre" detalhe={__APP_VERSION__ || undefined} onClick={() => ir('/sobre')} />
      </BlocoBranco>

      <BlocoBranco className="perfil-sair">
        <LinhaItem icone={MdExitToApp} titulo="Sair da conta" tom="perigo" comSeta={false} onClick={() => setConfirmarSair(true)} />
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
