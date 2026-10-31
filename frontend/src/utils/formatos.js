const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const FORMATO_FECHA = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
})

function convertirFecha(valor) {
  if (!valor) return null
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function formatearFechaHora(valor) {
  const fecha = convertirFecha(valor)
  return fecha ? FORMATO_FECHA_HORA.format(fecha) : '—'
}

export function formatearFecha(valor) {
  const fecha = convertirFecha(valor)
  return fecha ? FORMATO_FECHA.format(fecha) : '—'
}
