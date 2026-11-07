import { useEffect, useMemo, useState } from 'react'
import { MdShare } from 'react-icons/md'
import { IcCheckCircle, IcSchedule, IcWarning } from '../components/IconesApp'
import { useSessao } from '../auth/useSessao'
import { listarBoletos, type FaturaDto } from '../api/client'
import { buscarDadosCliente } from '../api/cadastro'
import CabecalhoTela from '../components/CabecalhoTela'
import BotaoFechar from '../components/BotaoFechar'
import Skeleton from '../components/Skeleton'
import { AbasPilula, RotuloGrupo } from '../components/PadraoTelas'
import { anosQuitacao, montarDadosQuitacao, type AnoQuitacao, type DadosQuitacao } from '../utils/quitacao'
import { formatarReais } from '../utils/recibo'
import { compartilharPdf, pdfQuitacao } from '../utils/pdfDocumentos'
import { useToast } from '../components/Toast/useToast'
import './Quitacao.css'

function situacao(ano: AnoQuitacao): { texto: string; tom: 'ok' | 'andamento' | 'pendente' } {
  if (ano.disponivel) return { texto: `${ano.faturas.length} cobranças · ${formatarReais(ano.totalPagoCentavos)}`, tom: 'ok' }
  if (!ano.encerrado) return { texto: 'Ano em andamento', tom: 'andamento' }
  if (ano.pendentes > 0) return { texto: `${ano.pendentes} cobrança(s) em aberto`, tom: 'pendente' }
  return { texto: `Há cobrança em aberto de ${ano.anoAnteriorPendente}`, tom: 'pendente' }
}

/**
 * Declaração anual de quitação — mesma regra e texto do app Android
 * (billing/QuitacaoDialog.kt e QuitacaoPdf.kt), gerada aqui como página de
 * impressão: o navegador salva em PDF.
 */
export default function Quitacao() {
  const { cpf } = useSessao()
  const [faturas, setFaturas] = useState<FaturaDto[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [contratoPk, setContratoPk] = useState<number | null>(null)
  const [cliente, setCliente] = useState<{ nome: string | null; doc: string | null }>({ nome: null, doc: cpf })
  const [gerandoAno, setGerandoAno] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    listarBoletos()
      .then((r) => {
        const lista = r.success ? (r.results ?? []) : []
        setFaturas(lista)
        setContratoPk(lista.find((f) => f.contract_pk != null)?.contract_pk ?? null)
        if (!r.success) setErro(r.message ?? 'Não foi possível carregar as cobranças.')
      })
      .catch(() => setErro('Não foi possível carregar as cobranças. Tente novamente.'))
    buscarDadosCliente(cpf)
      .then((c) => setCliente({ nome: c.client_complete_name ?? null, doc: c.client_doc1 ?? cpf }))
      .catch(() => {})
  }, [cpf])

  const contratos = useMemo(() => {
    const mapa = new Map<number, number>()
    for (const f of faturas ?? []) if (f.contract_pk != null) mapa.set(f.contract_pk, f.contract_number ?? f.contract_pk)
    return [...mapa.entries()]
  }, [faturas])

  const anos = faturas && contratoPk != null ? anosQuitacao(faturas, contratoPk, new Date().getFullYear()) : []

  /** Declaração em PDF de verdade, compartilhada como arquivo (como no app). */
  async function compartilhar(ano: AnoQuitacao) {
    const dados: DadosQuitacao | null = montarDadosQuitacao(ano, cliente.nome, cliente.doc)
    if (!dados) return
    setGerandoAno(ano.ano)
    try {
      const blob = await pdfQuitacao(dados)
      const resultado = await compartilharPdf(blob, `declaracao-quitacao-hotnet-${dados.ano}.pdf`, `Declaração de quitação ${dados.ano}`)
      if (resultado === 'baixado') toast('Declaração salva em PDF.', 'sucesso')
    } catch (erro) {
      console.error('[quitação pdf]', erro)
      toast('Não foi possível gerar o PDF da declaração. Tente novamente.')
    } finally {
      setGerandoAno(null)
    }
  }

  return (
    <div className="quitacao-tela tela-entrada">
      <CabecalhoTela titulo="Declaração de quitação" acoes={<BotaoFechar />} subtitulo="Disponível para anos encerrados com todas as cobranças pagas." />

      {faturas == null && !erro && (
        <div className="bloco-branco quitacao-esqueleto">
          <Skeleton width="40%" height={14} />
          <Skeleton width="70%" height={14} />
        </div>
      )}

      {erro && <p className="erro-carregamento">{erro}</p>}

      {contratos.length > 1 && (
        <div className="quitacao-seletor">
          <AbasPilula<string>
            rotulo="Contrato"
            opcoes={contratos.map(([pk, numero]) => ({ valor: String(pk), rotulo: `Nº ${numero}` }))}
            selecionada={String(contratoPk ?? '')}
            onSelecionar={(v) => setContratoPk(Number(v))}
          />
        </div>
      )}

      {faturas != null && anos.length > 0 && (
        <>
          <RotuloGrupo>Anos</RotuloGrupo>
          <div className="bloco-branco">
            {anos.map((ano, i) => {
              const s = situacao(ano)
              const Icone = s.tom === 'ok' ? IcCheckCircle : s.tom === 'andamento' ? IcSchedule : IcWarning
              return (
                <div key={ano.ano} className={`linha-item ${i > 0 ? 'com-divisoria' : ''}`}>
                  <span className={`linha-item-icone quitacao-icone ${s.tom}`} aria-hidden="true">
                    <Icone size={18} />
                  </span>
                  <span className="linha-item-textos">
                    <span className="linha-item-titulo">{ano.ano}</span>
                    <span className="linha-item-rotulo">{s.texto}</span>
                  </span>
                  {ano.disponivel ? (
                    <button
                      type="button"
                      className="botao-contorno quitacao-gerar"
                      disabled={gerandoAno != null}
                      onClick={() => compartilhar(ano)}
                    >
                      <MdShare size={16} /> {gerandoAno === ano.ano ? 'Gerando…' : 'Compartilhar'}
                    </button>
                  ) : (
                    <span className="quitacao-indisponivel">Indisponível</span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {faturas != null && !erro && anos.every((a) => !a.disponivel) && (
        <p className="quitacao-nenhum">Ainda não há ano encerrado com todas as cobranças pagas neste contrato.</p>
      )}

    </div>
  )
}
