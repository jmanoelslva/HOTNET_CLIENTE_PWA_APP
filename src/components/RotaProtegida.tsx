import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSessao } from '../auth/SessionContext'

/** Redireciona pro login quem tentar acessar uma tela protegida sem sessão ativa. */
export default function RotaProtegida({ children }: { children: ReactNode }) {
  const { logado } = useSessao()
  if (!logado) return <Navigate to="/login" replace />
  return <>{children}</>
}
