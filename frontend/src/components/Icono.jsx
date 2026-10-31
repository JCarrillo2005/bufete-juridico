/* Iconos SVG inline: trazo 1.75, cuadrícula de 24 px, color heredado (currentColor). */
const RUTAS = {
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  mas: <path d="M12 5v14M5 12h14" />,
  flecha: <path d="M5 12h14m-6-6 6 6-6 6" />,
  abrir: <path d="M7 17 17 7M8 7h9v9" />,
  alerta: (
    <>
      <path d="M12 3 2.5 20h19L12 3z" />
      <path d="M12 10v4M12 17.5v.01" />
    </>
  ),
  exito: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 3 3 5-6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </>
  ),
  carpeta: (
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  etiqueta: (
    <>
      <path d="M3 12V4h8l10 10-8 8L3 12z" />
      <path d="M7.5 8.5v.01" />
    </>
  ),
  actividad: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  cambio: <path d="M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4" />,
  reabrir: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />,
  candado: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  balanza: (
    <>
      <path d="M12 4v16M6 20h12M5 7h14" />
      <path d="M5 7 2 14a3 3 0 0 0 6 0L5 7zm14 0-3 7a3 3 0 0 0 6 0l-3-7z" />
    </>
  ),
  punto: <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />,
}

export default function Icono({ nombre, tamano = 20, className }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {RUTAS[nombre] ?? RUTAS.punto}
    </svg>
  )
}
