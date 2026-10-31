import { formatearFechaHora } from '../utils/formatos'
import { clasificarTipoHistorial } from '../utils/historial'

const CONFIGURACION = {
  apertura: { etiqueta: 'Apertura', marca: 'apertura', simbolo: '+' },
  actividad: { etiqueta: 'Actividad', marca: 'actividad', simbolo: '•' },
  cambio: { etiqueta: 'Cambio de estado', marca: 'cambio', simbolo: '↔' },
  otro: { etiqueta: 'Movimiento', marca: 'otro', simbolo: '·' },
}

function descripcionDe(entrada, tipo) {
  if (entrada.descripcion) return entrada.descripcion
  if (tipo === 'apertura') return 'Se registró la apertura del expediente.'
  if (tipo === 'cambio' && entrada.estadoNuevo) {
    return `El expediente pasó a ${entrada.estadoNuevo}.`
  }
  return ''
}

export default function HistorialTimeline({ entradas = [] }) {
  if (entradas.length === 0) {
    return <p className="texto-suave">Todavía no hay movimientos registrados.</p>
  }

  return (
    <ol className="historial">
      {entradas.map((entrada, indice) => {
        const tipo = clasificarTipoHistorial(entrada.tipo)
        const configuracion = CONFIGURACION[tipo]
        const descripcion = descripcionDe(entrada, tipo)
        const esCambio = tipo === 'cambio'
        const tieneTransicion = esCambio && (entrada.estadoAnterior || entrada.estadoNuevo)

        return (
          <li className="historial__item" key={`${entrada.fecha}-${indice}`}>
            <span
              className={`historial__marca historial__marca--${configuracion.marca}`}
              aria-hidden="true"
            >
              {configuracion.simbolo}
            </span>

            <div className="historial__cabecera">
              <span className="historial__tipo">{configuracion.etiqueta}</span>
              <time className="historial__fecha" dateTime={entrada.fecha || undefined}>
                {formatearFechaHora(entrada.fecha)}
              </time>
            </div>

            {descripcion && <p className="historial__texto">{descripcion}</p>}

            <div className="historial__meta">
              {entrada.tipoActividad && <span className="chip">{entrada.tipoActividad}</span>}
              {tieneTransicion && (
                <span className="chip">
                  {entrada.estadoAnterior || '—'} → {entrada.estadoNuevo || '—'}
                </span>
              )}
              {entrada.motivo && <span className="chip">Motivo: {entrada.motivo}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
