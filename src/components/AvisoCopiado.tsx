import { useSyncExternalStore } from 'react'
import { IcCheckCircle } from './IconesApp'
import { avisoCopiadoAtual, inscreverAvisoCopiado } from '../utils/avisoCopiado'
import './AvisoCopiado.css'

/**
 * Selo central de "copiado", igual ao AvisoCopiado do app Android
 * (ui/components/AvisoCopiado.kt): verde, no meio da tela, some sozinho em
 * 1,5 s. Disparado por mostrarAvisoCopiado (utils/avisoCopiado.ts).
 */
export default function AvisoCopiadoHost() {
  const aviso = useSyncExternalStore(inscreverAvisoCopiado, avisoCopiadoAtual)

  return (
    <div className="aviso-copiado-camada" aria-live="polite">
      {aviso && (
        <div key={aviso.id} className={`aviso-copiado ${aviso.visivel ? 'visivel' : 'saindo'}`}>
          <IcCheckCircle size={36} aria-hidden="true" />
          <strong>{aviso.titulo}</strong>
          {aviso.dica && <span>{aviso.dica}</span>}
        </div>
      )}
    </div>
  )
}
