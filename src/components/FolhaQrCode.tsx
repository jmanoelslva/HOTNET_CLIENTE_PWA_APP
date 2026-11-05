import { useState } from 'react'
import './ModalConfirmarLogout.css'
import './FolhaQrCode.css'

/**
 * invoice_qrcode_image pode vir com ou sem o prefixo "data:image/...;base64,".
 * Só aceita imagem em base64; o resto cai no aviso de indisponível.
 */
function srcQrCode(valor: string): string {
  const texto = valor.trim()
  if (/^data:image\/[a-z+]+;base64,/i.test(texto)) return texto
  return `data:image/png;base64,${texto}`
}

/** QR Code do Pix numa folha que sobe de baixo (QrCodeDialog do app). */
export default function FolhaQrCode({ imagem, onFechar }: { imagem: string; onFechar: () => void }) {
  const [indisponivel, setIndisponivel] = useState(false)
  return (
    <div className="modal-confirmar-logout-fundo" onClick={onFechar}>
      <div className="modal-confirmar-logout folha-qrcode" role="dialog" aria-modal="true" aria-label="QR Code do Pix" onClick={(e) => e.stopPropagation()}>
        <h2>QR Code do Pix</h2>
        {indisponivel ? (
          <p>QR Code indisponível no momento. Use o Pix copia e cola.</p>
        ) : (
          <img src={srcQrCode(imagem)} alt="QR Code do Pix" onError={() => setIndisponivel(true)} />
        )}
        <div className="modal-confirmar-logout-acoes">
          <button type="button" className="modal-confirmar-logout-sair" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
