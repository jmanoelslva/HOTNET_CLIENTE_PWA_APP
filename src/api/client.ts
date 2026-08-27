/**
 * Cliente HTTP pro backend Controllr/BRbyte (hotnet.net.br), reaproveitando
 * as mesmas particularidades já confirmadas e documentadas no app Android
 * (ver README do projeto Android, seção "Backend (Controllr/BRbyte)").
 *
 * Todas as chamadas passam por "/api/..." — em desenvolvimento, o proxy do
 * Vite (vite.config.ts) repassa pra hotnet.net.br; em produção, é o
 * servidor web (Apache/Nginx) que precisa fazer esse mesmo reverse proxy,
 * pra manter tudo na mesma origem do navegador e evitar problema de CORS
 * (ver README.md, seção "Deploy em produção").
 */

const API_BASE = '/api'

export class SessaoExpiradaError extends Error {
  constructor() {
    super('Sessão expirada.')
    this.name = 'SessaoExpiradaError'
  }
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * POST com corpo application/x-www-form-urlencoded — é o formato que
 * TODOS os endpoints do Controllr esperam (confirmado no app Android).
 * Sempre manda cookies (credentials: 'include'), já que a sessão é
 * mantida via cookie BRBOSCookie, não por token no header.
 */
async function post<T>(path: string, campos: Record<string, string | number | undefined>): Promise<T> {
  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor !== undefined) corpo.append(chave, String(valor))
  }

  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo.toString(),
  })

  // IMPORTANTE (mesmo quirk do app Android, ver SessionExpiredInterceptor.kt):
  // a própria chamada de /login NÃO deve ser tratada como "sessão expirada"
  // — uma senha errada bate no mesmo padrão (401, ou 200 com
  // {"success": false, "message": "Login Failure"/"Authentication failed..."}),
  // mas ali é só uma falha de login normal, não uma sessão que caiu.
  const ehLogin = path === 'login'

  const json = (await response.json()) as { success?: boolean; message?: string }

  if (!ehLogin) {
    if (response.status === 401 || (json.success === false && /login failure|unauthorized/i.test(json.message ?? ''))) {
      throw new SessaoExpiradaError()
    }
    if (!response.ok) {
      throw new ApiError(json.message ?? `Erro ${response.status} ao chamar ${path}`)
    }
  }

  return json as T
}

export interface LoginResponse {
  success: boolean
  code?: number
  message?: string
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return post<LoginResponse>('login', { username, password })
}

/**
 * Encerra a sessão do lado do servidor (invalida o BRBOSCookie) — sem
 * corpo, sem campos, confirmado inspecionando o painel web oficial.
 */
export function logout(): Promise<{ success: boolean }> {
  return post('session/logout', {})
}

export interface FaturaDto {
  invoice_pk: number
  contract_pk?: number
  contract_number?: number
  invoice_date_due?: string
  invoice_amount_document?: string
  days_late?: string
  invoice_barcode?: string
  invoice_qrcode?: string
  invoice_qrcode_image?: string
  invoice_date_credit?: string
  obs_pk?: number
  add_observation?: boolean
  // Taxas percentuais (não valor em R$) usadas pra calcular o valor com
  // encargos no cliente — "invoice_amount_document" é sempre o valor
  // ORIGINAL, sem multa/juros (confirmado no painel do cliente).
  invoice_rate_fine?: string
  invoice_rate_interest?: string
}

export interface FaturaListResponse {
  success: boolean
  message?: string
  results?: FaturaDto[]
}

/**
 * Lista os boletos do cliente logado — mesmo endpoint do app Android
 * (invoice_ctl/invoice/list), mesma ordenação por vencimento decrescente.
 * `limit` é usado pra descobrir todos os contratos do cliente a partir
 * das faturas (ver src/api/contratos.ts) — invoice/list nunca falha em
 * trazer todos os contract_pk, ao contrário do contract/list puro.
 */
export function listarBoletos(opcoes?: { limit?: number }): Promise<FaturaListResponse> {
  return post<FaturaListResponse>('invoice_ctl/invoice/list', {
    action: 'list',
    sort: 'invoice_date_due',
    dir: 'DESC',
    limit: opcoes?.limit,
  })
}

function whereJson(condicoes: Array<{ field: string; oper: number; value: string }>): string {
  return JSON.stringify(condicoes)
}

export interface ContratoDto {
  contract_pk: number
  contract_number?: number
  contract_status?: number
  contract_pay_day?: number
  contract_date_activation?: string
  contract_date_cad?: string
  contract_amount?: string
  contract_value?: string
}

/**
 * Detalhes de UM contrato específico (status, valor, dia de pagamento,
 * data de ativação) — controllrctl/contract/list SEM filtro pode voltar
 * vazio mesmo para clientes com contratos (bug do backend confirmado no
 * app Android), por isso sempre filtramos por contract_pk (oper 5 = "=").
 * `results` pode vir como array ou objeto único, dependendo do backend.
 */
export function buscarDetalhesContrato(
  contractPk: number,
): Promise<{ success?: boolean; message?: string; results?: ContratoDto | ContratoDto[] }> {
  return post('controllrctl/contract/list', {
    action: 'list',
    where: whereJson([{ field: 'contract_pk', oper: 5, value: String(contractPk) }]),
  })
}

export interface ItemServicoDto {
  item_pk?: number
  contract_pk?: number
  item_name?: string
  item_amount?: string
  item_type?: number
  item_rent?: boolean
  plan_name?: string
  plan_pk?: number
}

export interface ContractSvcListResponse {
  success: boolean
  message?: string
  results?: ItemServicoDto[]
}

/**
 * Itens/serviços de um contrato (plano, equipamentos alugados) —
 * controllrctl/contract/svclist, mesmo filtro/ordenação do app Android.
 */
export function listarItensContrato(contractPk: number): Promise<ContractSvcListResponse> {
  return post<ContractSvcListResponse>('controllrctl/contract/svclist', {
    where: whereJson([{ field: 'item.contract_pk', oper: 5, value: String(contractPk) }]),
    sort: 'contract_pk',
    dir: 'ASC',
  })
}

export interface InformarPagamentoResponse {
  success: boolean
  message?: string
}

/**
 * Informa pagamento de um boleto pra liberação temporária da conexão.
 */
export function informarPagamento(invoicePk: number, contractPk: number): Promise<InformarPagamentoResponse> {
  return post<InformarPagamentoResponse>('invoice_ctl/invoice/inform', {
    invoice_pk: invoicePk,
    contract_pk: contractPk,
    obs_text: 'Informado pelo Portal Web do Cliente',
  })
}

/**
 * URL do boleto em PDF/impressão, pronta pra abrir em nova aba — passa
 * pelo mesmo proxy de "/api" (ver vite.config.ts / README, seção de
 * produção), então os cookies de sessão já rewriteados valem aqui também.
 */
export function urlImpressaoBoleto(invoicePk: number): string {
  return `${API_BASE}/invoice_ctl/invoice/print_layout?invoice_pk=${invoicePk}`
}

/**
 * URL do contrato completo em PDF/impressão (mesmo endpoint usado pelo
 * WebView do app Android: controllrctl/contract/print/{contractPk}).
 */
export function urlImpressaoContrato(contractPk: number): string {
  return `${API_BASE}/controllrctl/contract/print/${contractPk}`
}

export interface ConsumoDiaDto {
  cpe_pk?: number
  contract_pk?: number
  contract_number?: number
  plan_name?: string
  usage_date?: string
  // Apesar do nome "_byte", confirmado comparando com o painel real que
  // esses valores vêm em KB — a conversão pra bytes é feita em
  // src/api/consumo.ts, igual ao app Android.
  usage_rx_byte?: number
  usage_tx_byte?: number
}

export interface UsageListDayResponse {
  success?: boolean
  message?: string
  results?: ConsumoDiaDto[]
}

/**
 * Consumo diário de internet do cliente logado — aaa_ctl/usage/list_day,
 * já escopado pra sessão de cliente, filtrado por período via "where".
 */
export function buscarConsumoDiario(where: string): Promise<UsageListDayResponse> {
  return post<UsageListDayResponse>('aaa_ctl/usage/list_day', { where })
}

export interface SessaoAtualDto {
  session_v4_ip?: string
  session_v6_px?: string
  session_v6_pd?: string
  session_mac?: string
  session_callingid?: string
  session_date_add?: string
  session_date_last?: string
  session_acct_time?: number
  // Mesmo quirk de KB de usage_rx_byte/usage_tx_byte, ver ConsumoDiaDto.
  session_rx_byte?: number
  session_tx_byte?: number
}

export interface ConnectionSessionResponse {
  success?: boolean
  message?: string
  results?: SessaoAtualDto[]
}

/**
 * Sessão de conexão ATUAL (ao vivo) de um CPE — aaa_ctl/connection/session,
 * filtrando por "aaa_cpe.cpe_pk".
 */
export function buscarSessaoAtual(where: string): Promise<ConnectionSessionResponse> {
  return post<ConnectionSessionResponse>('aaa_ctl/connection/session', { where })
}

export { post }
