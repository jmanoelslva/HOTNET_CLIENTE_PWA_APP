/**
 * Formata segundos em "Xh Ymin" (ou "Dd Xh Ymin"/"Ymin"), igual ao
 * ConsumoRepository.formatarDuracao() do app Android.
 */
export function formatarDuracao(segundos: number): string {
  const dias = Math.floor(segundos / 86400)
  const horas = Math.floor((segundos % 86400) / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  if (dias > 0) return `${dias}d ${horas}h ${minutos}min`
  if (horas > 0) return `${horas}h ${minutos}min`
  return `${minutos}min`
}

/**
 * Formata bytes em KB/MB/GB/TB, no padrão brasileiro (vírgula decimal) —
 * igual ao ConsumoRepository.formatarBytes() do app Android.
 */
export function formatarBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = bytes
  let indice = 0
  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024
    indice++
  }
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unidades[indice]}`
}

/** "MARIA DA SILVA" → "Maria da Silva" (preposições em minúsculas), como no app Android. */
export function nomeParaExibir(nome: string): string {
  return nome
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((p) => (['da', 'de', 'do', 'das', 'dos', 'e'].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}
