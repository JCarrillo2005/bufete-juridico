export default function Alerta({ tipo = 'error', children, onCerrar }) {
  if (!children) return null

  return (
    <div className={`alerta alerta--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <div className="alerta__contenido">{children}</div>
      {onCerrar && (
        <button
          type="button"
          className="alerta__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar mensaje"
        >
          ×
        </button>
      )}
    </div>
  )
}
