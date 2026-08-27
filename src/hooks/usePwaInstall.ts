import { useEffect, useState } from 'react'

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
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
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

  async function instalar(): Promise<'accepted' | 'dismissed' | 'indisponivel'> {
    if (!evento) return 'indisponivel'
    await evento.prompt()
    const escolha = await evento.userChoice
    setEvento(null)
    return escolha.outcome
  }

  return { podeInstalarNativo, podeInstalarIos, instalado, instalar }
}
