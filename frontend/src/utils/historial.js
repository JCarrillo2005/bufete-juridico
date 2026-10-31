import { normalizarEstado } from './catalogos'

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

/**
 * Índice de la última reapertura: el último cambio de estado que salió de
 * "Cerrado". Devuelve -1 si el expediente nunca se reabrió.
 */
export function indiceUltimaReapertura(historial = []) {
  for (let i = historial.length - 1; i >= 0; i -= 1) {
    const entrada = historial[i]
    if (
      clasificarTipoHistorial(entrada.tipo) === 'cambio' &&
      normalizarEstado(entrada.estadoAnterior) === 'cerrado'
    ) {
      return i
    }
  }
  return -1
}

/**
 * Indica si existe una actividad posterior a la última reapertura (o desde la
 * apertura si el expediente nunca se reabrió). Es la regla que exige la API
 * para permitir un nuevo cierre.
 */
export function hayActividadDesdeUltimaReapertura(historial = []) {
  const indice = indiceUltimaReapertura(historial)
  return historial
    .slice(indice + 1)
    .some((entrada) => clasificarTipoHistorial(entrada.tipo) === 'actividad')
}
