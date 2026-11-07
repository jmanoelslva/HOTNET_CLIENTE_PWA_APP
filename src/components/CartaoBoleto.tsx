import { useEffect, useRef, useState } from 'react'
import { MdCalendarMonth, MdCheck, MdMoreHoriz, MdPrint, MdShare } from 'react-icons/md'
import type { FaturaDto } from '../api/client'
import { IcBarcode, IcCheckCircle, IcPayments, IcPix, IcQrCodeScanner, IcSchedule } from './IconesApp'
import { useToast } from './Toast/useToast'
import DialogoHotnet from './DialogoHotnet'
import { mostrarAvisoCopiado } from '../utils/avisoCopiado'
import {
  calcularPrazo,
  diasDeAtraso,
  encargosDetalhados,
  estaVencida,
  formatarMoeda,
  textoCompartilharFatura,
  textoPrazo,
  valorAtual,
} from '../utils/faturas'
import './PadraoTelas.css'
import './CartaoBoleto.css'

// Chave Pix (CNPJ) quando o boleto não traz código próprio, como no app.
const CNPJ_FALLBACK = '17.659.900/0001-48'

interface Props {
  fatura: FaturaDto
  /** "inicio": Ver boletos e menu curto (BoletoDestaqueInicio); "boletos": conta de juros e menu completo (FaturaItem). */
  variante: 'inicio' | 'boletos'
  mostrarContrato?: boolean
  jaInformado?: boolean
  onVerBoletos?: () => void
  onVerContrato?: () => void
  onQrCode: (imagem: string) => void
  onJaPaguei: () => void
  onImprimir?: () => void
}

async function compartilharTexto(texto: string, aoCopiar: () => void) {
  try {
    if (navigator.share) {
      await navigator.share({ text: texto })
      return
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
  }
  try {
    await navigator.clipboard.writeText(texto)
    aoCopiar()
  } catch {
    // Sem compartilhar nem área de transferência: nada a fazer.
  }
}

/** Cartão grafite do boleto, igual ao do app Android nas duas telas. */
export default function CartaoBoleto({
  fatura,
  variante,
  mostrarContrato,
  jaInformado,
  onVerBoletos,
  onVerContrato,
  onQrCode,
  onJaPaguei,
  onImprimir,
}: Props) {
  const { toast } = useToast()
  const [pixCopiado, setPixCopiado] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [compartilharAberto, setCompartilharAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const vencida = estaVencida(fatura)
  const prazo = calcularPrazo(fatura)
  const encargos = variante === 'boletos' && vencida ? encargosDetalhados(fatura) : null
  const pix = fatura.invoice_qrcode?.trim() || null
  const barras = fatura.invoice_barcode?.trim() || null
  const podeInformar = fatura.contract_pk != null

  useEffect(() => {
    if (!pixCopiado) return
    const t = setTimeout(() => setPixCopiado(false), 3000)
    return () => clearTimeout(t)
  }, [pixCopiado])

  useEffect(() => {
    if (!menuAberto) return
    const fora = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuAberto(false)
    }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [menuAberto])

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(pix ?? CNPJ_FALLBACK)
    } catch {
      toast('Não foi possível copiar agora.')
      return
    }
    setPixCopiado(true)
    mostrarAvisoCopiado(pix ? 'Código Pix copiado' : 'Chave Pix copiada', 'Cole no app do seu banco')
    if (!pix) {
      toast('Você copiou a chave Pix (CNPJ). Após pagar, envie o comprovante para o nosso WhatsApp.', 'info')
    }
  }

  async function copiarBarras() {
    if (!barras) return
    try {
      await navigator.clipboard.writeText(barras)
      mostrarAvisoCopiado('Código de barras copiado', 'Cole no app do seu banco')
    } catch {
      toast('Não foi possível copiar agora.')
    }
  }

  // Leitor de tela: o topo do cartão vira uma frase só, como o app (semantics mergeDescendants).
  const resumoFalado = [
    `${vencida ? 'Boleto atrasado' : 'Próximo boleto'}${fatura.contract_number != null && (mostrarContrato || variante === 'boletos') ? `, contrato ${fatura.contract_number}` : ''}`,
    formatarMoeda(valorAtual(fatura)),
    textoPrazo(fatura),
    vencida ? 'Atrasado' : 'Em aberto',
  ].join('. ')

  const corPrazo = prazo?.tipo === 'atrasado' ? 'atrasado' : prazo?.tipo === 'hoje' ? 'hoje' : 'em-dia'

  return (
    <section className="cartao-destaque cartao-boleto" aria-label={vencida ? 'Boleto atrasado' : 'Próximo boleto'}>
      <p className="sr-only">{resumoFalado}</p>
      <div className="cartao-boleto-topo">
        <span className="cartao-boleto-rotulos">
          <span className="cartao-destaque-rotulo" aria-hidden="true">{vencida ? 'Boleto atrasado' : 'Próximo boleto'}</span>
          {fatura.contract_number != null &&
            (variante === 'boletos' && onVerContrato ? (
              <>
                <span className="cartao-boleto-ponto" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  className="cartao-boleto-contrato"
                  onClick={onVerContrato}
                  aria-label={`Ver contrato ${fatura.contract_number}`}
                >
                  Contrato {fatura.contract_number} ›
                </button>
              </>
            ) : (
              mostrarContrato && <span className="cartao-destaque-rotulo" aria-hidden="true"> · Contrato {fatura.contract_number}</span>
            ))}
        </span>
        <span className={`cartao-boleto-estado ${vencida ? 'atrasado' : 'aberto'}`} aria-hidden="true">{vencida ? 'Atrasado' : 'Em aberto'}</span>
      </div>

      <strong className="cartao-boleto-valor" aria-hidden="true">{formatarMoeda(valorAtual(fatura))}</strong>

      <span className={`cartao-boleto-prazo ${corPrazo}`} aria-hidden="true">
        <MdCalendarMonth size={15} aria-hidden="true" />
        {textoPrazo(fatura)}
      </span>

      {encargos && (
        <div className="cartao-boleto-conta">
          <p className="sr-only">
            {`Valor do boleto ${formatarMoeda(encargos.original)}. Multa de ${fatura.invoice_rate_fine?.replace('.', ',')}%: ${formatarMoeda(encargos.multa)}. ` +
              `Juros de ${fatura.invoice_rate_interest?.replace('.', ',')}% ao dia por ${diasDeAtraso(fatura)} ${diasDeAtraso(fatura) === 1 ? 'dia' : 'dias'}: ${formatarMoeda(encargos.juros)}. ` +
              `Total hoje ${formatarMoeda(encargos.total)}.`}
          </p>
          <div aria-hidden="true">
            <span>Valor do boleto</span>
            <span>{formatarMoeda(encargos.original)}</span>
          </div>
          <div aria-hidden="true">
            <span>Multa ({fatura.invoice_rate_fine?.replace('.', ',')}%)</span>
            <span>{formatarMoeda(encargos.multa)}</span>
          </div>
          <div aria-hidden="true">
            <span>
              Juros ({fatura.invoice_rate_interest?.replace('.', ',')}% ao dia × {diasDeAtraso(fatura)})
            </span>
            <span>{formatarMoeda(encargos.juros)}</span>
          </div>
          <hr aria-hidden="true" />
          <div className="total" aria-hidden="true">
            <span>Total hoje</span>
            <span>{formatarMoeda(encargos.total)}</span>
          </div>
        </div>
      )}

      <button type="button" className={`cartao-boleto-pix ${pixCopiado ? 'copiado' : ''}`} onClick={copiarPix}>
        {pixCopiado ? <MdCheck size={18} aria-hidden="true" /> : <IcPix size={18} />}
        <span aria-live="polite">{!pixCopiado ? 'Copiar código Pix' : pix ? 'Código Pix copiado' : 'Chave Pix copiada'}</span>
      </button>

      <div className="cartao-boleto-linha">
        {fatura.invoice_qrcode_image && (
          <button type="button" onClick={() => onQrCode(fatura.invoice_qrcode_image!)}>
            <IcQrCodeScanner size={18} /> QR Code
          </button>
        )}
        {variante === 'inicio' ? (
          <button type="button" onClick={onVerBoletos}>
            <IcPayments size={18} /> Ver boletos
          </button>
        ) : (
          <button type="button" className="largo" onClick={copiarBarras} disabled={!barras}>
            <IcBarcode size={18} /> Código de barras
          </button>
        )}
        <div className="cartao-boleto-mais" ref={menuRef}>
          <button type="button" aria-label="Mais opções do boleto" aria-expanded={menuAberto} onClick={() => setMenuAberto((v) => !v)}>
            <MdMoreHoriz size={20} />
          </button>
          {menuAberto && (
            <div className="menu-hotnet" role="menu">
              {variante === 'inicio' && barras && (
                <button type="button" role="menuitem" onClick={() => (setMenuAberto(false), copiarBarras())}>
                  <IcBarcode size={20} />
                  <span>
                    <strong>Copiar código de barras</strong>
                    <small>Linha digitável para pagar no app do banco</small>
                  </span>
                </button>
              )}
              {variante === 'boletos' && (
                <>
                  <button type="button" role="menuitem" onClick={() => (setMenuAberto(false), setCompartilharAberto(true))}>
                    <MdShare size={20} />
                    <span>
                      <strong>Compartilhar boleto</strong>
                      <small>Pix, código de barras ou tudo</small>
                    </span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setMenuAberto(false), onImprimir?.())}>
                    <MdPrint size={20} />
                    <span>
                      <strong>Imprimir ou salvar PDF</strong>
                      <small>Boleto completo do banco</small>
                    </span>
                  </button>
                </>
              )}
              {podeInformar &&
                (jaInformado ? (
                  <div className="menu-hotnet-aviso">
                    <IcSchedule size={20} />
                    <span>
                      <strong>Liberação temporária já solicitada</strong>
                      <small>Aguardando a compensação do pagamento</small>
                    </span>
                  </div>
                ) : (
                  <button type="button" role="menuitem" className="destaque" onClick={() => (setMenuAberto(false), onJaPaguei())}>
                    <IcCheckCircle size={20} />
                    <span>
                      <strong>Já paguei este boleto</strong>
                      <small>Libera a internet enquanto o pagamento compensa</small>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <DialogoHotnet
        aberto={compartilharAberto}
        onFechar={() => setCompartilharAberto(false)}
        titulo="Compartilhar boleto"
        icone={MdShare}
        acoes={
          <button type="button" className="botao-contorno" onClick={() => setCompartilharAberto(false)}>
            Cancelar
          </button>
        }
      >
        {pix && (
          <button
            type="button"
            className="dialogo-opcao"
            onClick={() => (setCompartilharAberto(false), compartilharTexto(pix, () => mostrarAvisoCopiado('Código Pix copiado')))}
          >
            <span className="dialogo-opcao-textos">
              <strong>Só o código Pix</strong>
              <small>Quem recebe toca e segura a mensagem para copiar</small>
            </span>
          </button>
        )}
        {barras && (
          <button
            type="button"
            className="dialogo-opcao"
            onClick={() => (setCompartilharAberto(false), compartilharTexto(barras, () => mostrarAvisoCopiado('Código de barras copiado')))}
          >
            <span className="dialogo-opcao-textos">
              <strong>Só o código de barras</strong>
              <small>Linha digitável para pagar no app do banco</small>
            </span>
          </button>
        )}
        <button
          type="button"
          className="dialogo-opcao"
          onClick={() => (setCompartilharAberto(false), compartilharTexto(textoCompartilharFatura(fatura), () => mostrarAvisoCopiado('Mensagem copiada')))}
        >
          <span className="dialogo-opcao-textos">
            <strong>Mensagem completa</strong>
            <small>Valor, vencimento, Pix e código de barras</small>
          </span>
        </button>
      </DialogoHotnet>
    </section>
  )
}
