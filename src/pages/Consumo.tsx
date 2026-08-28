import { useEffect, useMemo, useState } from 'react'
import { MdDataUsage } from 'react-icons/md'
import {
  buscarConsumoDoMes,
  buscarSessaoAtualPorCpe,
  totalBytes,
  totalRxBytes,
  totalTxBytes,
  type ConsumoPorContrato,
  type SessaoAtual,
} from '../api/consumo'
import { formatarBytes, formatarDuracao } from '../utils/formatacao'
import CabecalhoTela from '../components/CabecalhoTela'
import PullToRefresh from '../components/PullToRefresh'
import Skeleton from '../components/Skeleton'
import EstadoVazio from '../components/EstadoVazio'
import { CORES } from '../utils/cores'
import './Consumo.css'

const NOMES_DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function ehMesAtual(ano: number, mes: number): boolean {
  const hoje = new Date()
  return ano === hoje.getFullYear() && mes === hoje.getMonth() + 1
}

function formatarDiaCurto(dataIso: string): { diaMes: string; diaSemana: string } {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const data = new Date(ano, mes - 1, dia)
  return {
    diaMes: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
    diaSemana: NOMES_DIAS_SEMANA[data.getDay()],
  }
}

export default function Consumo() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)

  const [consumoPorContrato, setConsumoPorContrato] = useState<ConsumoPorContrato[]>([])
  const [cpePkSelecionado, setCpePkSelecionado] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [sessaoAtual, setSessaoAtual] = useState<SessaoAtual | null | undefined>(undefined)
  const [detalhesAbertos, setDetalhesAbertos] = useState(false)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await buscarConsumoDoMes(ano, mes)
      setConsumoPorContrato(dados)
      if (dados.length > 0) {
        setCpePkSelecionado((atual) => (dados.some((c) => c.cpePk === atual) ? atual : dados[0].cpePk))
      } else {
        setCpePkSelecionado(null)
      }
    } catch {
      setErro('Não foi possível carregar o consumo. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const consumoSelecionado = useMemo(
    () => consumoPorContrato.find((c) => c.cpePk === cpePkSelecionado) ?? null,
    [consumoPorContrato, cpePkSelecionado],
  )

  useEffect(() => {
    setSessaoAtual(undefined)
    setDetalhesAbertos(false)
    if (consumoSelecionado == null) return
    let cancelado = false
    buscarSessaoAtualPorCpe(consumoSelecionado.cpePk)
      .then((sessao) => {
        if (!cancelado) setSessaoAtual(sessao)
      })
      .catch(() => {
        if (!cancelado) setSessaoAtual(null)
      })
    return () => {
      cancelado = true
    }
  }, [consumoSelecionado])

  function irParaMesAnterior() {
    if (mes === 1) {
      setMes(12)
      setAno((a) => a - 1)
    } else {
      setMes((m) => m - 1)
    }
  }

  function irParaProximoMes() {
    if (ehMesAtual(ano, mes)) return
    if (mes === 12) {
      setMes(1)
      setAno((a) => a + 1)
    } else {
      setMes((m) => m + 1)
    }
  }

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  const maiorDia = consumoSelecionado
    ? Math.max(1, ...consumoSelecionado.dias.map((d) => d.rxBytes + d.txBytes))
    : 1
  const hojeIso = new Date().toISOString().slice(0, 10)

  return (
    <PullToRefresh aoAtualizar={carregar}>
    <div className="consumo-tela tela-entrada">
      <CabecalhoTela
        icone={MdDataUsage}
        cor={CORES.consumo}
        titulo="Consumo"
        subtitulo="Acompanhe o uso diário da sua internet."
      />

      <div className="consumo-seletor-mes">
        <button onClick={irParaMesAnterior} aria-label="Mês anterior">‹</button>
        <span>{nomesMeses[mes - 1]} {ano}</span>
        <button onClick={irParaProximoMes} disabled={ehMesAtual(ano, mes)} aria-label="Próximo mês">›</button>
      </div>

      {consumoPorContrato.length > 1 && (
        <select
          className="consumo-filtro-contrato"
          value={cpePkSelecionado ?? ''}
          onChange={(evento) => setCpePkSelecionado(Number(evento.target.value))}
        >
          {consumoPorContrato.map((c) => (
            <option key={c.cpePk} value={c.cpePk}>
              Contrato {c.contractNumber ?? c.cpePk}
            </option>
          ))}
        </select>
      )}

      {carregando && (
        <>
          <div className="consumo-card-resumo">
            <Skeleton width="50%" height={12} />
            <Skeleton width="70%" height={26} />
          </div>
          <div className="consumo-card-sessao">
            <Skeleton width="40%" height={14} />
          </div>
        </>
      )}

      {!carregando && erro && (
        <div className="consumo-status">
          <p>{erro}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {!carregando && !erro && !consumoSelecionado && (
        <EstadoVazio icone={MdDataUsage} titulo="Nenhum consumo registrado" subtitulo="Nada por aqui neste período." />
      )}

      {!carregando && !erro && consumoSelecionado && (
        <>
          <div className="consumo-card-resumo">
            <span className="consumo-total-label">Consumo total no período</span>
            <p className="consumo-total-valor">{formatarBytes(totalBytes(consumoSelecionado))}</p>
            <div className="consumo-resumo-linhas">
              <div>
                <span>Download</span>
                <strong>{formatarBytes(totalTxBytes(consumoSelecionado))}</strong>
              </div>
              <div>
                <span>Upload</span>
                <strong>{formatarBytes(totalRxBytes(consumoSelecionado))}</strong>
              </div>
            </div>
          </div>

          <div className="consumo-card-sessao">
            <div className="consumo-sessao-topo">
              <span
                className="consumo-indicador"
                style={{ background: sessaoAtual ? CORES.sucesso : CORES.textoFraco }}
              />
              <span>
                {sessaoAtual === undefined ? 'Verificando conexão…' : sessaoAtual ? 'Online Agora' : 'Offline'}
              </span>
            </div>

            {sessaoAtual && (
              <>
                <button className="consumo-toggle-detalhes" onClick={() => setDetalhesAbertos((v) => !v)}>
                  {detalhesAbertos ? 'OCULTAR DETALHES ▴' : 'DETALHES DA CONEXÃO ▾'}
                </button>

                {detalhesAbertos && (
                  <div className="consumo-detalhes-sessao">
                    <p>Tempo online: {formatarDuracao(sessaoAtual.tempoOnlineSegundos)}</p>
                    <p>IP: {sessaoAtual.ip ?? 'não disponível'}</p>
                    {sessaoAtual.callingId && <p>MAC: {sessaoAtual.callingId}</p>}
                    {sessaoAtual.ipv6Prefixo && <p>IPv6 (prefixo): {sessaoAtual.ipv6Prefixo}</p>}
                    {sessaoAtual.ipv6Delegado && <p>IPv6 (delegado): {sessaoAtual.ipv6Delegado}</p>}
                    <div className="consumo-resumo-linhas">
                      <div>
                        <span>Download (sessão)</span>
                        <strong>{formatarBytes(sessaoAtual.txBytes)}</strong>
                      </div>
                      <div>
                        <span>Upload (sessão)</span>
                        <strong>{formatarBytes(sessaoAtual.rxBytes)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {consumoSelecionado.dias.length > 0 && (
            <div className="consumo-card-historico">
              <span className="consumo-historico-titulo">Detalhe diário</span>
              {[...consumoSelecionado.dias]
                .sort((a, b) => b.data.localeCompare(a.data))
                .map((dia) => {
                  const { diaMes, diaSemana } = formatarDiaCurto(dia.data)
                  const total = dia.rxBytes + dia.txBytes
                  const proporcao = Math.max(4, (total / maiorDia) * 100)
                  return (
                    <div className="consumo-dia" key={dia.data}>
                      <div className="consumo-dia-cabecalho">
                        <span>
                          {diaMes} <span className="consumo-dia-semana">{diaSemana}</span>
                          {dia.data === hojeIso && <span className="consumo-chip-hoje">Hoje</span>}
                        </span>
                        <strong>{formatarBytes(total)}</strong>
                      </div>
                      <div className="consumo-barra-fundo">
                        <div className="consumo-barra" style={{ width: `${proporcao}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  )
}
