# Arquitectura del sistema y decisiones de diseño

Documento de apoyo del proyecto **Bufete Popular — Gestión de expedientes** (UMG AI Code Wars,
Tech Day Boot Camp). Explica cómo está construido el sistema y por qué se tomaron las decisiones
que lo llevaron a su estado actual. Todos los casos y datos son ficticios.

---

## 1. Arquitectura del sistema

### 1.1 Visión general

La aplicación sigue una arquitectura **cliente-servidor de dos capas**, pensada para ejecutarse
localmente y para caber en el tiempo de una competencia académica:

```text
┌──────────────────────────────────────────────────────────────┐
│ Navegador                                                    │
│                                                              │
│  React 19 + Vite + React Router                              │
│  pages/ ──► components/                                      │
│     │                                                        │
│     └──► api/ (fetch + normalización)                        │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP/JSON · CORS
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ ASP.NET Core Web API (.NET 8)                                │
│                                                              │
│  Controllers/ ──► Services/ ──► Models/                      │
│         │              │                                     │
│         │              └──► Data/expedientes.json            │
│         └──► middleware de errores (400 / 404 / 409)         │
└──────────────────────────────────────────────────────────────┘
```

No hay base de datos, servidor de autenticación, colas ni servicios externos. El navegador consume
una API REST y la API conserva el estado en un archivo JSON local.

### 1.2 Componentes principales

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| Interfaz | React 19 + Vite 8 + React Router 7 | Listado, apertura, detalle, historial y acciones sobre el expediente |
| Cliente HTTP | `fetch` nativo | Construir peticiones, leer errores y adaptar respuestas |
| API | ASP.NET Core Web API (.NET 8) | Validar, aplicar reglas de negocio y exponer los seis endpoints |
| Persistencia | `System.Text.Json` + archivo local | Guardar expedientes, cierres e historial entre reinicios |
| Documentación de API | Swagger / OpenAPI | Probar los endpoints manualmente desde el navegador |
| Comunicación | CORS abierto en desarrollo | Permitir que Vite (`:5173`) llame a la API (`:5125`) |

### 1.3 Flujo de una petición

1. La persona interactúa con una página de React (por ejemplo, pulsa **Agregar actividad**).
2. La página llama a una función de `frontend/src/api/expedientes.js`.
3. `frontend/src/api/client.js` arma la petición `fetch` con la URL base de `VITE_API_URL`,
   encabezados JSON y manejo uniforme de errores.
4. El controlador correspondiente recibe el DTO y delega en `ExpedienteService`.
5. El servicio valida los datos, aplica la regla de negocio y modifica el expediente en memoria.
6. `Guardar()` escribe primero un archivo temporal y luego lo mueve sobre `expedientes.json`, para
   evitar dejar el archivo a medias.
7. La API responde con el expediente completo en JSON.
8. `frontend/src/api/normalizar.js` adapta la respuesta al modelo que usan las pantallas.
9. React actualiza su estado y la interfaz refleja el cambio **sin recargar la página**.

Si algo falla, el middleware de `Program.cs` convierte las excepciones de negocio en respuestas
JSON con un código HTTP coherente y un mensaje comprensible.

### 1.4 Modelo de datos

El modelo se organiza alrededor de tres estructuras.

#### Expediente

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | texto | Identificador generado por la API (`EXP-0001`, `EXP-0002`, …) |
| `solicitante` | texto | Nombre o alias de la persona |
| `descripcion` | texto | Resumen del asunto |
| `responsable` | texto | Persona del bufete a cargo |
| `categoria` | texto opcional | Civil, Familiar o Laboral |
| `estado` | texto | `Abierto`, `En seguimiento` o `Cerrado` |
| `fechaApertura` | fecha/hora | Generada por la API |
| `fechaCierre` | fecha/hora opcional | Cierre vigente; vuelve a `null` al reabrir |
| `motivoCierre` | texto opcional | Motivo del cierre vigente; vuelve a `null` al reabrir |
| `cierres` | arreglo | Historial completo de cierres; nunca se reemplaza |
| `historial` | arreglo | Línea de tiempo cronológica de todos los movimientos |

#### CierreRegistro

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `numero` | número | Número consecutivo del cierre |
| `fechaCierre` | fecha/hora | Momento del cierre |
| `motivoCierre` | texto | Motivo indicado por la persona |
| `fechaReapertura` | fecha/hora opcional | Se completa si el expediente se reabre |
| `motivoReapertura` | texto opcional | Motivo de la reapertura |

#### HistorialEntrada

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | número | Consecutivo dentro del expediente |
| `tipo` | texto | `Apertura`, `Actividad` o `CambioEstado` |
| `fecha` | fecha/hora | Momento del movimiento |
| `descripcion` | texto | Detalle legible del movimiento |
| `tipoActividad` | texto opcional | Reunión, audiencia, seguimiento, etc. |
| `estadoAnterior` | texto opcional | Estado de origen en un cambio |
| `estadoNuevo` | texto opcional | Estado de destino en un cambio |
| `motivo` | texto opcional | Motivo del cierre o de la reapertura |

El historial es **append-only**: cada apertura, actividad, cambio de estado y reapertura agrega una
entrada; no se reescriben las anteriores. Los cierres se guardan aparte en `cierres[]` porque un
expediente puede cerrarse y reabrirse varias veces y el cierre vigente solo representa el último.

### 1.5 Máquina de estados

```text
                 Pasar a En seguimiento
   ┌─────────┐  ───────────────────────►  ┌───────────────┐
   │ Abierto │                              │ En seguimiento│
   └─────────┘                              └───────┬───────┘
                                                     │
                          Cerrar (actividad nueva +  │
                          motivo no vacío)           │
                                                     ▼
                                              ┌────────────┐
                                              │  Cerrado   │
                                              └─────┬──────┘
                                                    │
                              Reabrir (motivo no     │
                              vacío)                │
                                                    ▼
                                             En seguimiento
```

Reglas que sostiene la máquina:

- `Abierto` solo pasa a `En seguimiento`.
- `En seguimiento` solo pasa a `Cerrado` si existe al menos una actividad **posterior a la última
  reapertura** (o desde la apertura si nunca se reabrió) y el motivo no está vacío.
- `Cerrado` no admite actividades ni cambios de estado, pero sigue visible para consulta.
- `Cerrado` solo puede volver a `En seguimiento` mediante **Reabrir expediente**, con motivo
  obligatorio.
- Cada transición se registra en el historial.

### 1.6 Arquitectura del frontend

El frontend se divide por responsabilidad, no por tipo de archivo:

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| Rutas | `routes/AppRoutes.jsx` | Mapa de URLs y carga de páginas |
| Layout | `layouts/AppLayout.jsx` | Encabezado, navegación, contenido y pie |
| Páginas | `pages/*.jsx` | Estado de pantalla, formularios y acciones |
| Componentes | `components/*.jsx` | Piezas reutilizables: alertas, campos, insignias e historial |
| API | `api/client.js`, `api/expedientes.js`, `api/normalizar.js` | Transporte HTTP, endpoints y adaptación de datos |
| Hooks | `hooks/useDebounce.js` | Retardo de la búsqueda |
| Utilidades | `utils/*.js` | Catálogos, fechas, errores y reglas del historial |
| Estilos | `styles/*.css` | Variables, estilos globales y adaptación responsive |

La separación clave es **páginas → API → normalización**. Las pantallas no conocen URLs absolutas
ni detalles del transporte; solo trabajan con el modelo normalizado. Si el backend cambia un nombre
de campo, se ajusta `normalizar.js` una sola vez.

### 1.7 Arquitectura del backend

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| Arranque | `Program.cs` | Servicios, CORS, Swagger y middleware de errores |
| Controladores | `Controllers/ExpedientesController.cs` | Exponer las rutas y delegar en el servicio |
| Servicio | `Services/ExpedienteService.cs` | Validaciones, reglas de negocio, persistencia y migración |
| Modelos | `Models/Expediente.cs`, `Models/Dtos.cs` | Entidades y cuerpos de petición |
| Excepciones | `Services/Excepciones.cs` | Errores de validación, regla de negocio y no encontrado |
| Datos | `Data/expedientes.json` | Estado persistente de la demostración |

`ExpedienteService` se registra como **singleton** y protege sus operaciones con un candado. Esto
es suficiente para una aplicación local de un solo proceso. No se diseñó para múltiples instancias
ni para escritura concurrente desde varios servidores.

### 1.8 Contrato de la API

| Acción | Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| Listar / buscar | `GET /api/expedientes?busqueda=&estado=` | — | Arreglo de resúmenes |
| Detalle + historial | `GET /api/expedientes/{id}` | — | Expediente completo |
| Abrir | `POST /api/expedientes` | `{ solicitante, descripcion, responsable, categoria? }` | `201` + expediente |
| Actividad | `POST /api/expedientes/{id}/actividades` | `{ descripcion, tipoActividad? }` | `200` + expediente |
| Cambiar estado | `POST /api/expedientes/{id}/estado` | `{ nuevoEstado, motivoCierre? }` | `200` + expediente |
| Reabrir | `POST /api/expedientes/{id}/reabrir` | `{ motivo }` | `200` + expediente en `En seguimiento` |

Formato de error:

```json
{
  "mensaje": "Hay datos que debe corregir.",
  "errores": {
    "motivo": "Ingrese el motivo de la reapertura."
  }
}
```

- `400`: datos inválidos, con detalle por campo.
- `404`: expediente inexistente.
- `409`: operación no permitida por el estado actual.

### 1.9 Persistencia y migración

- La API carga `Data/expedientes.json` al iniciar y lo crea si no existe.
- Cada escritura usa un archivo temporal y luego reemplaza el original, para reducir el riesgo de
  corrupción.
- Al iniciar, los expedientes cerrados que solo tenían `fechaCierre` y `motivoCierre` se migran a
  `cierres[]` con una primera entrada. Así el esquema nuevo es compatible con datos anteriores.
- El repositorio incluye dos expedientes ficticios:
  - `EXP-0001`: cerrado, con actividad y motivo de cierre.
  - `EXP-0002`: en seguimiento, sin actividad registrada.

### 1.10 Validación y manejo de errores

La API es la **autoridad** de las reglas. El frontend valida lo mismo para dar respuesta inmediata,
pero no reemplaza la validación del servidor.

- El backend recorta con `trim` los campos obligatorios.
- Devuelve `errores` por campo cuando corresponde.
- El frontend lee esos errores con `errorDeCampo`, tolerando mayúsculas y arreglos.
- Los mensajes de acción se muestran en una alerta; los de campo, junto al `input` o `textarea`.
- Los formularios usan `aria-invalid`, `aria-describedby`, `role="alert"` y foco visible.

### 1.11 Ejecución local

```powershell
# Terminal 1
cd dotnet-api
dotnet run --launch-profile http

# Terminal 2
cd frontend
npm install
npm run dev
```

- API: `http://localhost:5125`
- Swagger: `http://localhost:5125/swagger`
- Aplicación: `http://localhost:5173`
- URL configurable con `VITE_API_URL`; valor por defecto: `http://localhost:5125`.

Si la máquina solo tiene el runtime de .NET 10, la API se ejecuta con:

```powershell
dotnet run --launch-profile http --roll-forward Major
```

### 1.12 Alcance y límites arquitectónicos

La arquitectura asume un prototipo académico local:

- Sin autenticación, roles ni JWT.
- Sin base de datos relacional.
- Sin edición ni eliminación de expedientes o actividades.
- Sin adjuntos, notificaciones, reportes ni dashboard.
- Sin despliegue en la nube.
- Una sola instancia de la API y un solo archivo de datos.

Estos límites son deliberados y se explican en la segunda parte.

---

## 2. Justificación de las decisiones tomadas

### 2.1 Criterios usados para decidir

Cada decisión se evaluó con cinco criterios:

1. **Cumplir el enunciado** sin agregar funciones que no otorgan puntos.
2. **Terminar el recorrido completo** en el tiempo de la competencia.
3. **Mantener el sistema comprensible** para el equipo y para quien lo evalúe.
4. **Conservar los datos y el historial** de forma verificable.
5. **Poder demostrar** cada regla con una prueba concreta.

### 2.2 Resumen de decisiones y beneficios

| Decisión | Alternativa descartada | Beneficio principal |
| --- | --- | --- |
| Dos proyectos: API + SPA | Microservicios o solución por capas con varios proyectos | Menos configuración, arranque rápido y una sola ruta de datos |
| React + Vite + React Router | Plantillas con framework pesado o JavaScript sin componentes | Interfaz declarativa, recarga rápida y rutas claras |
| ASP.NET Core Web API | Node/Express, PHP u otro backend | Tipado, Swagger, validación y estructura conocida por el equipo |
| Persistencia en JSON | SQL Server + EF Core | Cero infraestructura y datos que sobreviven al reinicio |
| Sin autenticación ni roles | Login, JWT y permisos | Se enfoca el tiempo en el flujo que evalúa el enunciado |
| Alcance mínimo | Dashboard, clientes, catálogos, adjuntos, reportes | Menos superficie de error y demo más corta |
| Máquina de estados explícita | Cambios de estado libres | Reglas claras y errores `409` comprensibles |
| Historial append-only | Sobrescribir el estado o el historial | Trazabilidad completa de lo ocurrido |
| `cierres[]` separado del cierre vigente | Reconstruir cierres desde el historial | Los cierres y reaperturas nunca se pierden |
| Reapertura con motivo y actividad nueva | Permitir cerrar con cualquier actividad histórica | Evita cierres sin trabajo real después de reabrir |
| Normalización en un solo archivo | Adaptar campos en cada pantalla | Un único punto de cambio ante variaciones del backend |
| Contrato de errores `400/404/409` | Mensajes genéricos o solo alertas | El usuario sabe qué corregir y por qué falló |
| CSS plano con variables | Tailwind, MUI u otra librería visual | Control total, sin dependencias y con identidad propia |
| Accesibilidad básica | Interfaz solo visual | Uso con teclado, lectores de pantalla y foco visible |
| Verificación con API + navegador headless | Confiar solo en pruebas manuales | Evidencia repetible de los recorridos críticos |
| Datos de demostración versionados | Crear todo a mano durante la demo | La demo inicia con casos listos para probar |
| CORS abierto y sin redirección HTTPS | Configurar HTTPS y orígenes cerrados | El frontend local funciona sin fricción |

### 2.3 Dos proyectos en lugar de una arquitectura distribuida

**Decisión:** un frontend React y una API ASP.NET Core, sin capas adicionales ni microservicios.

**Por qué:** el enunciado pide organizar expedientes, registrar actividades y consultar estado e
historial. No pide alta disponibilidad, despliegue ni separación de dominios. Una solución
distribuida habría agregado configuración, contenedores y puntos de falla sin mejorar la nota.

**Beneficio:** el equipo puede levantar todo con dos comandos, explicar el flujo en una sola
pantalla y dedicar el tiempo a las reglas de negocio y a la interfaz.

**Costo asumido:** no es una arquitectura para producción masiva; se documenta como prototipo.

### 2.4 React + Vite + React Router

**Decisión:** una SPA con React 19, Vite y React Router.

**Por qué:** el detalle del expediente cambia con frecuencia (actividad, estado, cierre,
reapertura). React permite actualizar solo esa vista sin recargar. Vite ofrece arranque y recarga
rápidos. React Router da URLs claras: `/expedientes`, `/expedientes/nuevo` y
`/expedientes/:id`.

**Beneficio:** la reapertura se refleja de inmediato en la pantalla y el usuario conserva el
contexto. Las rutas permiten abrir un expediente directamente y recargar sin perder la página.

**Alternativa descartada:** una aplicación con recargas completas o un framework con más
configuración inicial. Habría sido más lenta de iterar y de demostrar.

### 2.5 ASP.NET Core Web API

**Decisión:** ASP.NET Core con controladores, DTOs y un servicio de dominio.

**Por qué:** el equipo ya contaba con el entorno .NET, Swagger facilita probar los endpoints y el
tipado ayuda a mantener el contrato. El middleware de excepciones permite devolver errores JSON
consistentes sin repetir lógica en cada acción.

**Beneficio:** la API es fácil de inspeccionar y de probar desde Swagger; el frontend recibe
siempre la misma forma de respuesta y de error.

### 2.6 Persistencia en JSON en lugar de SQL Server + EF Core

**Decisión:** guardar todo en `dotnet-api/Data/expedientes.json`.

**Por qué:** el requisito real es “conservar los datos al reiniciar”, no administrar una base de
datos. SQL Server habría exigido instalar un servidor, crear migraciones, configurar cadenas de
conexión y resolver permisos. Para dos expedientes de demostración, eso es infraestructura sin
beneficio académico.

**Beneficio:** el proyecto arranca en cualquier máquina con .NET, los datos se pueden inspeccionar
con un editor de texto y la demo no depende de un servicio externo. La escritura con archivo
temporal reduce el riesgo de corrupción.

**Costo asumido:** no hay concurrencia multiusuario ni consultas complejas. Se documenta como
limitación y se mitiga con un candado en el servicio para un solo proceso.

### 2.7 Sin autenticación, JWT ni roles

**Decisión:** no implementar login ni permisos.

**Por qué:** el enunciado no los pide y el prototipo se ejecuta localmente con datos ficticios.
Agregar autenticación habría consumido tiempo, introducido redirecciones y roto el recorrido de la
demo sin sumar puntos.

**Beneficio:** cualquier evaluador puede abrir la aplicación y probar el flujo completo sin
credenciales. El equipo invierte el tiempo en las reglas que sí se califican.

**Límite:** en un entorno real sería obligatorio agregar autenticación, autorización y auditoría.

### 2.8 Alcance mínimo y rechazo de funciones fuera del enunciado

**Decisión:** limitar la aplicación a apertura, listado/búsqueda, detalle, actividades, cierre y
reapertura.

**Por qué:** cada función adicional (dashboard, clientes, catálogos, adjuntos, notificaciones,
reportes) amplía el modelo, la interfaz y las pruebas. En una competencia con tiempo acotado, eso
aumenta el riesgo de no terminar el recorrido principal.

**Beneficio:** el sistema hace pocas cosas, pero las hace completas y verificables. La interfaz se
explica en una sola demostración y el equipo puede defender cada pantalla.

### 2.9 Máquina de estados explícita

**Decisión:** permitir solo `Abierto → En seguimiento → Cerrado` y `Cerrado → En seguimiento`
mediante reapertura.

**Por qué:** un cambio de estado libre permitiría saltos inválidos (por ejemplo, cerrar desde
`Abierto`) y haría ambiguo el historial. La máquina explícita concentra las reglas en el servicio
y devuelve `409` cuando la operación no corresponde.

**Beneficio:** el comportamiento es predecible, fácil de probar y fácil de explicar. El frontend
puede deshabilitar acciones inválidas y el backend sigue siendo la autoridad.

### 2.10 Historial append-only y cierres acumulados

**Decisión:** nunca borrar ni reescribir entradas del historial; guardar todos los cierres en
`cierres[]`.

**Por qué:** el valor del sistema está en saber qué pasó y cuándo. Si al reabrir se borrara el
cierre anterior, se perdería la trazabilidad. Si los cierres se reconstruyeran solo desde el
historial, cualquier cambio futuro en el formato rompería la vista.

**Beneficio:** cada cierre conserva su fecha, motivo y, si corresponde, su reapertura. El cierre
vigente (`fechaCierre`/`motivoCierre`) se mantiene separado para consultas rápidas, pero la fuente
completa es `cierres[]`.

**Evidencia:** tras dos ciclos de cierre y reapertura, la interfaz muestra ambos cierres con sus
motivos y fechas de reapertura.

### 2.11 Reapertura con motivo y actividad posterior obligatoria

**Decisión:** reabrir solo un expediente `Cerrado`, con motivo no vacío (máximo 500 caracteres), y
exigir una actividad **posterior a la última reapertura** para volver a cerrar.

**Por qué:** reabrir sin motivo dejaría un hueco en la trazabilidad. Permitir cerrar con una
actividad antigua haría que el nuevo cierre no represente trabajo realizado después de retomar el
caso. La regla obliga a registrar el motivo y a dejar evidencia del seguimiento nuevo.

**Beneficio:** el historial cuenta una historia coherente: cierre, motivo de reapertura, actividad
nueva y nuevo cierre. La API devuelve `400` si el motivo falta y `409` si no hay actividad nueva;
la interfaz explica ambas situaciones antes de que el usuario falle.

### 2.12 Normalización en un solo punto

**Decisión:** adaptar las respuestas del backend en `frontend/src/api/normalizar.js`.

**Por qué:** el contrato puede variar (por ejemplo, `persona` en lugar de `solicitante`, o
`fechaCreacion` en lugar de `fechaApertura`). Si cada pantalla adaptara los nombres, un cambio
obligaría a tocar varios archivos y aumentaría el riesgo de inconsistencias.

**Beneficio:** un único lugar concentra la compatibilidad. Al agregar `cierres[]`, la normalización
también tolera respuestas antiguas que solo traían `fechaCierre`, sin romper las pantallas.

### 2.13 Contrato de errores `400`, `404` y `409`

**Decisión:** devolver siempre `{ mensaje, errores? }` con el código HTTP adecuado.

**Por qué:** un `500` genérico no dice qué corregir. Separar validación (`400`), recurso
inexistente (`404`) y regla de estado (`409`) permite que el frontend muestre el mensaje correcto
y que el usuario entienda si el problema son los datos o el estado del expediente.

**Beneficio:** la interfaz muestra errores por campo (`errores.solicitante`, `errores.motivo`,
etc.) y alertas de acción. Las pruebas pueden verificar códigos y mensajes concretos.

### 2.14 CSS plano con variables y sin librería visual

**Decisión:** usar CSS propio con variables en `styles/variables.css`.

**Por qué:** la interfaz es pequeña y tiene una identidad institucional sencilla (azul marino,
dorado, superficies claras). Una librería como Tailwind o MUI habría agregado dependencias,
configuración y estilos difíciles de explicar en la defensa.

**Beneficio:** control total del diseño, menos peso, cero dependencias visuales y una curva de
aprendizaje mínima. Las clases están en español y siguen la misma convención en todas las
pantallas.

### 2.15 Accesibilidad y detalles de experiencia

**Decisión:** asociar etiquetas, marcar errores con `aria-invalid`, describirlos con
`aria-describedby`, usar `role="alert"` y mantener foco visible. La búsqueda usa un retardo de
350 ms y el listado muestra “Sin resultados”.

**Por qué:** la accesibilidad no es un adorno; permite usar la aplicación con teclado y lectores de
pantalla. El retardo evita una petición por cada tecla y el estado vacío evita que la pantalla
parezca rota.

**Beneficio:** la aplicación se puede recorrer sin ratón, los errores se entienden y la lista no
genera ruido visual ni peticiones innecesarias.

### 2.16 Verificación con API y navegador headless

**Decisión:** probar la API con peticiones directas y la interfaz con un navegador automatizado
(Edge headless), sin agregar un framework de pruebas al repositorio.

**Por qué:** el objetivo era demostrar el recorrido completo, no construir una suite de pruebas
mantenible. Los scripts temporales permitieron verificar estados, errores y persistencia sin
ampliar el alcance del proyecto.

**Beneficio:** se comprobaron los seis endpoints, los códigos `200/201/400/404/409`, la
persistencia tras reiniciar y los recorridos de listado, apertura, actividad, cierre, reapertura y
segundo cierre. `npm run lint` y `npm run build` se ejecutaron antes de cerrar el cambio.

**Límite:** no hay pruebas automatizadas versionadas; en un proyecto real se agregaría un proyecto
de tests y una suite E2E permanente.

### 2.17 Datos de demostración versionados y migración al iniciar

**Decisión:** incluir dos expedientes ficticios en `Data/expedientes.json` y migrar al iniciar los
cierres del esquema anterior.

**Por qué:** la demo necesita casos listos para probar. Si el archivo se creara vacío, el evaluador
tendría que abrir expedientes antes de ver el detalle, el historial y la reapertura. La migración
evita que el arranque de la API “ensucie” el árbol de Git con cambios automáticos.

**Beneficio:** la demostración inicia con un cerrado (`EXP-0001`) y un expediente en seguimiento
(`EXP-0002`). El esquema nuevo convive con datos antiguos y no se pierde información.

### 2.18 CORS abierto y sin redirección HTTPS en local

**Decisión:** permitir cualquier origen en la política CORS y no usar `UseHttpsRedirection`.

**Por qué:** el frontend corre en `http://localhost:5173` y la API en `http://localhost:5125`.
Redirigir a HTTPS rompería las peticiones del navegador y exigiría certificados. Restringir CORS
agregaría configuración sin mejorar la seguridad de un prototipo local.

**Beneficio:** el recorrido funciona desde el primer arranque. En un despliegue real se cerraría
CORS a los orígenes permitidos y se configuraría HTTPS.

### 2.19 Nota sobre .NET 10 y `--roll-forward`

**Decisión:** documentar el comando `dotnet run --launch-profile http --roll-forward Major` para
máquinas que solo tienen el runtime de .NET 10.

**Por qué:** el proyecto apunta a `net8.0`, pero no todas las máquinas de la competencia tienen
instalado el runtime 8. El roll-forward permite ejecutar la aplicación con el runtime mayor sin
cambiar el objetivo del proyecto.

**Beneficio:** la demo no se bloquea por una diferencia de entorno. Queda documentado en `README.md`
y `AGENTS.md` para que cualquier integrante lo resuelva sin investigar.

### 2.20 Documentación como parte de la entrega

**Decisión:** mantener `README.md`, `AGENTS.md` y este documento.

**Por qué:** el proyecto se evalúa y se retoma por otras personas. Un README con comandos, contrato,
reglas y pruebas reduce el tiempo de incorporación. `AGENTS.md` guía a agentes de IA y
colaboradores para no romper las reglas. Este documento explica el “por qué” detrás del “qué”.

**Beneficio:** la entrega es reproducible, las decisiones se pueden defender y el equipo evita
repetir discusiones ya resueltas.

### 2.21 Cómo se beneficia el programa en conjunto

La combinación de decisiones produce un sistema:

- **Completo:** cubre apertura, consulta, actividades, cierre y reapertura.
- **Trazable:** cada movimiento queda en el historial y cada cierre en `cierres[]`.
- **Predecible:** la máquina de estados y los códigos de error eliminan ambigüedades.
- **Mantenible:** frontend por capas, normalización central y backend con servicio único.
- **Demostrable:** datos de ejemplo, Swagger, comandos claros y recorridos verificados.
- **Acotado:** no promete funciones que el enunciado no pide ni que el tiempo no permite sostener.

En un escenario de producción, la evolución natural sería reemplazar el archivo JSON por una base
de datos, agregar autenticación y roles, versionar una suite de pruebas y preparar despliegue. La
arquitectura actual deja esos puntos identificados sin arrastrarlos al prototipo académico.

---

## Cierre

El sistema no intenta ser una plataforma jurídica completa. Intenta ser un prototipo honesto,
comprensible y verificable de la gestión de expedientes. La arquitectura de dos capas y la
persistencia en JSON permitieron llegar rápido al recorrido principal; la máquina de estados, el
historial append-only y `cierres[]` aseguran que el caso se pueda seguir en el tiempo; y la
normalización, el contrato de errores y la documentación hacen que el sistema sea fácil de
mantener y de explicar.

Esa es la decisión central del proyecto: **priorizar un flujo completo y trazable sobre una
arquitectura grande que no se podría terminar ni demostrar en el tiempo disponible**.
