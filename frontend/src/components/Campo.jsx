export default function Campo({ id, etiqueta, error, requerido = false, ayuda, children }) {
  return (
    <div className={`campo${error ? ' campo--error' : ''}`}>
      <label htmlFor={id}>
        {etiqueta}
        {requerido && (
          <span className="campo__obligatorio" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {ayuda && !error && <p className="campo__ayuda">{ayuda}</p>}
      {error && (
        <p className="campo__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
