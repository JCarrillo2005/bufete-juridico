export const ESTADOS = {
  ABIERTO: 'Abierto',
  EN_SEGUIMIENTO: 'En seguimiento',
  CERRADO: 'Cerrado',
}

export const OPCIONES_FILTRO_ESTADO = [
  { valor: '', etiqueta: 'Todos los estados' },
  { valor: ESTADOS.ABIERTO, etiqueta: ESTADOS.ABIERTO },
  { valor: ESTADOS.EN_SEGUIMIENTO, etiqueta: ESTADOS.EN_SEGUIMIENTO },
  { valor: ESTADOS.CERRADO, etiqueta: ESTADOS.CERRADO },
]

export const CATEGORIAS = ['Civil', 'Familiar', 'Laboral']

export const TIPOS_ACTIVIDAD = [
  'Reunión',
  'Presentación de documentos',
  'Audiencia',
  'Seguimiento',
  'Notificación',
  'Otra',
]

export function normalizarEstado(estado) {
  return String(estado ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export const estaAbierto = (estado) => normalizarEstado(estado) === 'abierto'
export const estaEnSeguimiento = (estado) => normalizarEstado(estado) === 'en seguimiento'
export const estaCerrado = (estado) => normalizarEstado(estado) === 'cerrado'
