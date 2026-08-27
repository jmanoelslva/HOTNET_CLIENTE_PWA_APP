import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../components/Toast/ToastContext'

/**
 * Evento `beforeinstallprompt` — o Chrome/Edge só disparam quando os
 * critérios de instalabilidade do PWA são cumpridos (manifest válido,
 * HTTPS, service worker registrado), e só na hora deles, não a cada
 * carregamento — por isso a instalação não é "perguntada" sozinha em
 * todo acesso; precisa capturar o evento e oferecer um botão pra usar
 * depois. iOS Safari nunca dispara esse evento (não existe prompt nativo
 * lá), então é tratado à parte com instrução manual.
 */
interface EventoInstalarPwa extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function ehIos(): boolean {
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true
  // iPadOS 13+ se identifica como um Mac comum no user agent (a não ser
  // que o cliente tenha desligado "Solicitar Site para Computador") — só
  // um Mac de verdade tem tela touch, então isso distingue os dois.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function jaInstalado(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function usePwaInstall() {
  const [evento, setEvento] = useState<EventoInstalarPwa | null>(null)
  const [instalado, setInstalado] = useState(jaInstalado())
  const [modalIosAberto, setModalIosAberto] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    function aoFicarInstalavel(e: Event) {
      e.preventDefault()
      setEvento(e as EventoInstalarPwa)
    }
    function aoInstalar() {
      setInstalado(true)
      setEvento(null)
    }
    window.addEventListener('beforeinstallprompt', aoFicarInstalavel)
    window.addEventListener('appinstalled', aoInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoFicarInstalavel)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  const podeInstalarNativo = evento != null && !instalado
  const podeInstalarIos = ehIos() && !instalado
  // Pra qualquer lugar que só precisa decidir se mostra um botão/aviso de
  // instalação, sem se importar com o motivo (prompt nativo ou iOS manual).
  const podeInstalar = podeInstalarNativo || podeInstalarIos

  const instalar = useCallback(async (): Promise<'accepted' | 'dismissed' | 'indisponivel'> => {
    if (!evento) return 'indisponivel'
    await evento.prompt()
    const escolha = await evento.userChoice
    setEvento(null)
    return escolha.outcome
  }, [evento])

  // Handler único pro botão "Instalar app", reaproveitado no menu do
  // avatar (Home) e na tela de Login — prompt nativo quando o navegador
  // oferece, senão abre o passo a passo manual do iOS.
  const aoClicarInstalar = useCallback(async () => {
    if (podeInstalarNativo) {
      const resultado = await instalar()
      if (resultado === 'accepted') toast('App instalado!', 'sucesso')
      return
    }
    setModalIosAberto(true)
  }, [podeInstalarNativo, instalar, toast])

  return {
    podeInstalarNativo,
    podeInstalarIos,
    podeInstalar,
    instalado,
    instalar,
    aoClicarInstalar,
    modalIosAberto,
    fecharModalIos: () => setModalIosAberto(false),
  }
}
