import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { crearExpediente } from '../api/expedientes'
import Alerta from '../components/Alerta'
import Campo from '../components/Campo'
import { CATEGORIAS } from '../utils/catalogos'
import { errorDeCampo } from '../utils/errores'

const DATOS_INICIALES = {
  solicitante: '',
  descripcion: '',
  responsable: '',
  categoria: '',
}

export default function NuevoExpediente() {
  const navigate = useNavigate()
  const [datos, setDatos] = useState(DATOS_INICIALES)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const errorSolicitante = errorDeCampo(errores, 'solicitante')
  const errorDescripcion = errorDeCampo(errores, 'descripcion')
  const errorResponsable = errorDeCampo(errores, 'responsable')

  function actualizar(campo, valor) {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }))
    setErrores((actuales) => ({ ...actuales, [campo]: '' }))
  }

  function validar() {
    const encontrados = {}
    if (!datos.solicitante.trim()) {
      encontrados.solicitante = 'Escribe el nombre o alias del solicitante.'
    }
    if (!datos.descripcion.trim()) {
      encontrados.descripcion = 'Describe brevemente el asunto.'
    }
    if (!datos.responsable.trim()) {
      encontrados.responsable = 'Escribe el nombre del responsable.'
    }
    return encontrados
  }

  async function enviar(evento) {
    evento.preventDefault()

    const encontrados = validar()
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      setError('Revisa los campos marcados antes de continuar.')
      return
    }

    setEnviando(true)
    setError('')
    setErrores({})

    try {
      const creado = await crearExpediente({
        solicitante: datos.solicitante.trim(),
        descripcion: datos.descripcion.trim(),
        responsable: datos.responsable.trim(),
        ...(datos.categoria ? { categoria: datos.categoria } : {}),
      })

      if (creado.id) {
        navigate(`/expedientes/${creado.id}`, {
          replace: true,
          state: { mensaje: 'Expediente creado correctamente.' },
        })
      } else {
        navigate('/expedientes', { replace: true })
      }
    } catch (fallo) {
      setError(fallo.mensaje)
      setErrores(fallo.errores ?? {})
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <div className="pagina__encabezado">
        <div>
          <h1>Nuevo expediente</h1>
          <p>
            Registra la apertura con los tres datos obligatorios. El identificador, la
            fecha y hora, y el estado <strong>Abierto</strong> se generan automáticamente.
          </p>
        </div>
      </div>

      <div className="tarjeta tarjeta--angosta">
        <form className="formulario" onSubmit={enviar} noValidate>
          {error && <Alerta tipo="error">{error}</Alerta>}

          <Campo
            id="solicitante"
            etiqueta="Solicitante"
            requerido
            error={errorSolicitante}
            ayuda="Nombre ficticio o alias. No uses datos personales reales."
          >
            <input
              id="solicitante"
              type="text"
              value={datos.solicitante}
              onChange={(evento) => actualizar('solicitante', evento.target.value)}
              maxLength={100}
              autoComplete="off"
              aria-invalid={Boolean(errorSolicitante)}
              aria-describedby={errorSolicitante ? 'solicitante-error' : undefined}
            />
          </Campo>

          <Campo
            id="descripcion"
            etiqueta="Descripción del asunto"
            requerido
            error={errorDescripcion}
            ayuda="Resumen breve del caso. Evita información personal sensible."
          >
            <textarea
              id="descripcion"
              value={datos.descripcion}
              onChange={(evento) => actualizar('descripcion', evento.target.value)}
              maxLength={500}
              aria-invalid={Boolean(errorDescripcion)}
              aria-describedby={errorDescripcion ? 'descripcion-error' : undefined}
            />
          </Campo>

          <Campo
            id="responsable"
            etiqueta="Responsable"
            requerido
            error={errorResponsable}
            ayuda="Nombre de la persona del bufete que atenderá el expediente."
          >
            <input
              id="responsable"
              type="text"
              value={datos.responsable}
              onChange={(evento) => actualizar('responsable', evento.target.value)}
              maxLength={100}
              autoComplete="off"
              aria-invalid={Boolean(errorResponsable)}
              aria-describedby={errorResponsable ? 'responsable-error' : undefined}
            />
          </Campo>

          <Campo
            id="categoria"
            etiqueta="Categoría (opcional)"
            ayuda="Si no aplica, deja la opción Sin categoría."
          >
            <select
              id="categoria"
              value={datos.categoria}
              onChange={(evento) => actualizar('categoria', evento.target.value)}
            >
              <option value="">Sin categoría</option>
              {CATEGORIAS.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </Campo>

          <div className="formulario__acciones">
            <Link className="boton boton--secundario" to="/expedientes">
              Cancelar
            </Link>
            <button type="submit" className="boton boton--primario" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Abrir expediente'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
