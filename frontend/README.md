# Frontend — Bufete Popular

Aplicación React (Vite + React Router) para el prototipo de gestión de expedientes.
La documentación completa del proyecto, el contrato de la API y las pruebas están en el
[`README.md`](../README.md) de la raíz.

## Ejecutar

```powershell
npm install
npm run dev
```

- Aplicación: <http://localhost:5173>
- API esperada: <http://localhost:5125>

## Configuración

Copia `.env.example` como `.env` si necesitas cambiar la URL de la API:

```dotenv
VITE_API_URL=http://localhost:5125
```

Sin `.env`, el cliente usa `http://localhost:5125` por defecto.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Vista previa de la compilación |
| `npm run lint` | Revisión con Oxlint |

## Organización

```text
src/
├── api/          # cliente fetch, endpoints y normalización de respuestas
├── components/   # Alerta, Campo, EstadoBadge, HistorialTimeline
├── hooks/        # useDebounce
├── layouts/      # AppLayout
├── pages/        # Listado, Nuevo, Detalle, No encontrado
├── routes/       # AppRoutes
├── styles/       # variables, global y responsive
└── utils/        # catálogos, formatos, errores e historial
```

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/expedientes` | Listado y búsqueda |
| `/expedientes/nuevo` | Formulario de apertura |
| `/expedientes/:id` | Detalle, historial y acciones |

No hay login ni rutas protegidas: la API no usa autenticación.
