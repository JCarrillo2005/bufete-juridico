import { formatearFechaHora } from '../utils/formatos'
import { clasificarTipoHistorial } from '../utils/historial'
import Icono from './Icono'

const CONFIGURACION = {
  apertura: { etiqueta: 'Apertura', icono: 'carpeta' },
  actividad: { etiqueta: 'Actividad', icono: 'actividad' },
  cambio: { etiqueta: 'Cambio de estado', icono: 'cambio' },
  cierre: { etiqueta: 'Cierre', icono: 'candado' },
  reapertura: { etiqueta: 'Reapertura', icono: 'reabrir' },
  otro: { etiqueta: 'Movimiento', icono: 'punto' },
}

const minusculas = (valor) => String(valor ?? '').toLowerCase()

/* Distingue cierres y reaperturas dentro de los cambios de estado. */
function subtipoDe(entrada, tipo) {
  if (tipo !== 'cambio') return tipo
  if (minusculas(entrada.estadoAnterior) === 'cerrado') return 'reapertura'
  if (minusculas(entrada.estadoNuevo) === 'cerrado') return 'cierre'
  return 'cambio'
}

function descripcionDe(entrada, subtipo) {
  if (entrada.descripcion) return entrada.descripcion
  if (subtipo === 'apertura') return 'Se registró la apertura del expediente.'
  if (subtipo === 'reapertura') return 'El expediente se reabrió y volvió a En seguimiento.'
  if (subtipo === 'cierre') return 'El expediente se cerró.'
  if (subtipo === 'cambio' && entrada.estadoNuevo) {
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
        const subtipo = subtipoDe(entrada, tipo)
        const configuracion = CONFIGURACION[subtipo] ?? CONFIGURACION.otro
        const descripcion = descripcionDe(entrada, subtipo)
        const tieneTransicion =
          tipo === 'cambio' && (entrada.estadoAnterior || entrada.estadoNuevo)
        const destacado = subtipo === 'reapertura'

        return (
          <li
            className={`historial__item${destacado ? ' historial__item--destacado' : ''}`}
            key={`${entrada.fecha}-${indice}`}
          >
            <span className={`historial__marca historial__marca--${subtipo}`} aria-hidden="true">
              <Icono nombre={configuracion.icono} tamano={16} />
            </span>

            <div className="historial__contenido">
              <div className="historial__cabecera">
                <span className="historial__tipo">{configuracion.etiqueta}</span>
                <time className="historial__fecha" dateTime={entrada.fecha || undefined}>
                  {formatearFechaHora(entrada.fecha)}
                </time>
              </div>

              {descripcion && <p className="historial__texto">{descripcion}</p>}

              {entrada.motivo && (
                <p className="historial__motivo">
                  <strong>Motivo:</strong> {entrada.motivo}
                </p>
              )}

              <div className="historial__meta">
                {entrada.tipoActividad && <span className="chip">{entrada.tipoActividad}</span>}
                {tieneTransicion && (
                  <span className="chip">
                    {entrada.estadoAnterior || '—'} → {entrada.estadoNuevo || '—'}
                  </span>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
