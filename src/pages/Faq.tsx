import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'
import { MdArrowForward, MdKeyboardArrowDown, MdKeyboardArrowRight, MdOutlineLightbulb, MdSearchOff } from 'react-icons/md'
import { useSessao } from '../auth/useSessao'
import { buscarDadosCliente } from '../api/cadastro'
import { abrirWhatsappAjuda } from '../utils/whatsapp'
import CabecalhoTela from '../components/CabecalhoTela'
import EstadoVazio from '../components/EstadoVazio'
import { IcDataUsage, IcDescription, IcLock, IcPayments, IcSupportAgent, IcWhatsapp, IcWifi } from '../components/IconesApp'
import { comAlpha } from '../utils/cores'
import { FAQ_CATEGORIAS, FAQ_PERGUNTAS, type FaqDestino } from './faqDados'
import './Faq.css'

// Mesmos ícones das categorias do app Android (FaqScreen.kt).
const ICONES: Record<string, IconType> = {
  atendimento: IcSupportAgent,
  wifi: IcWifi,
  cobrancas: IcPayments,
  contratos: IcDescription,
  consumo: IcDataUsage,
  seguranca: IcLock,
}

const CATEGORIAS = FAQ_CATEGORIAS.map((c) => ({ ...c, Icone: ICONES[c.id] ?? IcSupportAgent }))
const PERGUNTAS = FAQ_PERGUNTAS

// Atalho de cada resposta: rótulo e tela, como o rotuloDestino do app.
const DESTINOS: Record<FaqDestino, { rotulo: string; rota: string; state?: unknown }> = {
  BOLETOS: { rotulo: 'Ir para Boletos', rota: '/boletos' },
  SUPORTE: { rotulo: 'Abrir Suporte', rota: '/suporte' },
  CONTRATOS: { rotulo: 'Ir para Contratos', rota: '/contratos' },
  CONSUMO: { rotulo: 'Ir para Consumo', rota: '/consumo' },
  TESTE_VELOCIDADE: { rotulo: 'Testar velocidade', rota: '/velocidade' },
  SEGURANCA: { rotulo: 'Abrir Segurança', rota: '/seguranca' },
  ALTERAR_SENHA: { rotulo: 'Alterar senha', rota: '/alterar-senha' },
}

export default function Faq() {
  const navigate = useNavigate()
  const { cpf } = useSessao()
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)
  const [abertaId, setAbertaId] = useState<number | null>(null)

  const listaExibida = useMemo(() => {
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase()
      return PERGUNTAS.filter(
        (p) => p.pergunta.toLowerCase().includes(termo) || p.resposta.toLowerCase().includes(termo),
      )
    }
    if (categoriaFiltro) return PERGUNTAS.filter((p) => p.categoriaId === categoriaFiltro)
    return PERGUNTAS
  }, [busca, categoriaFiltro])

  function selecionarCategoria(id: string) {
    setBusca('')
    setCategoriaFiltro((atual) => (atual === id ? null : id))
  }

  async function aoClicarWhatsapp() {
    try {
      const cliente = await buscarDadosCliente(cpf)
      abrirWhatsappAjuda(cliente.client_complete_name ?? null, cpf)
    } catch {
      abrirWhatsappAjuda(null, cpf)
    }
  }

  // Perguntas agrupadas por assunto, como no app Android (FaqScreen.kt).
  const grupos = CATEGORIAS.map((categoria) => ({
    categoria,
    itens: listaExibida.map((p, indice) => ({ p, indice })).filter(({ p }) => p.categoriaId === categoria.id),
  })).filter((g) => g.itens.length > 0)

  return (
    <div className="faq-tela tela-entrada">
      <CabecalhoTela titulo="Dúvidas" subtitulo="Perguntas frequentes e nossos canais de contato." />

      <input
        className="faq-busca"
        placeholder="Busque: pix, recibo, Wi-Fi…"
        value={busca}
        onChange={(evento) => {
          setBusca(evento.target.value)
          setCategoriaFiltro(null)
        }}
      />

      <button type="button" className="faq-guia" onClick={() => navigate('/', { state: { tour: true }, viewTransition: true })}>
        <span className="faq-guia-icone" aria-hidden="true">
          <MdOutlineLightbulb size={20} />
        </span>
        <span className="faq-falar-textos">
          <strong>Primeira vez no app?</strong>
          <span>Veja o guia rápido da tela inicial</span>
        </span>
        <MdKeyboardArrowRight size={22} aria-hidden="true" />
      </button>

      <section className="faq-assuntos" aria-labelledby="faq-assuntos-titulo">
        <div className="faq-assuntos-topo">
          <h2 id="faq-assuntos-titulo">Assuntos</h2>
          {categoriaFiltro && (
            <button type="button" onClick={() => setCategoriaFiltro(null)}>
              Ver todos
            </button>
          )}
        </div>
        <div className="faq-categorias">
          {CATEGORIAS.map((categoria) => (
            <button
              key={categoria.id}
              type="button"
              className={`faq-categoria ${categoriaFiltro === categoria.id ? 'ativa' : ''}`}
              onClick={() => selecionarCategoria(categoria.id)}
              aria-pressed={categoriaFiltro === categoria.id}
            >
              <span className="faq-categoria-icone" style={{ background: comAlpha(categoria.cor, 15), color: categoria.cor }}>
                <categoria.Icone size={20} />
              </span>
              <span className="faq-categoria-nome">{categoria.nome}</span>
              <span className="faq-categoria-subtitulo">
                {PERGUNTAS.filter((p) => p.categoriaId === categoria.id).length} perguntas
              </span>
            </button>
          ))}
        </div>
      </section>

      {grupos.length === 0 && (
        <EstadoVazio icone={MdSearchOff} titulo="Nenhuma pergunta encontrada" subtitulo="Tente buscar com outras palavras." />
      )}

      {grupos.map(({ categoria, itens }) => (
        <section key={categoria.id} className="faq-grupo">
          <h2 className="faq-grupo-titulo">
            <span className="faq-grupo-ponto" style={{ background: categoria.cor }} aria-hidden="true" />
            {categoria.nome}
          </h2>
          <div className="bloco-branco">
            {itens.map(({ p, indice }, i) => {
              const aberta = abertaId === indice
              return (
                <div key={indice} className={`faq-item ${i > 0 ? 'com-divisoria' : ''}`}>
                  <button
                    type="button"
                    className="faq-item-topo"
                    onClick={() => setAbertaId(aberta ? null : indice)}
                    aria-expanded={aberta}
                  >
                    <span className={`faq-item-pergunta ${aberta ? 'aberta' : ''}`}>{p.pergunta}</span>
                    <MdKeyboardArrowDown size={22} className={`faq-item-seta ${aberta ? 'aberta' : ''}`} aria-hidden="true" />
                  </button>
                  {aberta && (
                    <div className="faq-item-resposta">
                      <p>{p.resposta}</p>
                      {p.destino && (
                        <button
                          type="button"
                          className="faq-item-destino"
                          onClick={() =>
                            navigate(DESTINOS[p.destino!].rota, { state: DESTINOS[p.destino!].state, viewTransition: true })
                          }
                        >
                          {DESTINOS[p.destino].rotulo} <MdArrowForward size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <button type="button" className="faq-falar" onClick={aoClicarWhatsapp}>
        <span className="faq-falar-icone" aria-hidden="true">
          <IcWhatsapp size={22} />
        </span>
        <span className="faq-falar-textos">
          <strong>Não achou sua dúvida?</strong>
          <span>Fale com a gente no WhatsApp</span>
        </span>
        <span className="faq-falar-chamar">Chamar</span>
      </button>
    </div>
  )
}
