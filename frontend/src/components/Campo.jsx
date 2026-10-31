import Icono from './Icono'

export default function Campo({
  id,
  etiqueta,
  error,
  requerido = false,
  ayuda,
  contador,
  className = '',
  children,
}) {
  return (
    <div className={`campo${error ? ' campo--error' : ''} ${className}`.trim()}>
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
      {(error || ayuda || contador) && (
        <div className="campo__pie">
          {error ? (
            <p className="campo__error" id={`${id}-error`} role="alert">
              <Icono nombre="error" tamano={14} />
              <span>{error}</span>
            </p>
          ) : (
            ayuda && (
              <p className="campo__ayuda" id={`${id}-ayuda`}>
                {ayuda}
              </p>
            )
          )}
          {contador}
        </div>
      )}
    </div>
  )
}
