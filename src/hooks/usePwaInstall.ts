import { useCallback, useState, useSyncExternalStore } from 'react'
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

/**
 * O "posso instalar via prompt nativo?" mora em módulo, não em useState
 * de usePwaInstall — `beforeinstallprompt` só dispara UMA VEZ por
 * carregamento de página inteiro, não a cada navegação da SPA. Preso a
 * estado local do hook, sair e voltar pro Login (ou qualquer
 * desmontar/remontar de quem chama o hook) criava uma instância nova
 * com o evento zerado — e o navegador não dispara de novo só porque um
 * listener novo apareceu, então o botão "Instalar app" sumia pra
 * sempre até recarregar a página inteira, mesmo a instalação
 * continuando disponível de verdade (bug confirmado na prática).
 * useSyncExternalStore mantém todo componente que usa o hook em
 * sincronia com esse estado compartilhado.
 */
let eventoCapturado: EventoInstalarPwa | null = null
let instaladoCompartilhado = typeof window === 'undefined' ? false : jaInstalado()
const ouvintesMudanca = new Set<() => void>()

function notificarMudanca() {
  ouvintesMudanca.forEach((ouvir) => ouvir())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    eventoCapturado = e as EventoInstalarPwa
    notificarMudanca()
  })
  window.addEventListener('appinstalled', () => {
    instaladoCompartilhado = true
    eventoCapturado = null
    notificarMudanca()
  })
}

function inscrever(ouvir: () => void): () => void {
  ouvintesMudanca.add(ouvir)
  return () => ouvintesMudanca.delete(ouvir)
}

export function usePwaInstall() {
  const evento = useSyncExternalStore(inscrever, () => eventoCapturado)
  const instalado = useSyncExternalStore(inscrever, () => instaladoCompartilhado)
  const [modalIosAberto, setModalIosAberto] = useState(false)
  const { toast } = useToast()

  const podeInstalarNativo = evento != null && !instalado
  const podeInstalarIos = ehIos() && !instalado
  // Pra qualquer lugar que só precisa decidir se mostra um botão/aviso de
  // instalação, sem se importar com o motivo (prompt nativo ou iOS manual).
  const podeInstalar = podeInstalarNativo || podeInstalarIos

  const instalar = useCallback(async (): Promise<'accepted' | 'dismissed' | 'indisponivel'> => {
    if (!eventoCapturado) return 'indisponivel'
    await eventoCapturado.prompt()
    const escolha = await eventoCapturado.userChoice
    eventoCapturado = null
    notificarMudanca()
    return escolha.outcome
  }, [])

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
