# AGENTS.md

Guía para agentes de IA y colaboradores que trabajen en este repositorio.

## 1. Contexto del proyecto

Prototipo académico para la competencia **UMG AI Code Wars — Bufete Popular**. El objetivo es
organizar expedientes, registrar actividades y consultar estado e historial. Todos los casos y
datos son ficticios.

Alcance mínimo (no agregar nada que no esté aquí sin justificarlo):

- Abrir expedientes con solicitante, descripción y responsable obligatorios; categoría opcional.
- Listar y buscar por identificador o nombre/alias; filtro opcional por estado.
- Registrar actividades en expedientes Abiertos o En seguimiento.
- Pasar de Abierto a En seguimiento y cerrar desde En seguimiento con actividad previa y motivo.
- Reabrir un expediente cerrado con motivo, conservando el historial de cierres.
- Conservar el historial cronológico y los datos al reiniciar.

Fuera de alcance: autenticación, JWT, roles, SQL Server, EF Core, dashboard, clientes, usuarios,
catálogos, adjuntos, notificaciones, reportes y despliegue. No otorgan puntos y rompen el tiempo
de la competencia.

## 2. Estructura del repositorio

```text
.
├── AGENTS.md
├── README.md
├── dotnet-api/                 # ASP.NET Core Web API (.NET 8)
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   ├── Data/                   # expedientes.json (persistencia)
│   └── Program.cs
└── frontend/                   # React 19 + Vite + React Router
    └── src/
        ├── api/                # cliente HTTP y adaptación de respuestas
        ├── components/         # piezas reutilizables de interfaz
        ├── hooks/              # useDebounce
        ├── layouts/            # AppLayout con encabezado y navegación
        ├── pages/              # Listado, Nuevo, Detalle, No encontrado
        ├── routes/             # AppRoutes
        ├── styles/             # variables, global y responsive
        └── utils/              # catálogos, formatos, errores, historial
```

## 3. Comandos

### API

```powershell
cd dotnet-api
dotnet run --launch-profile http
```

- URL: `http://localhost:5125`
- Swagger: `http://localhost:5125/swagger`
- Si solo está instalado el runtime de .NET 10 y la app no arranca por falta de
  `Microsoft.NETCore.App 8.0`, usar `dotnet run --launch-profile http --roll-forward Major`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

- URL: `http://localhost:5173`
- Verificación obligatoria antes de cerrar un cambio:

```powershell
npm run lint
npm run build
```

## 4. Contrato de la API

El frontend depende de estos seis endpoints. No cambiar rutas ni nombres de campos sin actualizar
`frontend/src/api/expedientes.js` y `frontend/src/api/normalizar.js`.

| Acción | Método y ruta | Cuerpo |
| --- | --- | --- |
| Listar / buscar | `GET /api/expedientes?busqueda=&estado=` | — |
| Detalle + historial | `GET /api/expedientes/{id}` | — |
| Abrir | `POST /api/expedientes` | `{ solicitante, descripcion, responsable, categoria? }` |
| Actividad | `POST /api/expedientes/{id}/actividades` | `{ descripcion, tipoActividad? }` |
| Cambiar estado | `POST /api/expedientes/{id}/estado` | `{ nuevoEstado, motivoCierre? }` |
| Reabrir | `POST /api/expedientes/{id}/reabrir` | `{ motivo }` |

Respuestas de error:

- `400`: `{ mensaje, errores: { campo: "qué corregir" } }`; en la reapertura el campo es `motivo`.
- `404` y `409`: `{ mensaje }`

El listado devuelve `[]` cuando no hay resultados. El detalle incluye `historial[]` en orden
cronológico, con `tipo` igual a `Apertura`, `Actividad` o `CambioEstado`, y `cierres[]` con todos
los cierres del expediente (`numero`, `fechaCierre`, `motivoCierre`, `fechaReapertura?`,
`motivoReapertura?`). Las entradas de historial de tipo `CambioEstado` pueden incluir `motivo`.

## 5. Reglas de negocio que no se pueden romper

1. `solicitante`, `descripcion` y `responsable` se validan con `trim`; solo espacios es inválido.
2. El identificador, la fecha/hora de apertura y el estado `Abierto` los genera el backend.
3. `Abierto` solo pasa a `En seguimiento`.
4. `En seguimiento` solo pasa a `Cerrado` si existe al menos una actividad **posterior a la última
   reapertura** (o desde la apertura si nunca se reabrió) y el motivo no está vacío (máximo 500
   caracteres).
5. Un expediente `Cerrado` no admite actividades ni cambios de estado, pero sigue visible para
   consulta y puede reabrirse con `motivo` (no vacío, máximo 500 caracteres).
6. Al reabrir, el expediente vuelve a `En seguimiento`; `fechaCierre` y `motivoCierre` quedan en
   `null`, pero `cierres[]` se conserva y el último cierre recibe `fechaReapertura` y
   `motivoReapertura`.
7. Solo se reabre un expediente `Cerrado`; en cualquier otro estado la API responde `409`.
8. La apertura, cada actividad, cada cambio de estado y cada reapertura se guardan automáticamente
   en el historial.
9. Los datos persisten en `dotnet-api/Data/expedientes.json` (o el almacenamiento que defina el
   backend). No usar memoria volátil para la entrega. El repositorio incluye dos expedientes de
   demostración en ese archivo; no borrarlos sin una razón. Al iniciar, la API migra los cierres
   antiguos que solo tenían `fechaCierre`/`motivoCierre` a `cierres[]`.

## 6. Convenciones del frontend

- Interfaz y mensajes en español; identificadores de código en inglés o español consistente.
- Componentes en `PascalCase.jsx`; utilidades y hooks en `camelCase.js`.
- Estilos en CSS plano con clases en español y variables de `styles/variables.css`. No agregar
  Tailwind, MUI ni otra librería visual sin una razón fuerte.
- La URL de la API se lee de `VITE_API_URL` y tiene como respaldo `http://localhost:5125`.
  No escribir URLs absolutas dentro de las páginas.
- Los errores de campo se leen con `errorDeCampo` para tolerar mayúsculas y arreglos.
- Las respuestas se normalizan en `api/normalizar.js`. Si el backend usa otros nombres, adaptar
  ahí y no en cada pantalla.
- Mantener accesibilidad básica: `label` asociado, `aria-invalid`, mensajes con `role="alert"`,
  foco visible y navegación por teclado.
- El listado debe mostrar "Sin resultados" cuando la API devuelva `[]`.
- En el detalle, con estado `Cerrado` se ocultan los formularios de actividad y cierre, se muestra
  el cierre vigente y aparece el formulario **Reabrir expediente** (`motivo` obligatorio, máximo
  500 caracteres).
- Para habilitar el cierre se cuenta la actividad **posterior a la última reapertura** (última
  entrada `CambioEstado` con `estadoAnterior === "Cerrado"`), no cualquier actividad histórica.
- Los cierres anteriores se leen de `cierres[]`; no se reconstruyen solo con el historial.

## 7. Zona sensible

- `dotnet-api/` es responsabilidad del equipo de backend. **No modificarlo** salvo que la tarea lo
  pida explícitamente.
- No agregar autenticación, `ProtectedRoute`, interceptores JWT ni redirecciones a login: la API
  no usa tokens.
- No commitear `node_modules/`, `dist/`, `.env` ni archivos de usuario.
- Si se toca la API, revisar que `Program.cs` no tenga `app.UseHttpsRedirection()` y que CORS
  permita `http://localhost:5173`.

## 8. Verificación mínima antes de entregar

- `npm run lint` sin errores ni advertencias.
- `npm run build` exitoso.
- Recorrido manual: crear dos expedientes, buscar por id y alias, abrir detalle, registrar
  actividad, pasar a En seguimiento, cerrar con motivo.
- Comprobar que un cerrado rechaza actividad y cambio de estado, pero permite reabrir con motivo;
  tras reabrir, exigir actividad nueva antes de cerrar y confirmar que `cierres[]` conserva ambos.
- Confirmar que reiniciar la API conserva los datos y migra los cierres antiguos a `cierres[]`.
- Actualizar la tabla de comprobación del `README.md` con resultados reales (Cumple / Parcial / No cumple).
