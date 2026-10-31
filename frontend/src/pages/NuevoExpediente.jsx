import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { crearExpediente } from '../api/expedientes'
import Alerta from '../components/Alerta'
import Campo from '../components/Campo'
import ContadorCaracteres from '../components/ContadorCaracteres'
import EncabezadoPagina from '../components/EncabezadoPagina'
import { CATEGORIAS } from '../utils/catalogos'
import { ariaCampo } from '../utils/accesibilidad'
import { errorDeCampo } from '../utils/errores'

const DATOS_INICIALES = {
  solicitante: '',
  descripcion: '',
  responsable: '',
  categoria: '',
}

const OBLIGATORIOS = ['solicitante', 'descripcion', 'responsable']

const ETIQUETAS = {
  solicitante: 'Solicitante',
  descripcion: 'Descripción del asunto',
  responsable: 'Responsable',
}

const MENSAJES = {
  solicitante: 'Escribe el nombre o alias del solicitante.',
  descripcion: 'Describe brevemente el asunto.',
  responsable: 'Escribe el nombre del responsable.',
}

const MAXIMOS = { solicitante: 100, descripcion: 500, responsable: 100 }

export default function NuevoExpediente() {
  const navigate = useNavigate()
  const [datos, setDatos] = useState(DATOS_INICIALES)
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [intentoFallido, setIntentoFallido] = useState(false)
  const [versionResumen, setVersionResumen] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const refResumen = useRef(null)
  const refSolicitante = useRef(null)

  const errorSolicitante = errorDeCampo(errores, 'solicitante')
  const errorDescripcion = errorDeCampo(errores, 'descripcion')
  const errorResponsable = errorDeCampo(errores, 'responsable')

  const erroresVisibles = [
    { campo: 'solicitante', mensaje: errorSolicitante },
    { campo: 'descripcion', mensaje: errorDescripcion },
    { campo: 'responsable', mensaje: errorResponsable },
  ].filter((item) => item.mensaje)

  const mostrarResumen = intentoFallido && (erroresVisibles.length > 0 || errorServidor)

  // Foco inicial en el primer campo, solo en pantallas anchas (evita abrir el teclado en móvil).
  useEffect(() => {
    if (window.matchMedia('(min-width: 721px)').matches) refSolicitante.current?.focus()
  }, [])

  // Foco en el resumen de errores cada vez que se intenta enviar y falla.
  useEffect(() => {
    if (versionResumen > 0) refResumen.current?.focus()
  }, [versionResumen])

  function actualizar(campo, valor) {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }))
    setErrores((actuales) => ({ ...actuales, [campo]: '' }))
  }

  function alSalir(campo) {
    return () => {
      if (!OBLIGATORIOS.includes(campo)) return
      setErrores((actuales) => ({
        ...actuales,
        [campo]: datos[campo].trim() ? '' : MENSAJES[campo],
      }))
    }
  }

  function validar() {
    const encontrados = {}
    OBLIGATORIOS.forEach((campo) => {
      if (!datos[campo].trim()) encontrados[campo] = MENSAJES[campo]
    })
    return encontrados
  }

  function irAlCampo(evento, campo) {
    evento.preventDefault()
    document.getElementById(campo)?.focus()
  }

  async function enviar(evento) {
    evento.preventDefault()

    const encontrados = validar()
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      setErrorServidor('')
      setIntentoFallido(true)
      setVersionResumen((numero) => numero + 1)
      return
    }

    setEnviando(true)
    setErrorServidor('')
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
      setErrorServidor(fallo.mensaje)
      setErrores(fallo.errores ?? {})
      setIntentoFallido(true)
      setVersionResumen((numero) => numero + 1)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <EncabezadoPagina
        migas={[{ etiqueta: 'Expedientes', a: '/expedientes' }, { etiqueta: 'Nuevo expediente' }]}
        eyebrow="Gestión"
        titulo="Nuevo expediente"
        descripcion="Registra la apertura con los tres datos obligatorios. El identificador, la fecha y hora, y el estado Abierto se generan automáticamente."
      />

      <div className="tarjeta tarjeta--angosta">
        <form className="formulario" onSubmit={enviar} noValidate>
          {mostrarResumen && (
            <Alerta
              ref={refResumen}
              tipo="error"
              titulo={errorServidor || 'Revisa los campos marcados antes de continuar.'}
            >
              {erroresVisibles.length > 0 && (
                <ul>
                  {erroresVisibles.map((item) => (
                    <li key={item.campo}>
                      <a href={`#${item.campo}`} onClick={(evento) => irAlCampo(evento, item.campo)}>
                        {ETIQUETAS[item.campo]}
                      </a>
                      : {item.mensaje}
                    </li>
                  ))}
                </ul>
              )}
            </Alerta>
          )}

          <fieldset className="grupo">
            <legend className="grupo__leyenda">Persona solicitante</legend>

            <Campo
              id="solicitante"
              etiqueta="Solicitante"
              requerido
              error={errorSolicitante}
              ayuda="Nombre ficticio o alias. No uses datos personales reales."
              contador={
                <ContadorCaracteres
                  id="solicitante-contador"
                  valor={datos.solicitante}
                  maximo={MAXIMOS.solicitante}
                />
              }
              className="grupo__ancho"
            >
              <input
                ref={refSolicitante}
                id="solicitante"
                type="text"
                inputMode="text"
                value={datos.solicitante}
                onChange={(evento) => actualizar('solicitante', evento.target.value)}
                onBlur={alSalir('solicitante')}
                maxLength={MAXIMOS.solicitante}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                {...ariaCampo('solicitante', {
                  error: errorSolicitante,
                  ayuda: true,
                  contador: true,
                })}
              />
            </Campo>
          </fieldset>

          <fieldset className="grupo">
            <legend className="grupo__leyenda">Detalle del caso</legend>

            <Campo
              id="descripcion"
              etiqueta="Descripción del asunto"
              requerido
              error={errorDescripcion}
              ayuda="Resumen breve del caso. Evita información personal sensible."
              contador={
                <ContadorCaracteres
                  id="descripcion-contador"
                  valor={datos.descripcion}
                  maximo={MAXIMOS.descripcion}
                />
              }
              className="grupo__ancho"
            >
              <textarea
                id="descripcion"
                value={datos.descripcion}
                onChange={(evento) => actualizar('descripcion', evento.target.value)}
                onBlur={alSalir('descripcion')}
                maxLength={MAXIMOS.descripcion}
                {...ariaCampo('descripcion', {
                  error: errorDescripcion,
                  ayuda: true,
                  contador: true,
                })}
              />
            </Campo>

            <Campo
              id="responsable"
              etiqueta="Responsable"
              requerido
              error={errorResponsable}
              ayuda="Persona del bufete que atenderá el expediente."
              contador={
                <ContadorCaracteres
                  id="responsable-contador"
                  valor={datos.responsable}
                  maximo={MAXIMOS.responsable}
                />
              }
            >
              <input
                id="responsable"
                type="text"
                inputMode="text"
                value={datos.responsable}
                onChange={(evento) => actualizar('responsable', evento.target.value)}
                onBlur={alSalir('responsable')}
                maxLength={MAXIMOS.responsable}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                {...ariaCampo('responsable', {
                  error: errorResponsable,
                  ayuda: true,
                  contador: true,
                })}
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
                {...ariaCampo('categoria', { ayuda: true })}
              >
                <option value="">Sin categoría</option>
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </Campo>
          </fieldset>

          <div className="formulario__acciones formulario__acciones--fija">
            <Link className="boton boton--secundario" to="/expedientes">
              Cancelar
            </Link>
            <button
              type="submit"
              className={`boton boton--primario${enviando ? ' boton--cargando' : ''}`}
              disabled={enviando}
              aria-busy={enviando}
            >
              {enviando && <span className="spinner" aria-hidden="true" />}
              {enviando ? 'Guardando…' : 'Abrir expediente'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
