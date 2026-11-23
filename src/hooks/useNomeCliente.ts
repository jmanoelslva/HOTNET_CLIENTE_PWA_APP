import { useEffect, useState } from 'react'
import { buscarDadosCliente } from '../api/cadastro'

/**
 * Nome completo do cliente, buscado ao abrir a tela. O botão de WhatsApp usa o
 * nome já carregado: buscar no toque e abrir depois da espera faz o Safari do
 * iPhone bloquear a janela (o toque deixa de valer como gesto do usuário).
 */
export function useNomeCliente(cpf: string | null): string | null {
  const [nome, setNome] = useState<string | null>(null)
  useEffect(() => {
    let cancelado = false
    buscarDadosCliente(cpf)
      .then((cliente) => {
        if (!cancelado) setNome(cliente.client_complete_name?.trim() || null)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [cpf])
  return nome
}
