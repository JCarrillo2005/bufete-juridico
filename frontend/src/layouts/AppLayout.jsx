import { Link, NavLink, Outlet } from 'react-router-dom'

function claseEnlace({ isActive }) {
  return `nav__enlace${isActive ? ' nav__enlace--activo' : ''}`
}

export default function AppLayout() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="contenedor app-header__contenido">
          <Link to="/expedientes" className="marca">
            <span className="marca__icono" aria-hidden="true">
              §
            </span>
            <span>
              <strong>Bufete Popular</strong>
              <small>Gestión de expedientes</small>
            </span>
          </Link>

          <nav className="nav" aria-label="Navegación principal">
            <NavLink to="/expedientes" end className={claseEnlace}>
              Expedientes
            </NavLink>
            <NavLink to="/expedientes/nuevo" className={claseEnlace}>
              Nuevo expediente
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="contenedor app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="contenedor">
          Prototipo académico · Casos y datos ficticios · No brinda asesoría jurídica
        </div>
      </footer>
    </div>
  )
}
