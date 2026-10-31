/* Atributos ARIA coherentes para el control hijo de <Campo>. */
export function ariaCampo(id, { error, ayuda, contador } = {}) {
  const ids = []
  if (error) ids.push(`${id}-error`)
  else if (ayuda) ids.push(`${id}-ayuda`)
  if (contador) ids.push(`${id}-contador`)

  return {
    'aria-invalid': Boolean(error),
    'aria-describedby': ids.length > 0 ? ids.join(' ') : undefined,
  }
}
