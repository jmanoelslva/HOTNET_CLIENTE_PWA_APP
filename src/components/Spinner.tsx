import './Spinner.css'

/** Spinner simples pra carregamentos de tela inteira (ex: checagem de sessão). */
export default function Spinner({ tela = false }: { tela?: boolean }) {
  if (tela) {
    return (
      <div className="spinner-tela" role="status">
        <span className="spinner" aria-hidden="true" />
        <span className="sr-only">Carregando</span>
      </div>
    )
  }
  return <span className="spinner" />
}
