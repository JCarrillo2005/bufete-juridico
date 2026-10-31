import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { listarExpedientes } from '../api/expedientes'
import Alerta from '../components/Alerta'
import EncabezadoPagina from '../components/EncabezadoPagina'
import EstadoBadge from '../components/EstadoBadge'
import Esqueleto from '../components/Esqueleto'
import Icono from '../components/Icono'
import useDebounce from '../hooks/useDebounce'
import {
  OPCIONES_FILTRO_ESTADO,
  estaAbierto,
  estaCerrado,
  estaEnSeguimiento,
} from '../utils/catalogos'
import { formatearFecha } from '../utils/formatos'

const FILAS_ESQUELETO = 5

export default function ListadoExpedientes() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()

  // La URL es la fuente de verdad de los filtros (sobreviven a recarga y a "atrás").
  const busquedaUrl = params.get('busqueda') ?? ''
  const estado = params.get('estado') ?? ''

  const [busqueda, setBusqueda] = useState(busquedaUrl)
  const [urlPrevia, setUrlPrevia] = useState(busquedaUrl)
  const [intento, setIntento] = useState(0)
  const [mensaje, setMensaje] = useState(location.state?.mensaje ?? '')
  const [resultado, setResultado] = useState({ clave: null, expedientes: [], error: '' })
  const refError = useRef(null)

  const busquedaDiferida = useDebounce(busqueda, 350)

  // URL → campo: si la URL cambió por navegación (atrás/adelante), reflejarlo en el input.
  if (busquedaUrl !== urlPrevia) {
    setUrlPrevia(busquedaUrl)
    if (busquedaUrl !== busquedaDiferida.trim()) setBusqueda(busquedaUrl)
  }

  // Campo → URL: tras el debounce de 350 ms, escribir la búsqueda en la URL.
  useEffect(() => {
    if (busquedaDiferida !== busqueda) return
    const termino = busqueda.trim()
    if (termino === busquedaUrl) return

    const siguiente = new URLSearchParams(params)
    if (termino) siguiente.set('busqueda', termino)
    else siguiente.delete('busqueda')
    setParams(siguiente, { replace: true })
  }, [busqueda, busquedaDiferida, busquedaUrl, params, setParams])

  // Carga: la consulta vigente se identifica con una clave; mientras no coincida, "cargando".
  const clave = `${busquedaUrl}|${estado}|${intento}`

  useEffect(() => {
    const control = new AbortController()

    listarExpedientes({ busqueda: busquedaUrl, estado }, { signal: control.signal })
      .then((datos) => setResultado({ clave, expedientes: datos, error: '' }))
      .catch((fallo) => {
        if (fallo.name === 'AbortError') return
        setResultado({ clave, expedientes: [], error: fallo.mensaje })
      })

    return () => control.abort()
  }, [busquedaUrl, estado, intento, clave])

  const cargando = resultado.clave !== clave
  const error = cargando ? '' : resultado.error
  const expedientes = resultado.expedientes
  const total = expedientes.length
  const hayFiltros = busquedaUrl !== '' || estado !== ''
  const etiquetaEstado =
    OPCIONES_FILTRO_ESTADO.find((opcion) => opcion.valor === estado)?.etiqueta ?? estado

  useEffect(() => {
    if (error) refError.current?.focus()
  }, [error])

  function cambiarParametros(cambios, opciones) {
    const siguiente = new URLSearchParams(params)
    Object.entries(cambios).forEach(([nombre, valor]) => {
      if (valor) siguiente.set(nombre, valor)
      else siguiente.delete(nombre)
    })
    setParams(siguiente, opciones)
  }

  function quitarBusqueda() {
    setBusqueda('')
    cambiarParametros({ busqueda: '' }, { replace: true })
  }

  function limpiarFiltros() {
    setBusqueda('')
    setParams(new URLSearchParams())
  }

  let textoConteo = 'Cargando expedientes…'
  if (!cargando && !error) {
    textoConteo =
      total === 0
        ? 'Sin resultados'
        : `${total} ${total === 1 ? 'expediente encontrado' : 'expedientes encontrados'}`
  }
  if (error) textoConteo = ''

  const conteos = [
    { etiqueta: 'Abiertos', cantidad: expedientes.filter((e) => estaAbierto(e.estado)).length },
    {
      etiqueta: 'En seguimiento',
      cantidad: expedientes.filter((e) => estaEnSeguimiento(e.estado)).length,
    },
    { etiqueta: 'Cerrados', cantidad: expedientes.filter((e) => estaCerrado(e.estado)).length },
  ]

  return (
    <section>
      <EncabezadoPagina
        eyebrow="Gestión"
        titulo="Expedientes"
        descripcion="Consulta los expedientes del bufete, busca por identificador o persona y abre su historial completo."
        acciones={
          <Link className="boton boton--primario" to="/expedientes/nuevo">
            <Icono nombre="mas" tamano={18} />
            Nuevo expediente
          </Link>
        }
      />

      {mensaje && (
        <div style={{ marginBottom: 'var(--e-4)' }}>
          <Alerta tipo="exito" onCerrar={() => setMensaje('')}>
            {mensaje}
          </Alerta>
        </div>
      )}

      <div className="tarjeta">
        <div className="filtros" role="search" aria-label="Filtrar expedientes">
          <div className="campo">
            <label htmlFor="busqueda">Buscar</label>
            <div className="buscador">
              <Icono nombre="buscar" tamano={18} />
              <input
                id="busqueda"
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Identificador o nombre/alias"
                autoComplete="off"
              />
              {busqueda && (
                <button
                  type="button"
                  className="buscador__limpiar"
                  onClick={quitarBusqueda}
                  aria-label="Borrar búsqueda"
                >
                  <Icono nombre="cerrar" tamano={18} />
                </button>
              )}
            </div>
          </div>

          <div className="campo">
            <label htmlFor="estado">Estado</label>
            <select
              id="estado"
              value={estado}
              onChange={(evento) => cambiarParametros({ estado: evento.target.value })}
            >
              {OPCIONES_FILTRO_ESTADO.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hayFiltros && (
          <div className="filtros-activos">
            <span className="filtros-activos__etiqueta">Filtros activos:</span>
            {busquedaUrl && (
              <span className="chip chip--filtro">
                Búsqueda: {busquedaUrl}
                <button
                  type="button"
                  className="chip__quitar"
                  onClick={quitarBusqueda}
                  aria-label={`Quitar filtro de búsqueda: ${busquedaUrl}`}
                >
                  <Icono nombre="cerrar" tamano={14} />
                </button>
              </span>
            )}
            {estado && (
              <span className="chip chip--filtro">
                Estado: {etiquetaEstado}
                <button
                  type="button"
                  className="chip__quitar"
                  onClick={() => cambiarParametros({ estado: '' })}
                  aria-label={`Quitar filtro de estado: ${etiquetaEstado}`}
                >
                  <Icono nombre="cerrar" tamano={14} />
                </button>
              </span>
            )}
            <button type="button" className="boton boton--fantasma boton--pequeno" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        )}

        <div className="resultado">
          <p className="resultado__conteo" aria-live="polite">
            {textoConteo}
          </p>
          {!cargando && !error && total > 0 && (
            <ul className="resultado__vista" aria-label="Estados en esta vista">
              {conteos.map((conteo) => (
                <li className="chip" key={conteo.etiqueta}>
                  {conteo.etiqueta}: {conteo.cantidad} (en esta vista)
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <Alerta ref={refError} tipo="error" titulo="No se pudo cargar el listado">
            <p>{error}</p>
            <button
              type="button"
              className="boton boton--secundario boton--pequeno"
              onClick={() => setIntento((numero) => numero + 1)}
            >
              <Icono nombre="reabrir" tamano={16} />
              Reintentar
            </button>
          </Alerta>
        )}

        {!cargando && !error && total === 0 && (
          <div className="vacio">
            <span className="vacio__icono" aria-hidden="true">
              <Icono nombre={hayFiltros ? 'buscar' : 'carpeta'} tamano={28} />
            </span>
            <h2>Sin resultados</h2>
            <p>
              {hayFiltros
                ? 'No hay expedientes que coincidan con la búsqueda o el estado seleccionado. Prueba con otro término o quita los filtros.'
                : 'Aún no se ha registrado ningún expediente. Abre el primero para comenzar.'}
            </p>
            {hayFiltros ? (
              <button type="button" className="boton boton--secundario" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            ) : (
              <Link className="boton boton--primario" to="/expedientes/nuevo">
                <Icono nombre="mas" tamano={18} />
                Nuevo expediente
              </Link>
            )}
          </div>
        )}

        {!error && (cargando || total > 0) && (
          <table className="tabla" aria-busy={cargando}>
            <caption className="visualmente-oculto">Listado de expedientes</caption>
            <thead>
              <tr>
                <th scope="col">Expediente</th>
                <th scope="col">Persona</th>
                <th scope="col">Responsable</th>
                <th scope="col">Estado</th>
                <th scope="col">Apertura</th>
                <th scope="col">
                  <span className="visualmente-oculto">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando &&
                Array.from({ length: FILAS_ESQUELETO }, (_, indice) => (
                  <tr key={indice}>
                    <td data-etiqueta="Expediente">
                      <Esqueleto ancho="5rem" />
                    </td>
                    <td data-etiqueta="Persona">
                      <Esqueleto ancho="9rem" />
                    </td>
                    <td data-etiqueta="Responsable">
                      <Esqueleto ancho="8rem" />
                    </td>
                    <td data-etiqueta="Estado">
                      <Esqueleto ancho="6rem" alto="1.4em" />
                    </td>
                    <td data-etiqueta="Apertura">
                      <Esqueleto ancho="5rem" />
                    </td>
                    <td />
                  </tr>
                ))}

              {!cargando &&
                expedientes.map((expediente) => (
                  <tr key={expediente.id}>
                    <td data-etiqueta="Expediente">
                      <Link className="tabla__id" to={`/expedientes/${expediente.id}`}>
                        {expediente.id || '—'}
                      </Link>
                    </td>
                    <td data-etiqueta="Persona">{expediente.solicitante || '—'}</td>
                    <td data-etiqueta="Responsable">{expediente.responsable || '—'}</td>
                    <td data-etiqueta="Estado">
                      <EstadoBadge estado={expediente.estado} />
                    </td>
                    <td data-etiqueta="Apertura">{formatearFecha(expediente.fechaApertura)}</td>
                    <td className="tabla__acciones">
                      <Link
                        className="boton boton--secundario boton--pequeno"
                        to={`/expedientes/${expediente.id}`}
                        aria-label={`Abrir expediente ${expediente.id}`}
                      >
                        Abrir
                        <Icono nombre="abrir" tamano={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
