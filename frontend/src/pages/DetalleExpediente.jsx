import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  cambiarEstado as cambiarEstadoApi,
  crearActividad,
  obtenerExpediente,
  reabrirExpediente as reabrirExpedienteApi,
} from '../api/expedientes'
import Alerta from '../components/Alerta'
import Campo from '../components/Campo'
import Confirmacion from '../components/Confirmacion'
import ContadorCaracteres from '../components/ContadorCaracteres'
import EncabezadoPagina from '../components/EncabezadoPagina'
import EstadoBadge from '../components/EstadoBadge'
import Esqueleto from '../components/Esqueleto'
import HistorialTimeline from '../components/HistorialTimeline'
import Icono from '../components/Icono'
import {
  ESTADOS,
  TIPOS_ACTIVIDAD,
  estaAbierto,
  estaCerrado,
  estaEnSeguimiento,
} from '../utils/catalogos'
import { ariaCampo } from '../utils/accesibilidad'
import { errorDeCampo } from '../utils/errores'
import { formatearFechaHora } from '../utils/formatos'
import {
  clasificarTipoHistorial,
  hayActividadDesdeUltimaReapertura,
  indiceUltimaReapertura,
} from '../utils/historial'

const ACTIVIDAD_INICIAL = { descripcion: '', tipoActividad: '' }
const MAX_DESCRIPCION = 500
const MAX_MOTIVO = 500
const MAX_TIPO = 50

function enfocar(id) {
  document.getElementById(id)?.focus()
}

function Spinner({ activo }) {
  return activo ? <span className="spinner" aria-hidden="true" /> : null
}

export default function DetalleExpediente() {
  const { id } = useParams()
  const location = useLocation()

  const [expediente, setExpediente] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [intento, setIntento] = useState(0)
  const [mensaje, setMensaje] = useState(location.state?.mensaje ?? '')
  const [versionExito, setVersionExito] = useState(0)
  const [errorAccion, setErrorAccion] = useState('')
  const [versionError, setVersionError] = useState(0)
  const [errores, setErrores] = useState({})
  const [actividad, setActividad] = useState(ACTIVIDAD_INICIAL)
  const [motivoCierre, setMotivoCierre] = useState('')
  const [motivoReapertura, setMotivoReapertura] = useState('')
  const [enviando, setEnviando] = useState('')
  const [dialogo, setDialogo] = useState('')

  const refAlertaError = useRef(null)
  const refAlertaExito = useRef(null)

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

  // Errores del servidor: el foco va a la alerta.
  useEffect(() => {
    if (versionError > 0) refAlertaError.current?.focus()
  }, [versionError])

  // Éxito tras una acción: el foco va al aviso (el formulario usado puede haber desaparecido).
  useEffect(() => {
    if (versionExito > 0) refAlertaExito.current?.focus()
  }, [versionExito])

  function avisarExito(texto) {
    setMensaje(texto)
    setVersionExito((numero) => numero + 1)
  }

  function avisarError(fallo) {
    setErrorAccion(fallo.mensaje)
    setErrores(fallo.errores ?? {})
    setVersionError((numero) => numero + 1)
  }

  function rechazarCampo(campo, texto, idCampo) {
    setErrores({ [campo]: texto })
    setErrorAccion('')
    enfocar(idCampo)
  }

  async function registrarActividad(evento) {
    evento.preventDefault()

    const descripcion = actividad.descripcion.trim()
    if (!descripcion) {
      rechazarCampo('descripcion', 'Describe la actividad realizada.', 'descripcion-actividad')
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
      avisarExito('Actividad registrada correctamente.')
    } catch (fallo) {
      avisarError(fallo)
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
      avisarExito(
        nuevoEstado === ESTADOS.CERRADO
          ? 'Expediente cerrado correctamente.'
          : 'El expediente ahora está En seguimiento.',
      )
    } catch (fallo) {
      avisarError(fallo)
    } finally {
      setEnviando('')
    }
  }

  // Cerrar: valida el motivo y pide confirmación antes de enviar.
  function pedirCierre(evento) {
    evento.preventDefault()

    if (!motivoCierre.trim()) {
      rechazarCampo('motivoCierre', 'Escribe el motivo de cierre.', 'motivo-cierre')
      return
    }
    setErrores({})
    setDialogo('cierre')
  }

  function confirmarCierre() {
    setDialogo('')
    ejecutarCambioEstado(ESTADOS.CERRADO, motivoCierre.trim())
  }

  // Reabrir: misma lógica, con confirmación.
  function pedirReapertura(evento) {
    evento.preventDefault()

    if (!motivoReapertura.trim()) {
      rechazarCampo('motivo', 'Escribe el motivo de la reapertura.', 'motivo-reapertura')
      return
    }
    setErrores({})
    setDialogo('reapertura')
  }

  async function confirmarReapertura() {
    setDialogo('')
    setEnviando('reabrir')
    setErrorAccion('')
    setErrores({})

    try {
      const actualizado = await reabrirExpedienteApi(id, motivoReapertura.trim())
      setExpediente(actualizado)
      setMotivoReapertura('')
      avisarExito('Expediente reabierto correctamente. Ahora está En seguimiento.')
    } catch (fallo) {
      avisarError(fallo)
    } finally {
      setEnviando('')
    }
  }

  if (cargando) {
    return (
      <div aria-busy="true">
        <p className="visualmente-oculto" role="status">
          Cargando expediente…
        </p>
        <div className="encabezado-pagina">
          <div style={{ width: '100%' }}>
            <Esqueleto ancho="6rem" />
            <div style={{ margin: 'var(--e-3) 0' }}>
              <Esqueleto ancho="12rem" alto="2rem" />
            </div>
            <Esqueleto ancho="18rem" />
          </div>
        </div>
        <div className="detalle">
          <div className="detalle__lateral">
            <div className="tarjeta">
              <Esqueleto ancho="60%" alto="1.25rem" />
              <div style={{ marginTop: 'var(--e-4)' }}>
                <Esqueleto alto="4rem" />
              </div>
            </div>
          </div>
          <div className="detalle__principal">
            <div className="tarjeta">
              <Esqueleto ancho="40%" alto="1.25rem" />
              <div style={{ marginTop: 'var(--e-4)' }}>
                <Esqueleto alto="6rem" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (errorCarga) {
    const noEncontrado = errorCarga.status === 404

    return (
      <div className="tarjeta vacio">
        <span className="vacio__icono" aria-hidden="true">
          <Icono nombre={noEncontrado ? 'carpeta' : 'alerta'} tamano={28} />
        </span>
        <h1>{noEncontrado ? 'Expediente no encontrado' : 'No se pudo cargar el expediente'}</h1>
        <p>
          {noEncontrado
            ? `No existe un expediente con el identificador ${id}. Revisa el identificador o vuelve al listado.`
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
    expediente.historial.find((entrada) => clasificarTipoHistorial(entrada.tipo) === 'apertura')
      ?.fecha

  const fechaCierre =
    expediente.fechaCierre || ultimoCierre?.fechaCierre || cierreEnHistorial?.fecha
  const motivoCierreMostrado =
    expediente.motivoCierre || ultimoCierre?.motivoCierre || cierreEnHistorial?.motivo

  const errorDescripcionActividad = errorDeCampo(errores, 'descripcion')
  const errorTipoActividad = errorDeCampo(errores, 'tipoActividad')
  const errorMotivoCierre = errorDeCampo(errores, 'motivoCierre')
  const errorMotivoReapertura = errorDeCampo(errores, 'motivo')

  const razonBloqueoCierre = tieneActividad
    ? ''
    : huboReapertura
      ? 'No se puede cerrar todavía: registra una actividad posterior a la última reapertura.'
      : 'No se puede cerrar todavía: registra al menos una actividad.'

  let siguientePaso = ''
  if (abierto) {
    siguientePaso =
      'Siguiente paso permitido: pasar a En seguimiento. Solo desde ese estado podrás cerrar el expediente.'
  } else if (enSeguimiento) {
    siguientePaso = tieneActividad
      ? 'Siguiente paso permitido: cerrar el expediente indicando un motivo. También puedes seguir registrando actividades.'
      : huboReapertura
        ? 'Antes de cerrarlo de nuevo debes registrar una actividad posterior a la reapertura.'
        : 'Antes de cerrarlo debes registrar al menos una actividad.'
  } else if (cerrado) {
    siguientePaso =
      'El expediente sigue disponible para consulta, pero no admite actividades ni cambios de estado. Siguiente paso permitido: reabrirlo indicando un motivo.'
  } else {
    siguientePaso = 'El estado actual no permite acciones desde esta pantalla.'
  }

  let accionPrincipal = null
  if (abierto) {
    accionPrincipal = (
      <button
        type="button"
        className={`boton boton--primario${enviando === 'estado' ? ' boton--cargando' : ''}`}
        onClick={() => ejecutarCambioEstado(ESTADOS.EN_SEGUIMIENTO)}
        disabled={enviando !== ''}
      >
        <Spinner activo={enviando === 'estado'} />
        {enviando === 'estado' ? 'Actualizando…' : 'Pasar a En seguimiento'}
      </button>
    )
  } else if (enSeguimiento && !tieneActividad) {
    accionPrincipal = (
      <button
        type="button"
        className="boton boton--primario"
        onClick={() => enfocar('descripcion-actividad')}
      >
        <Icono nombre="actividad" tamano={18} />
        Registrar actividad
      </button>
    )
  } else if (enSeguimiento) {
    accionPrincipal = (
      <button
        type="button"
        className="boton boton--primario"
        onClick={() => enfocar('motivo-cierre')}
      >
        <Icono nombre="candado" tamano={18} />
        Cerrar expediente
      </button>
    )
  } else if (cerrado) {
    accionPrincipal = (
      <button
        type="button"
        className="boton boton--primario"
        onClick={() => enfocar('motivo-reapertura')}
      >
        <Icono nombre="reabrir" tamano={18} />
        Reabrir expediente
      </button>
    )
  }

  return (
    <section>
      <EncabezadoPagina
        migas={[
          { etiqueta: 'Expedientes', a: '/expedientes' },
          { etiqueta: expediente.id || id },
        ]}
        eyebrow="Expediente"
        titulo={expediente.id || id}
        insignia={<EstadoBadge estado={expediente.estado} />}
        descripcion={`Solicitante: ${expediente.solicitante || 'persona sin nombre'} · Responsable: ${expediente.responsable || 'sin asignar'}`}
        acciones={accionPrincipal}
      />

      <div className="detalle">
        {/* Estado y acciones: primero en el DOM para priorizarlos en móvil */}
        <aside className="detalle__lateral" aria-label="Estado y acciones">
          {mensaje && (
            <Alerta
              ref={refAlertaExito}
              tipo="exito"
              onCerrar={() => setMensaje('')}
            >
              {mensaje}
            </Alerta>
          )}

          {errorAccion && (
            <Alerta
              ref={refAlertaError}
              tipo="error"
              titulo="No se pudo completar la acción"
              onCerrar={() => setErrorAccion('')}
            >
              <p>{errorAccion}</p>
            </Alerta>
          )}

          <section className="tarjeta" aria-labelledby="estado-expediente">
            <div className="panel__titulo">
              <Icono nombre="cambio" />
              <h2 id="estado-expediente">Estado y siguiente paso</h2>
            </div>
            <div className="estado-actual">
              <span className="texto-suave">Estado actual:</span>
              <EstadoBadge estado={expediente.estado} />
            </div>
            <p className="texto-suave" style={{ marginBottom: 0 }}>
              {siguientePaso}
            </p>

            {abierto && (
              <div className="accion-bloque">
                <button
                  type="button"
                  className={`boton boton--primario${enviando === 'estado' ? ' boton--cargando' : ''}`}
                  onClick={() => ejecutarCambioEstado(ESTADOS.EN_SEGUIMIENTO)}
                  disabled={enviando !== ''}
                >
                  <Spinner activo={enviando === 'estado'} />
                  {enviando === 'estado' ? 'Actualizando…' : 'Pasar a En seguimiento'}
                </button>
              </div>
            )}
          </section>

          {!cerrado && (
            <section className="tarjeta" aria-labelledby="registrar-actividad">
              <div className="panel__titulo">
                <Icono nombre="actividad" />
                <h2 id="registrar-actividad">Registrar actividad</h2>
              </div>
              <form className="formulario" onSubmit={registrarActividad} noValidate>
                <Campo
                  id="descripcion-actividad"
                  etiqueta="Descripción"
                  requerido
                  error={errorDescripcionActividad}
                  contador={
                    <ContadorCaracteres
                      id="descripcion-actividad-contador"
                      valor={actividad.descripcion}
                      maximo={MAX_DESCRIPCION}
                    />
                  }
                >
                  <textarea
                    id="descripcion-actividad"
                    value={actividad.descripcion}
                    onChange={(evento) =>
                      setActividad((actual) => ({ ...actual, descripcion: evento.target.value }))
                    }
                    maxLength={MAX_DESCRIPCION}
                    {...ariaCampo('descripcion-actividad', {
                      error: errorDescripcionActividad,
                      contador: true,
                    })}
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
                      setActividad((actual) => ({ ...actual, tipoActividad: evento.target.value }))
                    }
                    maxLength={MAX_TIPO}
                    autoComplete="off"
                    {...ariaCampo('tipo-actividad', {
                      error: errorTipoActividad,
                      ayuda: true,
                    })}
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
                    className={`boton boton--primario${enviando === 'actividad' ? ' boton--cargando' : ''}`}
                    disabled={enviando === 'actividad'}
                  >
                    <Spinner activo={enviando === 'actividad'} />
                    {enviando === 'actividad' ? 'Guardando…' : 'Registrar actividad'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {enSeguimiento && (
            <section className="tarjeta" aria-labelledby="cerrar-expediente">
              <div className="panel__titulo">
                <Icono nombre="candado" />
                <h2 id="cerrar-expediente">Cerrar expediente</h2>
              </div>
              <form className="formulario" onSubmit={pedirCierre} noValidate>
                <p className="texto-suave" style={{ margin: 0 }}>
                  Para cerrar se requiere al menos una actividad (posterior a la última
                  reapertura, si la hubo) y un motivo de cierre.
                </p>

                <Campo
                  id="motivo-cierre"
                  etiqueta="Motivo de cierre"
                  requerido
                  error={errorMotivoCierre}
                  contador={
                    <ContadorCaracteres
                      id="motivo-cierre-contador"
                      valor={motivoCierre}
                      maximo={MAX_MOTIVO}
                    />
                  }
                >
                  <textarea
                    id="motivo-cierre"
                    value={motivoCierre}
                    onChange={(evento) => setMotivoCierre(evento.target.value)}
                    maxLength={MAX_MOTIVO}
                    {...ariaCampo('motivo-cierre', { error: errorMotivoCierre, contador: true })}
                  />
                </Campo>

                {razonBloqueoCierre && (
                  <p className="razon-bloqueo" id="razon-bloqueo-cierre">
                    <Icono nombre="alerta" tamano={18} />
                    <span>{razonBloqueoCierre}</span>
                  </p>
                )}

                <div className="formulario__acciones">
                  <button
                    type="submit"
                    className={`boton boton--peligro${enviando === 'estado' ? ' boton--cargando' : ''}`}
                    disabled={enviando === 'estado' || !tieneActividad}
                    aria-describedby={razonBloqueoCierre ? 'razon-bloqueo-cierre' : undefined}
                  >
                    <Spinner activo={enviando === 'estado'} />
                    {enviando === 'estado' ? 'Cerrando…' : 'Cerrar expediente'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {cerrado && (
            <section className="tarjeta" aria-labelledby="reabrir-expediente">
              <div className="panel__titulo">
                <Icono nombre="reabrir" />
                <h2 id="reabrir-expediente">Reabrir expediente</h2>
              </div>
              <form className="formulario" onSubmit={pedirReapertura} noValidate>
                <Campo
                  id="motivo-reapertura"
                  etiqueta="Motivo de la reapertura"
                  requerido
                  error={errorMotivoReapertura}
                  ayuda="Explica por qué se retoma el caso. El cierre anterior se conservará."
                  contador={
                    <ContadorCaracteres
                      id="motivo-reapertura-contador"
                      valor={motivoReapertura}
                      maximo={MAX_MOTIVO}
                    />
                  }
                >
                  <textarea
                    id="motivo-reapertura"
                    value={motivoReapertura}
                    onChange={(evento) => setMotivoReapertura(evento.target.value)}
                    maxLength={MAX_MOTIVO}
                    {...ariaCampo('motivo-reapertura', {
                      error: errorMotivoReapertura,
                      ayuda: true,
                      contador: true,
                    })}
                  />
                </Campo>

                <div className="formulario__acciones">
                  <button
                    type="submit"
                    className={`boton boton--primario${enviando === 'reabrir' ? ' boton--cargando' : ''}`}
                    disabled={enviando === 'reabrir'}
                  >
                    <Spinner activo={enviando === 'reabrir'} />
                    {enviando === 'reabrir' ? 'Reabriendo…' : 'Reabrir expediente'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {expediente.cierres.length > 0 && (
            <section className="tarjeta" aria-labelledby="cierres-expediente">
              <div className="panel__titulo">
                <Icono nombre="candado" />
                <h2 id="cierres-expediente">Cierres y reaperturas</h2>
              </div>
              <p className="texto-suave">Se conservan todos los cierres del expediente.</p>
              <ol className="cierres">
                {expediente.cierres.map((cierre) => {
                  const vigente = cerrado && !cierre.fechaReapertura

                  return (
                    <li
                      className={`cierres__item${vigente ? ' cierres__item--vigente' : ''}`}
                      key={`${cierre.numero}-${cierre.fechaCierre}`}
                    >
                      <div className="cierres__cabecera">
                        <span className="cierres__numero">Cierre n.º {cierre.numero}</span>
                        {vigente && <span className="chip">Cierre vigente</span>}
                      </div>
                      <p className="cierres__fecha">{formatearFechaHora(cierre.fechaCierre)}</p>
                      <p className="cierres__motivo">{cierre.motivoCierre || '—'}</p>
                      {cierre.fechaReapertura && (
                        <p className="cierres__reapertura">
                          <Icono nombre="reabrir" tamano={16} />
                          <span>
                            Reabierto el {formatearFechaHora(cierre.fechaReapertura)}
                            {cierre.motivoReapertura
                              ? `. Motivo: ${cierre.motivoReapertura}`
                              : ''}
                          </span>
                        </p>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
        </aside>

        <div className="detalle__principal">
          <dl className="franja" aria-label="Datos rápidos">
            <div>
              <dt>
                <Icono nombre="etiqueta" tamano={14} />
                Categoría
              </dt>
              <dd>{expediente.categoria || 'Sin categoría'}</dd>
            </div>
            <div>
              <dt>
                <Icono nombre="calendario" tamano={14} />
                Apertura
              </dt>
              <dd>{formatearFechaHora(fechaApertura)}</dd>
            </div>
            <div>
              <dt>
                <Icono nombre="candado" tamano={14} />
                Cierre vigente
              </dt>
              <dd>{cerrado ? formatearFechaHora(fechaCierre) : 'Sin cierre vigente'}</dd>
            </div>
            <div>
              <dt>
                <Icono nombre="usuario" tamano={14} />
                Responsable
              </dt>
              <dd>{expediente.responsable || 'Sin asignar'}</dd>
            </div>
          </dl>

          <section className="tarjeta" aria-labelledby="descripcion-expediente">
            <div className="panel__titulo">
              <Icono nombre="carpeta" />
              <h2 id="descripcion-expediente">Descripción del asunto</h2>
            </div>
            <p className="descripcion">{expediente.descripcion || '—'}</p>
            {cerrado && (
              <dl className="datos accion-bloque">
                <div>
                  <dt>Motivo de cierre</dt>
                  <dd>{motivoCierreMostrado || '—'}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="tarjeta" aria-labelledby="historial-expediente">
            <div className="panel__titulo">
              <Icono nombre="reloj" />
              <h2 id="historial-expediente">Historial</h2>
            </div>
            <p className="texto-suave">Movimientos en orden cronológico.</p>
            <HistorialTimeline entradas={expediente.historial} />
          </section>
        </div>
      </div>

      <Confirmacion
        abierto={dialogo === 'cierre'}
        titulo={`¿Cerrar el expediente ${expediente.id || id}?`}
        textoConfirmar="Cerrar expediente"
        variante="peligro"
        onConfirmar={confirmarCierre}
        onCancelar={() => setDialogo('')}
      >
        <p>Al cerrar, el expediente dejará de admitir actividades hasta que se reabra.</p>
        <p className="dialogo__cita">
          <strong>Motivo:</strong> {motivoCierre.trim()}
        </p>
      </Confirmacion>

      <Confirmacion
        abierto={dialogo === 'reapertura'}
        titulo={`¿Reabrir el expediente ${expediente.id || id}?`}
        textoConfirmar="Reabrir expediente"
        onConfirmar={confirmarReapertura}
        onCancelar={() => setDialogo('')}
      >
        <p>
          Al reabrir, el expediente volverá a En seguimiento y deberás registrar una nueva
          actividad antes de cerrarlo otra vez. El cierre anterior se conserva en el historial.
        </p>
        <p className="dialogo__cita">
          <strong>Motivo:</strong> {motivoReapertura.trim()}
        </p>
      </Confirmacion>
    </section>
  )
}
