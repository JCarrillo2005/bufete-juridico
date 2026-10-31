const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5125').replace(/\/+$/, '')

const MENSAJES_POR_ESTADO = {
  400: 'Revisa los datos enviados.',
  404: 'No se encontró el recurso solicitado.',
  409: 'La operación no es válida en el estado actual del expediente.',
  500: 'La API tuvo un error interno. Intenta de nuevo.',
}

export class ApiError extends Error {
  constructor(status, payload = {}) {
    super(payload.mensaje || MENSAJES_POR_ESTADO[status] || 'Ocurrió un error inesperado.')
    this.name = 'ApiError'
    this.status = status
    this.mensaje = this.message
    this.errores = payload.errores ?? {}
  }
}

export async function peticion(ruta, { signal, headers, ...opciones } = {}) {
  let respuesta

  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, {
      ...opciones,
      signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, {
      mensaje: `No se pudo conectar con la API en ${BASE_URL}. Verifica que el backend esté en ejecución.`,
    })
  }

  if (respuesta.status === 204) return null

  const texto = await respuesta.text()
  let datos = null

  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      datos = null
    }
  }

  if (!respuesta.ok) throw new ApiError(respuesta.status, datos ?? {})

  return datos
}

export { BASE_URL }
