import { useEffect, useState } from 'react'
import { MdBadge } from 'react-icons/md'
import { useSessao } from '../auth/SessionContext'
import { buscarDadosCliente, buscarEnderecos, formatarContatos, rotuloDocumento, tipoCadastro, type Endereco } from '../api/cadastro'
import type { ClientDto } from '../api/client'
import CabecalhoTela from '../components/CabecalhoTela'
import Skeleton from '../components/Skeleton'
import { CORES } from '../utils/cores'
import './Cadastro.css'

function formatarData(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const soData = raw.split(' ')[0]
  const partes = soData.split('-')
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
  return null
}

interface Linha {
  label: string
  value: string | null | undefined
}

function Bloco({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  const preenchidas = linhas.filter((linha) => linha.value?.trim())
  if (preenchidas.length === 0) return null

  return (
    <div className="cadastro-card">
      <span className="cadastro-card-titulo">{titulo}</span>
      {preenchidas.map((linha, indice) => (
        <div className="cadastro-linha" key={indice}>
          <span>{linha.label}</span>
          <strong style={{ whiteSpace: 'pre-line' }}>{linha.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Cadastro() {
  const { cpf } = useSessao()
  const [cliente, setCliente] = useState<ClientDto | null>(null)
  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

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

  return (
    <div className="cadastro-tela tela-entrada">
      <CabecalhoTela
        icone={MdBadge}
        cor={CORES.dados}
        titulo="Meus dados"
        subtitulo="Suas informações cadastrais na HOTNET."
      />

      {carregando && (
        <>
          <div className="cadastro-card">
            <Skeleton width="45%" height={13} />
            <Skeleton width="70%" height={13} />
            <Skeleton width="60%" height={13} />
          </div>
          <div className="cadastro-card">
            <Skeleton width="35%" height={13} />
            <Skeleton width="55%" height={13} />
          </div>
        </>
      )}

      {!carregando && erro && (
        <div className="cadastro-status">
          <p>{erro}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {!carregando && !erro && cliente && (
        <>
          <Bloco
            titulo="Informações pessoais"
            linhas={[
              { label: 'Tipo de cliente', value: tipoCadastro(cliente.client_doc1) },
              { label: 'Nome completo', value: cliente.client_complete_name },
              { label: rotuloDocumento(cliente.client_doc1), value: cliente.client_doc1 },
              { label: rotuloDocumento(cliente.client_doc1) === 'CNPJ' ? 'Inscrição Estadual' : 'RG', value: cliente.client_doc2 },
              { label: 'Cliente desde', value: formatarData(cliente.client_date_cad) },
            ]}
          />

          <Bloco
            titulo="Contato"
            linhas={[
              { label: 'Telefone(s)', value: formatarContatos(cliente.client_phones) },
              { label: 'E-mail', value: formatarContatos(cliente.client_emails) },
            ]}
          />

          <div className="cadastro-secao-endereco">
            <span className="cadastro-secao-titulo">Endereço</span>
            {enderecos.length === 0 ? (
              <p className="cadastro-endereco-indisponivel">Endereço indisponível no momento.</p>
            ) : (
              enderecos.map((endereco, indice) => {
                const titulo = endereco.identificacao?.trim()
                  ? endereco.identificacao
                  : endereco.padrao
                    ? 'Endereço padrão'
                    : `Endereço ${indice + 1}`
                const logradouro = [endereco.logradouro, endereco.numero ? `nº ${endereco.numero}` : null]
                  .filter(Boolean)
                  .join(', ')
                const cidadeUf = [endereco.cidade, endereco.estado].filter(Boolean).join(' - ')

                return (
                  <div className="cadastro-card" key={endereco.addressPk || indice}>
                    <span className="cadastro-card-titulo cadastro-endereco-titulo">{titulo}</span>
                    {[
                      { label: 'Logradouro', value: logradouro || null },
                      { label: 'Bairro', value: endereco.bairro },
                      { label: 'CEP', value: endereco.cep },
                      { label: 'Cidade / UF', value: cidadeUf || null },
                      { label: 'Complemento', value: endereco.complemento },
                    ]
                      .filter((linha) => linha.value?.trim())
                      .map((linha, i) => (
                        <div className="cadastro-linha" key={i}>
                          <span>{linha.label}</span>
                          <strong>{linha.value}</strong>
                        </div>
                      ))}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
