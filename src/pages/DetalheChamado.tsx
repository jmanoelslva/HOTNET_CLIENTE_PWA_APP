import { useEffect, useRef, useState } from 'react'
import FolhaConfirmar from '../components/FolhaConfirmar'
import { MdChatBubbleOutline, MdPictureAsPdf } from 'react-icons/md'
import { IcAttachFile, IcDescription, IcLocationOn, IcPhotoCamera, IcPhotoLibrary } from '../components/IconesApp'
import { useLocation, useParams } from 'react-router-dom'
import VoltarInicio from '../components/VoltarInicio'
import EstadoVazio from '../components/EstadoVazio'
import {
  buscarOperacoes,
  chamadoResolvido,
  descartarPendentesConfirmadas,
  ehArquivoDeImagem,
  ehArquivoDeVideo,
  ehArquivoPdf,
  enviarAnexoChamado,
  enviarMensagem,
  type OperacaoChamado,
} from '../api/suporte'
import type { TicketDto } from '../api/client'
import { useToast } from '../components/Toast/useToast'
import Skeleton from '../components/Skeleton'
import './DetalheChamado.css'

const INTERVALO_ATUALIZACAO_MS = 10_000

function formatarDataHora(data: string | null): string {
  if (!data) return ''
  const partes = data.split(' ')
  const dataParte = partes[0]?.split('-')
  const horaParte = partes[1]?.slice(0, 5)
  if (dataParte?.length === 3) {
    return `${dataParte[2]}/${dataParte[1]}/${dataParte[0]}${horaParte ? ` ${horaParte}` : ''}`
  }
  return data
}

/** "YYYY-MM-DD HH:mm:ss", mesmo formato que op_date_create — usado só pra
 * carimbar a mensagem otimista (ver aoEnviarTexto) com algo que
 * formatarDataHora sabe exibir. */
function agoraNoFormatoDoServidor(): string {
  const agora = new Date()
  const par = (n: number) => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${par(agora.getMonth() + 1)}-${par(agora.getDate())} ${par(agora.getHours())}:${par(agora.getMinutes())}:${par(agora.getSeconds())}`
}

export default function DetalheChamado() {
  const { ticketPk } = useParams<{ ticketPk: string }>()
  const pk = Number(ticketPk)
  const location = useLocation()
  const { toast } = useToast()
  const chamado = (location.state as { chamado?: TicketDto } | null)?.chamado ?? null
  const resolvido = chamado ? chamadoResolvido(chamado) : false

  const [operacoes, setOperacoes] = useState<OperacaoChamado[]>([])
  // Mensagens de texto enviadas mas ainda não confirmadas pelo servidor —
  // aparecem na hora, sem esperar o próximo fetch (que pode demorar até
  // o intervalo de atualização, ou nem trazer a mensagem ainda por
  // atraso do próprio backend). Removidas assim que o fetch confirma.
  const [pendentes, setPendentes] = useState<OperacaoChamado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [menuAnexoAberto, setMenuAnexoAberto] = useState(false)
  const [confirmandoLocalizacao, setConfirmandoLocalizacao] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)
  const inputGaleriaRef = useRef<HTMLInputElement>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)
  const inputMensagemRef = useRef<HTMLInputElement>(null)
  const fimDaListaRef = useRef<HTMLDivElement>(null)
  // Quantidade de mensagens na última carga — em ref pra comparar sem
  // depender de "operacoes" no closure do setInterval (que ficaria
  // desatualizado, já que o efeito só reagenda quando "pk" muda).
  const qtdMensagensRef = useRef(0)

  // Pausa o polling com a aba/app em segundo plano (document.hidden) —
  // sem isso, o app continua gastando dados/bateria a cada 10s mesmo
  // minimizado, o que pesa mais pra quem já está numa conexão ruim
  // (justamente o público de um portal de cliente de internet). Ao voltar
  // pro primeiro plano, busca na hora (não espera o próximo tick) e
  // retoma o intervalo.
  useEffect(() => {
    if (!Number.isFinite(pk)) return
    carregar(true)
    let intervalo: ReturnType<typeof setInterval> | null =
      document.visibilityState === 'visible' ? setInterval(() => carregar(false), INTERVALO_ATUALIZACAO_MS) : null

    function aoMudarVisibilidade() {
      if (document.visibilityState === 'visible') {
        if (intervalo == null) {
          carregar(false)
          intervalo = setInterval(() => carregar(false), INTERVALO_ATUALIZACAO_MS)
        }
      } else if (intervalo != null) {
        clearInterval(intervalo)
        intervalo = null
      }
    }

    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      if (intervalo != null) clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pk])

  async function carregar(mostrarCarregando: boolean) {
    if (mostrarCarregando) setCarregando(true)
    try {
      const dados = await buscarOperacoes(pk)
      const chegouMensagemNova = dados.length > qtdMensagensRef.current
      qtdMensagensRef.current = dados.length
      setOperacoes(dados)
      setPendentes((atual) => descartarPendentesConfirmadas(atual, dados))
      setErro(null)
      // Só rola pro fim na carga inicial ou quando chega mensagem nova —
      // nas atualizações silenciosas de fundo (a cada 10s) sem novidade,
      // não puxa a tela de quem estiver lendo mensagens antigas.
      if (mostrarCarregando || chegouMensagemNova) {
        setTimeout(() => fimDaListaRef.current?.scrollIntoView({ block: 'end' }), 0)
      }
    } catch {
      if (mostrarCarregando) setErro('Não foi possível carregar as mensagens deste chamado.')
    } finally {
      if (mostrarCarregando) setCarregando(false)
    }
  }

  /** Envia qualquer texto pro chamado — reaproveitado pela mensagem digitada e pela localização. */
  async function aoEnviarTexto(texto: string, aoConcluir?: () => void) {
    setEnviando(true)
    // Mostra a mensagem na hora (sem esperar o servidor confirmar) e já
    // rola pro fim — resolve o problema de mandar uma mensagem e ela não
    // aparecer até a próxima atualização automática.
    const otimista: OperacaoChamado = {
      opPk: -Date.now(),
      texto,
      arquivo: null,
      dataCriacao: agoraNoFormatoDoServidor(),
      doCliente: true,
      urlAnexo: null,
    }
    setPendentes((atual) => [...atual, otimista])
    setTimeout(() => fimDaListaRef.current?.scrollIntoView({ block: 'end' }), 0)
    try {
      await enviarMensagem(pk, texto)
      aoConcluir?.()
      await carregar(false)
    } catch (excecao) {
      setPendentes((atual) => atual.filter((p) => p.opPk !== otimista.opPk))
      toast(excecao instanceof Error ? excecao.message : 'Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  function aoEnviarMensagem() {
    if (enviando) return
    const texto = mensagem.trim()
    if (!texto) return
    aoEnviarTexto(texto, () => setMensagem(''))
    // Clicar em "Enviar" tira o foco do campo de texto e o teclado do
    // celular fecha sozinho — devolve o foco na hora (ainda dentro do
    // mesmo gesto do usuário, senão o navegador ignora) pra só fechar
    // quando o próprio usuário fechar.
    inputMensagemRef.current?.focus()
  }

  async function aoSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    setMenuAnexoAberto(false)
    if (!arquivo) return
    setEnviando(true)
    try {
      await enviarAnexoChamado(pk, arquivo)
      await carregar(false)
    } catch (excecao) {
      toast(excecao instanceof Error ? excecao.message : 'Não foi possível enviar o anexo.')
    } finally {
      setEnviando(false)
    }
  }

  function confirmarEnviarLocalizacao() {
    if (!navigator.geolocation) {
      toast('Este navegador não suporta compartilhar localização.')
      return
    }
    setConfirmandoLocalizacao(false)
    setEnviando(true)
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const { latitude, longitude } = posicao.coords
        const link = `https://www.google.com/maps?q=${latitude},${longitude}`
        aoEnviarTexto(`Minha localização atual: ${link}`)
      },
      () => {
        setEnviando(false)
        toast('Não foi possível obter a localização agora. Verifique a permissão do navegador.')
      },
    )
  }

  if (!Number.isFinite(pk)) {
    return <p className="detalhe-status">Chamado não encontrado.</p>
  }

  const listaExibida = [...operacoes, ...pendentes]

  return (
    <div className="detalhe-tela tela-entrada">
      <header className="detalhe-cabecalho">
        <VoltarInicio to="/suporte" label="Chamados" />
        {chamado && (
          <div className="detalhe-resumo">
            <div className="detalhe-resumo-topo">
              <span className="detalhe-assunto">{chamado.ticket_title ?? `Chamado #${pk}`}</span>
              <span className={`ticket-status-badge ${resolvido ? 'badge-fechado' : 'badge-aberto'}`}>
                {resolvido ? 'Fechado' : 'Aberto'}
              </span>
            </div>
            {chamado.ticket_protocol && <p className="detalhe-linha-resumo">Protocolo: {chamado.ticket_protocol}</p>}
            <p className="detalhe-linha-resumo">{chamado.category_name ?? 'Categoria não informada'}</p>
          </div>
        )}
      </header>

      {/* role="log" + aria-live: leitor de tela anuncia mensagens novas
          chegando via polling, sem precisar o cliente ficar navegando pra
          "descobrir" que a equipe respondeu. */}
      <div className="detalhe-chat" role="log" aria-live="polite" aria-relevant="additions">
        {carregando &&
          [0, 1, 2].map((indice) => (
            <div key={indice} className={`balao-linha ${indice === 1 ? 'linha-equipe' : 'linha-cliente'}`}>
              <div className={`balao ${indice === 1 ? 'balao-equipe' : 'balao-cliente'}`}>
                <Skeleton width={indice === 1 ? 160 : 120} height={13} />
              </div>
            </div>
          ))}

        {!carregando && erro && (
          <div className="detalhe-status">
            <p>{erro}</p>
            <button onClick={() => carregar(true)}>Tentar novamente</button>
          </div>
        )}

        {!carregando && !erro && listaExibida.length === 0 && (
          <EstadoVazio icone={MdChatBubbleOutline} titulo="Nenhuma mensagem ainda" subtitulo="Escreva algo pra começar a conversa." />
        )}

        {!carregando &&
          !erro &&
          listaExibida.map((op) => (
            <div key={op.opPk} className={`balao-linha ${op.doCliente ? 'linha-cliente' : 'linha-equipe'}`}>
              <div className={`balao ${op.doCliente ? 'balao-cliente' : 'balao-equipe'}`}>
                {!op.doCliente && <span className="balao-autor">Equipe Hotnet</span>}

                {op.texto && <p className="balao-texto">{op.texto}</p>}

                {op.urlAnexo && ehArquivoDeImagem(op.arquivo) && (
                  <img src={op.urlAnexo} alt="Anexo" className="balao-anexo-imagem" />
                )}
                {op.urlAnexo && ehArquivoDeVideo(op.arquivo) && (
                  <video src={op.urlAnexo} controls className="balao-anexo-imagem" />
                )}
                {op.urlAnexo && !ehArquivoDeImagem(op.arquivo) && !ehArquivoDeVideo(op.arquivo) && (
                  <a
                    href={op.urlAnexo}
                    target="_blank"
                    rel="noreferrer"
                    className={`balao-anexo-documento ${ehArquivoPdf(op.arquivo) ? 'balao-anexo-pdf' : ''}`}
                  >
                    <span className="balao-anexo-documento-icone">
                      {ehArquivoPdf(op.arquivo) ? <MdPictureAsPdf size={20} /> : <IcAttachFile size={20} />}
                    </span>
                    <span className="balao-anexo-documento-nome">{op.arquivo}</span>
                  </a>
                )}

                <span className="balao-data">{formatarDataHora(op.dataCriacao)}</span>
              </div>
            </div>
          ))}
        <div ref={fimDaListaRef} />
      </div>

      {!resolvido && (
        <div className="detalhe-envio">
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={aoSelecionarArquivo}
          />
          <input
            ref={inputGaleriaRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={aoSelecionarArquivo}
          />
          <input ref={inputArquivoRef} type="file" style={{ display: 'none' }} onChange={aoSelecionarArquivo} />

          <div className="detalhe-anexo-wrapper">
            <button
              className="detalhe-btn-anexar"
              disabled={enviando}
              onClick={() => setMenuAnexoAberto((v) => !v)}
              aria-label="Anexar"
            >
              <IcAttachFile size={20} />
            </button>
            {menuAnexoAberto && (
              <>
                <div className="detalhe-menu-fundo" onClick={() => setMenuAnexoAberto(false)} />
                <div className="detalhe-menu-anexo">
                  <button onClick={() => inputFotoRef.current?.click()}>
                    <IcPhotoCamera /> Tirar foto
                  </button>
                  <button onClick={() => inputGaleriaRef.current?.click()}>
                    <IcPhotoLibrary /> Galeria
                  </button>
                  <button onClick={() => inputArquivoRef.current?.click()}>
                    <IcDescription /> Arquivo
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            className="detalhe-btn-anexar"
            disabled={enviando}
            onClick={() => setConfirmandoLocalizacao(true)}
            aria-label="Enviar localização"
          >
            <IcLocationOn size={20} />
          </button>

          <input
            ref={inputMensagemRef}
            className="detalhe-input-mensagem"
            value={mensagem}
            onChange={(evento) => setMensagem(evento.target.value)}
            onKeyDown={(evento) => evento.key === 'Enter' && aoEnviarMensagem()}
            placeholder="Digite uma mensagem…"
          />
          <button className="detalhe-btn-enviar" disabled={enviando || !mensagem.trim()} onClick={aoEnviarMensagem}>
            Enviar
          </button>
        </div>
      )}

      <FolhaConfirmar
        aberto={confirmandoLocalizacao}
        titulo="Enviar sua localização?"
        texto="Isso manda sua localização atual como mensagem neste chamado, útil para a equipe encontrar o endereço numa visita técnica."
        icone={IcLocationOn}
        confirmar="Sim, enviar"
        onCancelar={() => setConfirmandoLocalizacao(false)}
        onConfirmar={confirmarEnviarLocalizacao}
      />
    </div>
  )
}
