import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MdRadioButtonUnchecked } from 'react-icons/md'
import { IcCheckCircle, IcLock } from '../components/IconesApp'
import BotaoFechar from '../components/BotaoFechar'
import { useNavigate } from 'react-router-dom'
import { useSessao } from '../auth/useSessao'
import { alterarSenha, login, SessaoExpiradaError } from '../api/client'
import CabecalhoTela from '../components/CabecalhoTela'
import { marcarSenhaPadrao } from '../utils/contaLocal'
import { avaliarSenha, TAMANHO_MAX_SENHA } from '../utils/senha'
import './AlterarSenha.css'

type Etapa = 'confirmar' | 'nova' | 'concluido'

// Depois de algumas senhas atuais erradas seguidas, espera um pouco antes de deixar tentar de novo.
const TENTATIVAS_ANTES_DE_ESPERAR = 5
const ESPERA_MS = 30_000

function Regra({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className={`senha-regra ${ok ? 'ok' : ''}`}>
      {ok ? <IcCheckCircle aria-hidden="true" /> : <MdRadioButtonUnchecked aria-hidden="true" />}
      <span>{texto}</span>
      <span className="sr-only">{ok ? ' (atendida)' : ' (pendente)'}</span>
    </li>
  )
}

/**
 * Troca da senha da conta (menu do avatar → "Alterar senha"). O Controllr (session/setpassword)
 * não pede a senha atual, então o portal confirma antes refazendo o login com ela — quem pegou o
 * navegador logado não troca a senha sem saber a atual. Mesmas regras do app Android.
 */
export default function AlterarSenha() {
  const { cpf } = useSessao()
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<Etapa>('confirmar')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [falhas, setFalhas] = useState(0)
  const [bloqueadoAte, setBloqueadoAte] = useState(0)

  const avaliacao = avaliarSenha(nova, confirmacao, cpf)

  // Troca de etapa (confirmar → nova → concluído): o leitor de tela anuncia o título novo.
  const etapaInicial = useRef(etapa)
  useEffect(() => {
    if (etapa === etapaInicial.current) return
    const titulo = document.querySelector<HTMLElement>('.senha-tela .senha-card h2')
    titulo?.setAttribute('tabindex', '-1')
    titulo?.focus({ preventScroll: true })
  }, [etapa])

  async function confirmarSenhaAtual(evento: FormEvent) {
    evento.preventDefault()
    if (!cpf || !senhaAtual || enviando) return
    if (Date.now() < bloqueadoAte) {
      setErro('Muitas tentativas. Aguarde 30 segundos e tente de novo.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      const resposta = await login(cpf, senhaAtual)
      if (resposta.success) {
        setSenhaAtual('')
        setFalhas(0)
        setEtapa('nova')
        return
      }
      const novasFalhas = falhas + 1
      setFalhas(novasFalhas)
      if (novasFalhas >= TENTATIVAS_ANTES_DE_ESPERAR) {
        setBloqueadoAte(Date.now() + ESPERA_MS)
        setFalhas(0)
        setErro('Muitas tentativas. Aguarde 30 segundos e tente de novo.')
      } else {
        setErro('Senha atual incorreta. Confira e tente de novo.')
      }
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : 'Não foi possível confirmar agora. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (!avaliacao.valida || enviando) return
    setEnviando(true)
    setErro(null)
    try {
      const resposta = await alterarSenha(nova)
      if (resposta.success) {
        setNova('')
        setConfirmacao('')
        if (cpf) marcarSenhaPadrao(cpf, false)
        setEtapa('concluido')
      } else {
        setErro(resposta.message || 'Não foi possível alterar a senha. Tente novamente.')
      }
    } catch (excecao) {
      // Sessão expirada: o aviso global já leva pro login.
      if (excecao instanceof SessaoExpiradaError) return
      setErro(excecao instanceof Error ? excecao.message : 'Não foi possível alterar a senha. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="senha-tela tela-entrada">
      <CabecalhoTela titulo="Alterar senha" fixo acoes={<BotaoFechar />} />

      {etapa === 'confirmar' && (
        <form className="senha-card" onSubmit={confirmarSenhaAtual}>
          <IcLock className="senha-icone" size={36} aria-hidden="true" />
          <h2>Confirme que é você</h2>
          <p className="senha-texto">Para sua segurança, digite a senha atual antes de criar uma nova.</p>
          <label htmlFor="senha-atual">Senha atual</label>
          <input
            id="senha-atual"
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => {
              setSenhaAtual(e.target.value)
              setErro(null)
            }}
            autoFocus
          />
          {erro && (
            <p className="senha-erro" role="alert">
              {erro}
            </p>
          )}
          <button className="senha-btn-primario" type="submit" disabled={!senhaAtual || enviando}>
            {enviando ? 'Confirmando…' : 'Continuar'}
          </button>
          <p className="senha-dica">Esqueceu a senha atual? Fale com a gente pelo WhatsApp que voltamos para a senha padrão.</p>
        </form>
      )}

      {etapa === 'nova' && (
        <form className="senha-card" onSubmit={salvar}>
          <label htmlFor="senha-nova">Nova senha</label>
          <input
            id="senha-nova"
            type="password"
            autoComplete="new-password"
            maxLength={TAMANHO_MAX_SENHA}
            value={nova}
            onChange={(e) => {
              setNova(e.target.value)
              setErro(null)
            }}
            autoFocus
          />
          <label htmlFor="senha-confirmacao">Repita a nova senha</label>
          <input
            id="senha-confirmacao"
            type="password"
            autoComplete="new-password"
            maxLength={TAMANHO_MAX_SENHA}
            value={confirmacao}
            onChange={(e) => {
              setConfirmacao(e.target.value)
              setErro(null)
            }}
          />
          <ul className="senha-regras" aria-live="polite">
            <Regra ok={avaliacao.tamanhoOk} texto="Entre 8 e 16 caracteres" />
            <Regra ok={avaliacao.diferenteDoDocumento} texto="Diferente do seu CPF/CNPJ" />
            <Regra ok={avaliacao.semSequencia} texto="Sem sequência óbvia (12345678, 11111111)" />
            <Regra ok={avaliacao.confirmacaoIgual} texto="As duas senhas são iguais" />
          </ul>
          {erro && (
            <p className="senha-erro" role="alert">
              {erro}
            </p>
          )}
          <button className="senha-btn-primario" type="submit" disabled={!avaliacao.valida || enviando}>
            {enviando ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      )}

      {etapa === 'concluido' && (
        <div className="senha-card senha-concluido">
          <IcCheckCircle className="senha-icone senha-icone-ok" size={48} aria-hidden="true" />
          <h2>Senha alterada</h2>
          <p className="senha-texto">
            Use a nova senha na próxima vez que entrar. Se você usa o app HOTNET no celular, ele vai pedir a nova
            senha no próximo acesso.
          </p>
          <button type="button" className="senha-btn-primario" onClick={() => navigate('/', { viewTransition: true })}>
            Voltar ao início
          </button>
        </div>
      )}
    </div>
  )
}
