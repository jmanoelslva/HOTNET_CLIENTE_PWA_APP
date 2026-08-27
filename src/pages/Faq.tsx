import { useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import {
  MdDataUsage,
  MdDescription,
  MdHelp,
  MdLock,
  MdPayments,
  MdSearchOff,
  MdSupportAgent,
  MdWifi,
} from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
import { useSessao } from '../auth/SessionContext'
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
  { id: 'atendimento', nome: 'Atendimento', subtitulo: 'Horários e canais', Icone: MdSupportAgent, cor: CORES.suporte },
  { id: 'wifi', nome: 'Internet e Wi-Fi', subtitulo: 'Velocidade e sinal', Icone: MdWifi, cor: CORES.ajuda },
  { id: 'cobrancas', nome: 'Cobranças', subtitulo: 'Boletos e pagamentos', Icone: MdPayments, cor: CORES.boletos },
  { id: 'contratos', nome: 'Contratos', subtitulo: 'Planos e contratos', Icone: MdDescription, cor: CORES.contratos },
  { id: 'consumo', nome: 'Consumo e Conexão', subtitulo: 'Uso e conexão', Icone: MdDataUsage, cor: CORES.consumo },
  { id: 'seguranca', nome: 'Segurança e Acesso', subtitulo: 'Login e segurança', Icone: MdLock, cor: CORES.dados },
]

function categoriaDe(id: string): CategoriaFaq {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[0]
}

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

  return (
    <div className="faq-tela tela-entrada">
      <CabecalhoTela
        icone={MdHelp}
        cor={CORES.ajuda}
        titulo="Ajuda"
        subtitulo="Perguntas frequentes e nossos canais de contato."
      />

      <input
        className="faq-busca"
        placeholder="Buscar dúvida…"
        value={busca}
        onChange={(evento) => {
          setBusca(evento.target.value)
          setCategoriaFiltro(null)
        }}
      />

      <div className="faq-categorias">
        {CATEGORIAS.map((categoria) => (
          <button
            key={categoria.id}
            className={`faq-categoria ${categoriaFiltro === categoria.id ? 'ativa' : ''}`}
            style={{ borderColor: categoriaFiltro === categoria.id ? categoria.cor : undefined }}
            onClick={() => selecionarCategoria(categoria.id)}
          >
            <span className="faq-categoria-icone" style={{ background: comAlpha(categoria.cor, 10), color: categoria.cor }}>
              <categoria.Icone size={22} />
            </span>
            <span className="faq-categoria-nome">{categoria.nome}</span>
            <span className="faq-categoria-subtitulo">{categoria.subtitulo}</span>
          </button>
        ))}
      </div>

      <h2 className="faq-titulo-lista">
        {busca.trim()
          ? 'Resultados da busca'
          : categoriaFiltro
            ? CATEGORIAS.find((c) => c.id === categoriaFiltro)?.nome
            : 'Dúvidas mais acessadas'}
      </h2>

      {listaExibida.length === 0 ? (
        <EstadoVazio icone={MdSearchOff} titulo="Nenhuma pergunta encontrada" subtitulo="Tente buscar com outras palavras." />
      ) : (
        <div className="faq-lista">
          {listaExibida.map((pergunta, indice) => {
            const aberta = abertaId === indice
            const categoria = categoriaDe(pergunta.categoriaId)
            return (
              <div key={indice} className="faq-item" onClick={() => setAbertaId(aberta ? null : indice)}>
                <div className="faq-item-topo">
                  <span
                    className="faq-item-icone"
                    style={{ background: comAlpha(categoria.cor, 10), color: categoria.cor }}
                  >
                    <categoria.Icone size={18} />
                  </span>
                  <span className="faq-item-pergunta">{pergunta.pergunta}</span>
                  <span className={`faq-item-seta ${aberta ? 'aberta' : ''}`}>›</span>
                </div>
                {aberta && <p className="faq-item-resposta">{pergunta.resposta}</p>}
              </div>
            )
          })}
        </div>
      )}

      <button className="faq-whatsapp" onClick={aoClicarWhatsapp}>
        <FaWhatsapp size={18} /> Não encontrei minha dúvida — falar com a gente
      </button>
    </div>
  )
}
