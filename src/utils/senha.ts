/**
 * Regras da senha nova da conta — mesmas do app Android (auth/RegrasSenha.kt). 8–16 caracteres é
 * o limite do próprio Controllr (session/setpassword); "diferente do CPF/CNPJ" e "sem sequência"
 * são do app: a senha padrão é o documento, então trocar por ele mesmo ou por 12345678 não protege.
 */
export const TAMANHO_MIN_SENHA = 8
export const TAMANHO_MAX_SENHA = 16

export interface AvaliacaoSenha {
  tamanhoOk: boolean
  diferenteDoDocumento: boolean
  semSequencia: boolean
  confirmacaoIgual: boolean
  valida: boolean
}

function ehOProprioDocumento(senha: string, documento: string | null): boolean {
  const doc = documento?.replace(/\D/g, '') ?? ''
  return doc.length > 0 && senha.replace(/\D/g, '') === doc && /^[\d.\-/ ]+$/.test(senha)
}

/** Todos iguais (11111111) ou dígitos em sequência crescente/decrescente (12345678, 87654321). */
export function ehSequenciaObvia(senha: string): boolean {
  if (senha.length < 2) return false
  if ([...senha].every((c) => c === senha[0])) return true
  if (!/^\d+$/.test(senha)) return false
  const passos = new Set<number>()
  for (let i = 1; i < senha.length; i++) passos.add((Number(senha[i]) - Number(senha[i - 1]) + 10) % 10)
  return passos.size === 1 && (passos.has(1) || passos.has(9))
}

export function avaliarSenha(nova: string, confirmacao: string, documento: string | null): AvaliacaoSenha {
  const tamanhoOk = nova.length >= TAMANHO_MIN_SENHA && nova.length <= TAMANHO_MAX_SENHA
  const diferenteDoDocumento = nova.length > 0 && !ehOProprioDocumento(nova, documento)
  const semSequencia = nova.length > 0 && !ehSequenciaObvia(nova)
  const confirmacaoIgual = confirmacao.length > 0 && nova === confirmacao
  return {
    tamanhoOk,
    diferenteDoDocumento,
    semSequencia,
    confirmacaoIgual,
    valida: tamanhoOk && diferenteDoDocumento && semSequencia && confirmacaoIgual,
  }
}
