import { ApiError, buscarCadastroInfo, buscarCadastroEnderecos, buscarClientePorCpf, type ClientDto, type EnderecoDto } from './client'

export interface Endereco {
  addressPk: number
  identificacao: string | null
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cep: string | null
  cidade: string | null
  estado: string | null
  complemento: string | null
  padrao: boolean
}

function paraEndereco(dto: EnderecoDto): Endereco {
  return {
    addressPk: dto.address_pk ?? 0,
    identificacao: dto.address_identification ?? null,
    logradouro: dto.address ?? null,
    numero: dto.address_number ?? null,
    bairro: dto.address_neighborhood ?? null,
    cep: dto.address_zipcode ?? null,
    cidade: dto.address_province ?? null,
    estado: dto.address_state ?? null,
    complemento: dto.address_completation ?? null,
    padrao: dto.address_default === 1,
  }
}

/**
 * Busca os dados cadastrais do cliente logado.
 *
 * Ordem de tentativas (da mais confiável pra mais "gambiarra"), mesmo
 * critério do CadastroRepository do app Android:
 * 1) controllrctl/cadastre/info — rota usada pelo app oficial do
 *    Controllr pro cliente ver os PRÓPRIOS dados.
 * 2) controllrctl/client/list — endpoint documentado, mas aparentemente
 *    administrativo; usado como segunda tentativa, filtrando por CPF.
 */
export async function buscarDadosCliente(cpf: string | null): Promise<ClientDto> {
  try {
    const resposta = await buscarCadastroInfo()
    if (resposta.success !== false) {
      const dado = Array.isArray(resposta.results) ? resposta.results[0] : resposta.results
      const cliente = dado ?? (resposta.client_complete_name || resposta.client_doc1 ? resposta : undefined)
      if (cliente?.client_complete_name || cliente?.client_doc1) {
        return cliente as ClientDto
      }
    }
  } catch {
    // segue pra próxima tentativa
  }

  if (cpf) {
    try {
      const resposta = await buscarClientePorCpf(cpf)
      const cliente = resposta.results?.[0]
      if (resposta.success !== false && cliente) return cliente
    } catch {
      // esgotou as tentativas
    }
  }

  throw new ApiError('Não foi possível carregar seus dados cadastrais.')
}

/** Busca TODOS os endereços cadastrados pro cliente logado. */
export async function buscarEnderecos(): Promise<Endereco[]> {
  try {
    const resposta = await buscarCadastroEnderecos()
    if (resposta.success === false) return []
    const resultados = resposta.results
    const lista = Array.isArray(resultados) ? resultados : resultados ? [resultados] : []
    return lista.map(paraEndereco)
  } catch {
    return []
  }
}

/**
 * Telefones/e-mails vêm no formato "Rótulo#-#valor", às vezes múltiplos
 * separados por vírgula (ex: "Celular#-#4898373602,Comercial#-#...").
 * Convertemos pra "Rótulo: valor", um por linha.
 */
export function formatarContatos(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const linhas = raw
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => parte.replace('#-#', ': '))
  return linhas.length > 0 ? linhas.join('\n') : null
}

/** CPF tem 11 dígitos, CNPJ tem 14 — usado pra saber o rótulo certo. */
export function tipoCadastro(doc: string | null | undefined): string | null {
  const digitos = doc?.replace(/\D/g, '') ?? ''
  if (digitos.length === 14) return 'Pessoa Jurídica'
  if (digitos.length === 11) return 'Pessoa Física'
  return null
}

export function rotuloDocumento(doc: string | null | undefined): string {
  const digitos = doc?.replace(/\D/g, '') ?? ''
  if (digitos.length === 14) return 'CNPJ'
  if (digitos.length === 11) return 'CPF'
  return 'CPF/CNPJ'
}
