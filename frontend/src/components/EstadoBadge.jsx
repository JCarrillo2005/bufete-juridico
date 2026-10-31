import { normalizarEstado } from '../utils/catalogos'

const ESTILOS = {
  abierto: 'estado--abierto',
  'en seguimiento': 'estado--seguimiento',
  cerrado: 'estado--cerrado',
}

export default function EstadoBadge({ estado }) {
  const clase = ESTILOS[normalizarEstado(estado)] ?? 'estado--otro'

  return <span className={`estado ${clase}`}>{estado || 'Sin estado'}</span>
}
