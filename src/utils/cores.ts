/**
 * Paleta de cores da marca — cada valor aponta pra uma CSS custom property
 * definida em src/index.css (nunca hex fixo), pra reagir automaticamente
 * ao modo escuro e continuar em um só lugar pra trocar a paleta inteira.
 */
export const CORES = {
  primaria: 'var(--cor-primaria)',
  primariaEscura: 'var(--cor-primaria-escura)',
  primariaClara: 'var(--cor-primaria-clara)',
  primariaGradienteFim: 'var(--cor-primaria-gradiente-fim)',

  fundo: 'var(--cor-fundo)',
  superficie: 'var(--cor-superficie)',
  borda: 'var(--cor-borda)',
  // Branco fixo — pros ícones dentro de um badge de cor sólida (o badge já
  // dá o contraste; não deve escurecer junto com o tema).
  branco: '#ffffff',

  texto: 'var(--cor-texto)',
  textoSecundario: 'var(--cor-texto-secundario)',
  textoTerciario: 'var(--cor-texto-terciario)',
  textoFraco: 'var(--cor-texto-fraco)',
  textoDesabilitado: 'var(--cor-texto-desabilitado)',

  sucesso: 'var(--cor-sucesso)',
  sucessoVivo: 'var(--cor-sucesso-vivo)',
  alerta: 'var(--cor-alerta)',
  atencao: 'var(--cor-atencao)',
  erro: 'var(--cor-erro)',

  boletos: 'var(--cor-boletos)',
  contratos: 'var(--cor-contratos)',
  consumo: 'var(--cor-consumo)',
  suporte: 'var(--cor-suporte)',
  dados: 'var(--cor-dados)',
  ajuda: 'var(--cor-ajuda)',
  pix: 'var(--cor-pix)',
  whatsapp: 'var(--cor-whatsapp)',
  whatsappEscura: 'var(--cor-whatsapp-escura)',
} as const

/**
 * Mistura uma cor (token de CORES ou hex) com transparência — substitui o
 * truque antigo de concatenar sufixo de alpha num hex fixo (`${cor}1a}`),
 * que quebra com var() e não reage ao tema escuro.
 */
export function comAlpha(cor: string, porcentagem: number): string {
  return `color-mix(in srgb, ${cor} ${porcentagem}%, transparent)`
}
