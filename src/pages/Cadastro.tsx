import { useEffect, useState } from 'react'
import { LuCopy, LuEye, LuEyeOff, LuMail, LuMapPin, LuPhone } from 'react-icons/lu'
import { FaWhatsapp } from 'react-icons/fa'
import { useSessao } from '../auth/useSessao'
import { buscarDadosCliente, buscarEnderecos, rotuloDocumento, type Endereco } from '../api/cadastro'
import type { ClientDto } from '../api/client'
import CabecalhoTela from '../components/CabecalhoTela'
import PullToRefresh from '../components/PullToRefresh'
import Skeleton from '../components/Skeleton'
import { BlocoBranco, LinhaItem, RotuloGrupo } from '../components/PadraoTelas'
import { useToast } from '../components/Toast/useToast'
import { mostrarAvisoCopiado } from '../utils/avisoCopiado'
import { mascararDocumento } from '../utils/recibo'
import { abrirWhatsappSuporte } from '../utils/whatsapp'
import './Cadastro.css'

function formatarData(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const partes = raw.split(' ')[0].split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : null
}

/** "a, b; c" → ["a", "b", "c"], sem vazios. */
function separarLista(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(/[;,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function formatarDocumento(doc: string): string {
  const d = doc.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return doc
}

function nomeParaExibir(nome: string): string {
  return nome
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((p) => (['da', 'de', 'do', 'das', 'dos', 'e'].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

/**
 * Meus dados — mesmo layout do app Android (register/CadastroScreen.kt):
 * titular no cartão grafite (documento oculto até tocar), Contato e
 * Endereços em blocos brancos, e "Algum dado errado?" no fim.
 */
export default function Cadastro() {
  const { cpf } = useSessao()
  const { toast } = useToast()
  const [cliente, setCliente] = useState<ClientDto | null>(null)
  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarDocumento, setMostrarDocumento] = useState(false)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const [dadosCliente, listaEnderecos] = await Promise.all([buscarDadosCliente(cpf), buscarEnderecos()])
      setCliente(dadosCliente)
      setEnderecos(listaEnderecos)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : 'Não foi possível carregar seus dados.')
    } finally {
      setCarregando(false)
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      mostrarAvisoCopiado('Copiado')
    } catch {
      toast('Não foi possível copiar.')
    }
  }

  const nome = cliente?.client_complete_name?.trim() ? nomeParaExibir(cliente.client_complete_name) : 'Não informado'
  const documento = cliente?.client_doc1?.trim() ?? ''
  const desde = formatarData(cliente?.client_date_cad)
  const telefones = separarLista(cliente?.client_phones)
  const emails = separarLista(cliente?.client_emails)
  const enderecosOrdenados = [...enderecos].sort((a, b) => Number(b.padrao) - Number(a.padrao))

  return (
    <PullToRefresh aoAtualizar={carregar}>
      <div className="cadastro-tela tela-entrada">
        <CabecalhoTela titulo="Meus dados" subtitulo="Suas informações cadastrais na HOTNET." />

        {carregando && (
          <div className="bloco-branco cadastro-esqueleto">
            <Skeleton width="45%" height={14} />
            <Skeleton width="70%" height={14} />
            <Skeleton width="60%" height={14} />
          </div>
        )}

        {!carregando && erro && (
          <div className="erro-carregamento">
            <p>{erro}</p>
            <button type="button" className="botao-primario" onClick={carregar}>
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && cliente && (
          <>
            <section className="cartao-destaque cadastro-titular" aria-label="Titular">
              <div className="cadastro-titular-topo">
                <span className="cadastro-titular-inicial" aria-hidden="true">
                  {nome.charAt(0).toUpperCase()}
                </span>
                <div className="cadastro-titular-textos">
                  <strong>{nome}</strong>
                  {desde && <span>Cliente desde {desde}</span>}
                </div>
              </div>
              {documento && (
                <button
                  type="button"
                  className="etiqueta-destaque cadastro-documento"
                  onClick={() => setMostrarDocumento((v) => !v)}
                  aria-label={mostrarDocumento ? 'Ocultar documento' : 'Mostrar documento'}
                >
                  {rotuloDocumento(documento)}{' '}
                  {mostrarDocumento ? formatarDocumento(documento) : (mascararDocumento(documento) ?? documento)}
                  {mostrarDocumento ? <LuEyeOff size={16} aria-hidden="true" /> : <LuEye size={16} aria-hidden="true" />}
                </button>
              )}
            </section>

            <RotuloGrupo>Contato</RotuloGrupo>
            <BlocoBranco>
              {telefones.map((fone) => (
                <LinhaItem
                  key={fone}
                  icone={LuPhone}
                  tom="primaria"
                  rotulo="Telefone"
                  titulo={fone}
                  fim={
                    <button type="button" className="linha-item-copiar" onClick={() => copiar(fone)} aria-label="Copiar telefone">
                      <LuCopy size={18} />
                    </button>
                  }
                />
              ))}
              {emails.map((email) => (
                <LinhaItem
                  key={email}
                  icone={LuMail}
                  tom="primaria"
                  rotulo="E-mail"
                  titulo={email}
                  fim={
                    <button type="button" className="linha-item-copiar" onClick={() => copiar(email)} aria-label="Copiar e-mail">
                      <LuCopy size={18} />
                    </button>
                  }
                />
              ))}
              {telefones.length === 0 && emails.length === 0 && <LinhaItem icone={LuMail} tom="primaria" titulo="Não informado" />}
            </BlocoBranco>

            <RotuloGrupo>Endereços</RotuloGrupo>
            {enderecosOrdenados.length === 0 ? (
              <p className="cadastro-endereco-indisponivel">Endereço indisponível no momento.</p>
            ) : (
              <BlocoBranco>
                {enderecosOrdenados.map((endereco, indice) => {
                  const rotulo = endereco.identificacao?.trim()
                    ? endereco.identificacao
                    : endereco.padrao
                      ? 'Endereço padrão'
                      : `Endereço ${indice + 1}`
                  const logradouro = [endereco.logradouro, endereco.numero ? `nº ${endereco.numero}` : null].filter(Boolean).join(', ')
                  const detalhes = [
                    endereco.complemento,
                    endereco.bairro,
                    [endereco.cidade, endereco.estado].filter(Boolean).join(' - '),
                    endereco.cep ? `CEP ${endereco.cep}` : null,
                  ]
                    .filter((s) => s?.trim())
                    .join(' · ')
                  return (
                    <div className="linha-item" key={endereco.addressPk || indice}>
                      <span className="linha-item-icone linha-item-icone-primaria" aria-hidden="true">
                        <LuMapPin size={18} />
                      </span>
                      <span className="linha-item-textos">
                        <span className="linha-item-rotulo">{rotulo}</span>
                        <span className="linha-item-titulo">{logradouro || 'Sem logradouro'}</span>
                        {detalhes && <span className="cadastro-endereco-detalhes">{detalhes}</span>}
                      </span>
                    </div>
                  )
                })}
              </BlocoBranco>
            )}

            <button
              type="button"
              className="cadastro-dado-errado"
              onClick={() => abrirWhatsappSuporte(cliente.client_complete_name ?? null, documento || cpf)}
            >
              <span className="cadastro-dado-errado-icone" aria-hidden="true">
                <FaWhatsapp size={20} />
              </span>
              <span className="cadastro-dado-errado-textos">
                <strong>Algum dado errado?</strong>
                <span>Peça a atualização pelo WhatsApp</span>
              </span>
            </button>
          </>
        )}
      </div>
    </PullToRefresh>
  )
}
