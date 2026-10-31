/**
 * Clasifica el campo `tipo` del historial sin depender de mayúsculas, espacios
 * ni acentos: "CambioEstado", "Cambio de estado" y "CambioEstado " dan igual.
 */
export function clasificarTipoHistorial(tipo) {
  const clave = String(tipo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()

  if (clave.startsWith('apertura')) return 'apertura'
  if (clave.startsWith('actividad')) return 'actividad'
  if (clave.startsWith('cambio')) return 'cambio'
  return 'otro'
}
