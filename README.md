# Bufete Popular — Gestión de expedientes

Prototipo web para organizar expedientes, registrar actividades y consultar el estado y el
historial de cada caso. Proyecto académico para **UMG AI Code Wars — Tech Day Boot Camp**.
Todos los nombres, casos y datos son ficticios; la aplicación no brinda asesoría jurídica.

## Contenido

- [Estado del proyecto](#estado-del-proyecto)
- [Stack](#stack)
- [Requisitos](#requisitos)
- [Cómo ejecutar](#cómo-ejecutar)
- [Configurar la URL de la API](#configurar-la-url-de-la-api)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Contrato de la API](#contrato-de-la-api)
- [Reglas de negocio](#reglas-de-negocio)
- [Recorrido de la interfaz](#recorrido-de-la-interfaz)
- [Pruebas rápidas](#pruebas-rápidas)
- [Persistencia](#persistencia)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Ficha de análisis](#ficha-de-análisis)
- [Responsabilidades del equipo](#responsabilidades-del-equipo)
- [Tres decisiones con IA](#tres-decisiones-con-ia)
- [Lista de comprobación](#lista-de-comprobación)
- [Recursos externos y uso de IA](#recursos-externos-y-uso-de-ia)

## Estado del proyecto

| Parte | Estado |
| --- | --- |
| Frontend React (listado, apertura, detalle, historial y acciones) | Implementado |
| Cliente HTTP contra los cinco endpoints del contrato | Implementado |
| Validaciones de formulario y mensajes de error por campo | Implementado |
| Backend ASP.NET Core con los cinco endpoints | Implementado y verificado |

La API ya incluye CORS abierto y no usa `UseHttpsRedirection`, por lo que el frontend puede
llamarla por HTTP en `http://localhost:5125` sin ajustes adicionales.

## Stack

- **Frontend:** React 19, Vite 8, React Router 7, CSS plano.
- **Backend:** ASP.NET Core Web API (.NET 8), Swagger.
- **Persistencia:** archivo JSON del lado del backend (`dotnet-api/Data/expedientes.json`).
- **Sin autenticación, roles, SQL Server ni servicios externos.** No son requisitos del enunciado.

## Requisitos

- .NET SDK 8 o superior. El proyecto apunta a `net8.0`.
- Node.js 20.19+ o 22.12+ (recomendado: Node 22).
- npm 10+.
- Navegador moderno (Chrome, Edge o Firefox).

## Cómo ejecutar

El orden recomendado es **primero la API y después el frontend**.

### 1. API

```powershell
cd dotnet-api
dotnet run --launch-profile http
```

- API: <http://localhost:5125>
- Swagger: <http://localhost:5125/swagger>

> Si tu máquina solo tiene .NET 10 y no el runtime 8, ejecuta
> `dotnet run --launch-profile http --roll-forward Major`.

Si el puerto cambia, actualiza `frontend/.env` (ver la sección siguiente).

### 2. Frontend

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

- Aplicación: <http://localhost:5173>

### 3. Verificación de calidad del frontend

```powershell
cd frontend
npm run lint
npm run build
```

### CORS y HTTPS

La API del repositorio ya configura una política CORS abierta y no redirige a HTTPS. No necesitas
tocar `Program.cs` para ejecutar el frontend local. Si en el futuro se restringe CORS, autoriza
`http://localhost:5173`.

No agregues autenticación ni JWT: el frontend no envía tokens y una redirección a login rompería
el recorrido.

## Configurar la URL de la API

La URL se lee de la variable `VITE_API_URL` y, si no existe, usa `http://localhost:5125`.

```powershell
cd frontend
Copy-Item .env.example .env
```

Contenido de `.env`:

```dotenv
VITE_API_URL=http://localhost:5125
```

El archivo `.env` está ignorado por Git. Si no lo creas, la aplicación funciona igual con el
valor por defecto.

## Estructura del repositorio

```text
.
├── AGENTS.md                     # Guía para agentes de IA y colaboradores
├── README.md
├── dotnet-api/                   # API ASP.NET Core (.NET 8)
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   ├── Data/                     # Persistencia JSON
│   └── Program.cs
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/
        │   ├── client.js         # fetch, errores HTTP y URL base
        │   ├── expedientes.js    # los cinco endpoints
        │   └── normalizar.js     # adaptación de respuestas
        ├── components/
        │   ├── Alerta.jsx
        │   ├── Campo.jsx
        │   ├── EstadoBadge.jsx
        │   └── HistorialTimeline.jsx
        ├── hooks/
        │   └── useDebounce.js
        ├── layouts/
        │   └── AppLayout.jsx
        ├── pages/
        │   ├── ListadoExpedientes.jsx
        │   ├── NuevoExpediente.jsx
        │   ├── DetalleExpediente.jsx
        │   └── NoEncontrado.jsx
        ├── routes/
        │   └── AppRoutes.jsx
        ├── styles/
        │   ├── variables.css
        │   ├── global.css
        │   └── responsive.css
        ├── utils/
        │   ├── catalogos.js
        │   ├── errores.js
        │   ├── formatos.js
        │   └── historial.js
        ├── App.jsx
        └── main.jsx
```

## Contrato de la API

| Acción | Método y ruta | Cuerpo |
| --- | --- | --- |
| Listar / buscar | `GET /api/expedientes?busqueda=&estado=` | — |
| Detalle + historial | `GET /api/expedientes/{id}` | — |
| Abrir | `POST /api/expedientes` | `{ solicitante, descripcion, responsable, categoria? }` |
| Actividad | `POST /api/expedientes/{id}/actividades` | `{ descripcion, tipoActividad? }` |
| Cambiar estado | `POST /api/expedientes/{id}/estado` | `{ nuevoEstado, motivoCierre? }` |

### Formato de error

```json
{
  "mensaje": "Revisa los datos del expediente.",
  "errores": {
    "solicitante": "El solicitante es obligatorio."
  }
}
```

- `400`: error de validación con detalle por campo.
- `404`: expediente inexistente.
- `409`: operación no permitida por el estado actual.

El frontend muestra `mensaje` como alerta y cada entrada de `errores` junto a su campo.

### Forma esperada del listado

```json
[
  {
    "id": "EXP-0001",
    "solicitante": "María López",
    "responsable": "Lic. Pérez",
    "estado": "Abierto",
    "categoria": "Civil",
    "fechaApertura": "2026-10-31T08:15:00"
  }
]
```

Si no hay coincidencias, la API devuelve `[]`. El frontend muestra **“Sin resultados”**.

### Forma esperada del detalle

```json
{
  "id": "EXP-0001",
  "solicitante": "María López",
  "descripcion": "Conflicto por contrato de arrendamiento.",
  "responsable": "Lic. Pérez",
  "categoria": "Civil",
  "estado": "Cerrado",
  "fechaApertura": "2026-10-31T08:15:00",
  "fechaCierre": "2026-10-31T08:50:00",
  "motivoCierre": "Acuerdo entre las partes.",
  "historial": [
    {
      "tipo": "Apertura",
      "descripcion": "Se registró la apertura del expediente.",
      "fecha": "2026-10-31T08:15:00"
    },
    {
      "tipo": "Actividad",
      "descripcion": "Entrevista inicial con la solicitante.",
      "tipoActividad": "Reunión",
      "fecha": "2026-10-31T08:25:00"
    },
    {
      "tipo": "CambioEstado",
      "estadoAnterior": "Abierto",
      "estadoNuevo": "En seguimiento",
      "fecha": "2026-10-31T08:30:00"
    },
    {
      "tipo": "CambioEstado",
      "estadoAnterior": "En seguimiento",
      "estadoNuevo": "Cerrado",
      "descripcion": "Cambio de estado: En seguimiento → Cerrado. Motivo: Acuerdo entre las partes.",
      "fecha": "2026-10-31T08:50:00"
    }
  ]
}
```

El historial debe llegar en orden cronológico. El frontend distingue visualmente `Apertura`,
`Actividad` y `CambioEstado` con marcas y colores distintos. El motivo de cierre se muestra desde
`motivoCierre` del expediente y también aparece en la descripción del último cambio de estado.

> `frontend/src/api/normalizar.js` tolera algunos nombres alternativos (`persona`,
> `numeroExpediente`, `fechaCreacion`, etc.). Si el backend usa otros, ajústalo ahí una sola vez.

## Reglas de negocio

1. **Apertura:** `solicitante`, `descripcion` y `responsable` son obligatorios. Se rechazan vacíos
   o compuestos solo por espacios. `categoria` es opcional.
2. **Datos automáticos:** identificador único, fecha y hora de apertura, y estado inicial
   `Abierto`. El identificador sugerido es `EXP-0001`, `EXP-0002`, etc.
3. **Estados:**
   - `Abierto` → `En seguimiento`: acción explícita del usuario.
   - `En seguimiento` → `Cerrado`: requiere al menos una actividad y un `motivoCierre` no vacío.
   - `Cerrado` es final: no admite actividades ni cambios de estado, pero sigue consultable.
4. **Actividades:** solo en expedientes `Abierto` o `En seguimiento`; descripción obligatoria,
   fecha y hora automáticas, tipo opcional.
5. **Historial:** la apertura y cada cambio de estado se registran automáticamente. Cada actividad
   es una entrada independiente. El orden es cronológico.
6. **Búsqueda:** por identificador o nombre/alias, con filtro opcional por estado. Sin resultados
   se devuelve `[]`.

## Recorrido de la interfaz

### Listado — `/expedientes`

- Tabla con identificador, persona, responsable, estado y fecha de apertura.
- Búsqueda con retardo de 350 ms y filtro por estado.
- Enlace **Abrir** para ir al detalle.
- Mensaje **“Sin resultados”** cuando la lista llega vacía.
- Botón **Nuevo expediente**.

### Apertura — `/expedientes/nuevo`

- Campos: solicitante, descripción y responsable (obligatorios); categoría (opcional).
- Validación inmediata y mensajes del servidor junto a cada campo.
- Al crear, redirige al detalle con confirmación.

### Detalle — `/expedientes/{id}`

- Datos del expediente y estado con insignia de color.
- Historial cronológico con estilo distinto para Apertura, Actividad y CambioEstado.
- Formulario de actividad (descripción y tipo opcional).
- Si está `Abierto`: botón **Pasar a En seguimiento**.
- Si está `En seguimiento`: formulario de cierre con motivo. El botón se deshabilita si aún no
  hay actividades.
- Si está `Cerrado`: se ocultan los formularios y se muestra el motivo y la fecha de cierre.

## Pruebas rápidas

El repositorio ya incluye dos expedientes de demostración (`EXP-0001` cerrado y `EXP-0002` en
seguimiento). Si repites la apertura, los identificadores nuevos continúan en `EXP-0003`. Para
empezar desde cero, detén la API y elimina `dotnet-api/Data/expedientes.json`.

### Desde Swagger (`http://localhost:5125/swagger`)

1. Crear dos expedientes. Deben recibir identificadores distintos (`EXP-0001`, `EXP-0002`).
2. Crear uno con `solicitante: "   "`. Debe responder `400` con el detalle del campo.
3. `GET /api/expedientes?busqueda=EXP-0002` devuelve el segundo expediente.
4. Buscar por alias (`?busqueda=María`) devuelve coincidencias.
5. `?busqueda=zzz` devuelve `[]`.
6. Intentar cerrar un expediente `Abierto`: `409`.
7. Pasarlo a `En seguimiento`, intentar cerrar sin actividad: `409`.
8. Cerrar con actividad y `motivoCierre` vacío: `400`.
9. Cerrar con actividad y motivo válido: `200`.
10. Intentar una actividad o un cambio de estado sobre el cerrado: `409`.
11. Detener la API, volver a ejecutarla y confirmar que los datos siguen en
    `dotnet-api/Data/expedientes.json`.

### En la interfaz

1. Crear dos expedientes desde **Nuevo expediente**.
2. Dejar un obligatorio vacío o con espacios y comprobar el mensaje junto al campo.
3. Buscar por identificador y por alias; probar una búsqueda sin resultados.
4. Abrir el detalle y revisar que el historial distinga los tres tipos de entrada.
5. Registrar una actividad.
6. Pasar a **En seguimiento** y cerrar con motivo.
7. Confirmar que el expediente cerrado ya no muestra los formularios.
8. Recargar el navegador y confirmar que los datos se conservan (los conserva la API).

## Persistencia

La API guarda en `dotnet-api/Data/expedientes.json`. El repositorio incluye dos expedientes
ficticios para la demostración:

- `EXP-0001`: María López, categoría Civil, **Cerrado**, con actividad, fecha y motivo de cierre.
- `EXP-0002`: Carlos Ruiz, categoría Laboral, **En seguimiento**, sin actividad registrada.

La API crea el archivo y la carpeta `Data/` si no existen. Si quieres iniciar con el sistema vacío,
detén la API y elimina el archivo; se volverá a crear en la siguiente apertura.

## Limitaciones conocidas

- **La búsqueda distingue acentos:** `María` no encuentra `Maria`. Es una decisión consciente para
  mantener simple el filtrado; se documenta como limitación.
- No hay autenticación ni roles; cualquier persona con acceso local puede usar la API.
- No se editan ni eliminan expedientes o actividades, porque el enunciado no lo exige.
- No hay archivos adjuntos, notificaciones ni reportes.
- La aplicación está pensada para ejecutarse localmente; no se preparó despliegue.
- La concurrencia sobre el archivo JSON no está diseñada para múltiples usuarios simultáneos.

## Ficha de análisis

### Problema y usuario

El Bufete Popular atiende casos de personas de escasos recursos y necesita ordenar el seguimiento
de cada expediente. Usuarios principales: personal administrativo y abogados del bufete, que
registran la apertura, anotan actividades y consultan el estado de un caso.

### Prioridades

1. Completar el recorrido apertura → seguimiento → cierre sin errores.
2. Validar las reglas y mostrar mensajes comprensibles.
3. Conservar los datos y el historial.
4. Mantener una interfaz clara y utilizable en poco tiempo.

### Datos principales y supuestos

- Expediente: identificador, solicitante (alias), descripción, responsable, categoría opcional,
  estado, fecha de apertura, fecha y motivo de cierre.
- Historial: entradas de tipo Apertura, Actividad o CambioEstado, con fecha y hora.
- El identificador, la fecha de apertura y el estado inicial los genera el sistema.
- Los datos son ficticios; no se solicita información personal real ni documentos.
- Un expediente cerrado se conserva para consulta y no se reabre.

## Responsabilidades del equipo

| Integrante | Responsabilidad | Aporte verificable |
| --- | --- | --- |
| _(completar)_ | API, reglas y persistencia | Endpoints, validaciones y pruebas en Swagger |
| _(completar)_ | Frontend: listado y apertura | Pantallas y cliente HTTP |
| _(completar)_ | Frontend: detalle, historial y cierre | Línea de tiempo y acciones de estado |
| _(completar)_ | README, pruebas y demostración | Ficha, tabla de decisiones y recorridos |

Forma de integración: el contrato de la API se acordó antes de programar; el frontend consume las
rutas y el backend mantiene los nombres de campo. Los cambios de contrato se hacen en
`frontend/src/api/normalizar.js` y se avisan al equipo.

## Tres decisiones con IA

| Decisión o necesidad | Aporte de la IA | Decisión del equipo y razón | Cómo se comprobó |
| --- | --- | --- | --- |
| Persistencia sin infraestructura | Proponía SQL Server, EF Core, JWT y cuatro proyectos para una arquitectura “profesional”. | Se descartó. Un solo Web API con JSON cumple “conservar los datos” sin migraciones ni configuración y cabe en 90 minutos. | Se reinició la API y se comprobó que `Data/expedientes.json` conserva los dos expedientes y sus estados. |
| Alcance del frontend | Proponía login, roles, dashboard, clientes y catálogos. | Se recortó a tres vistas y cinco endpoints. Nada de eso se exige y habría consumido el tiempo de la demo. | `npm run lint` y `npm run build` sin errores; recorrido automatizado de listado, apertura, detalle, actividad y cierre. |
| Validación y reglas de estado | Sugirió validar en el frontend y confiar en la interfaz. | Se validó en ambos lados, pero la API es la autoridad: devuelve `400`, `404` y `409` con mensajes claros. El frontend deshabilita acciones inválidas. | Pruebas de API: 400 con solicitante vacío y motivo vacío, 404 inexistente, 409 al cerrar desde Abierto o sin actividad y al operar un cerrado. |

> Evidencia registrada el 31/10/2026 con pruebas de API y un recorrido automatizado en Edge headless.

## Lista de comprobación

| Recorrido | Comprobación esperada | Resultado observado | Estado |
| --- | --- | --- | --- |
| 1. Apertura | Crear dos expedientes con identificadores distintos; rechazar obligatorios incompletos. | `EXP-0001` y `EXP-0002` creados; `solicitante: "   "` respondió `400` con `errores.solicitante`. | Cumple |
| 2. Consulta | Localizar por identificador y persona, abrir detalle e historial; informar búsqueda sin resultados. | Búsqueda por `EXP-0002` y por `María`; `zzz` devolvió `[]` y la interfaz mostró “Sin resultados”; el detalle mostró el historial. | Cumple |
| 3. Seguimiento y cierre | Agregar actividades, pasar a En seguimiento y cerrar con actividad y motivo; rechazar cierres inválidos y bloquear acciones en cerrado. | Actividad registrada, paso a En seguimiento y cierre con motivo; `409` al cerrar desde Abierto o sin actividad, `400` con motivo vacío; el cerrado bloqueó actividad y cambio de estado. | Cumple |
| Persistencia | Los datos se conservan al reiniciar la API. | Tras detener y volver a ejecutar la API, siguieron los dos expedientes con sus estados e historial. | Cumple |

### Verificación ejecutada

- `npm run lint` sin errores ni advertencias.
- `npm run build` exitoso.
- Los cinco endpoints se probaron con respuestas `200`, `201`, `400`, `404` y `409`.
- Recorrido de interfaz automatizado en Edge headless: listado, búsqueda, detalle, apertura,
  actividad, paso a En seguimiento y cierre.
- Reinicio de la API para comprobar la persistencia en `Data/expedientes.json`.

## Recursos externos y uso de IA

- React, Vite, React Router y ASP.NET Core son bibliotecas y frameworks de uso general.
- La IA se usó para analizar el enunciado, proponer la arquitectura, generar borradores de código,
  revisar reglas y redactar documentación. El equipo revisó, recortó y adaptó las propuestas.
- No se incorporaron plantillas de un proyecto de expedientes preexistente; la base fue la
  plantilla genérica de Vite y el proyecto Web API de .NET.
- Los datos de demostración son ficticios.
