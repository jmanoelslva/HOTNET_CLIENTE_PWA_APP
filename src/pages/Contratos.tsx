import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LuCalendarClock, LuConstruction, LuFileText, LuReceiptText, LuStar, LuWallet, LuWifi } from 'react-icons/lu'
import { urlImpressaoContrato } from '../api/client'
import { buscarContratos, type Contrato } from '../api/contratos'
import CabecalhoTela from '../components/CabecalhoTela'
import PullToRefresh from '../components/PullToRefresh'
import Skeleton from '../components/Skeleton'
import { AbasPilula, BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
import { abrirEImprimir } from '../utils/impressao'
import { useToast } from '../components/Toast/useToast'
import './Contratos.css'

// contract_status: ponto colorido + texto, como no app Android.
const STATUS: Record<number, { texto: string; ponto: string }> = {
  0: { texto: 'Desativado', ponto: '#b0bac5' },
  1: { texto: 'Ativo', ponto: '#3ddc84' },
  2: { texto: 'Com aviso', ponto: '#ffb784' },
  3: { texto: 'Pendente', ponto: '#ffb784' },
  4: { texto: 'Bloqueado', ponto: '#ff8a8a' },
  5: { texto: 'Cancelado', ponto: '#b0bac5' },
}

function formatarMoeda(valorBruto: string | null): string {
  const valor = Number.parseFloat(valorBruto ?? '')
  return (Number.isFinite(valor) ? valor : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** "2019-03-15" → "março de 2019". */
function mesAnoPorExtenso(data: string | null): string | null {
  const partes = (data ?? '').split(' ')[0].split('-')
  if (partes.length !== 3) return null
  const d = new Date(Number(partes[0]), Number(partes[1]) - 1, 1)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/**
 * Contratos — mesmo layout do app Android (contracts/ContratosScreen.kt):
 * um contrato por vez (seletor em pílula quando há mais de um), plano no
 * cartão grafite com o estado, Resumo e Serviços e itens em blocos brancos.
 */
export default function Contratos() {
  const { toast } = useToast()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  // Contrato aberto a partir de um boleto (Boletos.tsx).
  const contratoAlvo = (location.state as { contratoPk?: number } | null)?.contratoPk ?? null
  const [selecionado, setSelecionado] = useState<number | null>(contratoAlvo)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      // contract_client_show=false: o contrato sai da lista (o status dele ainda vale na Início).
      const resultado = (await buscarContratos()).filter((contrato) => contrato.podeVerDados)
      if (resultado.length === 0) setErro('Nenhum contrato disponível para exibição no momento.')
      setContratos(resultado)
      setSelecionado((atual) => (resultado.some((c) => c.id === atual) ? atual : (resultado[0]?.id ?? null)))
    } catch {
      setErro('Não foi possível carregar os contratos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const contrato = contratos.find((c) => c.id === selecionado) ?? contratos[0] ?? null
  const status = (contrato?.status != null && STATUS[contrato.status]) || { texto: 'Desconhecido', ponto: '#b0bac5' }
  const desde = contrato ? mesAnoPorExtenso(contrato.dataAtivacao) : null

  return (
    <PullToRefresh aoAtualizar={carregar}>
      <div className="contratos-tela tela-entrada">
        <CabecalhoTela titulo="Contratos" subtitulo="Seus planos e serviços na HOTNET." />

        {carregando && (
          <div className="cartao-destaque contratos-esqueleto">
            <Skeleton width="40%" height={12} />
            <Skeleton width="65%" height={22} />
            <Skeleton width="30%" height={12} />
          </div>
        )}

        {!carregando && erro && contratos.length === 0 && (
          <div className="erro-carregamento">
            <p>{erro}</p>
            <button type="button" className="botao-primario" onClick={carregar}>
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && contrato && (
          <>
            {contratos.length > 1 && (
              <div className="contratos-seletor">
                <AbasPilula<string>
                  rotulo="Contrato"
                  opcoes={contratos.map((c) => ({ valor: String(c.id), rotulo: `Nº ${c.numero ?? c.id}` }))}
                  selecionada={String(contrato.id)}
                  onSelecionar={(v) => setSelecionado(Number(v))}
                />
              </div>
            )}

            <section className="cartao-destaque" aria-label="Plano">
              <span className="cartao-destaque-rotulo">Plano</span>
              <strong className="contrato-plano">{contrato.plano ?? 'Plano não informado'}</strong>
              <span className="contrato-numero">Contrato {contrato.numero ?? contrato.id}</span>
              <span className="etiqueta-destaque contrato-estado">
                <span className="contrato-ponto" style={{ background: status.ponto }} aria-hidden="true" />
                {status.texto}
              </span>
            </section>

            <RotuloGrupo>Resumo</RotuloGrupo>
            <BlocoBranco>
              <LinhaItem icone={LuWallet} tom="primaria" rotulo="Valor mensal" titulo={formatarMoeda(contrato.valor)} />
              {contrato.diaPagamento != null && (
                <LinhaItem icone={LuCalendarClock} tom="primaria" rotulo="Vencimento" titulo={`Todo dia ${contrato.diaPagamento}`} />
              )}
              {desde && <LinhaItem icone={LuStar} tom="primaria" rotulo="Ativo desde" titulo={desde} />}
            </BlocoBranco>

            {contrato.itens.length > 0 && (
              <>
                <RotuloGrupo>Serviços e itens</RotuloGrupo>
                <BlocoBranco>
                  {contrato.itens.map((item, indice) => (
                    <LinhaItem
                      key={indice}
                      icone={item.ehEquipamento ? LuConstruction : LuWifi}
                      tom={item.ehEquipamento ? 'perigo' : 'primaria'}
                      rotulo={item.ehEquipamento ? 'Equipamento' : 'Plano'}
                      titulo={item.nome}
                      fim={<strong className="contrato-item-valor">{formatarMoeda(item.valor)}</strong>}
                    />
                  ))}
                </BlocoBranco>
              </>
            )}

            <div className="contrato-acoes">
              <button
                type="button"
                className="botao-primario"
                onClick={() => navigate('/boletos', { state: { contratoPk: contrato.id }, viewTransition: true })}
              >
                <LuReceiptText size={18} aria-hidden="true" /> Ver boletos deste contrato
              </button>
              {/* contract_client_print=false: sem o documento completo. */}
              {contrato.podeVerDocumento && (
                <button
                  type="button"
                  className="botao-contorno"
                  onClick={() =>
                    abrirEImprimir(urlImpressaoContrato(contrato.id), () =>
                      toast('Não foi possível abrir o contrato agora. Tente novamente.'),
                    )
                  }
                >
                  <LuFileText size={18} aria-hidden="true" /> Ver contrato completo
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  )
}
