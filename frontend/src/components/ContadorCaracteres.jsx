/* Contador visible. Solo se anuncia a lectores de pantalla cuando se acerca al límite. */
export default function ContadorCaracteres({ id, valor = '', maximo }) {
  const cantidad = valor.length
  const cerca = cantidad >= Math.floor(maximo * 0.9)

  return (
    <span
      id={id}
      className={`contador${cerca ? ' contador--limite' : ''}`}
      aria-live={cerca ? 'polite' : 'off'}
    >
      {cantidad} / {maximo}
      {cerca && <span className="visualmente-oculto"> caracteres, cerca del límite</span>}
    </span>
  )
}
