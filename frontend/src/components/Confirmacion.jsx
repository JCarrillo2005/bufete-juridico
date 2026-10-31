import { useEffect, useId, useRef } from 'react'

/*
 * Diálogo de confirmación con <dialog> nativo.
 * showModal() atrapa el foco, Esc dispara "cancel" y al cerrar el navegador
 * devuelve el foco al elemento que lo abrió.
 */
export default function Confirmacion({
  abierto,
  titulo,
  children,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  variante = 'primario',
  onConfirmar,
  onCancelar,
}) {
  const ref = useRef(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        evento.preventDefault()
        onCancelar()
      }}
      onClick={(evento) => {
        if (evento.target === ref.current) onCancelar()
      }}
    >
      <div className="dialogo__cuerpo">
        <h2 id={idTitulo}>{titulo}</h2>
        {children}
        <div className="dialogo__acciones">
          <button type="button" className="boton boton--secundario" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button type="button" className={`boton boton--${variante}`} onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  )
}
