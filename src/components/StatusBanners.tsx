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
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Por padrão, o navegador só checa o sw.js sozinho a cada
      // navegação — e mesmo assim, no máximo 1x a cada ~24h (limite do
      // próprio spec de Service Worker, não configurável). Um cliente
      // que abre o app, o SO suspende em segundo plano, e volta a
      // primeiro plano horas depois (sem uma navegação nova de verdade)
      // podia nunca disparar essa checagem, mesmo dentro da mesma janela
      // de 24h de um deploy novo. registration.update() ignora esse
      // limite de 24h — chamado aqui ao registrar e de novo toda vez que
      // o app volta a primeiro plano (mesmo padrão de retomar em
      // primeiro plano já usado no polling do chat, ver
      // DetalheChamado.tsx), o app checa por uma versão nova sempre que
      // o cliente efetivamente volta a usá-lo, não só uma vez por dia.
      registration.update()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
    },
  })

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
