import { useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import {
  LuChartColumn,
  LuFileText,
  LuLock,
  LuReceiptText,
  LuSearchX,
  LuChevronDown,
  LuHeadset,
  LuWifi,
} from 'react-icons/lu'
import { FaWhatsapp } from 'react-icons/fa'
import { useSessao } from '../auth/useSessao'
import { buscarDadosCliente } from '../api/cadastro'
import { abrirWhatsappAjuda } from '../utils/whatsapp'
import CabecalhoTela from '../components/CabecalhoTela'
import EstadoVazio from '../components/EstadoVazio'
import { CORES, comAlpha } from '../utils/cores'
import './Faq.css'

interface CategoriaFaq {
  id: string
  nome: string
  subtitulo: string
  Icone: IconType
  cor: string
}

interface PerguntaFrequente {
  categoriaId: string
  pergunta: string
  resposta: string
}

// Mesmas cores usadas nos badges equivalentes na Home, pra manter a
// associação visual entre uma categoria de dúvida e a tela que ela trata.
const CATEGORIAS: CategoriaFaq[] = [
  { id: 'atendimento', nome: 'Atendimento', subtitulo: 'Horários e canais', Icone: LuHeadset, cor: CORES.suporte },
  { id: 'wifi', nome: 'Internet e Wi-Fi', subtitulo: 'Velocidade e sinal', Icone: LuWifi, cor: CORES.ajuda },
  { id: 'cobrancas', nome: 'Cobranças', subtitulo: 'Boletos e pagamentos', Icone: LuReceiptText, cor: CORES.boletos },
  { id: 'contratos', nome: 'Contratos', subtitulo: 'Planos e contratos', Icone: LuFileText, cor: CORES.contratos },
  { id: 'consumo', nome: 'Consumo e Conexão', subtitulo: 'Uso e conexão', Icone: LuChartColumn, cor: CORES.consumo },
  { id: 'seguranca', nome: 'Segurança e Acesso', subtitulo: 'Login e segurança', Icone: LuLock, cor: CORES.dados },
]

const PERGUNTAS: PerguntaFrequente[] = [
  {
    categoriaId: 'atendimento',
    pergunta: 'Qual o horário de atendimento?',
    resposta:
      'De segunda a sexta, das 8h às 12h e das 14h às 18h. Aos sábados, das 8h às 12h. Fora desse horário, você ainda pode abrir um chamado de suporte pelo portal — nossa equipe responde assim que o atendimento for retomado.',
  },
  {
    categoriaId: 'atendimento',
    pergunta: 'Como abro um chamado de suporte?',
    resposta:
      'Na tela de Suporte, toque no botão de novo chamado, escolha a categoria e descreva o problema. Depois de aberto, você pode acompanhar as respostas e anexar fotos ou vídeos diretamente pelo chamado.',
  },
  {
    categoriaId: 'wifi',
    pergunta: 'Meu Wi-Fi está lento, o que pode ser?',
    resposta:
      'Se a velocidade está boa perto do roteador, mas diminui em outros cômodos, o problema geralmente está relacionado à cobertura do sinal Wi-Fi (distância, paredes, interferência de outros aparelhos), não à internet em si.',
  },
  {
    categoriaId: 'wifi',
    pergunta: 'Preciso trocar meu roteador/equipamento, como peço?',
    resposta:
      'Abra um chamado na tela de Suporte, escolha a categoria técnica e descreva a situação (é possível anexar foto do equipamento). Nossa equipe avalia e agenda uma visita técnica, se necessário.',
  },
  {
    categoriaId: 'cobrancas',
    pergunta: 'Como pago meu boleto?',
    resposta:
      'Na tela de Boletos, toque em "Copiar PIX" ou "Copiar código de barras" — o código já fica pronto para colar no aplicativo do seu banco.',
  },
  {
    categoriaId: 'cobrancas',
    pergunta: 'Meu boleto venceu — o valor com juros e multa já está certo?',
    resposta:
      'Sim. Para boletos vencidos, o portal mostra o valor original e o valor atualizado (já com a multa e os juros somados) separadamente. Não é necessário fazer nenhum cálculo — basta pagar o valor atualizado exibido na tela.',
  },
  {
    categoriaId: 'contratos',
    pergunta: 'Tenho mais de um contrato com a HOTNET, como acompanho cada um?',
    resposta:
      'Todos os seus contratos aparecem na tela de Contratos, com plano, valor e itens de cada um. Na tela de Boletos, um filtro por contrato é exibido automaticamente quando você possui mais de um.',
  },
  {
    categoriaId: 'contratos',
    pergunta: 'Como faço para cancelar meu contrato?',
    resposta:
      'O cancelamento não é feito pelo portal. Abra um chamado de suporte ou fale conosco pelo WhatsApp — nossa equipe explica o processo e os próximos passos.',
  },
  {
    categoriaId: 'consumo',
    pergunta: 'Como acompanho quanto de internet já usei?',
    resposta:
      'Na tela de Consumo, você visualiza o total utilizado no mês (download e upload) e o histórico diário — é possível navegar entre os meses anteriores. A tela também mostra se sua conexão está on-line no momento.',
  },
  {
    categoriaId: 'seguranca',
    pergunta: 'Não consigo entrar, o que faço?',
    resposta:
      'Confira se está digitando o CPF correto, sem pontos nem traço — usuário e senha são o mesmo número. Se o problema persistir, fale conosco pelo WhatsApp.',
  },
]

export default function Faq() {
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
        <EstadoVazio icone={LuSearchX} titulo="Nenhuma pergunta encontrada" subtitulo="Tente buscar com outras palavras." />
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
                    <LuChevronDown size={22} className={`faq-item-seta ${aberta ? 'aberta' : ''}`} aria-hidden="true" />
                  </button>
                  {aberta && <p className="faq-item-resposta">{p.resposta}</p>}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <button type="button" className="faq-falar" onClick={aoClicarWhatsapp}>
        <span className="faq-falar-icone" aria-hidden="true">
          <FaWhatsapp size={22} />
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
