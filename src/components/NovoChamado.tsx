import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { MdArrowBack } from 'react-icons/md'
import { IcCheckCircle, IcClose, IcContentCopy, IcWhatsapp } from './IconesApp'
import { useFecharComVoltar } from '../hooks/useFecharComVoltar'
import type { IconType } from 'react-icons'
import type { CategoriaDto } from '../api/client'
import type { ChamadoCriado } from '../api/suporte'
import './NovoChamado.css'

interface AjudaCategoria {
  descricao: string
  sugestoes: string[]
  exemplo: string | null
  dicaBoletos?: boolean
}

// Textos de apoio por categoria (nome cadastrado no Controllr) — os mesmos do app Android.
const AJUDA: Record<string, AjudaCategoria> = {
  'suporte técnico': {
    descricao: 'Sem internet, lentidão, Wi-Fi caindo',
    sugestoes: ['Sem internet', 'Internet lenta', 'Wi-Fi caindo'],
    exemplo: 'Desde quando? Acontece em todos os aparelhos? Alguma luz diferente no roteador?',
  },
  'financeiro e pagamentos': {
    descricao: 'Boleto, pagamento não reconhecido',
    sugestoes: ['Pagamento não reconhecido', 'Boleto não chegou', 'Valor diferente'],
    exemplo: 'Data e forma do pagamento ajudam a localizar mais rápido.',
    dicaBoletos: true,
  },
  'alteração de plano': {
    descricao: 'Mais velocidade, troca de plano',
    sugestoes: ['Aumentar a velocidade', 'Trocar de plano'],
    exemplo: 'Qual plano ou velocidade você tem interesse?',
  },
  instalação: {
    descricao: 'Mudança de endereço, novo ponto',
    sugestoes: ['Mudança de endereço', 'Novo ponto de rede'],
    exemplo: 'Informe o endereço e o melhor horário para a visita.',
  },
  'vendas e comercial': {
    descricao: 'Contratar, serviços adicionais',
    sugestoes: ['Contratar internet', 'Serviços adicionais'],
    exemplo: null,
  },
}

// Os assuntos mais comuns primeiro; categoria nova cadastrada vai pro fim.
const ORDEM = [
  'suporte técnico',
  'financeiro e pagamentos',
  'alteração de plano',
  'instalação',
  'vendas e comercial',
  'reclamação',
  'ouvidoria e administrativo',
  'ouvidoria e adminstrativo',
  'cancelamento',
]

const chave = (nome: string | undefined) => nome?.trim().toLowerCase() ?? ''

interface Props {
  categorias: CategoriaDto[]
  /** contract_status de todos os contratos: 5 = todos cancelados → só WhatsApp. */
  contratoStatus: number | null
  /** Passos marcados no checklist de conexão, anexados ao fim da descrição. */
  passosFeitos: string[]
  iconeDaCategoria: (nome: string) => IconType
  corDaCategoria: (nome: string) => string
  onEnviar: (categoriaPk: number, assunto: string, descricao: string) => Promise<ChamadoCriado | null>
  onVerConversa: (criado: ChamadoCriado, assunto: string, categoria: string | null) => void
  onVerBoletos: () => void
  onWhatsapp: () => void
  onFechar: () => void
}

/**
 * Novo chamado em duas etapas (mesmo fluxo do app Android): assunto, com uma linha explicando
 * cada categoria; depois o texto, com sugestões e um exemplo do que escrever. Fica aberto até a
 * resposta: erro mantém o texto; sucesso mostra o número com "Copiar" e "Ver conversa".
 */
export default function NovoChamado({
  categorias,
  contratoStatus,
  passosFeitos,
  iconeDaCategoria,
  corDaCategoria,
  onEnviar,
  onVerConversa,
  onVerBoletos,
  onWhatsapp,
  onFechar,
}: Props) {
  const [categoriaPk, setCategoriaPk] = useState<number | null>(null)
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [criado, setCriado] = useState<ChamadoCriado | null>(null)
  const [copiado, setCopiado] = useState(false)
  // Voltar do celular fecha a janela, como no app.
  useFecharComVoltar(true, onFechar)

  const ordenadas = useMemo(
    () =>
      [...categorias].sort((a, b) => {
        const ia = ORDEM.indexOf(chave(a.category_name))
        const ib = ORDEM.indexOf(chave(b.category_name))
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      }),
    [categorias],
  )
  const categoria = categorias.find((c) => c.category_pk === categoriaPk) ?? null
  const ajuda = categoria ? AJUDA[chave(categoria.category_name)] : undefined

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !enviando) onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar, enviando])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!categoria || !assunto.trim() || !descricao.trim() || enviando) return
    const completa =
      passosFeitos.length === 0
        ? descricao.trim()
        : `${descricao.trim()}\n\nPassos já feitos pelo app:\n${passosFeitos.map((p) => `- ${p}`).join('\n')}`
    setEnviando(true)
    const resultado = await onEnviar(categoria.category_pk, assunto.trim(), completa)
    setEnviando(false)
    if (resultado) setCriado(resultado)
  }

  async function copiar(protocolo: string) {
    try {
      await navigator.clipboard.writeText(protocolo)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1500)
    } catch {
      setCopiado(false)
    }
  }

  const fecharSePuder = () => {
    if (!enviando) onFechar()
  }

  let conteudo
  if (contratoStatus === 5) {
    conteudo = (
      <div className="chamado-etapa">
        <h2 id="chamado-titulo">Contrato cancelado</h2>
        <p className="chamado-texto">O atendimento de contratos cancelados é feito pelo WhatsApp. Fale com a gente por lá.</p>
        <button className="chamado-btn-whatsapp" onClick={onWhatsapp}>
          <IcWhatsapp size={18} aria-hidden="true" /> Falar no WhatsApp
        </button>
        <button className="chamado-btn-secundario" onClick={onFechar}>
          Fechar
        </button>
      </div>
    )
  } else if (criado) {
    conteudo = (
      <div className="chamado-etapa chamado-sucesso">
        <IcCheckCircle size={52} className="chamado-sucesso-icone" aria-hidden="true" />
        <h2 id="chamado-titulo">Chamado aberto</h2>
        {criado.protocolo ? (
          <>
            <p className="chamado-texto">Guarde o número para acompanhar o atendimento.</p>
            <div className="chamado-protocolo" aria-live="polite">
              <span>{criado.protocolo}</span>
              <button onClick={() => copiar(criado.protocolo!)} aria-label="Copiar número do chamado">
                <IcContentCopy size={16} aria-hidden="true" /> {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </>
        ) : (
          <p className="chamado-texto">O número do chamado aparece na lista em instantes.</p>
        )}
        {criado.ticketPk != null && (
          <button className="chamado-btn-primario" onClick={() => onVerConversa(criado, assunto.trim(), categoria?.category_name ?? null)}>
            Ver conversa
          </button>
        )}
        <button className="chamado-btn-secundario" onClick={onFechar}>
          Fechar
        </button>
      </div>
    )
  } else if (!categoria) {
    conteudo = (
      <div className="chamado-etapa">
        <div className="chamado-etapas" aria-label="Etapa 1 de 2">
          <span className="on" />
          <span />
        </div>
        <h2 id="chamado-titulo">Sobre o que é o chamado?</h2>
        {categorias.length === 0 && <p className="chamado-texto">Carregando assuntos…</p>}
        <ul className="chamado-categorias">
          {ordenadas.map((c) => {
            const Icone = iconeDaCategoria(c.category_name ?? '')
            const cor = corDaCategoria(c.category_name ?? '')
            return (
              <li key={c.category_pk}>
                <button onClick={() => setCategoriaPk(c.category_pk)}>
                  <span className="chamado-categoria-icone" style={{ color: cor, background: `color-mix(in srgb, ${cor} 12%, transparent)` }}>
                    <Icone size={20} aria-hidden="true" />
                  </span>
                  <span className="chamado-categoria-texto">
                    <strong>{c.category_name ?? `Categoria ${c.category_pk}`}</strong>
                    {AJUDA[chave(c.category_name)] && <small>{AJUDA[chave(c.category_name)].descricao}</small>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <button className="chamado-btn-secundario" onClick={onFechar}>
          Cancelar
        </button>
      </div>
    )
  } else {
    conteudo = (
      <form className="chamado-etapa" onSubmit={enviar}>
        <div className="chamado-etapas" aria-label="Etapa 2 de 2">
          <span className="on" />
          <span className="on" />
        </div>
        <button type="button" className="chamado-voltar" onClick={() => setCategoriaPk(null)} disabled={enviando}>
          <MdArrowBack size={16} aria-hidden="true" /> {categoria.category_name}
        </button>
        <h2 id="chamado-titulo">O que está acontecendo?</h2>
        {ajuda?.dicaBoletos && (
          <p className="chamado-dica">
            Boleto ou Pix? Em Boletos você copia o código e informa o pagamento.{' '}
            <button type="button" onClick={onVerBoletos} disabled={enviando}>
              Ver boletos
            </button>
          </p>
        )}
        <label htmlFor="chamado-assunto">Assunto</label>
        {ajuda && ajuda.sugestoes.length > 0 && (
          <div className="chamado-sugestoes">
            {ajuda.sugestoes.map((s) => (
              <button type="button" key={s} className={assunto === s ? 'ativa' : ''} onClick={() => setAssunto(s)} disabled={enviando}>
                {s}
              </button>
            ))}
          </div>
        )}
        <input
          id="chamado-assunto"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          placeholder="Resuma em poucas palavras"
          maxLength={120}
          disabled={enviando}
        />
        <label htmlFor="chamado-descricao">Conte o que acontece</label>
        <textarea
          id="chamado-descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={ajuda?.exemplo ?? 'Quanto mais detalhes, mais rápido o atendimento.'}
          rows={5}
          maxLength={4000}
          disabled={enviando}
        />
        {passosFeitos.length > 0 && (
          <div className="chamado-passos">
            <span>Vai junto no chamado:</span>
            <ul>
              {passosFeitos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
        <button className="chamado-btn-primario" type="submit" disabled={enviando || !assunto.trim() || !descricao.trim()}>
          {enviando ? 'Enviando…' : 'Enviar chamado'}
        </button>
        <button type="button" className="chamado-btn-secundario" onClick={onFechar} disabled={enviando}>
          Cancelar
        </button>
      </form>
    )
  }

  return (
    <div className="chamado-fundo" onClick={fecharSePuder}>
      <div className="chamado-modal" role="dialog" aria-modal="true" aria-labelledby="chamado-titulo" onClick={(e) => e.stopPropagation()}>
        <button className="chamado-fechar" onClick={fecharSePuder} aria-label="Fechar" disabled={enviando}>
          <IcClose size={22} />
        </button>
        {conteudo}
      </div>
    </div>
  )
}
