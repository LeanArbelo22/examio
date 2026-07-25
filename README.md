# Examio Frontend

Frontend web de Examio, una plataforma académica para crear, rendir, corregir y analizar evaluaciones. La aplicación está desarrollada con Next.js 16, React 19 y TypeScript.

## Documentación del sistema

La documentación se divide por responsabilidad:

| Documento | Contenido |
|---|---|
| [README.md](./README.md) | Frontend: instalación, arquitectura, autenticación, servicios, hooks y convenciones |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Entorno local, puertos, health check y diagnóstico |
| [docs/API.md](./docs/API.md) | Contratos HTTP, endpoints, RBAC y testing de la API Node |
| [docs/DATABASE.md](./docs/DATABASE.md) | Modelo y procedimientos de SQL Server |
| [PLAN.md](./PLAN.md) | Plan técnico, fases, estado y deuda registrada |

Cuando exista una diferencia entre documentación y comportamiento, el código y el contrato efectivo de la API deben verificarse antes de implementar.

## Stack

- Next.js 16 con App Router.
- React 19.
- TypeScript 5.
- Tailwind CSS 4.
- NextAuth 4 con Credentials Provider.
- TanStack React Query 5.
- Zod 4.
- Recharts 3.
- ESLint 9 con reglas de Next.js.
- pnpm como gestor de dependencias.

## Requisitos

- Node.js compatible con Next.js 16.
- pnpm.
- API Node de Examio disponible.
- SQL Server accesible desde la API.

Puertos locales esperados:

| Servicio | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| API | `http://localhost:55803/api` |
| Health check | `http://localhost:55803/api/health` |

## Instalación y ejecución

```bash
pnpm install
pnpm env:check
pnpm dev
```

También se puede verificar el entorno antes de iniciar Next.js:

```bash
pnpm dev:checked
```

Otros comandos:

```bash
pnpm lint
pnpm build
pnpm start
```

Actualmente el frontend no posee infraestructura de tests automatizados. Su incorporación está registrada en [PLAN.md](./PLAN.md).

## Variables de entorno

Las variables locales se guardan en `.env.local`. Los archivos `.env*` están ignorados por Git y no deben contenerse en commits.

### Variables utilizadas por Next.js

| Variable | Obligatoria | Alcance | Descripción |
|---|---:|---|---|
| `NEXTAUTH_URL` | Sí | Servidor | URL canónica del frontend utilizada por NextAuth. En local: `http://localhost:3000`. |
| `NEXTAUTH_SECRET` | Sí | Servidor | Secreto utilizado para firmar y cifrar información de NextAuth. No debe exponerse al cliente. |
| `EXAMIO_API_URL` | Sí | Servidor | Base URL exclusiva de la API. En local: `http://localhost:55803/api`. No usar prefijo `NEXT_PUBLIC_`. |
| `NODE_ENV` | Automática | Servidor y build | `development`, `production` o `test`. Next.js la establece según el comando ejecutado. |
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | No | Cliente y servidor | Existe una comprobación que muestra una advertencia de desarrollo, pero actualmente **no implementa un bypass real**. No debe utilizarse como mecanismo de seguridad. |

Ejemplo sin valores reales:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generar-un-secreto-seguro>
EXAMIO_API_URL=http://localhost:55803/api
```

### Variables de la herramienta de diagnóstico

Estas variables son opcionales y solo afectan `pnpm env:check`:

| Variable | Default | Descripción |
|---|---|---|
| `EXAMIO_FRONTEND_URL` | `http://localhost:3000` | URL esperada del frontend. |
| `EXAMIO_BACKEND_URL` | `http://localhost:55803/api` | URL utilizada para comprobar health y conectividad. |

Ejemplo en PowerShell:

```powershell
$env:EXAMIO_BACKEND_URL="http://localhost:55803/api"
pnpm env:check
```

`EXAMIO_API_URL` se valida exclusivamente en servidor. El BFF y NextAuth
construyen sus destinos desde esa base y no aceptan URLs arbitrarias enviadas por
el navegador.

El cliente `apiFetch` aplica un timeout de 20 segundos, permite configurar
`timeoutMs` por operación y respeta el `AbortSignal` del consumidor. El BFF
limita además cada espera hacia la API a 15 segundos y normaliza su timeout
como `504 BFF_UPSTREAM_TIMEOUT`. Los servicios comparten el serializador de
query strings de `src/lib/query-string.ts`.

## Arquitectura

El flujo previsto para datos remotos es:

```text
Página o componente
        ↓
Hook de dominio (TanStack Query)
        ↓
Servicio API
        ↓
apiFetch
        ↓
BFF `/api/examio/*`
        ↓
API Node / SQL Server
```

Responsabilidades:

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Routing y composición | `src/app` | Rutas, layouts, páginas, route handlers y Server Actions |
| UI compartida | `src/components` | Componentes visuales, layouts, formularios y providers |
| Estado remoto | `src/hooks` | Queries, mutaciones, caché e invalidaciones |
| Acceso HTTP | `src/services/api` | Endpoints y serialización de payloads por dominio |
| Infraestructura | `src/lib` | Cliente HTTP, NextAuth, schemas y datos auxiliares |
| Contratos | `src/types` | Entidades, DTOs, payloads y ampliaciones de NextAuth |
| Assets | `src/assets` | Imágenes y recursos importados por componentes |

No existen actualmente `src/context`, `src/utils`, `src/styles` ni `src/providers`. Los providers están en `src/components/providers` y los estilos globales en `src/app/globals.css`.

## Routing

El proyecto utiliza App Router.

### Rutas públicas

- `/`
- `/login`
- `/api/auth/[...nextauth]`

### Administración

- `/admin`
- `/admin/analitica`
- `/admin/alumnos`
- `/admin/carreras`
- `/admin/comisiones`
- `/admin/docentes`
- `/admin/materias`
- `/admin/usuarios`

### Alumno

- `/alumno`
- `/alumno/resultados`
- `/alumno/examen/[id]`
- `/alumno/examen/[id]/actividad/[actividadId]`
- `/alumno/intento/[idIntento]`

### Docente

- `/profesor`
- `/profesor/crear-examen`
- `/profesor/examen/[idPublicacion]`
- `/profesor/examen/[idPublicacion]/detalle`
- `/profesor/intento/[idIntento]`
- `/profesor/reportes`

Los route groups `(role)` y `(gestion)` organizan layouts y código sin agregar segmentos a la URL.

## Layouts y providers

### Root layout

`src/app/layout.tsx`:

- Carga Geist.
- Monta `Providers`.
- Renderiza `Navbar`.
- Aplica estilos globales.
- Actualmente bloquea el menú contextual en toda la aplicación; su limitación al entorno de examen está pendiente.

### Layout de roles

`src/app/(role)/layout.tsx` agrega:

- `Header`.
- `Breadcrumbs`.
- Contenedor común para las áreas autenticadas.

### Providers

`src/components/providers/Providers.tsx` monta:

- `QueryClientProvider`.
- `SessionProvider`.
- `SessionExpiredModal`.

React Query tiene `retry: false` para queries y caches globales que intentan detectar errores 401.

## Autenticación

La autenticación utiliza NextAuth 4 con Credentials Provider y estrategia de sesión JWT.

### Flujo

```text
LoginForm
  ↓ Server Action
loginAction + Zod
  ↓ validación correcta
signIn("credentials")
  ↓
POST /api/auth/callback/credentials
  ↓
CredentialsProvider.authorize()
  ↓
POST API Node /api/auth/login
  ↓
access token + refresh token + usuario
  ↓
callbacks jwt/session
  ↓
cookie JWT HttpOnly de NextAuth
```

El JWT cifrado de NextAuth conserva access token, refresh token, expiraciones e
identidad únicamente del lado servidor. El objeto devuelto por `useSession()` no
expone esas credenciales.

El callback `jwt` renueva silenciosamente el access token antes de vencer. La
renovación rota ambos tokens mediante `POST /api/auth/refresh`, utiliza una clave
de idempotencia estable por operación y comparte renovaciones concurrentes dentro
del proceso. Si la API devuelve `401 ACCESS_TOKEN_EXPIRED`, `apiFetch` actualiza
la sesión y reintenta la solicitud original una sola vez.

El logout de NextAuth ejecuta `POST /api/auth/logout` de forma idempotente y luego
elimina la sesión local aun si la API no está disponible.

### Roles y redirecciones

`src/middleware.ts` aplica:

| Rol JWT | Ruta principal |
|---|---|
| `admin` | `/admin` |
| `docente` | `/profesor` |
| `alumno` | `/alumno` |

Un usuario autenticado no puede navegar hacia el área de otro rol desde el frontend. La autorización definitiva siempre corresponde al backend.

### Datos añadidos a sesión

Las ampliaciones de NextAuth en `src/types/next-auth.d.ts` incluyen:

- `id`
- `role`
- `identificadorInstitucional`
- `idAlumno`
- `idDocente`
- `authError` tipado, únicamente cuando falla definitivamente la renovación

### Limitaciones conocidas

- La cookie de NextAuth puede dividirse en varios fragmentos por contener las
  credenciales cifradas; NextAuth administra ese particionado.
- El single-flight en memoria evita duplicados dentro de una instancia. La
  idempotencia persistida por la API resuelve concurrencia entre pestañas o
  instancias.
- Las respuestas de una evaluación utilizan una outbox IndexedDB por
  intento/pregunta. React Query mantiene la representación visual y la outbox
  conserva versiones pendientes o confirmadas hasta finalizar el intento.

### Continuidad de evaluaciones

Las respuestas se persisten localmente antes del request. La UI diferencia
`Guardando`, `Guardado`, `Pendiente de sincronización` y rechazo no recuperable.
Ante pérdida de conectividad no se ejecuta refresh ni logout: el intento continúa
visible, las respuestas pendientes se sincronizan al recuperar el evento
`online` y la entrega espera a que la cola quede vacía.

La outbox usa IndexedDB nativo, conserva solo respuestas académicas y nunca
credenciales. Si IndexedDB no está disponible, utiliza memoria durante la vista
y advierte que no debe cerrarse ni recargarse la pestaña.

## Comunicación con la API

### Cliente HTTP

`src/lib/api.ts` expone:

- `apiFetch<T>()`
- `ApiError`

`apiFetch`:

1. Valida que el endpoint sea una ruta relativa.
2. Llama al BFF same-origin `/api/examio/*`.
3. Interpreta el contrato `{ success, data, message, code, errors }`.
4. Ante `401 ACCESS_TOKEN_EXPIRED`, solicita una actualización de la cookie
   NextAuth y repite una sola vez si el body es reproducible.
5. Devuelve directamente `data` o lanza `ApiError` tipado.

El Route Handler BFF obtiene el JWT de NextAuth en servidor, agrega el bearer de
la API y preserva método, query string, body, status y respuesta. No reenvía la
cookie, autorización ni headers arbitrarios del navegador hacia la API.

### Servicios

Los servicios están organizados por dominio en `src/services/api`:

- `actas.api.ts`
- `admin.api.ts`
- `alumnos.api.ts`
- `auth.api.ts`
- `carreras.api.ts`
- `comisiones.api.ts`
- `divisiones.api.ts`
- `docentes.api.ts`
- `evaluaciones.api.ts`
- `materias.api.ts`
- `reportes.api.ts`
- `usuarios.api.ts`

Los requests utilizan PascalCase cuando así lo requiere la API. Las respuestas se consumen en camelCase.

### Regla para nuevas integraciones

Una nueva integración debe seguir:

```text
types → service → hook → component/page
```

No debe realizar `fetch` directamente desde páginas o componentes.

## Hooks

Los hooks de dominio se encuentran en `src/hooks`:

| Archivo | Dominio |
|---|---|
| `useActas.tsx` | Actas y cierre académico |
| `useAdmin.tsx` | Analítica administrativa |
| `useAlumnos.tsx` | CRUD y materias del alumno |
| `useCarreras.tsx` | CRUD, plan y alumnos |
| `useComisiones.tsx` | Comisiones y alumnos |
| `useDivisiones.tsx` | Divisiones |
| `useDocentes.tsx` | CRUD, materias y comisiones docentes |
| `useEvaluaciones.tsx` | Evaluaciones, intentos, corrección y telemetría |
| `useMaterias.tsx` | CRUD, comisiones y alumnos |
| `useReportes.ts` | Reporte de rendimiento |
| `useUsuarios.tsx` | Usuarios |

Convenciones actuales:

- `useQuery` para lecturas.
- `useMutation` para escrituras.
- `enabled` cuando una query necesita un identificador.
- `invalidateQueries` después de mutaciones.
- Los query params forman parte de la query key.

Los retornos y nombres todavía no están normalizados entre todos los hooks.

## Query keys

Las query keys son arrays serializables. El primer elemento representa el dominio o recurso.

### Convenciones observadas

| Dominio | Ejemplos |
|---|---|
| Actas | `["actas"]`, `["acta", id]` |
| Alumnos | `["alumnos"]`, `["alumno", matricula]`, `["alumnos", matricula, "materias"]` |
| Administración | `["admin", "analitica", filtros]` |
| Carreras | `["carreras"]`, `["planDeEstudio", carreraId]`, `["alumnosInscriptos", carreraId]` |
| Comisiones | `["comisiones"]`, `["alumnosComision", id]` |
| Divisiones | `["divisiones"]`, `["division", id]` |
| Docentes | `["docentes"]`, `["docente", legajo, "evaluaciones"]`, `["docente", legajo, "comisiones"]` |
| Evaluaciones | `["evaluacion", id, "detalle"]`, `["evaluacion", id, "alumnos"]`, `["publicacion", id]` |
| Examen | `["examen", "sorteo", idIntento]`, `["pregunta", idPregunta, "opciones", idIntento]` |
| Intentos | `["intento", id, "completo"]`, `["intentos", "alumno", idAlumno]` |
| Materias | `["materias"]`, `["comisionesMateria", id]`, `["alumnosMateria", id]` |
| Reportes | `["reportes", "rendimiento", "listado", filtros]`, `["reportes", "rendimiento", "detalle", matricula, filtros]` |
| Usuarios | `["usuarios"]` |

### Reglas para nuevas query keys

- Usar arrays, nunca strings concatenados.
- Colocar primero el dominio.
- Incorporar todos los parámetros que cambien el resultado.
- Mantener la misma jerarquía entre query e invalidación.
- No incluir funciones, instancias de clases ni valores no serializables.
- Evitar crear una convención nueva si ya existe una equivalente.

La creación de fábricas centralizadas de query keys está planificada para la fase 4.

## Componentes reutilizables

### UI

- `Button`
- `Modal`
- `ErrorMessage`
- `DashboardCard`
- `Breadcrumbs`
- `FullscreenWrapper`

### Layout

- `Navbar`
- `Header`
- `Footer`

### Reportes

- `ReportLayout`
- `ReportFilterPanel`
- `ReportKpiGrid`
- `ReportTable`
- `ChartCard`
- `ReportCharts`
- `StudentReportDetail`

Antes de crear un componente nuevo se debe comprobar si existe uno equivalente. Los componentes de reportes deben validarse con un segundo reporte antes de generalizarse más.

## Estilos

- Tailwind CSS 4 mediante `@import "tailwindcss"`.
- Estilos globales en `src/app/globals.css`.
- Fuente Geist mediante `next/font`.
- Paleta principal `slate` + `indigo`.
- Superficies claras, bordes suaves, radios amplios y sombras sutiles.

No se utilizan CSS Modules, Sass, Styled Components ni una librería UI externa.

## Convenciones

- Alias `@/` para imports desde `src`.
- Componentes en PascalCase.
- Hooks con prefijo `use`.
- Servicios agrupados por dominio.
- Tipos compartidos antes de crear tipos locales duplicados.
- UI, lógica de negocio y acceso a API en capas separadas.
- Nuevas funcionalidades con estados de loading, error y vacío.
- Memoización solamente cuando aporte un beneficio verificable.
- Refactorizaciones relevantes sujetas a propuesta y aprobación.

## Verificación antes de entregar cambios

```bash
pnpm lint
pnpm build
```

El repositorio contiene errores ESLint preexistentes. Como mínimo, todo archivo nuevo o modificado debe pasar ESLint focalizado y TypeScript. No deben atribuirse errores preexistentes a una funcionalidad nueva.

## Riesgos y deuda técnica

El inventario completo y el estado de cada iniciativa se mantienen en [PLAN.md](./PLAN.md). Las prioridades principales son:

1. Consolidar autenticación y sesión.
2. Centralizar configuración y cliente API.
3. Fortalecer contratos TypeScript.
4. Normalizar React Query y manejo de errores.
5. Incorporar testing frontend.
6. Mejorar accesibilidad.
7. Separar mocks de código productivo.

Este README debe actualizarse cuando cambien arquitectura, variables, autenticación, scripts, rutas, servicios o convenciones.
