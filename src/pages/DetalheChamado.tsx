import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  buscarOperacoes,
  chamadoResolvido,
  ehArquivoDeImagem,
  ehArquivoDeVideo,
  enviarAnexoChamado,
  enviarMensagem,
  type OperacaoChamado,
} from '../api/suporte'
import type { TicketDto } from '../api/client'
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

export default function DetalheChamado() {
  const { ticketPk } = useParams<{ ticketPk: string }>()
  const pk = Number(ticketPk)
  const navigate = useNavigate()
  const location = useLocation()
  const chamado = (location.state as { chamado?: TicketDto } | null)?.chamado ?? null
  const resolvido = chamado ? chamadoResolvido(chamado) : false

  const [operacoes, setOperacoes] = useState<OperacaoChamado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputArquivoRef = useRef<HTMLInputElement>(null)
  const fimDaListaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!Number.isFinite(pk)) return
    carregar(true)
    const intervalo = setInterval(() => carregar(false), INTERVALO_ATUALIZACAO_MS)
    return () => clearInterval(intervalo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pk])

  async function carregar(mostrarCarregando: boolean) {
    if (mostrarCarregando) setCarregando(true)
    try {
      const dados = await buscarOperacoes(pk)
      setOperacoes(dados)
      setErro(null)
      setTimeout(() => fimDaListaRef.current?.scrollIntoView({ block: 'end' }), 0)
    } catch {
      if (mostrarCarregando) setErro('Não foi possível carregar as mensagens deste chamado.')
    } finally {
      if (mostrarCarregando) setCarregando(false)
    }
  }

  async function aoEnviarMensagem() {
    const texto = mensagem.trim()
    if (!texto) return
    setEnviando(true)
    try {
      await enviarMensagem(pk, texto)
      setMensagem('')
      await carregar(false)
    } catch (excecao) {
      window.alert(excecao instanceof Error ? excecao.message : 'Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  async function aoSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    setEnviando(true)
    try {
      await enviarAnexoChamado(pk, arquivo)
      await carregar(false)
    } catch (excecao) {
      window.alert(excecao instanceof Error ? excecao.message : 'Não foi possível enviar o anexo.')
    } finally {
      setEnviando(false)
    }
  }

  if (!Number.isFinite(pk)) {
    return <p className="detalhe-status">Chamado não encontrado.</p>
  }

  return (
    <div className="detalhe-tela">
      <header className="detalhe-cabecalho">
        <button className="detalhe-voltar" onClick={() => navigate('/suporte')}>
          ← Voltar
        </button>
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

      <div className="detalhe-chat">
        {carregando && <p className="detalhe-status">Carregando mensagens…</p>}

        {!carregando && erro && (
          <div className="detalhe-status">
            <p>{erro}</p>
            <button onClick={() => carregar(true)}>Tentar novamente</button>
          </div>
        )}

        {!carregando && !erro && operacoes.length === 0 && (
          <p className="detalhe-status">Nenhuma mensagem neste chamado ainda.</p>
        )}

        {!carregando &&
          !erro &&
          operacoes.map((op) => (
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
                  <a href={op.urlAnexo} target="_blank" rel="noreferrer" className="balao-anexo-arquivo">
                    📎 {op.arquivo}
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
          <input ref={inputArquivoRef} type="file" style={{ display: 'none' }} onChange={aoSelecionarArquivo} />
          <button
            className="detalhe-btn-anexar"
            disabled={enviando}
            onClick={() => inputArquivoRef.current?.click()}
            aria-label="Anexar arquivo"
          >
            📎
          </button>
          <input
            className="detalhe-input-mensagem"
            value={mensagem}
            onChange={(evento) => setMensagem(evento.target.value)}
            onKeyDown={(evento) => evento.key === 'Enter' && aoEnviarMensagem()}
            placeholder="Digite uma mensagem…"
            disabled={enviando}
          />
          <button className="detalhe-btn-enviar" disabled={enviando || !mensagem.trim()} onClick={aoEnviarMensagem}>
            Enviar
          </button>
        </div>
      )}
    </div>
  )
}
