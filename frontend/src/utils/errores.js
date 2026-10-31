/**
 * Lee un mensaje de error de campo sin depender de mayúsculas.
 * Acepta tanto { descripcion: "texto" } como { Descripcion: ["texto"] }.
 */
export function errorDeCampo(errores, campo) {
  if (!errores || typeof errores !== 'object') return ''

  const clave = Object.keys(errores).find(
    (nombre) => nombre.toLowerCase() === campo.toLowerCase(),
  )

  if (!clave) return ''

  const valor = errores[clave]
  return Array.isArray(valor) ? valor.join(' ') : String(valor ?? '')
}
