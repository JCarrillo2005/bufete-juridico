import { Link } from 'react-router-dom'

export default function EncabezadoPagina({
  migas,
  eyebrow,
  titulo,
  insignia,
  descripcion,
  acciones,
}) {
  return (
    <>
      {migas && migas.length > 0 && (
        <nav className="migas" aria-label="Ruta de navegación">
          <ol>
            {migas.map((miga) => (
              <li key={miga.etiqueta}>
                {miga.a ? (
                  <Link to={miga.a}>{miga.etiqueta}</Link>
                ) : (
                  <span aria-current="page">{miga.etiqueta}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <header className="encabezado-pagina">
        <div>
          {eyebrow && <p className="encabezado-pagina__eyebrow">{eyebrow}</p>}
          <div className="encabezado-pagina__titulo">
            <h1>{titulo}</h1>
            {insignia}
          </div>
          {descripcion && <p className="encabezado-pagina__descripcion">{descripcion}</p>}
        </div>
        {acciones && <div className="encabezado-pagina__acciones">{acciones}</div>}
      </header>
    </>
  )
}
