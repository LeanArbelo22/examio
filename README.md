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
- TypeScript 5 con `strict: true`.
- Tailwind CSS 4.
- NextAuth 4 con Credentials Provider.
- TanStack React Query 5.
- Zod 4.
- Recharts 3.
- Vitest 4, jsdom y React Testing Library para tests unitarios y de componentes.
- Mock Service Worker 2 para simular contratos HTTP en tests sin levantar la API.
- ESLint 9 con reglas de Next.js.
- npm como gestor de dependencias.

## Requisitos

- Node.js compatible con Next.js 16.
- npm.
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
npm install
npm run env:check
npm run dev
```

También se puede verificar el entorno antes de iniciar Next.js:

```bash
npm run dev:checked
```

Otros comandos:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run build
npm run start
```

Para desarrollar tests en modo interactivo usar `npm test`. Los archivos se ubican junto
al módulo probado con sufijo `*.test.ts` o `*.test.tsx`.

Las librerías de testing cumplen responsabilidades separadas:

- **Vitest:** runner, assertions, mocks de funciones y ejecución en modo interactivo o CI.
- **jsdom:** implementación del DOM para ejecutar componentes React sin navegador real.
- **React Testing Library:** render y consultas orientadas a la experiencia del usuario.
- **user-event:** interacciones de usuario más fieles que invocar handlers directamente.
- **jest-dom:** matchers legibles para estado, visibilidad y accesibilidad del DOM.
- **MSW:** intercepta `fetch` en los tests y responde mediante contratos HTTP declarativos.
  La configuración usa `setupServer` de Node; no genera un Service Worker productivo,
  no intercepta el navegador real y no requiere que la API Examio esté levantada.
- **fake-indexeddb:** implementación en memoria de la API estándar IndexedDB para
  verificar la outbox durable en Node/jsdom. Solo se usa en tests y no reemplaza ni
  modifica el almacenamiento del navegador en producción.
- **Playwright:** ejecuta flujos críticos en Chromium contra Next.js, NextAuth,
  middleware y BFF reales. Una API efímera local aporta contratos deterministas sin
  conectarse a SQL Server, usar cuentas reales ni persistir datos académicos.

El servidor compartido vive en `src/test/msw/server.ts`; se inicia desde
`vitest.setup.ts`, restaura handlers después de cada test y falla ante requests no
declarados. Los tests de `apiFetch` simulan las rutas same-origin `/api/examio/*` y
`/api/auth/session`, conservando la frontera BFF sin conocer tokens.

Los hooks de React Query se renderizan con un `QueryClient` nuevo por caso mediante
`src/test/query-client.tsx`. El harness desactiva reintentos para que los estados sean
deterministas y evita compartir caché entre tests. Los servicios se mockean cuando el
objetivo es verificar `enabled`, query keys, payloads o invalidaciones; MSW se reserva
para probar el límite HTTP real.

La cobertura actual incluye schemas, transformadores, utilidades, componentes y
reportes, el cliente HTTP con refresh/reintento, hooks de dominio, outbox, sesión y
entrega coordinada. Los callbacks server-side de NextAuth cubren login, refresh,
single-flight, logout y ausencia de credenciales en la sesión pública. Los E2E viven
en `e2e/`; `playwright.config.ts` levanta el frontend en el puerto 3100 y el stub en
el 55813, usa identidades ficticias `@cervantes.edu.ar` y nunca toca la base real.
La primera ejecución requiere `npx playwright install chromium`.

## Variables de entorno

Las variables locales se guardan en `.env.local`. Los archivos `.env*` están ignorados por Git y no deben contenerse en commits.

### Variables utilizadas por Next.js

| Variable | Obligatoria | Alcance | Descripción |
|---|---:|---|---|
| `NEXTAUTH_URL` | Sí | Servidor | URL canónica del frontend utilizada por NextAuth. En local: `http://localhost:3000`. |
| `NEXTAUTH_SECRET` | Sí | Servidor | Secreto utilizado para firmar y cifrar información de NextAuth. No debe exponerse al cliente. |
| `EXAMIO_API_URL` | Sí | Servidor | Base URL exclusiva de la API. En local: `http://localhost:55803/api`. No usar prefijo `NEXT_PUBLIC_`. |
| `NODE_ENV` | Automática | Servidor y build | `development`, `production` o `test`. Next.js la establece según el comando ejecutado. |
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | No | — | Variable legacy sin efecto. No implementa un bypass y no debe utilizarse como mecanismo de seguridad. |

Ejemplo sin valores reales:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generar-un-secreto-seguro>
EXAMIO_API_URL=http://localhost:55803/api
```

### Variables de la herramienta de diagnóstico

Estas variables son opcionales y solo afectan `npm run env:check`:

| Variable | Default | Descripción |
|---|---|---|
| `EXAMIO_FRONTEND_URL` | `http://localhost:3000` | URL esperada del frontend. |
| `EXAMIO_BACKEND_URL` | `http://localhost:55803/api` | URL utilizada para comprobar health y conectividad. |

Ejemplo en PowerShell:

```powershell
$env:EXAMIO_BACKEND_URL="http://localhost:55803/api"
npm run env:check
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

Las escrituras hacia la API conservan el PascalCase documentado por sus schemas.
Las respuestas se consumen en camelCase después de la normalización del backend.
`src/types/index.ts` funciona como barrel compatible. Las definiciones están
separadas en `shared`, `api`, `auth`, `alumnos`, `academic`, `evaluaciones`,
`administracion` y `reportes`.

Las query keys se construyen con fábricas de `src/lib/query-keys.ts`. Los hooks
exponen el resultado estándar de TanStack Query y mantienen algunos aliases
anteriores solo para compatibilidad. React Query representa datos remotos
confirmados; la outbox IndexedDB conserva las respuestas de examen pendientes.

Los errores HTTP se clasifican en `src/lib/errors.ts`, que distingue validación,
autenticación, autorización, ausencia, conflicto, red, timeout y servidor. Los
mensajes técnicos se limitan a desarrollo; la interfaz muestra mensajes funcionales
seguros y conserva los errores de validación asociados a campos.

No existen actualmente `src/context`, `src/utils`, `src/styles` ni `src/providers`. Los providers están en `src/components/providers` y los estilos globales en `src/app/globals.css`.

## Routing

El proyecto utiliza App Router.

### Rutas públicas

- `/`
- `/login`
- `/api/auth/[...nextauth]`

### Administración

- `/admin`
- `/admin/analitica`: panorama institucional configurable por carrera, materia, comisión y evaluación, con período compartible, comparación ordenada, promedio oficial sobre 10 y evolución mensual, semestral o anual con series seleccionables.
  Compara únicamente entidades con evidencia suficiente, muestra la evolución mensual
  de los resultados actuales y mantiene las correcciones pendientes en un bloque separado.
  El período inicial abarca doce meses y permanece en la URL al navegar o paginar.
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

El inicio docente agrupa las actividades por materia dentro de la misma pantalla.
Si una materia posee varias comisiones, presenta un segundo nivel por
`MateriaDivision`; con una sola comisión, muestra directamente sus actividades.

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
| Incidentes | `["incidentes", "publicaciones", idPublicacion, "listado", filtros]` |
| Materias | `["materias"]`, `["comisionesMateria", id]`, `["alumnosMateria", id]` |
| Reportes | `["reportes", "rendimiento", "listado", filtros]`, `["reportes", "rendimiento", "detalle", matricula, filtros]`, `["reportes", "rendimiento-evaluaciones", "listado", filtros]` |
| Usuarios | `["usuarios"]` |

### Reglas para nuevas query keys

- Usar arrays, nunca strings concatenados.
- Colocar primero el dominio.
- Incorporar todos los parámetros que cambien el resultado.
- Mantener la misma jerarquía entre query e invalidación.
- No incluir funciones, instancias de clases ni valores no serializables.
- Evitar crear una convención nueva si ya existe una equivalente.

Las fábricas centralizadas de query keys viven en `src/lib/query-keys.ts`.

## Formularios y validación

El login, la creación de examen y materias usan Zod con alcances acordes a su
complejidad. La creación de examen separa:

```text
estado controlado
  → examFormSchema
  → errores por path
  → toGuardarEvaluacionPayload
  → servicio HTTP
```

Los campos se validan al perder foco y el formulario completo vuelve a validarse
al enviar. `FormFieldError` conecta mensajes con `aria-invalid` y
`aria-describedby`. Apertura y cierre tienen valores iniciales editables, orden
temporal obligatorio y una ventana máxima de diez años.

No se incorporó React Hook Form: el modelo controlado existente y Zod cubren los
campos dinámicos sin sumar otra dependencia. Los CRUD simples mantienen schemas
y transformaciones pequeños, sin una abstracción universal de formularios.

## Componentes reutilizables

### UI

- `Button`
- `Modal`
- `FeedbackMessage`
- `RequestErrorState`
- `LoadingState`
- `EmptyState`
- `Pagination`
- `StatusBadge`
- `ErrorMessage`
- `DashboardCard`
- `Breadcrumbs`
- `FullscreenWrapper`

`FeedbackMessage` aporta regiones accesibles `alert` o `status`.
`RequestErrorState` normaliza mensajes y solo ofrece reintento cuando el error
es recuperable. Administración y docente tienen límites `error.tsx`; el área
del alumno conserva manejo local para no desmontar una evaluación activa.

### Layout

- `Navbar`
- `Header`
- `Footer`

### Reportes

- `ReportLayout`
- `ReportFilterPanel`
- `ReportKpiGrid`
- `ReportTable`
- `ReportSkeleton`
- `ChartCard`
- `ReportCharts`
- `EvaluationReportCharts`
- `StudentReportDetail`
- `QuestionOptionsDetail`

Los reportes por alumno y por publicación de evaluación comparten esta familia.
Los gráficos permanecen específicos de cada dominio: **Comparar evaluaciones** contrasta
participación y resultados oficiales entre las publicaciones visibles, indicando expresamente
ese alcance; el análisis individual conserva la distribución global. El reporte por alumno
mantiene sus KPIs globales y no grafica la página visible. Preguntas y grupos usan distribuciones
globales de corrección y respuesta, además de rankings server-side de menor puntaje promedio y
mayor tiempo promedio. Sus tablas continúan paginadas y no se usan para calcular esos rankings.

Los filtros docentes de materia, comisión, actividad y publicación se construyen desde
las evaluaciones autorizadas del docente. Al aplicar una combinación incompatible se
limpian los niveles inferiores en lugar de consultar IDs ajenos a ese alcance.

La pestaña **Analizar evaluación** de `/profesor/reportes` implementa el recorrido
docente por publicación. El selector se construye desde el listado completo autorizado
del docente y encadena materia, comisión y evaluación sin inferir alcance desde una
página de reporte. El resumen separa resultados oficiales de pendientes operativos y
mantiene la distribución legacy en un bloque identificado como no oficial. El segundo
paso consulta preguntas con `alcanceIntentos=validos` y
`estadoCorreccion=confirmada`, presenta el ranking server-side de hallazgos y permite
abrir opciones históricas por `claveContenido` junto con las variantes descriptivas del
grupo. Las fechas del listado no se trasladan a este análisis.

### Administración

- `ManagementPageHeader`
- `ManagementFilterPanel`
- `ManagementSectionHeader`

Alumnos y materias validan estos componentes junto con `Pagination`. No existe
una `DataTable` universal: las acciones y estados de las gestiones todavía no
justifican esa abstracción.

Antes de crear un componente nuevo se debe comprobar si existe uno equivalente.

## Revisión de evaluaciones

La confirmación docente cierra la corrección, pero no vuelve visible el examen por sí sola.
Cada publicación configura una política (`nunca`, `al_corregir`, `ventana` o `manual`), un
tipo de acceso (`unico` o `libre`) y puede otorgar o revocar permisos por intento.
`nunca` impide cualquier revisión, incluso con permisos anteriores. `manual` sólo habilita los
intentos autorizados individualmente. El acceso único se consume una sola vez por intento.

El alumno no consume `/intentos/:id/completo`. La revisión sigue el flujo:

```text
disponibilidad → apertura idempotente → contenido temporal desde snapshots
```

La apertura usa `Idempotency-Key`; el acceso único sólo se consume después de una acción
explícita del alumno. La API devuelve el vencimiento efectivo, limitado por cinco minutos,
por el fin de la ventana general o por el fin del permiso individual. La interfaz retira el
contenido al alcanzar ese límite y vuelve a consultar la disponibilidad. Los contratos y query keys viven en `revisiones.api.ts`,
`useRevisiones.ts` y `revisionKeys`.

## Supervisión durante evaluaciones

Cada publicación dispone de una política versionada de supervisión. El docente puede definir si
la pantalla completa es obligatoria y crear reglas por tipo de incidente, cantidad o duración,
con consecuencias de registro, advertencia, bloqueo temporal o anulación.

Al iniciar un intento, la API congela la política. El frontend registra eventos mediante la outbox
temporal y aplica únicamente la instrucción devuelta por el backend; no decide anulaciones por su
cuenta. Los bloqueos visuales conservan el guardado y la sincronización de respuestas. La pantalla
de corrección permite consultar el snapshot y registrar desbloqueos, reconocimientos o descartes
auditados, excepto sobre intentos ya anulados.

## Visibilidad operativa de incidentes

La gestión de una evaluación muestra únicamente los eventos que la API clasifica como incidentes,
con resumen global, filtros, paginación y acceso al intento afectado. El docente puede mantenerlos
pendientes, marcarlos como revisados o descartarlos mediante revisión optimista e idempotente.

Esta revisión es un seguimiento operativo separado de las acciones de supervisión en vivo. No
modifica notas, estados del intento ni consecuencias, y un incidente pendiente no implica fraude.
El reporte por evaluación incorpora los mismos agregados y filtros sobre el conjunto completo antes
de paginar.

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
npm run lint
npm run build
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
7. Mantener mocks exclusivamente en tests y E2E; las dependencias backend faltantes se documentan en `PLAN.md`.

Este README debe actualizarse cuando cambien arquitectura, variables, autenticación, scripts, rutas, servicios o convenciones.
