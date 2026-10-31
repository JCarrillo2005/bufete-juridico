import { peticion } from './client'
import { normalizarExpediente } from './normalizar'

export async function listarExpedientes({ busqueda = '', estado = '' } = {}, { signal } = {}) {
  const parametros = new URLSearchParams()
  if (busqueda.trim()) parametros.set('busqueda', busqueda.trim())
  if (estado) parametros.set('estado', estado)

  const consulta = parametros.toString()
  const datos = await peticion(`/api/expedientes${consulta ? `?${consulta}` : ''}`, { signal })

  return Array.isArray(datos) ? datos.map(normalizarExpediente) : []
}

export async function obtenerExpediente(id, { signal } = {}) {
  const datos = await peticion(`/api/expedientes/${encodeURIComponent(id)}`, { signal })
  return normalizarExpediente(datos ?? {})
}

export async function crearExpediente(expediente) {
  const datos = await peticion('/api/expedientes', {
    method: 'POST',
    body: JSON.stringify(expediente),
  })
  return normalizarExpediente(datos ?? {})
}

export async function crearActividad(id, actividad) {
  return peticion(`/api/expedientes/${encodeURIComponent(id)}/actividades`, {
    method: 'POST',
    body: JSON.stringify(actividad),
  })
}

export async function cambiarEstado(id, cambio) {
  return peticion(`/api/expedientes/${encodeURIComponent(id)}/estado`, {
    method: 'POST',
    body: JSON.stringify(cambio),
  })
}
