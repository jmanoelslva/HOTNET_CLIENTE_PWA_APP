import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MdDescription, MdFileDownload, MdPayments } from 'react-icons/md'
import { urlImpressaoContrato } from '../api/client'
import { buscarContratos, type Contrato } from '../api/contratos'
import CabecalhoTela from '../components/CabecalhoTela'
import Skeleton from '../components/Skeleton'
import { CORES, comAlpha } from '../utils/cores'
import { abrirEImprimir } from '../utils/impressao'
import './Contratos.css'

// Valores confirmados na documentação oficial do contract_status.
const STATUS: Record<number, { texto: string; cor: string }> = {
  0: { texto: 'Desativado', cor: CORES.textoDesabilitado },
  1: { texto: 'Ativo', cor: CORES.sucesso },
  2: { texto: 'Alertado', cor: CORES.alerta },
  3: { texto: 'Pendente', cor: CORES.atencao },
  4: { texto: 'Bloqueado', cor: CORES.erro },
  5: { texto: 'Cancelado', cor: CORES.textoFraco },
}

function formatarMoeda(valorBruto: string | null): string {
  const valor = Number.parseFloat(valorBruto ?? '')
  if (!Number.isFinite(valor)) return 'R$ 0,00'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data: string | null): string {
  if (!data) return '--/--/----'
  const soData = data.split(' ')[0]
  const partes = soData.split('-')
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
  return soData
}

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  // Contrato pra rolar até e destacar quando chegamos aqui a partir de um
  // boleto (ver Boletos.tsx, mesmo padrão usado no sentido inverso).
  const contratoAlvo = (location.state as { contratoPk?: number } | null)?.contratoPk ?? null
  const cardsRef = useRef<Map<number, HTMLLIElement>>(new Map())

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    if (contratoAlvo == null || contratos.length === 0) return
    cardsRef.current.get(contratoAlvo)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [contratoAlvo, contratos])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await buscarContratos()
      if (resultado.length === 0) {
        setErro('Nenhum contrato disponível para exibição no momento.')
      }
      setContratos(resultado)
    } catch {
      setErro('Não foi possível carregar os contratos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="contratos-tela tela-entrada">
      <CabecalhoTela
        icone={MdDescription}
        cor={CORES.contratos}
        titulo="Contratos"
        subtitulo="Seus contratos, planos e itens contratados."
      />

      {carregando && (
        <ul className="contratos-lista">
          {[0, 1].map((indice) => (
            <li key={indice} className="contrato-card">
              <Skeleton width="50%" height={16} />
              <Skeleton width="70%" height={12} />
              <Skeleton width="60%" height={12} />
              <Skeleton width="40%" height={12} />
            </li>
          ))}
        </ul>
      )}

      {!carregando && erro && contratos.length === 0 && (
        <div className="contratos-status">
          <p>{erro}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {!carregando && contratos.length > 0 && (
        <ul className="contratos-lista">
          {contratos.map((contrato) => {
            const status = (contrato.status != null && STATUS[contrato.status]) || {
              texto: 'Desconhecido',
              cor: CORES.textoDesabilitado,
            }

            return (
              <li
                key={contrato.id}
                ref={(elemento) => {
                  if (elemento) cardsRef.current.set(contrato.id, elemento)
                  else cardsRef.current.delete(contrato.id)
                }}
                className={`contrato-card ${contrato.id === contratoAlvo ? 'contrato-card-destaque' : ''}`}
              >
                <div className="contrato-topo">
                  <span className="contrato-numero">Contrato #{contrato.numero ?? contrato.id}</span>
                  <span className="contrato-status-badge" style={{ background: status.cor }}>
                    {status.texto}
                  </span>
                </div>

                <div className="contrato-detalhes">
                  <div className="contrato-linha">
                    <span>Plano</span>
                    <strong>{contrato.plano ?? 'Não informado'}</strong>
                  </div>
                  <div className="contrato-linha">
                    <span>Valor mensal</span>
                    <strong>{formatarMoeda(contrato.valor)}</strong>
                  </div>
                  <div className="contrato-linha">
                    <span>Vencimento</span>
                    <strong>{contrato.diaPagamento != null ? `Dia ${contrato.diaPagamento}` : 'Não informado'}</strong>
                  </div>
                  <div className="contrato-linha">
                    <span>Ativado em</span>
                    <strong>{formatarData(contrato.dataAtivacao)}</strong>
                  </div>
                </div>

                {contrato.itens.length > 0 && (
                  <div className="contrato-itens">
                    <span className="contrato-itens-titulo">Itens do contrato</span>
                    {contrato.itens.map((item, indice) => (
                      <div className="contrato-linha" key={indice}>
                        <span>{item.ehEquipamento ? `${item.nome} (equipamento)` : item.nome}</span>
                        <strong>{item.valor ? formatarMoeda(item.valor) : '—'}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="contrato-acoes">
                  <button
                    style={{ background: comAlpha(CORES.boletos, 10), color: CORES.boletos }}
                    onClick={() => navigate('/boletos', { state: { contratoPk: contrato.id }, viewTransition: true })}
                  >
                    <MdPayments /> Meus boletos
                  </button>
                  <button
                    style={{ background: comAlpha(CORES.primaria, 10), color: CORES.primaria }}
                    onClick={() => abrirEImprimir(urlImpressaoContrato(contrato.id))}
                  >
                    <MdFileDownload /> Ver contrato completo
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
