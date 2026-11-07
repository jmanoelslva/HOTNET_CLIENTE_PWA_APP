import { useEffect, useState, type ReactNode } from 'react'
import { useSessao } from '../auth/useSessao'
import { buscarAvisosNaoLidos, confirmarLeitura, descricaoDoTipo, type Aviso } from '../api/avisos'
import { useToast } from './Toast/useToast'
import './AvisoGate.css'

/**
 * "Recibo digital" obrigatório: se o cliente logado tem avisos ainda não
 * confirmados (bloqueio, alerta, cancelamento), bloqueia o resto do app
 * atrás de uma tela cheia até ele tocar em "Estou ciente" — a confirmação
 * é registrada no servidor (aaa_ctl/notification/update), não só aqui.
 * Mesmo comportamento do AvisoActivity do app Android.
 *
 * Só monta o gate de verdade (`AvisoGateInterno`) enquanto `logado` for
 * true — assim, ao deslogar, o estado (`avisos`/`indice`) desmonta junto
 * em vez de precisar ser resetado manualmente num efeito. Sem isso, se o
 * cliente relogasse com outra conta antes da nova busca terminar, os
 * avisos da conta anterior ficariam visíveis por um instante.
 */
export default function AvisoGate({ children }: { children: ReactNode }) {
  const { logado } = useSessao()
  if (!logado) return <>{children}</>
  return <AvisoGateInterno>{children}</AvisoGateInterno>
}

function AvisoGateInterno({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [avisos, setAvisos] = useState<Aviso[] | null>(null)
  const [indice, setIndice] = useState(0)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    buscarAvisosNaoLidos()
      .then(setAvisos)
      .catch(() => setAvisos([]))
  }, [])

  if (avisos == null || indice >= avisos.length) {
    return <>{children}</>
  }

  const aviso = avisos[indice]
  const { titulo, descricao } = descricaoDoTipo(aviso.tipo)
  const detalhes = [
    aviso.contractNumber != null ? `Contrato nº ${aviso.contractNumber}` : null,
    aviso.invoiceNossoNum ? `Boleto ${aviso.invoiceNossoNum}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  async function confirmar() {
    setConfirmando(true)
    try {
      await confirmarLeitura(aviso.noticePk)
      setIndice((i) => i + 1)
    } catch {
      toast('Não foi possível confirmar agora. Tente novamente.')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div className="aviso-gate-tela">
      <div className="aviso-gate-card">
        <span className="aviso-gate-icone">⚠️</span>
        <h1>{titulo}</h1>
        <p>{descricao}</p>
        {detalhes && <p className="aviso-gate-detalhes">{detalhes}</p>}
        <button disabled={confirmando} onClick={confirmar}>
          {confirmando ? 'Confirmando…' : 'Estou ciente'}
        </button>
      </div>
    </div>
  )
}
