import { useEffect, useState, type ReactNode } from 'react'
import { useFecharComVoltar } from '../hooks/useFecharComVoltar'
import { MdBlock, MdCheck, MdInfo, MdTimer } from 'react-icons/md'
import { IcClose, IcLock, IcPayments, IcWhatsapp, IcWifi } from './IconesApp'
import './ChecklistConexao.css'

const SEGUNDOS_FORA_DA_TOMADA = 30

const STATUS_CONTRATO: Record<number, string> = {
  1: 'Ativo',
  2: 'Com alerta',
  3: 'Com pendência',
  4: 'Bloqueado',
  5: 'Cancelado',
}

interface Props {
  /** null = ainda não se sabe (a linha some). */
  boletosAtrasados: number | null
  /** contract_status (1=Ativo … 4=Bloqueado, 5=Cancelado); null = a tela não tem o dado. */
  contratoStatus: number | null
  onVerBoletos: () => void
  onFechar: () => void
  /** Recebe os passos marcados, que vão junto no texto do chamado. */
  onContinuar: (passosFeitos: string[]) => void
  onWhatsapp: () => void
}

function plural(n: number, um: string, varios: string): string {
  return n === 1 ? um : varios
}

interface PropsPasso {
  numero: number
  titulo: string
  descricao: string
  feito: boolean
  atual: boolean
  onAlternar: (feito: boolean) => void
  children?: ReactNode
}

// Fora do componente principal: definido dentro, era recriado a cada segundo da contagem e o
// checkbox perdia o foco.
function Passo({ numero, titulo, descricao, feito, atual, onAlternar, children }: PropsPasso) {
  const id = `checklist-passo-${numero}`
  return (
    <li className={`checklist-passo ${atual ? 'atual' : ''} ${feito ? 'feito' : ''}`}>
      <span className="checklist-passo-numero" aria-hidden="true">
        {feito ? <MdCheck /> : numero}
      </span>
      <div className="checklist-passo-texto">
        <label htmlFor={id}>{titulo}</label>
        <p>{descricao}</p>
        {children}
      </div>
      <input id={id} type="checkbox" checked={feito} onChange={(e) => onAlternar(e.target.checked)} />
    </li>
  )
}

/**
 * "Vamos tentar resolver juntos" (Suporte e "Diagnóstico" do cartão de conexão da Início) — mesmo
 * fluxo do app Android (ChecklistConexaoDialog). O que o portal já sabe vem pronto; o resto são
 * passos que o cliente marca, com contagem de 30 s no reinício do roteador. Bloqueio e
 * cancelamento trocam o conteúdo: reiniciar o roteador não resolve. Cancelado: só WhatsApp.
 */
export default function ChecklistConexao({ boletosAtrasados, contratoStatus, onVerBoletos, onFechar, onContinuar, onWhatsapp }: Props) {
  // Voltar do celular fecha a janela, como no app.
  useFecharComVoltar(true, onFechar)
  const [reiniciou, setReiniciou] = useState(false)
  const [luzes, setLuzes] = useState(false)
  const [cabos, setCabos] = useState(false)
  const [contando, setContando] = useState(false)
  const [restantes, setRestantes] = useState(SEGUNDOS_FORA_DA_TOMADA)

  useEffect(() => {
    if (!contando) return
    const id = window.setTimeout(() => {
      if (restantes <= 1) {
        // Contagem até o fim = o roteador ficou fora da tomada o tempo certo.
        setRestantes(0)
        setContando(false)
        setReiniciou(true)
      } else {
        setRestantes(restantes - 1)
      }
    }, 1000)
    return () => window.clearTimeout(id)
  }, [contando, restantes])

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  const bloqueado = contratoStatus === 4
  const cancelado = contratoStatus === 5
  const atrasados = boletosAtrasados ?? 0
  const ativo = !reiniciou ? 1 : !luzes ? 2 : !cabos ? 3 : 0
  const todosFeitos = reiniciou && luzes && cabos
  const passos = [
    reiniciou ? 'Reiniciou o roteador' : null,
    luzes ? 'Esperou as luzes acenderem' : null,
    cabos ? 'Conferiu os cabos' : null,
  ].filter((p): p is string => p !== null)

  // TalkBack/leitor de tela: anuncia de 10 em 10 s, não a cada segundo.
  const anunciado = Math.ceil(restantes / 10) * 10

  return (
    <div className="checklist-fundo" onClick={onFechar}>
      <div className="checklist-modal" role="dialog" aria-modal="true" aria-labelledby="checklist-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="checklist-barra">
          <span className="checklist-icone" aria-hidden="true">
            <IcWifi size={22} />
          </span>
          <button className="checklist-fechar" onClick={onFechar} aria-label="Fechar">
            <IcClose size={22} />
          </button>
        </div>
        <h2 id="checklist-titulo">Vamos tentar resolver juntos</h2>
        {!bloqueado && !cancelado && (
          <p className="checklist-subtitulo">Leva uns 2 minutos e resolve a maioria dos casos sem esperar atendimento.</p>
        )}

        {bloqueado && (
          <div className="checklist-aviso checklist-aviso-erro">
            <IcLock size={20} aria-hidden="true" />
            <div>
              <strong>Conexão bloqueada</strong>
              <p>
                {atrasados > 0
                  ? `Identificamos ${atrasados} ${plural(atrasados, 'boleto', 'boletos')} em aberto. Após a confirmação do pagamento, a conexão é liberada.`
                  : 'Identificamos um boleto em aberto neste contrato. Após a confirmação do pagamento, a conexão é liberada.'}
              </p>
            </div>
          </div>
        )}
        {cancelado && (
          <div className="checklist-aviso">
            <MdInfo size={20} aria-hidden="true" />
            <div>
              <strong>Contrato cancelado</strong>
              <p>Seu contrato foi cancelado. Fale com a gente se tiver alguma dúvida.</p>
            </div>
          </div>
        )}
        {!bloqueado && !cancelado && atrasados > 0 && (
          <div className="checklist-aviso checklist-aviso-atraso">
            <IcPayments size={20} aria-hidden="true" />
            <div>
              <p>
                Há {atrasados} {plural(atrasados, 'boleto', 'boletos')} em atraso. O pagamento evita o bloqueio da conexão.
              </p>
              <button className="checklist-link" onClick={onVerBoletos}>
                Ver boletos
              </button>
            </div>
          </div>
        )}

        {(boletosAtrasados != null || contratoStatus != null) && (
          <>
            <span className="checklist-secao">O portal já conferiu</span>
            <ul className="checklist-conferido">
              {boletosAtrasados != null && (
                <li>
                  <span>Boletos</span>
                  <strong className={atrasados > 0 ? 'ruim' : 'bom'}>
                    {atrasados > 0 ? `${atrasados} em atraso` : 'Em dia'}
                  </strong>
                </li>
              )}
              {contratoStatus != null && STATUS_CONTRATO[contratoStatus] && (
                <li>
                  <span>Contrato</span>
                  <strong className={contratoStatus === 1 ? 'bom' : 'ruim'}>
                    {cancelado ? <MdBlock aria-hidden="true" /> : null} {STATUS_CONTRATO[contratoStatus]}
                  </strong>
                </li>
              )}
            </ul>
          </>
        )}

        {!bloqueado && !cancelado && (
          <>
            <span className="checklist-secao">Faça agora</span>
            <ol className="checklist-passos">
              <Passo
                numero={1}
                titulo="Reinicie o roteador"
                descricao={contando ? 'Roteador fora da tomada. Ligue de novo quando terminar.' : 'Tire da tomada, espere 30 segundos e ligue de novo.'}
                feito={reiniciou}
                atual={ativo === 1}
                onAlternar={(feito) => {
                  setReiniciou(feito)
                  setContando(false)
                }}
              >
                {!reiniciou &&
                  (contando ? (
                    <div className="checklist-contagem" role="timer" aria-label={`Faltam ${anunciado} segundos`}>
                      <span aria-hidden="true">{restantes}</span>
                    </div>
                  ) : (
                    <button
                      className="checklist-contar"
                      onClick={() => {
                        setRestantes(SEGUNDOS_FORA_DA_TOMADA)
                        setContando(true)
                      }}
                    >
                      <MdTimer size={16} aria-hidden="true" /> Contar 30 segundos
                    </button>
                  ))}
              </Passo>
              <Passo
                numero={2}
                titulo="Espere as luzes acenderem"
                descricao="Leva cerca de 2 minutos. Luz vermelha acesa ou piscando indica problema no sinal: abra um chamado."
                feito={luzes}
                atual={ativo === 2}
                onAlternar={setLuzes}
              />
              <Passo
                numero={3}
                titulo="Confira os cabos"
                descricao="Veja se estão firmes no roteador e na tomada."
                feito={cabos}
                atual={ativo === 3}
                onAlternar={setCabos}
              />
            </ol>
            {todosFeitos && <p className="checklist-pergunta">A internet voltou?</p>}
          </>
        )}

        <div className="checklist-acoes">
          {bloqueado && (
            <>
              <button className="checklist-btn-primario" onClick={onVerBoletos}>
                <IcPayments size={18} aria-hidden="true" /> Ver boletos
              </button>
              <button className="checklist-btn-secundario" onClick={() => onContinuar(passos)}>
                Já paguei, abrir chamado
              </button>
            </>
          )}
          {cancelado && (
            <>
              <button className="checklist-btn-whatsapp" onClick={onWhatsapp}>
                <IcWhatsapp size={18} aria-hidden="true" /> Falar no WhatsApp
              </button>
              <button className="checklist-btn-secundario" onClick={onFechar}>
                Fechar
              </button>
            </>
          )}
          {!bloqueado && !cancelado && todosFeitos && (
            <>
              <button className="checklist-btn-primario" onClick={onFechar}>
                Sim, voltou
              </button>
              <button className="checklist-btn-secundario" onClick={() => onContinuar(passos)}>
                Não, abrir chamado
              </button>
            </>
          )}
          {!bloqueado && !cancelado && !todosFeitos && (
            <button className="checklist-btn-secundario" onClick={() => onContinuar(passos)}>
              Pular e abrir chamado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
