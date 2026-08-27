import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import './Toast.css'

type TipoToast = 'info' | 'sucesso' | 'erro'

interface ItemToast {
  id: number
  mensagem: string
  tipo: TipoToast
}

interface ToastContextValue {
  toast: (mensagem: string, tipo?: TipoToast) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURACAO_MS = 3500

/**
 * Toasts no estilo de app (em vez de window.alert()) — empilham no
 * rodapé da tela, com cor por tipo, e somem sozinhos depois de um tempo.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemToast[]>([])
  const proximoId = useRef(0)

  const toast = useCallback((mensagem: string, tipo: TipoToast = 'erro') => {
    const id = proximoId.current++
    setItens((atual) => [...atual, { id, mensagem, tipo }])
    setTimeout(() => {
      setItens((atual) => atual.filter((item) => item.id !== id))
    }, DURACAO_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-pilha">
        {itens.map((item) => (
          <div key={item.id} className={`toast toast-${item.tipo}`}>
            {item.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext)
  if (!contexto) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return contexto
}
