import { useRegisterSW } from 'virtual:pwa-register/react'
import { useOnline } from '../hooks/useOnline'
import './StatusBanners.css'

/**
 * Faixa fixa no topo pros dois avisos de estado do app que exigem atenção
 * (mas não bloqueiam como o AvisoGate): sem internet, ou versão nova
 * disponível. "autoUpdate" (vite.config.ts) ativa o service worker novo
 * sozinho, mas isso não troca os módulos JS já carregados na aba aberta —
 * por isso ainda precisa avisar e deixar o cliente decidir a hora de
 * recarregar, em vez de forçar no meio de alguma ação.
 */
export default function StatusBanners() {
  const online = useOnline()
  const { needRefresh: [precisaAtualizar], updateServiceWorker } = useRegisterSW()

  if (!online) {
    return (
      <div className="status-banner status-banner-offline">Sem conexão com a internet</div>
    )
  }

  if (precisaAtualizar) {
    return (
      <div className="status-banner status-banner-atualizar">
        <span>Nova versão disponível</span>
        <button onClick={() => updateServiceWorker(true)}>Atualizar</button>
      </div>
    )
  }

  return null
}
