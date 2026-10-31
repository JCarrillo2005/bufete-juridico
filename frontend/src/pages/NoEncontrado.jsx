import { Link } from 'react-router-dom'

export default function NoEncontrado() {
  return (
    <div className="tarjeta vacio">
      <h1>Página no encontrada</h1>
      <p>La dirección que abriste no existe en esta aplicación.</p>
      <Link className="boton boton--primario" to="/expedientes">
        Ir al listado de expedientes
      </Link>
    </div>
  )
}
