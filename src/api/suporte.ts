import {
  ApiError,
  abrirChamado as apiAbrirChamado,
  buscarCadastroInfo,
  buscarClientePorCpf,
  criarOperacaoChamado,
  enviarAnexoChamado as apiEnviarAnexoChamado,
  listarCategoriasSuporte,
  listarChamados,
  listarOperacoesChamado,
  urlAnexoChamado,
  type CategoriaDto,
  type TicketDto,
} from './client'

export interface PaginaChamados {
  chamados: TicketDto[]
  total: number
}

/** ticket_date_close preenchido = já foi fechado; nulo = ainda aberto. */
export function chamadoResolvido(chamado: TicketDto): boolean {
  return !!chamado.ticket_date_close
}

export async function buscarChamados(start: number, limit = 20): Promise<PaginaChamados> {
  const resposta = await listarChamados(start, limit)
  if (resposta.success === false) {
    throw new ApiError(resposta.message ?? 'Falha ao buscar chamados.')
  }
  const resultados = resposta.results
  const chamados = Array.isArray(resultados) ? resultados : resultados ? [resultados] : []
  return { chamados, total: resposta.total ?? chamados.length }
}

export async function buscarCategorias(): Promise<CategoriaDto[]> {
  const resposta = await listarCategoriasSuporte()
  if (resposta.success === false) return []
  return resposta.results ?? []
}

/**
 * Resolve o client_pk do cliente logado (obrigatório pra abrir chamado):
 * tenta cadastre/info primeiro (mesma ordem do app Android), com
 * client/list por CPF como fallback.
 */
async function buscarClientePk(cpf: string | null): Promise<number | null> {
  try {
    const resposta = await buscarCadastroInfo()
    if (resposta.success !== false) {
      const dado = Array.isArray(resposta.results) ? resposta.results[0] : resposta.results
      if (dado?.client_pk) return dado.client_pk
      if (resposta.client_pk) return resposta.client_pk
    }
  } catch {
    // segue pro fallback
  }

  if (!cpf) return null
  try {
    const resposta = await buscarClientePorCpf(cpf)
    if (resposta.success !== false) {
      return resposta.results?.[0]?.client_pk ?? null
    }
  } catch {
    // esgotou as tentativas
  }
  return null
}

export async function abrirChamado(
  cpf: string | null,
  categoryPk: number,
  titulo: string,
  descricao: string,
): Promise<string> {
  const clientPk = await buscarClientePk(cpf)
  if (clientPk == null) {
    throw new ApiError('Não foi possível identificar seu cadastro para abrir o chamado.')
  }

  const resposta = await apiAbrirChamado({ clientPk, categoryPk, ticketTitle: titulo, ticketDesc: descricao })
  if (!resposta.success) {
    throw new ApiError(resposta.message ?? 'Não foi possível abrir o chamado.')
  }

  const protocolo = resposta.results?.[0]?.ticket_protocol
  return protocolo ? `Chamado aberto com sucesso! Protocolo: ${protocolo}` : 'Chamado aberto com sucesso!'
}

export interface OperacaoChamado {
  opPk: number
  texto: string | null
  arquivo: string | null
  dataCriacao: string | null
  doCliente: boolean
  urlAnexo: string | null
}

export async function buscarOperacoes(ticketPk: number): Promise<OperacaoChamado[]> {
  const resposta = await listarOperacoesChamado(ticketPk)
  if (resposta.success === false) {
    throw new ApiError(resposta.message ?? 'Falha ao buscar mensagens do chamado.')
  }

  const operacoes: OperacaoChamado[] = []
  for (const dto of resposta.results ?? []) {
    if (dto.op_pk == null) continue
    const arquivo = dto.op_file?.trim() || null
    operacoes.push({
      opPk: dto.op_pk,
      texto: dto.op_desc?.trim() || null,
      arquivo,
      dataCriacao: dto.op_date_create ?? null,
      doCliente: dto.op_client === true,
      urlAnexo: arquivo ? urlAnexoChamado(ticketPk, arquivo) : null,
    })
  }
  return operacoes.sort((a, b) => (a.dataCriacao ?? '').localeCompare(b.dataCriacao ?? ''))
}

/**
 * Remove de "pendentes" (mensagens otimistas, ver DetalheChamado.tsx) as
 * que já foram confirmadas em "dados" — casamento 1-pra-1 por texto (a
 * pendente não tem opPk real, só o texto pra comparar). Cada operação
 * confirmada do cliente "consome" no máximo uma pendente com o mesmo
 * texto: um "some()" simples removeria TODAS as pendentes com aquele
 * texto de uma vez, mesmo com só uma confirmação — bug real quando o
 * mesmo texto é enviado mais de uma vez antes do servidor confirmar a
 * primeira.
 */
export function descartarPendentesConfirmadas(
  pendentes: OperacaoChamado[],
  dados: OperacaoChamado[],
): OperacaoChamado[] {
  const usados = new Set<number>()
  for (const d of dados) {
    if (!d.doCliente) continue
    const indice = pendentes.findIndex((p, i) => !usados.has(i) && p.texto === d.texto)
    if (indice !== -1) usados.add(indice)
  }
  return pendentes.filter((_, i) => !usados.has(i))
}

export async function enviarMensagem(ticketPk: number, texto: string): Promise<void> {
  const resposta = await criarOperacaoChamado(ticketPk, texto)
  if (resposta.success === false) {
    throw new ApiError(resposta.message ?? 'Não foi possível enviar a mensagem.')
  }
}

export async function enviarAnexoChamado(ticketPk: number, arquivo: File): Promise<void> {
  const resposta = await apiEnviarAnexoChamado(ticketPk, arquivo)
  if (resposta.success === false) {
    throw new ApiError(resposta.message ?? 'Não foi possível enviar o anexo.')
  }
}

const EXTENSOES_VIDEO = ['.mp4', '.mov', '.3gp', '.avi', '.mkv', '.webm']
const EXTENSOES_IMAGEM = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif']

export function ehArquivoDeVideo(nomeArquivo: string | null): boolean {
  if (!nomeArquivo) return false
  const nome = nomeArquivo.toLowerCase()
  return EXTENSOES_VIDEO.some((ext) => nome.endsWith(ext))
}

export function ehArquivoDeImagem(nomeArquivo: string | null): boolean {
  if (!nomeArquivo) return false
  const nome = nomeArquivo.toLowerCase()
  return EXTENSOES_IMAGEM.some((ext) => nome.endsWith(ext))
}

export function ehArquivoPdf(nomeArquivo: string | null): boolean {
  return !!nomeArquivo && nomeArquivo.toLowerCase().endsWith('.pdf')
}
