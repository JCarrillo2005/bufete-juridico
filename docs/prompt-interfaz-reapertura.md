# Prompt para implementar la reapertura en la interfaz React

Copia el contenido de este archivo como instrucción para el agente que trabaje el frontend.

---

## Rol y objetivo

Eres un desarrollador frontend trabajando en `frontend/` del repositorio **Bufete Popular**
(React 19 + Vite + React Router, CSS plano). El backend ya implementó la **reapertura de
expedientes cerrados**. Tu tarea es llevar esa capacidad a la interfaz sin romper el recorrido
actual (listado, apertura, detalle, actividades y cierre).

No modifiques `dotnet-api/`. No agregues librerías nuevas. Interfaz y mensajes en español.

## Contexto de la API (ya implementada y verificada)

El detalle `GET /api/expedientes/{id}` ahora incluye:

```json
{
  "id": "EXP-0001",
  "estado": "Cerrado",
  "fechaApertura": "2026-10-31T08:37:52-06:00",
  "fechaCierre": "2026-10-31T08:50:00-06:00",
  "motivoCierre": "Acuerdo entre las partes.",
  "cierres": [
    {
      "numero": 1,
      "fechaCierre": "2026-10-31T08:50:00-06:00",
      "motivoCierre": "Acuerdo entre las partes.",
      "fechaReapertura": null,
      "motivoReapertura": null
    }
  ],
  "historial": [
    { "tipo": "Apertura", "fecha": "2026-10-31T08:37:52-06:00", "descripcion": "Expediente abierto." },
    { "tipo": "Actividad", "fecha": "2026-10-31T08:40:00-06:00", "descripcion": "Entrevista inicial.", "tipoActividad": "Reunión" },
    { "tipo": "CambioEstado", "estadoAnterior": "En seguimiento", "estadoNuevo": "Cerrado", "motivo": "Acuerdo entre las partes.", "fecha": "2026-10-31T08:50:00-06:00" }
  ]
}
```

Endpoint nuevo:

| Acción | Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| Reabrir | `POST /api/expedientes/{id}/reabrir` | `{ "motivo": "texto" }` | `200` con el expediente completo ya en `En seguimiento` |

Reglas del endpoint:

- Solo acepta expedientes en estado `Cerrado`.
- `motivo` se recorta con `trim`: vacío o solo espacios devuelve `400` con
  `{ mensaje, errores: { motivo: "..." } }`; más de 500 caracteres también devuelve `400`.
- Si el expediente no está cerrado devuelve `409` con `{ mensaje }`.
- Si no existe devuelve `404` con `{ mensaje }`.
- Al reabrir: `estado` pasa a `En seguimiento`, `fechaCierre` y `motivoCierre` quedan en `null`,
  `cierres[]` se conserva y el último cierre recibe `fechaReapertura` y `motivoReapertura`.
- La reapertura se agrega al `historial[]` como `CambioEstado` de `Cerrado` a `En seguimiento`.

Regla de cierre que cambió:

- Para cerrar ya no basta con que exista **cualquier** actividad histórica. Debe existir al menos
  una actividad **posterior a la última reapertura** (o desde la apertura si nunca se reabrió).
  Si no, la API responde `409`.

## Archivos que debes tocar

### 1. `frontend/src/api/normalizar.js`

- Agrega `normalizarCierre(cierre = {})` con:
  - `numero` (número),
  - `fechaCierre`,
  - `motivoCierre`,
  - `fechaReapertura`,
  - `motivoReapertura`.
- En `normalizarExpediente`, agrega `cierres`:
  - Si `datos.cierres` es un arreglo, mapéalo con `normalizarCierre`.
  - Compatibilidad: si no viene `cierres` pero sí `fechaCierre`, devuelve un arreglo con un único
    cierre construido con `fechaCierre` y `motivoCierre`.
- Mantén el resto de campos y la tolerancia a nombres alternativos.

### 2. `frontend/src/api/expedientes.js`

Agrega y exporta:

```js
export async function reabrirExpediente(id, motivo) {
  const datos = await peticion(`/api/expedientes/${encodeURIComponent(id)}/reabrir`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  })
  return normalizarExpediente(datos ?? {})
}
```

### 3. `frontend/src/utils/historial.js`

Agrega helpers puros y testeables mentalmente:

```js
export function indiceUltimaReapertura(historial = []) {
  for (let i = historial.length - 1; i >= 0; i -= 1) {
    const entrada = historial[i]
    if (
      clasificarTipoHistorial(entrada.tipo) === 'cambio' &&
      normalizarEstado(entrada.estadoAnterior) === 'cerrado'
    ) {
      return i
    }
  }
  return -1
}

export function hayActividadDesdeUltimaReapertura(historial = []) {
  const indice = indiceUltimaReapertura(historial)
  return historial
    .slice(indice + 1)
    .some((entrada) => clasificarTipoHistorial(entrada.tipo) === 'actividad')
}
```

Importa `normalizarEstado` desde `./catalogos` si lo necesitas (evita duplicar la lógica).

### 4. `frontend/src/pages/DetalleExpediente.jsx`

Estado nuevo:

- `motivoReapertura` (string).
- Reutiliza `enviando` con el valor `'reabrir'` para deshabilitar el botón mientras se envía.

Lógica:

- Reemplaza el cálculo actual de `tieneActividad` (que usa `historial.some(...)`) por
  `hayActividadDesdeUltimaReapertura(expediente.historial)`.
- Agrega `reabrir(evento)`:
  1. `preventDefault`.
  2. Recorta el motivo; si está vacío, setea
     `errores = { motivo: 'Escribe el motivo de la reapertura.' }` y muestra el error de acción.
  3. Llama `reabrirExpediente(id, motivo)`.
  4. Con la respuesta, actualiza `expediente`, limpia `motivoReapertura`, limpia errores y muestra
     el mensaje **"Expediente reabierto correctamente. Ahora está En seguimiento."**
  5. En error, muestra `fallo.mensaje` y `fallo.errores` (el campo es `motivo`).
- Lee el error con `errorDeCampo(errores, 'motivo')`.

Interfaz cuando `estaCerrado(expediente.estado)`:

- Mantén la tarjeta **"Expediente cerrado"** con el texto de que sigue disponible para consulta.
- Muestra el **cierre vigente** con `fechaCierre` y `motivoCierre` (con los respaldos actuales del
  historial si hicieran falta).
- Agrega una sección **"Cierres y reaperturas"** que recorra `expediente.cierres`:
  - Cada fila: `Cierre #N`, fecha de cierre y motivo.
  - Si `fechaReapertura` existe: línea adicional "Reabierto el {fecha} — Motivo: {motivoReapertura}".
  - Si el arreglo está vacío, no muestres la sección.
- Agrega el formulario **"Reabrir expediente"**:
  - `textarea` con `id="motivo-reapertura"`, `maxLength={500}`, `aria-invalid` y
    `aria-describedby` cuando haya error.
  - Etiqueta: "Motivo de la reapertura", requerido.
  - Texto de ayuda: "Explica por qué se retoma el caso. El cierre anterior se conservará."
  - Botón: "Reabrir expediente" (`type="submit"`), deshabilitado mientras `enviando === 'reabrir'`.
  - Usa el componente `Campo` existente para mantener accesibilidad y estilos.
- Oculta los formularios de actividad y de cierre mientras esté cerrado.
- No muestres el botón "Pasar a En seguimiento" en cerrados.

Interfaz cuando `estaEnSeguimiento(...)`:

- El formulario de cierre se habilita solo si
  `hayActividadDesdeUltimaReapertura(expediente.historial)` es `true`.
- Si no hay actividad nueva, muestra una alerta informativa:
  **"Para cerrar de nuevo el expediente, registra una actividad después de la reapertura."**
  (o el mensaje equivalente si nunca se ha reabierto).
- Mantén el resto del comportamiento actual.

### 5. `frontend/src/components/HistorialTimeline.jsx` (ajuste menor, opcional)

- Ya muestra `entrada.motivo` como chip. Verifica que las reaperturas se lean como
  `CambioEstado` y que el texto de `descripcion` ("Reapertura: Cerrado → En seguimiento...")
  se vea correctamente.
- Si quieres diferenciarlas, agrega una marca visual para `estadoAnterior === 'Cerrado'`, pero sin
  introducir dependencias ni romper los tres tipos existentes.

### 6. `frontend/src/styles/global.css` (si hace falta)

- Reutiliza clases existentes (`tarjeta`, `formulario`, `datos`, `chip`, `alerta`).
- Si agregas una lista de cierres, crea clases en español y coherentes con las variables de
  `styles/variables.css`. No agregues Tailwind, MUI ni CSS-in-JS.

## Comportamiento esperado (recorrido)

1. Abrir el detalle de un expediente `Cerrado` (por ejemplo `EXP-0001` de demostración).
2. Ver el cierre vigente y la lista de cierres, sin formularios de actividad ni cierre.
3. Enviar la reapertura con el motivo vacío: mensaje junto al campo, sin llamar a la API.
4. Reabrir con un motivo válido: el estado cambia a `En seguimiento`, el cierre anterior sigue
   visible con su fecha/motivo de reapertura y aparece una alerta de éxito.
5. Intentar cerrar de inmediato: el botón está deshabilitado y se explica que hace falta una
   actividad nueva.
6. Registrar una actividad, cerrar con motivo y comprobar que `cierres[]` muestra dos cierres.
7. Reabrir de nuevo y repetir: los cierres nunca se pierden.
8. Probar la API con un expediente en `Abierto`/`En seguimiento`: debe responder `409` y la
   interfaz debe mostrar el mensaje del backend, sin romperse.

## Restricciones

- No tocar `dotnet-api/`.
- No agregar autenticación, JWT ni redirecciones a login.
- No agregar dependencias nuevas.
- Mantener CSS plano, clases en español y las variables existentes.
- Mantener accesibilidad: `label` asociado, `aria-invalid`, `aria-describedby`, mensajes con
  `role="alert"` (el componente `Alerta` ya lo hace), foco visible y navegación por teclado.
- No hardcodear la URL de la API: usa `VITE_API_URL` a través de `api/client.js`.

## Verificación obligatoria

```powershell
cd frontend
npm run lint
npm run build
```

Además:

- Confirma que el listado y la búsqueda siguen funcionando.
- Confirma que abrir un expediente nuevo, registrar actividad y cerrarlo sigue funcionando.
- Confirma que un expediente cerrado ya no muestra actividad/cierre y sí muestra reapertura.
- Confirma que los mensajes de error `400` (`errores.motivo`) y `409` se muestran al usuario.

## Criterios de aceptación

- [ ] Existe `reabrirExpediente` en `api/expedientes.js` y se usa desde el detalle.
- [ ] `normalizarExpediente` expone `cierres[]` normalizado y tolera respuestas sin ese campo.
- [ ] El detalle de un cerrado muestra cierre vigente, cierres anteriores y formulario de
      reapertura.
- [ ] El motivo de reapertura es obligatorio, máximo 500 caracteres, con error por campo.
- [ ] Al reabrir, la pantalla refleja `En seguimiento` sin recargar manualmente.
- [ ] El cierre exige actividad posterior a la última reapertura, no actividad histórica.
- [ ] Los cierres anteriores se conservan y se muestran tras una segunda reapertura.
- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] No se modificó `dotnet-api/` ni se agregaron dependencias.
