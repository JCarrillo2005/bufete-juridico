import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  cambiarEstado as cambiarEstadoApi,
  crearActividad,
  obtenerExpediente,
  reabrirExpediente as reabrirExpedienteApi,
} from '../api/expedientes'
import Alerta from '../components/Alerta'
import Campo from '../components/Campo'
import EstadoBadge from '../components/EstadoBadge'
import HistorialTimeline from '../components/HistorialTimeline'
import {
  ESTADOS,
  TIPOS_ACTIVIDAD,
  estaAbierto,
  estaCerrado,
  estaEnSeguimiento,
} from '../utils/catalogos'
import { errorDeCampo } from '../utils/errores'
import { formatearFechaHora } from '../utils/formatos'
import {
  clasificarTipoHistorial,
  hayActividadDesdeUltimaReapertura,
  indiceUltimaReapertura,
} from '../utils/historial'

const ACTIVIDAD_INICIAL = { descripcion: '', tipoActividad: '' }

export default function DetalleExpediente() {
  const { id } = useParams()
  const location = useLocation()

  const [expediente, setExpediente] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [intento, setIntento] = useState(0)
  const [mensaje, setMensaje] = useState(location.state?.mensaje ?? '')
  const [errorAccion, setErrorAccion] = useState('')
  const [errores, setErrores] = useState({})
  const [actividad, setActividad] = useState(ACTIVIDAD_INICIAL)
  const [motivoCierre, setMotivoCierre] = useState('')
  const [motivoReapertura, setMotivoReapertura] = useState('')
  const [enviando, setEnviando] = useState('')

  useEffect(() => {
    const control = new AbortController()

    obtenerExpediente(id, { signal: control.signal })
      .then((datos) => {
        setExpediente(datos)
        setErrorCarga(null)
      })
      .catch((fallo) => {
        if (fallo.name === 'AbortError') return
        setErrorCarga(fallo)
      })
      .finally(() => {
        if (!control.signal.aborted) setCargando(false)
      })

    return () => control.abort()
  }, [id, intento])

  async function registrarActividad(evento) {
    evento.preventDefault()

    const descripcion = actividad.descripcion.trim()
    if (!descripcion) {
      setErrores({ descripcion: 'Describe la actividad realizada.' })
      setErrorAccion('Revisa los campos marcados antes de continuar.')
      return
    }

    setEnviando('actividad')
    setErrorAccion('')
    setErrores({})

    try {
      const tipoActividad = actividad.tipoActividad.trim()
      await crearActividad(id, {
        descripcion,
        ...(tipoActividad ? { tipoActividad } : {}),
      })

      const actualizado = await obtenerExpediente(id)
      setExpediente(actualizado)
      setActividad(ACTIVIDAD_INICIAL)
      setMensaje('Actividad registrada correctamente.')
    } catch (fallo) {
      setErrorAccion(fallo.mensaje)
      setErrores(fallo.errores ?? {})
    } finally {
      setEnviando('')
    }
  }

  async function ejecutarCambioEstado(nuevoEstado, motivo) {
    setEnviando('estado')
    setErrorAccion('')
    setErrores({})

    try {
      await cambiarEstadoApi(id, {
        nuevoEstado,
        ...(motivo ? { motivoCierre: motivo } : {}),
      })

      const actualizado = await obtenerExpediente(id)
      setExpediente(actualizado)
      setMotivoCierre('')
      setMensaje(
        nuevoEstado === ESTADOS.CERRADO
          ? 'Expediente cerrado correctamente.'
          : 'El expediente ahora está En seguimiento.',
      )
    } catch (fallo) {
      setErrorAccion(fallo.mensaje)
      setErrores(fallo.errores ?? {})
    } finally {
      setEnviando('')
    }
  }

  function cerrarExpediente(evento) {
    evento.preventDefault()

    const motivo = motivoCierre.trim()
    if (!motivo) {
      setErrores({ motivoCierre: 'Escribe el motivo de cierre.' })
      setErrorAccion('Revisa los campos marcados antes de continuar.')
      return
    }

    ejecutarCambioEstado(ESTADOS.CERRADO, motivo)
  }

  async function reabrir(evento) {
    evento.preventDefault()

    const motivo = motivoReapertura.trim()
    if (!motivo) {
      setErrores({ motivo: 'Escribe el motivo de la reapertura.' })
      setErrorAccion('Revisa los campos marcados antes de continuar.')
      return
    }

    setEnviando('reabrir')
    setErrorAccion('')
    setErrores({})

    try {
      const actualizado = await reabrirExpedienteApi(id, motivo)
      setExpediente(actualizado)
      setMotivoReapertura('')
      setErrores({})
      setMensaje('Expediente reabierto correctamente. Ahora está En seguimiento.')
    } catch (fallo) {
      setErrorAccion(fallo.mensaje)
      setErrores(fallo.errores ?? {})
    } finally {
      setEnviando('')
    }
  }

  if (cargando) {
    return <p className="cargando">Cargando expediente…</p>
  }

  if (errorCarga) {
    const noEncontrado = errorCarga.status === 404

    return (
      <div className="tarjeta vacio">
        <h1>{noEncontrado ? 'Expediente no encontrado' : 'No se pudo cargar el expediente'}</h1>
        <p>
          {noEncontrado
            ? `No existe un expediente con el identificador ${id}.`
            : errorCarga.mensaje}
        </p>
        {noEncontrado ? (
          <Link className="boton boton--primario" to="/expedientes">
            Volver al listado
          </Link>
        ) : (
          <button
            type="button"
            className="boton boton--primario"
            onClick={() => {
              setCargando(true)
              setErrorCarga(null)
              setIntento((numero) => numero + 1)
            }}
          >
            Reintentar
          </button>
        )}
      </div>
    )
  }

  if (!expediente) return null

  const cerrado = estaCerrado(expediente.estado)
  const abierto = estaAbierto(expediente.estado)
  const enSeguimiento = estaEnSeguimiento(expediente.estado)

  const tieneActividad = hayActividadDesdeUltimaReapertura(expediente.historial)
  const huboReapertura = indiceUltimaReapertura(expediente.historial) >= 0

  const cierreEnHistorial = [...expediente.historial]
    .reverse()
    .find(
      (entrada) =>
        clasificarTipoHistorial(entrada.tipo) === 'cambio' &&
        String(entrada.estadoNuevo ?? '').toLowerCase() === 'cerrado',
    )

  const ultimoCierre = expediente.cierres.at(-1)

  const fechaApertura =
    expediente.fechaApertura ||
    expediente.historial.find(
      (entrada) => clasificarTipoHistorial(entrada.tipo) === 'apertura',
    )?.fecha

  const fechaCierre =
    expediente.fechaCierre || ultimoCierre?.fechaCierre || cierreEnHistorial?.fecha
  const motivoCierreMostrado =
    expediente.motivoCierre || ultimoCierre?.motivoCierre || cierreEnHistorial?.motivo

  const errorDescripcionActividad = errorDeCampo(errores, 'descripcion')
  const errorTipoActividad = errorDeCampo(errores, 'tipoActividad')
  const errorMotivoCierre = errorDeCampo(errores, 'motivoCierre')
  const errorMotivoReapertura = errorDeCampo(errores, 'motivo')

  return (
    <section>
      <Link className="volver" to="/expedientes">
        ← Volver al listado
      </Link>

      <div className="detalle__encabezado">
        <div>
          <p className="detalle__etiqueta">Expediente</p>
          <h1>{expediente.id || id}</h1>
          <p className="texto-suave">
            {expediente.solicitante || 'Persona sin nombre'} · Responsable:{' '}
            {expediente.responsable || 'sin asignar'}
          </p>
        </div>
        <EstadoBadge estado={expediente.estado} />
      </div>

      <section className="tarjeta" aria-labelledby="datos-expediente">
        <h2 id="datos-expediente">Datos del expediente</h2>
        <dl className="datos">
          <div>
            <dt>Solicitante</dt>
            <dd>{expediente.solicitante || '—'}</dd>
          </div>
          <div>
            <dt>Responsable</dt>
            <dd>{expediente.responsable || '—'}</dd>
          </div>
          <div>
            <dt>Categoría</dt>
            <dd>{expediente.categoria || 'Sin categoría'}</dd>
          </div>
          <div>
            <dt>Apertura</dt>
            <dd>{formatearFechaHora(fechaApertura)}</dd>
          </div>
          <div className="datos__ancho">
            <dt>Descripción</dt>
            <dd>{expediente.descripcion || '—'}</dd>
          </div>
          {cerrado && (
            <>
              <div>
                <dt>Cierre</dt>
                <dd>{formatearFechaHora(fechaCierre)}</dd>
              </div>
              <div className="datos__ancho">
                <dt>Motivo de cierre</dt>
                <dd>{motivoCierreMostrado || '—'}</dd>
              </div>
            </>
          )}
        </dl>
      </section>

      <div className="detalle__columnas">
        <section className="tarjeta" aria-labelledby="historial-expediente">
          <h2 id="historial-expediente">Historial</h2>
          <p className="texto-suave">Movimientos en orden cronológico.</p>
          <HistorialTimeline entradas={expediente.historial} />
        </section>

        <div className="detalle__acciones">
          {mensaje && (
            <Alerta tipo="exito" onCerrar={() => setMensaje('')}>
              {mensaje}
            </Alerta>
          )}

          {errorAccion && (
            <Alerta tipo="error" onCerrar={() => setErrorAccion('')}>
              {errorAccion}
            </Alerta>
          )}

          {cerrado && (
            <>
              <section className="tarjeta" aria-labelledby="expediente-cerrado">
                <h2 id="expediente-cerrado">Expediente cerrado</h2>
                <p className="texto-suave">
                  El expediente sigue disponible para consulta, pero no admite nuevas
                  actividades ni cambios de estado.
                </p>
                <dl className="datos">
                  <div>
                    <dt>Cierre vigente</dt>
                    <dd>{formatearFechaHora(fechaCierre)}</dd>
                  </div>
                  <div className="datos__ancho">
                    <dt>Motivo de cierre</dt>
                    <dd>{motivoCierreMostrado || '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="tarjeta" aria-labelledby="reabrir-expediente">
                <h2 id="reabrir-expediente">Reabrir expediente</h2>
                <form className="formulario" onSubmit={reabrir} noValidate>
                  <Campo
                    id="motivo-reapertura"
                    etiqueta="Motivo de la reapertura"
                    requerido
                    error={errorMotivoReapertura}
                    ayuda="Explica por qué se retoma el caso. El cierre anterior se conservará."
                  >
                    <textarea
                      id="motivo-reapertura"
                      value={motivoReapertura}
                      onChange={(evento) => setMotivoReapertura(evento.target.value)}
                      maxLength={500}
                      aria-invalid={Boolean(errorMotivoReapertura)}
                      aria-describedby={
                        errorMotivoReapertura ? 'motivo-reapertura-error' : undefined
                      }
                    />
                  </Campo>

                  <div className="formulario__acciones">
                    <button
                      type="submit"
                      className="boton boton--primario"
                      disabled={enviando === 'reabrir'}
                    >
                      {enviando === 'reabrir' ? 'Reabriendo…' : 'Reabrir expediente'}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}

          {!cerrado && (
            <>
              <section className="tarjeta" aria-labelledby="registrar-actividad">
                <h2 id="registrar-actividad">Registrar actividad</h2>
                <form className="formulario" onSubmit={registrarActividad} noValidate>
                  <Campo
                    id="descripcion-actividad"
                    etiqueta="Descripción"
                    requerido
                    error={errorDescripcionActividad}
                  >
                    <textarea
                      id="descripcion-actividad"
                      value={actividad.descripcion}
                      onChange={(evento) =>
                        setActividad((actual) => ({
                          ...actual,
                          descripcion: evento.target.value,
                        }))
                      }
                      maxLength={500}
                      aria-invalid={Boolean(errorDescripcionActividad)}
                      aria-describedby={
                        errorDescripcionActividad ? 'descripcion-actividad-error' : undefined
                      }
                    />
                  </Campo>

                  <Campo
                    id="tipo-actividad"
                    etiqueta="Tipo de actividad (opcional)"
                    error={errorTipoActividad}
                    ayuda="Puedes escribir uno o elegir una sugerencia."
                  >
                    <input
                      id="tipo-actividad"
                      type="text"
                      list="tipos-actividad"
                      value={actividad.tipoActividad}
                      onChange={(evento) =>
                        setActividad((actual) => ({
                          ...actual,
                          tipoActividad: evento.target.value,
                        }))
                      }
                      maxLength={50}
                      autoComplete="off"
                      aria-invalid={Boolean(errorTipoActividad)}
                      aria-describedby={errorTipoActividad ? 'tipo-actividad-error' : undefined}
                    />
                    <datalist id="tipos-actividad">
                      {TIPOS_ACTIVIDAD.map((tipo) => (
                        <option key={tipo} value={tipo} />
                      ))}
                    </datalist>
                  </Campo>

                  <div className="formulario__acciones">
                    <button
                      type="submit"
                      className="boton boton--primario"
                      disabled={enviando === 'actividad'}
                    >
                      {enviando === 'actividad' ? 'Guardando…' : 'Agregar actividad'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="tarjeta" aria-labelledby="cambiar-estado">
                <h2 id="cambiar-estado">Cambiar estado</h2>

                {abierto && (
                  <>
                    <p className="texto-suave">
                      El expediente está Abierto. Para cerrarlo, primero debes pasarlo a
                      En seguimiento.
                    </p>
                    <button
                      type="button"
                      className="boton boton--primario"
                      onClick={() => ejecutarCambioEstado(ESTADOS.EN_SEGUIMIENTO)}
                      disabled={enviando === 'estado'}
                    >
                      {enviando === 'estado' ? 'Actualizando…' : 'Pasar a En seguimiento'}
                    </button>
                  </>
                )}

                {enSeguimiento && (
                  <form className="formulario" onSubmit={cerrarExpediente} noValidate>
                    <p className="texto-suave">
                      Para cerrar el expediente debe existir al menos una actividad
                      registrada y debes indicar un motivo de cierre.
                    </p>

                    {!tieneActividad && (
                      <Alerta tipo="info">
                        {huboReapertura
                          ? 'Para cerrar de nuevo el expediente, registra una actividad después de la reapertura.'
                          : 'Aún no hay actividades registradas. Agrega una antes de cerrar el expediente.'}
                      </Alerta>
                    )}

                    <Campo
                      id="motivo-cierre"
                      etiqueta="Motivo de cierre"
                      requerido
                      error={errorMotivoCierre}
                    >
                      <textarea
                        id="motivo-cierre"
                        value={motivoCierre}
                        onChange={(evento) => setMotivoCierre(evento.target.value)}
                        maxLength={500}
                        aria-invalid={Boolean(errorMotivoCierre)}
                        aria-describedby={
                          errorMotivoCierre ? 'motivo-cierre-error' : undefined
                        }
                      />
                    </Campo>

                    <div className="formulario__acciones">
                      <button
                        type="submit"
                        className="boton boton--peligro"
                        disabled={enviando === 'estado' || !tieneActividad}
                      >
                        {enviando === 'estado' ? 'Cerrando…' : 'Cerrar expediente'}
                      </button>
                    </div>
                  </form>
                )}

                {!abierto && !enSeguimiento && (
                  <p className="texto-suave">
                    El estado actual no permite acciones desde esta pantalla.
                  </p>
                )}
              </section>
            </>
          )}

          {expediente.cierres.length > 0 && (
            <section className="tarjeta" aria-labelledby="cierres-expediente">
              <h2 id="cierres-expediente">Cierres y reaperturas</h2>
              <p className="texto-suave">Se conservan todos los cierres del expediente.</p>
              <ol className="cierres">
                {expediente.cierres.map((cierre) => (
                  <li
                    className="cierres__item"
                    key={`${cierre.numero}-${cierre.fechaCierre}`}
                  >
                    <div className="cierres__cabecera">
                      <span className="cierres__numero">Cierre #{cierre.numero}</span>
                      <span className="cierres__fecha">
                        {formatearFechaHora(cierre.fechaCierre)}
                      </span>
                    </div>
                    <p className="cierres__motivo">{cierre.motivoCierre || '—'}</p>
                    {cierre.fechaReapertura && (
                      <p className="cierres__reapertura">
                        Reabierto el {formatearFechaHora(cierre.fechaReapertura)}
                        {cierre.motivoReapertura
                          ? ` — Motivo: ${cierre.motivoReapertura}`
                          : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </section>
  )
}
