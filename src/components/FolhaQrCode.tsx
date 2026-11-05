import { useState } from 'react'
import DialogoHotnet from './DialogoHotnet'
import { IcQrCodeScanner } from './IconesApp'
import './FolhaQrCode.css'

/** invoice_qrcode_image pode vir com ou sem o prefixo "data:image/...;base64,". */
function srcQrCode(valor: string): string {
  const texto = valor.trim()
  if (/^data:image\/[a-z+]+;base64,/i.test(texto)) return texto
  return `data:image/png;base64,${texto}`
}

/** QR Code do Pix no diálogo do app (QrCodeDialog). */
export default function FolhaQrCode({ imagem, onFechar }: { imagem: string; onFechar: () => void }) {
  const [indisponivel, setIndisponivel] = useState(false)
  return (
    <DialogoHotnet
      aberto
      onFechar={onFechar}
      titulo="QR Code Pix"
      texto="Abra o app do seu banco, escolha pagar com Pix e aponte a câmera para o código."
      icone={IcQrCodeScanner}
      acoes={
        <button type="button" className="botao-contorno" onClick={onFechar}>
          Fechar
        </button>
      }
    >
      {indisponivel ? (
        <p className="dialogo-texto">QR Code indisponível no momento. Use o Pix copia e cola.</p>
      ) : (
        <img className="folha-qrcode-imagem" src={srcQrCode(imagem)} alt="QR Code do Pix" onError={() => setIndisponivel(true)} />
      )}
    </DialogoHotnet>
  )
}
