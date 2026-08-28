/**
 * Cliente HTTP pro backend Controllr/BRbyte (controllr.hotnet.net.br), reaproveitando
 * as mesmas particularidades já confirmadas e documentadas no app Android
 * (ver README do projeto Android, seção "Backend (Controllr/BRbyte)").
 *
 * Todas as chamadas passam por "/api/..." — em desenvolvimento, o proxy do
 * Vite (vite.config.ts) repassa pra controllr.hotnet.net.br; em produção, é o
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
 * Aviso de sessão expirada pro resto do app — este módulo é código comum
 * (fora de componente React), não dá pra chamar useSessao()/useToast()
 * diretamente daqui. `SessionProvider` (SessionContext.tsx) se registra
 * como ouvinte ao montar, e é quem realmente desloga (sair()) e mostra o
 * toast — sem isso, um 401 por sessão expirada em qualquer tela (exceto
 * Boletos, que trata local) passava batido: nada tirava o cliente da tela
 * protegida nem avisava, ele só via os dados pararem de carregar.
 */
let ouvinteSessaoExpirada: (() => void) | null = null

export function aoExpirarSessao(ouvinte: (() => void) | null): void {
  ouvinteSessaoExpirada = ouvinte
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
  // session/logout também fica de fora: se a sessão já caiu no servidor,
  // o próprio logout (chamado pelo ouvinte de sessão expirada, ver acima)
  // bate 401 de novo — sem essa exceção, isso reacionaria o ouvinte e
  // entraria num loop (expirou → desloga → logout 401 → "expirou" de novo).
  const ehLogout = path === 'session/logout'

  const json = (await response.json()) as { success?: boolean; message?: string }

  if (!ehLogin) {
    if (response.status === 401 || (json.success === false && /login failure|unauthorized/i.test(json.message ?? ''))) {
      if (!ehLogout) ouvinteSessaoExpirada?.()
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

export interface NoticeDto {
  notice_pk: number
  notice_date_cad?: string
  notice_read_date?: string
  notice_type?: number
  contract_pk?: number
  contract_number?: number
  invoice_pk?: number
  invoice_nosso_num?: string
}

export interface NoticeListResponse {
  success: boolean
  message?: string
  total?: number
  results?: NoticeDto[]
}

/**
 * Avisos do cliente logado (bloqueio, alerta, cancelamento, etc.) — sem
 * filtro, devolve todos (lidos e não lidos); notice_read_date null =
 * ainda não confirmado (ver src/api/avisos.ts).
 */
export function listarAvisos(): Promise<NoticeListResponse> {
  return post<NoticeListResponse>('aaa_ctl/notification/list', { action: 'list' })
}

/**
 * Marca um aviso como lido/confirmado pelo cliente —
 * aaa_ctl/notification/update.
 */
export function marcarAvisoComoLido(noticePk: number): Promise<NoticeListResponse> {
  return post<NoticeListResponse>('aaa_ctl/notification/update', { notice_pk: noticePk })
}

export interface ClientDto {
  client_pk: number
  client_complete_name?: string
  client_doc1?: string
  client_doc2?: string
  client_phones?: string
  client_emails?: string
  client_date_cad?: string
}

export interface EnderecoDto {
  address_pk?: number
  address_identification?: string
  address?: string
  address_number?: string
  address_neighborhood?: string
  address_zipcode?: string
  address_province?: string
  address_state?: string
  address_completation?: string
  address_default?: number
}

/**
 * TODOS os endereços cadastrados pro cliente logado (pode ter mais de
 * um, ex: um por contrato/instalação) — controllrctl/cadastre/address.
 * IMPORTANTE, confirmado no app Android: esse endpoint exige corpo
 * VAZIO (sem "action" nem nenhum outro campo) — mandar algo faz o
 * servidor devolver os dados de cadastre/info por engano.
 */
export function buscarCadastroEnderecos(): Promise<{
  success?: boolean
  message?: string
  results?: EnderecoDto | EnderecoDto[]
}> {
  return post('controllrctl/cadastre/address', {})
}

/**
 * Dados cadastrais do cliente logado — controllrctl/cadastre/info. Usado
 * só pra resolver o client_pk (obrigatório pra abrir chamado de suporte);
 * formato da resposta não é 100% documentado, por isso "results" é
 * tratado como array OU objeto único (ver src/api/suporte.ts).
 */
export function buscarCadastroInfo(): Promise<{
  success?: boolean
  message?: string
  results?: ClientDto | ClientDto[]
} & Partial<ClientDto>> {
  return post('controllrctl/cadastre/info', { action: 'info' })
}

/**
 * Fallback pra resolver o client_pk quando cadastre/info falha —
 * controllrctl/client/list filtrado por CPF/CNPJ.
 */
export function buscarClientePorCpf(cpf: string): Promise<{ success?: boolean; message?: string; results?: ClientDto[] }> {
  return post('controllrctl/client/list', {
    action: 'list',
    where: whereJson([{ field: 'client_doc1', oper: 5, value: cpf }]),
    page: 1,
    start: 0,
    limit: 1,
  })
}

export interface TicketDto {
  ticket_pk?: number
  ticket_protocol?: string
  ticket_title?: string
  ticket_desc?: string
  ticket_status?: number
  ticket_date_create?: string
  ticket_date_last?: string
  ticket_date_close?: string
  category_name?: string
  contract_number?: number
}

export interface TicketListResponse {
  success?: boolean
  message?: string
  total?: number
  results?: TicketDto | TicketDto[]
}

/**
 * Lista os chamados de suporte do cliente logado — support_ctl/ticket/list.
 */
export function listarChamados(start: number, limit = 20): Promise<TicketListResponse> {
  return post<TicketListResponse>('support_ctl/ticket/list', { action: 'list', start, limit })
}

export interface CategoriaDto {
  category_pk: number
  category_name?: string
}

export interface CategoriaListResponse {
  success?: boolean
  message?: string
  results?: CategoriaDto[]
}

/**
 * Categorias de chamado disponíveis (não é lista fixa — configurada no
 * painel do Controllr) — support_ctl/category/list.
 */
export function listarCategoriasSuporte(): Promise<CategoriaListResponse> {
  return post<CategoriaListResponse>('support_ctl/category/list', { action: 'list' })
}

export interface TicketCreateResultDto {
  client_pk?: number
  contract_pk?: number
  ticket_pk?: number
  ticket_protocol?: string
}

export interface TicketCreateResponse {
  success?: boolean
  message?: string
  results?: TicketCreateResultDto[]
}

/**
 * Abre um novo chamado — support_ctl/ticket/create. Campos fixos
 * (priority/sla/client_show/client_active) conforme documentação oficial
 * da BRbyte, mesmos valores usados pelo app Android.
 */
export function abrirChamado(parametros: {
  clientPk: number
  categoryPk: number
  ticketTitle: string
  ticketDesc: string
}): Promise<TicketCreateResponse> {
  return post<TicketCreateResponse>('support_ctl/ticket/create', {
    client_pk: parametros.clientPk,
    category_pk: parametros.categoryPk,
    ticket_priority: 5,
    ticket_sla: 2880,
    ticket_client_show: 2,
    ticket_client_active: 1,
    ticket_title: parametros.ticketTitle,
    ticket_desc: parametros.ticketDesc,
  })
}

export interface OperacaoDto {
  op_pk?: number
  op_desc?: string
  op_file?: string
  op_date_create?: string
  op_client?: boolean
}

export interface OperacaoListResponse {
  success?: boolean
  message?: string
  results?: OperacaoDto[]
}

/**
 * Histórico de mensagens/anexos de um chamado — support_ctl/op/list.
 */
export function listarOperacoesChamado(ticketPk: number): Promise<OperacaoListResponse> {
  return post<OperacaoListResponse>('support_ctl/op/list', {
    where: whereJson([{ field: 'ticket_pk', oper: 5, value: String(ticketPk) }]),
  })
}

/**
 * Envia uma nova mensagem de texto num chamado existente —
 * support_ctl/op/create.
 */
export function criarOperacaoChamado(
  ticketPk: number,
  opDesc: string,
): Promise<{ success?: boolean; message?: string }> {
  return post('support_ctl/op/create', { ticket_pk: ticketPk, op_type: 0, op_code: 0, op_desc: opDesc })
}

/**
 * URL de um anexo de chamado, pronta pra exibir/baixar — mesmo esquema
 * de proxy das outras URLs de impressão (ver urlImpressaoBoleto).
 */
export function urlAnexoChamado(ticketPk: number, arquivo: string): string {
  return `${API_BASE}/support_ctl/annex/view/${ticketPk}/${arquivo}`
}

/**
 * Envia um anexo (foto, vídeo ou qualquer arquivo) a um chamado —
 * support_ctl/annex/upload, multipart com só "file" e "ticket_pk". Não
 * reaproveita post() porque o corpo aqui é FormData (o navegador define
 * o Content-Type/boundary sozinho — definir manualmente quebraria o
 * multipart).
 */
export async function enviarAnexoChamado(ticketPk: number, arquivo: File): Promise<{ success?: boolean; message?: string }> {
  const corpo = new FormData()
  corpo.append('file', arquivo)
  corpo.append('ticket_pk', String(ticketPk))

  const response = await fetch(`${API_BASE}/support_ctl/annex/upload`, {
    method: 'POST',
    credentials: 'include',
    body: corpo,
  })

  if (response.status === 401) {
    ouvinteSessaoExpirada?.()
    throw new SessaoExpiradaError()
  }

  const json = (await response.json()) as { success?: boolean; message?: string }
  if (!response.ok || json.success === false) {
    throw new ApiError(json.message ?? 'Não foi possível enviar o anexo.')
  }
  return json
}

export { post }
