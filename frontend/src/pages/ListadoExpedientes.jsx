import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listarExpedientes } from '../api/expedientes'
import Alerta from '../components/Alerta'
import EstadoBadge from '../components/EstadoBadge'
import useDebounce from '../hooks/useDebounce'
import { OPCIONES_FILTRO_ESTADO } from '../utils/catalogos'
import { formatearFecha } from '../utils/formatos'

export default function ListadoExpedientes() {
  const location = useLocation()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [expedientes, setExpedientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [mensaje, setMensaje] = useState(location.state?.mensaje ?? '')

  const busquedaDiferida = useDebounce(busqueda, 350)

  useEffect(() => {
    const control = new AbortController()

    listarExpedientes(
      { busqueda: busquedaDiferida, estado },
      { signal: control.signal },
    )
      .then((datos) => {
        setExpedientes(datos)
        setError('')
      })
      .catch((fallo) => {
        if (fallo.name === 'AbortError') return
        setExpedientes([])
        setError(fallo.mensaje)
      })
      .finally(() => {
        if (!control.signal.aborted) setCargando(false)
      })

    return () => control.abort()
  }, [busquedaDiferida, estado, intento])

  const hayFiltros = busqueda.trim() !== '' || estado !== ''
  const total = expedientes.length

  function limpiarFiltros() {
    setCargando(true)
    setBusqueda('')
    setEstado('')
  }

  return (
    <section>
      <div className="pagina__encabezado">
        <div>
          <h1>Expedientes</h1>
          <p>
            Consulta los expedientes del bufete, busca por identificador o persona y abre
            su historial completo.
          </p>
        </div>
        <Link className="boton boton--primario" to="/expedientes/nuevo">
          Nuevo expediente
        </Link>
      </div>

      {mensaje && (
        <Alerta tipo="exito" onCerrar={() => setMensaje('')}>
          {mensaje}
        </Alerta>
      )}

      <div className="tarjeta">
        <div className="filtros">
          <div className="campo">
            <label htmlFor="busqueda">Buscar</label>
            <input
              id="busqueda"
              type="search"
              value={busqueda}
              onChange={(evento) => {
                setCargando(true)
                setBusqueda(evento.target.value)
              }}
              placeholder="Identificador o nombre/alias"
              autoComplete="off"
            />
          </div>

          <div className="campo">
            <label htmlFor="estado">Estado</label>
            <select
              id="estado"
              value={estado}
              onChange={(evento) => {
                setCargando(true)
                setEstado(evento.target.value)
              }}
            >
              {OPCIONES_FILTRO_ESTADO.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="boton boton--secundario filtros__limpiar"
            onClick={limpiarFiltros}
            disabled={!hayFiltros}
          >
            Limpiar
          </button>
        </div>

        {error && (
          <Alerta tipo="error" onCerrar={() => setError('')}>
            <span>{error}</span>
            <button
              type="button"
              className="boton--enlace"
              onClick={() => {
                setCargando(true)
                setIntento((numero) => numero + 1)
              }}
            >
              Reintentar
            </button>
          </Alerta>
        )}

        <div className="tabla-contenedor">
          <table className="tabla">
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
              {cargando && (
                <tr className="tabla__vacio">
                  <td colSpan="6">Cargando expedientes…</td>
                </tr>
              )}

              {!cargando && !error && total === 0 && (
                <tr className="tabla__vacio">
                  <td colSpan="6">
                    <strong>Sin resultados</strong>
                    <span>
                      {hayFiltros
                        ? 'No hay expedientes que coincidan con la búsqueda o el estado seleccionado.'
                        : 'Aún no se ha registrado ningún expediente.'}
                    </span>
                  </td>
                </tr>
              )}

              {!cargando &&
                expedientes.map((expediente) => (
                  <tr key={expediente.id}>
                    <td>
                      <Link className="tabla__id" to={`/expedientes/${expediente.id}`}>
                        {expediente.id || '—'}
                      </Link>
                    </td>
                    <td>{expediente.solicitante || '—'}</td>
                    <td>{expediente.responsable || '—'}</td>
                    <td>
                      <EstadoBadge estado={expediente.estado} />
                    </td>
                    <td>{formatearFecha(expediente.fechaApertura)}</td>
                    <td className="tabla__acciones">
                      <Link
                        className="boton boton--secundario boton--pequeno"
                        to={`/expedientes/${expediente.id}`}
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!cargando && !error && total > 0 && (
          <p className="tabla__resumen" aria-live="polite">
            {total} {total === 1 ? 'expediente encontrado' : 'expedientes encontrados'}
          </p>
        )}
      </div>
    </section>
  )
}
