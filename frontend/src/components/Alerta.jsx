import Icono from './Icono'

const ICONOS = { error: 'error', exito: 'exito', info: 'info', aviso: 'alerta' }

/*
 * Alerta con icono, título opcional y cierre accesible.
 * Recibe `ref` para poder enfocarla (errores) y usa role="alert" solo en errores.
 */
export default function Alerta({ tipo = 'error', titulo, children, onCerrar, ref }) {
  if (!children && !titulo) return null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={`alerta alerta--${tipo}`}
      role={tipo === 'error' ? 'alert' : 'status'}
      aria-live={tipo === 'error' ? 'assertive' : 'polite'}
    >
      <Icono nombre={ICONOS[tipo] ?? 'info'} className="alerta__icono" />
      <div className="alerta__contenido">
        {titulo && <strong className="alerta__titulo">{titulo}</strong>}
        {children}
      </div>
      {onCerrar && (
        <button
          type="button"
          className="alerta__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar mensaje"
        >
          <Icono nombre="cerrar" tamano={18} />
        </button>
      )}
    </div>
  )
}
