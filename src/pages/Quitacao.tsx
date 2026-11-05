import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuCircleCheck, LuClock, LuFileCheck, LuTriangleAlert } from 'react-icons/lu'
import { useSessao } from '../auth/useSessao'
import { listarBoletos, type FaturaDto } from '../api/client'
import { buscarDadosCliente } from '../api/cadastro'
import CabecalhoTela from '../components/CabecalhoTela'
import Skeleton from '../components/Skeleton'
import VoltarInicio from '../components/VoltarInicio'
import { AbasPilula, RotuloGrupo } from '../components/PadraoTelas'
import { anosQuitacao, montarDadosQuitacao, type AnoQuitacao, type DadosQuitacao } from '../utils/quitacao'
import { EMPRESA_RECIBO, formatarReais, rotuloDocumento, valorPorExtenso } from '../utils/recibo'
import logoHotnet from '../assets/logo-hotnet.png'
import '../components/ReciboModal.css'
import './Quitacao.css'

/** Declaração em folha (impressão / "Salvar como PDF"), mesmo esquema do recibo. */
function QuitacaoImpressao({ d }: { d: DadosQuitacao }) {
  return (
    <div className="recibo-impressao" aria-hidden="true">
      <div className="ri-faixa" />
      <header className="ri-topo">
        <div className="ri-marca">
          <img src={logoHotnet} alt="" width={56} height={56} />
          <div>
            <h1>{EMPRESA_RECIBO.nome}</h1>
            <small>
              {EMPRESA_RECIBO.responsavel} · CNPJ {EMPRESA_RECIBO.cnpj}
            </small>
            <small>
              {EMPRESA_RECIBO.endereco} · {EMPRESA_RECIBO.cidade}
            </small>
          </div>
        </div>
        <div className="ri-titulo">
          <b>Declaração de quitação</b>
          Ano de referência {d.ano}
          <small>Lei nº 12.007/2009</small>
        </div>
      </header>
      <p className="ri-corpo">
        Declaramos, para os fins da Lei nº 12.007/2009, que <b>{d.clienteNome?.toUpperCase() ?? 'TITULAR DO CONTRATO'}</b>
        {d.documentoMascarado ? `, ${rotuloDocumento(d.documentoMascarado)} ${d.documentoMascarado}` : ''}, efetuou o
        pagamento de todas as cobranças{d.contratoNumero != null ? ` do contrato nº ${d.contratoNumero}` : ''} com vencimento
        no ano de <b>{d.ano}</b>, no total de{' '}
        <b>
          {formatarReais(d.totalCentavos)} ({valorPorExtenso(d.totalCentavos)})
        </b>
        , nada devendo a esta empresa referente a esse período.
      </p>
      <div className="ri-info">
        <div>
          <span>Ano</span>
          {d.ano}
        </div>
        <div>
          <span>Cobranças</span>
          {d.linhas.length}
        </div>
        <div>
          <span>Contrato</span>
          {d.contratoNumero != null ? `Nº ${d.contratoNumero}` : '—'}
        </div>
        <div>
          <span>Total pago</span>
          {formatarReais(d.totalCentavos)}
        </div>
      </div>
      <table className="ri-tabela">
        <thead>
          <tr>
            <th>Cobrança</th>
            <th>Vencimento</th>
            <th>Pagamento</th>
            <th className="ri-valor">Valor pago</th>
          </tr>
        </thead>
        <tbody>
          {d.linhas.map((l) => (
            <tr key={l.numero}>
              <td>Nº {l.numero}</td>
              <td>{l.vencimento}</td>
              <td>{l.pagamento}</td>
              <td className="ri-valor">{formatarReais(l.pagoCentavos)}</td>
            </tr>
          ))}
          <tr className="ri-total">
            <td colSpan={3}>Total pago no ano</td>
            <td className="ri-valor">{formatarReais(d.totalCentavos)}</td>
          </tr>
        </tbody>
      </table>
      <small className="ri-rodape">
        Esta declaração substitui, para a comprovação do cumprimento das obrigações do consumidor, as quitações dos
        faturamentos mensais dos débitos do ano a que se refere e dos anos anteriores (art. 4º da Lei nº 12.007/2009).
        Emitida pelo portal HOTNET em {new Date().toLocaleDateString('pt-BR')}.
      </small>
    </div>
  )
}

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
  const [imprimindo, setImprimindo] = useState<DadosQuitacao | null>(null)

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

  useEffect(() => {
    if (!imprimindo) return
    const limpar = () => {
      document.body.classList.remove('imprimindo-recibo')
      window.removeEventListener('afterprint', limpar)
      setImprimindo(null)
    }
    document.body.classList.add('imprimindo-recibo')
    window.addEventListener('afterprint', limpar)
    // Espera a folha entrar no documento antes de abrir a impressão.
    const t = setTimeout(() => window.print(), 50)
    return () => clearTimeout(t)
  }, [imprimindo])

  return (
    <div className="quitacao-tela tela-entrada">
      <VoltarInicio to="/perfil" label="Perfil" />
      <CabecalhoTela titulo="Declaração de quitação" subtitulo="Disponível para anos encerrados com todas as cobranças pagas." />

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
              const Icone = s.tom === 'ok' ? LuCircleCheck : s.tom === 'andamento' ? LuClock : LuTriangleAlert
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
                      onClick={() => setImprimindo(montarDadosQuitacao(ano, cliente.nome, cliente.doc))}
                    >
                      <LuFileCheck size={16} /> PDF
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

      {imprimindo && createPortal(<QuitacaoImpressao d={imprimindo} />, document.body)}
    </div>
  )
}
