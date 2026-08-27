import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdDescription } from 'react-icons/md'
import { urlImpressaoContrato } from '../api/client'
import { buscarContratos, type Contrato } from '../api/contratos'
import VoltarInicio from '../components/VoltarInicio'
import CabecalhoTela from '../components/CabecalhoTela'
import './Contratos.css'

// Valores confirmados na documentação oficial do contract_status.
const STATUS: Record<number, { texto: string; cor: string }> = {
  0: { texto: 'Desativado', cor: '#757575' },
  1: { texto: 'Ativo', cor: '#4caf50' },
  2: { texto: 'Alertado', cor: '#ff9800' },
  3: { texto: 'Pendente', cor: '#ffc107' },
  4: { texto: 'Bloqueado', cor: '#f44336' },
  5: { texto: 'Cancelado', cor: '#9e9e9e' },
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

  useEffect(() => {
    carregar()
  }, [])

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
    <div className="contratos-tela">
      <VoltarInicio />
      <CabecalhoTela
        icone={MdDescription}
        cor="#4a5c7a"
        titulo="Contratos"
        subtitulo="Seus contratos, planos e itens contratados."
      />

      {carregando && <p className="contratos-status">Carregando contratos…</p>}

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
              cor: '#757575',
            }

            return (
              <li key={contrato.id} className="contrato-card">
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
                  <button onClick={() => navigate('/boletos', { state: { contratoPk: contrato.id } })}>
                    Meus boletos
                  </button>
                  <button onClick={() => window.open(urlImpressaoContrato(contrato.id), '_blank')}>
                    Ver contrato completo
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
