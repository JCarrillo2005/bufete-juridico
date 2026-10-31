/**
 * Punto único de adaptación entre la API y la interfaz.
 *
 * El contrato define los campos solicitante, descripcion, responsable, categoria,
 * estado e historial. Si el backend usa otros nombres (por ejemplo persona o
 * numeroExpediente), se agregan aquí como alternativas y las pantallas no cambian.
 */

function primero(...valores) {
  for (const valor of valores) {
    if (valor !== undefined && valor !== null && valor !== '') return valor
  }
  return ''
}

export function normalizarEntrada(entrada = {}) {
  return {
    tipo: primero(entrada.tipo, entrada.tipoEvento, entrada.evento),
    descripcion: primero(entrada.descripcion, entrada.detalle, entrada.observaciones),
    fecha: primero(entrada.fecha, entrada.fechaHora, entrada.fechaRegistro, entrada.fechaActividad),
    tipoActividad: primero(entrada.tipoActividad, entrada.tipoActividadNombre),
    estadoAnterior: primero(entrada.estadoAnterior, entrada.estadoOrigen),
    estadoNuevo: primero(entrada.estadoNuevo, entrada.estadoDestino),
    motivo: primero(entrada.motivo, entrada.motivoCierre),
  }
}

export function normalizarExpediente(datos = {}) {
  return {
    id: String(primero(datos.id, datos.numeroExpediente, datos.numero, datos.codigo)),
    solicitante: primero(datos.solicitante, datos.persona, datos.nombreSolicitante, datos.alias),
    responsable: primero(datos.responsable, datos.abogadoResponsable, datos.encargado),
    estado: primero(datos.estado, datos.estadoActual),
    categoria: primero(datos.categoria, datos.tipoAsunto),
    descripcion: primero(datos.descripcion, datos.asunto, datos.detalle),
    fechaApertura: primero(datos.fechaApertura, datos.fechaCreacion, datos.fecha),
    fechaCierre: primero(datos.fechaCierre),
    motivoCierre: primero(datos.motivoCierre, datos.motivo),
    historial: Array.isArray(datos.historial) ? datos.historial.map(normalizarEntrada) : [],
  }
}
