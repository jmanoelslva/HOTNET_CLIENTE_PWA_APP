import { useEffect, useMemo, useState } from 'react'
import { MdArrowDropDown, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdMemory, MdPublic } from 'react-icons/md'
import SeletorMes from '../components/SeletorMes'
import { IcDataUsage, IcWifi, IcWifiOff } from '../components/IconesApp'
import {
  buscarConsumoDoMes,
  comNumeroDoContrato,
  buscarSessaoAtualPorCpe,
  totalBytes,
  totalRxBytes,
  totalTxBytes,
  type ConsumoPorContrato,
  type SessaoAtual,
} from '../api/consumo'
import { buscarContratos } from '../api/contratos'
import { formatarBytes, formatarDuracao } from '../utils/formatacao'
import CabecalhoTela from '../components/CabecalhoTela'
import PullToRefresh from '../components/PullToRefresh'
import Skeleton from '../components/Skeleton'
import EstadoVazio from '../components/EstadoVazio'
import { AbasPilula, BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
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
  const [escolhendoMes, setEscolhendoMes] = useState(false)

  const [consumoPorContrato, setConsumoPorContrato] = useState<ConsumoPorContrato[]>([])
  const [cpePkSelecionado, setCpePkSelecionado] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [sessaoAtual, setSessaoAtual] = useState<SessaoAtual | null | undefined>(undefined)
  // Consulta da sessão falhou (rede, servidor): não é o mesmo que "Offline".
  const [falhaSessao, setFalhaSessao] = useState(false)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await comNumeroDoContrato(await buscarConsumoDoMes(ano, mes), buscarContratos)
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
    setFalhaSessao(false)
    if (consumoSelecionado == null) return
    let cancelado = false
    buscarSessaoAtualPorCpe(consumoSelecionado.cpePk)
      .then((sessao) => {
        if (!cancelado) setSessaoAtual(sessao)
      })
      .catch(() => {
        if (cancelado) return
        setSessaoAtual(null)
        setFalhaSessao(true)
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
      <CabecalhoTela titulo="Consumo" subtitulo="Quanto da internet você usou no mês." />

      {/* Seletor de mês (MonthSelector do app Android). */}
      <div className="consumo-seletor-mes">
        <button type="button" onClick={irParaMesAnterior} aria-label="Mês anterior">
          <MdKeyboardArrowLeft size={22} />
        </button>
        <button type="button" className="consumo-seletor-mes-nome" onClick={() => setEscolhendoMes(true)} aria-label="Selecionar mês">
          {nomesMeses[mes - 1]} de {ano}
          <MdArrowDropDown size={24} aria-hidden="true" />
        </button>
        <button type="button" onClick={irParaProximoMes} disabled={ehMesAtual(ano, mes)} aria-label="Próximo mês">
          <MdKeyboardArrowRight size={22} />
        </button>
      </div>

      {escolhendoMes && (
        <SeletorMes
          aberto
          mes={mes}
          ano={ano}
          onFechar={() => setEscolhendoMes(false)}
          onEscolher={(m, a) => {
            setEscolhendoMes(false)
            setMes(m)
            setAno(a)
          }}
        />
      )}

      {consumoPorContrato.length > 1 && (
        <div className="consumo-seletor-contrato">
          <AbasPilula<string>
            rotulo="Contrato"
            opcoes={consumoPorContrato.map((c) => ({ valor: String(c.cpePk), rotulo: `Nº ${c.contractNumber ?? c.cpePk}` }))}
            selecionada={String(cpePkSelecionado ?? '')}
            onSelecionar={(v) => setCpePkSelecionado(Number(v))}
          />
        </div>
      )}

      {carregando && (
        <div className="cartao-destaque consumo-esqueleto">
          <Skeleton width="40%" height={12} />
          <Skeleton width="60%" height={30} />
        </div>
      )}

      {!carregando && erro && (
        <div className="erro-carregamento">
          <p>{erro}</p>
          <button type="button" className="botao-primario" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {!carregando && !erro && !consumoSelecionado && (
        <EstadoVazio
          icone={IcDataUsage}
          titulo="Sem dados de consumo neste mês"
          subtitulo="O uso da internet aparece aqui conforme você navega."
        />
      )}

      {!carregando && !erro && consumoSelecionado && (
        <>
          <section className="cartao-destaque" aria-label="Total no mês">
            <span className="cartao-destaque-rotulo">Total no mês</span>
            <strong className="consumo-total">{formatarBytes(totalBytes(consumoSelecionado))}</strong>
            <div className="consumo-legendas">
              <span>
                <i className="consumo-legenda-ponto download" aria-hidden="true" /> Download{' '}
                {formatarBytes(totalTxBytes(consumoSelecionado))}
              </span>
              <span>
                <i className="consumo-legenda-ponto upload" aria-hidden="true" /> Upload{' '}
                {formatarBytes(totalRxBytes(consumoSelecionado))}
              </span>
            </div>
            {consumoSelecionado.dias.length > 0 && (
              <span className="consumo-media">
                Média de {formatarBytes(totalBytes(consumoSelecionado) / consumoSelecionado.dias.length)} por dia
              </span>
            )}
          </section>

          <RotuloGrupo>Conexão agora</RotuloGrupo>
          <BlocoBranco>
            <LinhaItem
              icone={sessaoAtual ? IcWifi : IcWifiOff}
              tom={sessaoAtual ? 'primaria' : 'neutra'}
              rotulo="Estado"
              titulo={
                sessaoAtual === undefined
                  ? 'Verificando conexão…'
                  : sessaoAtual
                    ? `Conectado há ${formatarDuracao(sessaoAtual.tempoOnlineSegundos)}`
                    : falhaSessao
                      ? 'Não foi possível verificar'
                      : 'Sem conexão agora'
              }
            />
            {sessaoAtual?.ip && <LinhaItem icone={MdPublic} tom="primaria" rotulo="IP atual" titulo={sessaoAtual.ip} />}
            {sessaoAtual?.callingId && (
              <LinhaItem icone={MdMemory} tom="primaria" rotulo="MAC" titulo={sessaoAtual.callingId} />
            )}
          </BlocoBranco>

          {consumoSelecionado.dias.length > 0 && (
            <>
              <RotuloGrupo>Consumo por dia</RotuloGrupo>
              <div className="bloco-branco consumo-dias">
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
            </>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  )
}
