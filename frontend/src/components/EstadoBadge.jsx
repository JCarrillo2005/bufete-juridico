import { normalizarEstado } from '../utils/catalogos'
import Icono from './Icono'

const ESTILOS = {
  abierto: { clase: 'estado--abierto', icono: 'punto' },
  'en seguimiento': { clase: 'estado--seguimiento', icono: 'reloj' },
  cerrado: { clase: 'estado--cerrado', icono: 'candado' },
}

/* El estado se comunica con icono + texto + color, nunca solo con color. */
export default function EstadoBadge({ estado }) {
  const config = ESTILOS[normalizarEstado(estado)] ?? { clase: 'estado--otro', icono: 'punto' }

  return (
    <span className={`estado ${config.clase}`}>
      <Icono nombre={config.icono} tamano={14} />
      {estado || 'Sin estado'}
    </span>
  )
}
