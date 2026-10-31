import { useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Icono from '../components/Icono'

function claseEnlace(activo) {
  return `nav__enlace${activo ? ' nav__enlace--activo' : ''}`
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const refPrincipal = useRef(null)

  const enNuevo = pathname.startsWith('/expedientes/nuevo')
  const enListado = pathname.startsWith('/expedientes') && !enNuevo

  function saltarAlContenido(evento) {
    evento.preventDefault()
    refPrincipal.current?.focus()
  }

  return (
    <div className="app">
      <a className="saltar" href="#contenido-principal" onClick={saltarAlContenido}>
        Saltar al contenido
      </a>

      <header className="app-header">
        <div className="contenedor app-header__contenido">
          <Link to="/expedientes" className="marca">
            <span className="marca__icono" aria-hidden="true">
              <Icono nombre="balanza" tamano={22} />
            </span>
            <span>
              <span className="marca__nombre">Bufete Popular</span>
              <small>Gestión de expedientes</small>
            </span>
          </Link>

          <nav className="nav" aria-label="Navegación principal">
            <Link
              to="/expedientes"
              className={claseEnlace(enListado)}
              aria-current={enListado ? 'page' : undefined}
            >
              Expedientes
            </Link>
            <span className="nav__separador" aria-hidden="true" />
            <Link
              to="/expedientes/nuevo"
              className={claseEnlace(enNuevo)}
              aria-current={enNuevo ? 'page' : undefined}
            >
              Nuevo expediente
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenido-principal" ref={refPrincipal} tabIndex={-1} className="contenedor app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="contenedor">
          <span className="app-footer__marca">Bufete Popular</span>
          Prototipo académico · Casos y datos ficticios · No brinda asesoría jurídica
        </div>
      </footer>
    </div>
  )
}
