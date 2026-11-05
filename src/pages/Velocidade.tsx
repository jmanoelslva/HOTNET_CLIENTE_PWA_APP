import { useEffect, useState } from 'react'
import { MdHome, MdSmartphone } from 'react-icons/md'
import { IcCheckCircle, IcSpeed, IcWarning, IcWifi, IcWifiOff } from '../components/IconesApp'
import { useNavigate } from 'react-router-dom'
import { buscarContratos } from '../api/contratos'
import { buscarConsumoDoMes, buscarSessaoAtualPorCpe, vincularContratos } from '../api/consumo'
import CabecalhoTela from '../components/CabecalhoTela'
import BotaoFechar from '../components/BotaoFechar'
import { BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
import { formatarDuracao } from '../utils/formatacao'
import './Velocidade.css'

type TipoRede = 'wifi' | 'cabo' | 'dados' | 'sem-rede' | 'desconhecida'

/** O navegador só informa o tipo de rede em alguns celulares (Chrome no Android). */
function tipoDaRede(): TipoRede {
  if (!navigator.onLine) return 'sem-rede'
  const conexao = (navigator as Navigator & { connection?: { type?: string } }).connection
  switch (conexao?.type) {
    case 'wifi':
      return 'wifi'
    case 'ethernet':
      return 'cabo'
    case 'cellular':
      return 'dados'
    default:
      return 'desconhecida'
  }
}

/**
 * Teste de velocidade — mesmo roteiro do app Android (speedtest/
 * SpeedTestActivity.kt): confere a rede do celular e o roteador HOTNET antes
 * de medir. A medição é do fast.com, como no app; aqui ela abre numa aba à
 * parte, porque o navegador não deixa o portal ler o resultado de outro site.
 */
export default function Velocidade() {
  const navigate = useNavigate()
  const [rede, setRede] = useState<TipoRede>(() => tipoDaRede())
  const [roteador, setRoteador] = useState<{ online: boolean | null; tempo?: number; plano?: string | null }>({ online: null })
  const [medirMesmoAssim, setMedirMesmoAssim] = useState(false)

  useEffect(() => {
    const atualizar = () => setRede(tipoDaRede())
    window.addEventListener('online', atualizar)
    window.addEventListener('offline', atualizar)
    return () => {
      window.removeEventListener('online', atualizar)
      window.removeEventListener('offline', atualizar)
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const [consumo, contratos] = await Promise.all([
          buscarConsumoDoMes(new Date().getFullYear(), new Date().getMonth() + 1),
          buscarContratos().catch(() => []),
        ])
        const conexoes = vincularContratos(consumo, contratos)
        const principal = conexoes[0]
        if (!principal) {
          if (!cancelado) setRoteador({ online: false, plano: contratos[0]?.plano ?? null })
          return
        }
        const sessao = await buscarSessaoAtualPorCpe(principal.cpePk)
        if (!cancelado) setRoteador({ online: sessao != null, tempo: sessao?.tempoOnlineSegundos, plano: principal.planoNome })
      } catch {
        if (!cancelado) setRoteador({ online: false })
      }
    })()
    return () => {
      cancelado = true
    }
  }, [])

  const alertaDados = rede === 'dados' && !medirMesmoAssim
  const alertaRoteador = roteador.online === false && !medirMesmoAssim
  const podeMedir = rede !== 'sem-rede' && !alertaDados && !alertaRoteador

  function medir() {
    window.open('https://fast.com', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="velocidade-tela tela-entrada">
      <CabecalhoTela titulo="Teste de velocidade" fixo acoes={<BotaoFechar />} subtitulo="Medição feita pelo fast.com." />

      <RotuloGrupo>Antes de medir</RotuloGrupo>
      <BlocoBranco>
        {rede === 'wifi' && <LinhaItem icone={IcWifi} tom="primaria" titulo="Conectado ao Wi-Fi" />}
        {rede === 'cabo' && <LinhaItem icone={IcWifi} tom="primaria" titulo="Conectado por cabo" />}
        {rede === 'dados' && (
          <LinhaItem icone={MdSmartphone} tom="perigo" titulo="Dados móveis" rotulo="Wi-Fi desligado ou fora de alcance" />
        )}
        {rede === 'sem-rede' && <LinhaItem icone={IcWifiOff} tom="perigo" titulo="Sem conexão no celular" />}
        {rede === 'desconhecida' && (
          <LinhaItem
            icone={IcWifi}
            tom="neutra"
            titulo="Teste conectado ao Wi-Fi da sua casa"
            rotulo="Em outra rede o resultado não é da sua internet HOTNET"
          />
        )}
        {roteador.online === null && <LinhaItem icone={MdHome} tom="neutra" titulo="Verificando seu roteador…" />}
        {roteador.online === true && (
          <LinhaItem
            icone={IcCheckCircle}
            tom="primaria"
            titulo="Seu roteador HOTNET está on-line"
            rotulo={roteador.tempo != null ? `Equipamento da sua casa · conectado há ${formatarDuracao(roteador.tempo)}` : 'Equipamento da sua casa'}
          />
        )}
        {roteador.online === false && (
          <LinhaItem icone={IcWarning} tom="perigo" titulo="Roteador sem conexão" rotulo="Equipamento da sua casa" />
        )}
        {roteador.plano && <LinhaItem icone={IcSpeed} tom="primaria" rotulo="Plano contratado" titulo={roteador.plano} />}
      </BlocoBranco>

      {alertaDados && (
        <section className="velocidade-alerta">
          <strong>Você está usando os dados móveis</strong>
          <p>
            Assim o teste mede a sua operadora de celular, não a internet da HOTNET. Conecte ao Wi-Fi de casa e teste de
            novo.
          </p>
          <button type="button" className="botao-contorno" onClick={() => setMedirMesmoAssim(true)}>
            Medir mesmo assim
          </button>
        </section>
      )}

      {alertaRoteador && !alertaDados && (
        <section className="velocidade-alerta">
          <strong>Seu roteador não está conectado à HOTNET</strong>
          <p>
            Não detectamos conexão ativa agora, então o teste não vai medir a sua internet. Confira se o roteador está
            ligado e faça o diagnóstico.
          </p>
          <div className="velocidade-alerta-acoes">
            <button type="button" className="botao-primario" onClick={() => navigate('/', { state: { diagnostico: true }, viewTransition: true })}>
              Fazer diagnóstico
            </button>
            <button type="button" className="botao-contorno" onClick={() => setMedirMesmoAssim(true)}>
              Medir mesmo assim
            </button>
          </div>
        </section>
      )}

      <button type="button" className="botao-primario velocidade-medir" disabled={!podeMedir} onClick={medir}>
        <IcSpeed size={20} aria-hidden="true" /> Medir no fast.com
      </button>
      <p className="velocidade-dica">
        Pause downloads e vídeos antes de medir. Pelo Wi-Fi é normal medir menos que o plano; para conferir a velocidade
        completa, faça o teste num computador ligado ao roteador por cabo.
      </p>
    </div>
  )
}
