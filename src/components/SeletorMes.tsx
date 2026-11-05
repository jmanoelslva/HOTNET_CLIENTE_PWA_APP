import { useState } from 'react'
import { MdCalendarMonth, MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md'
import DialogoHotnet from './DialogoHotnet'
import './SeletorMes.css'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface Props {
  aberto: boolean
  mes: number
  ano: number
  onFechar: () => void
  onEscolher: (mes: number, ano: number) => void
}

/**
 * Escolha de mês e ano do Consumo — o SeletorMesDialog do app Android: ano
 * com setas (até 10 anos atrás), grade de 12 meses com os futuros riscados.
 */
export default function SeletorMes({ aberto, mes, ano, onFechar, onEscolher }: Props) {
  const hoje = new Date()
  const anoHoje = hoje.getFullYear()
  const mesHoje = hoje.getMonth() + 1
  const [mesEscolhido, setMesEscolhido] = useState(mes)
  const [anoEscolhido, setAnoEscolhido] = useState(ano)
  const mesLimite = anoEscolhido === anoHoje ? mesHoje : 12

  function trocarAno(novo: number) {
    setAnoEscolhido(novo)
    if (novo === anoHoje && mesEscolhido > mesHoje) setMesEscolhido(mesHoje)
  }

  return (
    <DialogoHotnet
      aberto={aberto}
      onFechar={onFechar}
      titulo="Selecionar mês"
      icone={MdCalendarMonth}
      acoes={
        <>
          <button type="button" className="botao-primario" onClick={() => onEscolher(Math.min(mesEscolhido, mesLimite), anoEscolhido)}>
            Ver este mês
          </button>
          <button type="button" className="botao-contorno" onClick={onFechar}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="seletor-mes-ano">
        <button type="button" onClick={() => trocarAno(anoEscolhido - 1)} disabled={anoEscolhido <= anoHoje - 10} aria-label="Ano anterior">
          <MdKeyboardArrowLeft size={26} />
        </button>
        <strong>{anoEscolhido}</strong>
        <button type="button" onClick={() => trocarAno(anoEscolhido + 1)} disabled={anoEscolhido >= anoHoje} aria-label="Ano seguinte">
          <MdKeyboardArrowRight size={26} />
        </button>
      </div>
      <div className="seletor-mes-grade" role="radiogroup" aria-label="Mês">
        {NOMES_MESES.map((nome, i) => {
          const m = i + 1
          const habilitado = m <= mesLimite
          const selecionado = m === mesEscolhido
          return (
            <button
              key={nome}
              type="button"
              role="radio"
              aria-checked={selecionado}
              aria-label={nome}
              disabled={!habilitado}
              className={`seletor-mes-item ${selecionado ? 'selecionado' : ''}`}
              onClick={() => setMesEscolhido(m)}
            >
              {nome.slice(0, 3)}
            </button>
          )
        })}
      </div>
    </DialogoHotnet>
  )
}
