# Guía para agentes — Examio Frontend

Este archivo es el punto de entrada técnico para trabajar en el frontend sin relevar todo el repositorio.
Describe cómo está construido el proyecto, qué convenciones respetar y qué zonas requieren precaución.
No es un changelog ni un backlog: el trabajo pendiente y sus prioridades viven en `PLAN.md`.

## Propósito del frontend

Examio Frontend es la interfaz web para administrar, crear, rendir, corregir y analizar evaluaciones académicas.
Resuelve navegación, presentación, interacción, validación de entrada, sesión del usuario y consumo de datos.
La API Node es responsable de reglas de negocio, autorización efectiva, persistencia, integridad y acceso a SQL Server.
Nunca debe asumirse que ocultar una acción o proteger una ruta en el cliente reemplaza el RBAC del backend.

## Stack real

- Next.js 16 con App Router y React 19.
- TypeScript 5 con `strict: true`.
- Tailwind CSS 4 y estilos globales en `src/app/globals.css`.
- Fuente Geist mediante `next/font`.
- NextAuth 4 con Credentials Provider y sesión JWT.
- TanStack React Query 5 para estado remoto, caché y mutaciones.
- Zod 4 para la validación del login.
- Recharts 3 para gráficos de reportes.
- `fetch` encapsulado principalmente por el cliente HTTP propio.
- ESLint 9 con reglas de Next.js.
- pnpm como gestor de paquetes.
- No hay formatter ni infraestructura de tests frontend configurados actualmente.
- No se usa una librería UI externa, Redux, Zustand, Sass, CSS Modules ni Styled Components.

## Arquitectura actual

El proyecto usa capas ligeras, organizadas principalmente por responsabilidad:

```text
page / component
      ↓
domain hook (TanStack Query)
      ↓
domain service
      ↓
apiFetch
      ↓
Examio API
```

- `src/app` contiene rutas, layouts, páginas, route handlers y Server Actions.
- `src/components` contiene UI compartida, layouts, formularios, providers y componentes de reportes.
- `src/hooks` contiene queries y mutaciones de dominio.
- `src/services/api` traduce operaciones de dominio a contratos HTTP.
- `src/lib` concentra infraestructura: cliente HTTP, NextAuth, schemas, auxiliares y la outbox IndexedDB del examen.
- `src/types` contiene entidades, DTOs, payloads y ampliaciones de NextAuth.
  `index.ts` es el barrel compatible; las definiciones viven en `shared`, `api`,
  `auth`, `alumnos`, `academic`, `evaluaciones`, `administracion`, `reportes` y
  `banco-preguntas`.
- `src/assets` contiene recursos importados por componentes.
- Los estilos globales viven en `src/app/globals.css`.

No existen actualmente `src/context`, `src/utils`, `src/styles` ni `src/providers`.
Los providers se encuentran en `src/components/providers`.
El estado compartido de servidor se resuelve con React Query y la sesión con `SessionProvider`.
`src/lib/errors.ts` clasifica `ApiError`, produce mensajes seguros y agrupa errores de validación.
El feedback común usa `FeedbackMessage`, `RequestErrorState`, `LoadingState` y `EmptyState`.

## Mapa rápido del repositorio

```text
.
├── AGENTS.md                 # arquitectura y forma de trabajo
├── PLAN.md                   # plan técnico activo
├── README.md                 # uso y referencia general del frontend
├── docs/
│   ├── API.md                # contratos sincronizados de la API
│   ├── DATABASE.md           # modelo de datos sincronizado
│   ├── PLAN_API.md           # estado y pendientes sincronizados de la API
│   └── DEVELOPMENT.md        # entorno, puertos, health y diagnóstico
├── scripts/
│   └── check-development-environment.mjs
├── src/
│   ├── app/
│   │   ├── (role)/           # áreas autenticadas y layout compartido
│   │   ├── (gestion)/        # organización de gestión administrativa
│   │   ├── api/auth/         # route handler de NextAuth
│   │   ├── login/            # página, formulario y Server Action
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── providers/
│   │   ├── reports/
│   │   └── ui/
│   ├── hooks/                # hooks React Query por dominio
│   ├── services/api/         # llamadas HTTP por dominio
│   ├── lib/                  # api.ts, auth.ts, schemas y auxiliares
│   ├── types/                # contratos compartidos y NextAuth
│   └── middleware.ts         # protección y redirección por rol
├── next.config.*
├── package.json
└── tsconfig.json
```

Para modificar una feature, empezar por su ruta y seguir únicamente sus imports hacia hook, servicio y tipos.

## Rutas y navegación

El proyecto utiliza exclusivamente App Router.
Las rutas públicas principales son `/`, `/login` y el handler `/api/auth/[...nextauth]`.
Las áreas funcionales se agrupan bajo `/admin`, `/alumno` y `/profesor`.
Los route groups `(role)` y `(gestion)` organizan código y layouts sin agregar segmentos a la URL.

`src/app/(role)/layout.tsx` aporta `Header`, `Breadcrumbs` y el contenedor común de áreas autenticadas.
El root layout monta providers, `Navbar`, fuente y estilos globales.
La navegación existente debe ampliarse desde el mecanismo de cada área; no crear un sidebar o layout global sin aprobación.
El middleware usa el JWT de NextAuth para restringir áreas y redirigir cada rol a su inicio:

- `admin` → `/admin`
- `docente` → `/profesor`
- `alumno` → `/alumno`

Antes de cambiar rutas, revisar el layout inmediato, el middleware y los enlaces que referencian esa ruta.

## Autenticación y autorización

El login real sigue este flujo:

```text
LoginForm
  → loginAction (Server Action + Zod)
  → signIn("credentials")
  → /api/auth/callback/credentials
  → CredentialsProvider.authorize()
  → POST /api/auth/login
  → callbacks jwt/session
  → cookie NextAuth + sesión
```

`authorize()` está definido en `src/lib/auth.ts`.
Envía `Email` y `Password` a la API y obtiene el usuario más el JWT del backend.
Los callbacks conservan identidad funcional y credenciales rotables en el JWT cifrado de NextAuth.
Las ampliaciones de tipos correspondientes están en `src/types/next-auth.d.ts`.

Access token, refresh token y expiraciones permanecen exclusivamente en el JWT/cookie HttpOnly de NextAuth.
`Session.user` solo expone identidad funcional y rol. El callback `jwt` renueva anticipadamente las
credenciales y el BFF agrega el bearer del lado servidor. No almacenar tokens de API en `localStorage`.

El middleware protege navegación por rol, pero la API conserva la autoridad final.
No existe un bypass de autenticación activo.
`NEXT_PUBLIC_DEV_BYPASS_AUTH` es una variable legacy sin efecto y no debe tratarse como control de seguridad.
No modificar auth, sesión, middleware, logout o expiración como efecto colateral de otra feature.

## Comunicación con la API

`src/lib/api.ts` expone `apiFetch<T>` y `ApiError`.
El cliente llama al BFF same-origin `/api/examio/*`, interpreta
`{ success, data, message, code, errors }` y devuelve `data`.
`apiFetch` aplica timeout por defecto, acepta `timeoutMs` y compone cualquier `AbortSignal`
proporcionado por el consumidor. Las query strings de servicios se construyen con
`src/lib/query-string.ts`; no duplicar serializadores manuales.
El Route Handler obtiene la sesión NextAuth en servidor, agrega el bearer y solo reenvía hacia
`EXAMIO_API_URL`. Ante `401 ACCESS_TOKEN_EXPIRED`, el cliente actualiza la sesión y repite una sola vez.
Los servicios por dominio están en `src/services/api`.
Los hooks de `src/hooks` consumen esos servicios y exponen queries o mutaciones a la UI.

Para una integración nueva seguir:

```text
types → service → hook → page/component
```

- Reutilizar `apiFetch`; no agregar `fetch` directo a una página o componente.
- No hardcodear otra URL.
- Mantener PascalCase en requests cuando el backend lo exige y camelCase en las respuestas del frontend.
- Tipar payload, filtros y respuesta antes de conectar la UI.
- Incluir en la query key todo parámetro que altere el resultado.
- Preservar el mensaje y los errores de validación útiles sin exponer detalles sensibles.
- Para operaciones que exigen `Idempotency-Key`, crear un UUID por intención del usuario,
  bloquear envíos simultáneos y conservar la misma clave y el mismo body ante reintentos inciertos.
  Una clave nueva representa otra operación y nunca debe generarse automáticamente al recibir un 409.

La base URL se configura mediante `EXAMIO_API_URL`, variable exclusiva del servidor. No introducir
URLs hardcodeadas ni variables `NEXT_PUBLIC_` para este destino.
Consultar `docs/API.md` para endpoints, requests, responses, autenticación y comportamiento funcional.
Consultar `docs/DATABASE.md` cuando la tarea dependa de entidades, relaciones o restricciones del modelo.

## Componentes y organización

Antes de crear UI, buscar por nombre y revisar un caso equivalente.
Componentes compartidos conocidos:

- UI: `Button`, `Modal`, `FeedbackMessage`, `RequestErrorState`, `LoadingState`,
  `EmptyState`, `Pagination`, `StatusBadge`, `ErrorMessage`, `DashboardCard`,
  `Breadcrumbs`, `FullscreenWrapper`.
- Administración: `ManagementPageHeader`, `ManagementFilterPanel` y
  `ManagementSectionHeader`.
- Layout: `Navbar`, `Header`, `Footer`.
- Reportes: `ReportLayout`, `ReportFilterPanel`, `ReportKpiGrid`, `ReportTable`, `ChartCard`,
  `ReportSkeleton`, gráficos específicos por reporte y `StudentReportDetail`.

Los componentes verdaderamente genéricos pertenecen a `src/components/ui` o al dominio compartido correspondiente.
Los componentes específicos pueden permanecer junto a la feature si aún no existe reutilización real.
No generalizar una abstracción por un solo caso; validar su API con un segundo consumidor.
Proponer y obtener aprobación antes de modificar ampliamente un componente compartido.

Los componentes son Server Components por defecto.
Agregar `"use client"` solo si se requieren hooks, interacción, sesión, React Query o APIs del navegador.
No copiar el patrón client-heavy de una página antigua si la nueva composición puede conservar límites de servidor.
Usar PascalCase para componentes, prefijo `use` para hooks y alias `@/` para imports desde `src`.

## Formularios y validación

No hay una solución universal de formularios instalada.
El login usa Zod, Server Action y `useActionState`.
La creación de examen usa `src/lib/schemas/examSchema.ts`, estado controlado y
un transformador independiente en `src/lib/exam-form.ts`. Materias valida el
patrón reducido con su propio schema. `FormFieldError` presenta errores por path.
Otros CRUD todavía usan principalmente estado controlado y validación HTML nativa.
El backend siempre debe volver a validar datos y permisos.

Al modificar formularios:

- Reutilizar schemas y tipos existentes antes de crear otros.
- Mantener separados render, validación y transformación a payload.
- Asociar labels, ayudas y errores a sus campos.
- Mostrar mensajes funcionales; no revelar errores internos de la API.
- Transformar al casing esperado en el límite del servicio, no dispersarlo por la vista.
- Validar campos al perder foco y volver a validar el formulario completo al enviar.
- Para fechas locales, validar fecha real, orden temporal y una ventana de año razonable antes de convertir a ISO.
- No incorporar React Hook Form u otra dependencia sin un caso aprobado que justifique el cambio.

## Estado y datos

Usar estado local para interacción efímera: inputs, modal abierto, selección o estado visual.
Usar React Query para estado remoto, caché, carga, error, mutaciones e invalidaciones.
Usar `SessionProvider` para la sesión; no duplicar el usuario en un contexto nuevo.
Durante una evaluación, React Query mantiene la representación visual de las
respuestas y `src/lib/exam-answer-outbox.ts` actúa como respaldo durable hasta
confirmación/finalización. IndexedDB nunca debe contener tokens ni credenciales.
No introducir Redux, Zustand o Context global sin una necesidad transversal demostrable y aprobación.
Preferir estado derivado a copias sincronizadas mediante effects.
Memoizar solo cuando exista un beneficio concreto o una identidad estable sea necesaria.

Las query keys son arrays serializables, jerárquicos y comienzan por dominio.
Se construyen con las fábricas de `src/lib/query-keys.ts`; queries e invalidaciones
deben usar la misma fábrica e incluir filtros, paginación y cualquier valor que
cambie la respuesta. Los hooks exponen el objeto estándar de React Query; algunos
mantienen aliases históricos de datos/estado solo por compatibilidad transitoria.
El banco usa `bancoPreguntasKeys` y `src/hooks/useBancoPreguntas.ts`; las mutaciones
invalidan su namespace completo y una importación invalida también evaluaciones.

React Query gestiona estado remoto confirmado. El estado local controla interacción
efímera y la outbox IndexedDB del examen conserva respuestas pendientes; no trasladar
esas respuestas a React Query como única fuente durable.

## Testing

El testing usa Vitest 4, jsdom, React Testing Library, `user-event`, `jest-dom`,
MSW 2 y Playwright. Los tests unitarios se ubican junto al módulo probado como `*.test.ts` o `*.test.tsx`;
la configuración común vive en `vitest.config.ts` y `vitest.setup.ts`.
`src/test/msw/server.ts` expone el servidor Node compartido para simular `fetch`.
Declarar handlers por test, usar rutas BFF same-origin y mantener
`onUnhandledRequest: "error"`; no crear mocks globales permisivos ni simular tokens.
Los tests de hooks deben usar `src/test/query-client.tsx`, que crea un `QueryClient`
aislado y sin reintentos. Mockear el servicio de dominio para probar keys,
`enabled`, payloads e invalidaciones; usar MSW cuando el objeto de la prueba sea HTTP.
La outbox IndexedDB se prueba con `fake-indexeddb`; crear una fábrica aislada y usar
identificadores de intento únicos para evitar estado compartido entre casos. Probar
siempre también el fallback sin IndexedDB y exigir que informe `durable: false`.
Los E2E viven en `e2e/` y usan una API efímera local para atravesar NextAuth,
middleware y BFF sin SQL Server, cuentas reales ni datos persistentes. Mantener sus
contratos mínimos acotados a los flujos críticos; no convertir el stub en otra API.

Validar de forma proporcional:

```bash
pnpm eslint <archivos-modificados>
pnpm test:run
pnpm test:e2e
pnpm typecheck
pnpm build
```

Usar ESLint focalizado durante el desarrollo.
Ejecutar primero el archivo o patrón de test relacionado y luego `pnpm test:run`.
Ejecutar el build para cambios de routing, límites Server/Client, configuración o integración relevante.
Los tests del backend y su estrategia de mocks no constituyen tests del frontend.

## Estilos y UI

Tailwind CSS 4 es el mecanismo principal; los estilos globales viven en `src/app/globals.css`.
La identidad existente usa Geist, paleta slate/indigo, superficies claras, bordes suaves, radios amplios y sombras sutiles.
Los textos heredados con `text-slate-400` y placeholders `slate-300` se elevan desde
`globals.css` al contraste efectivo de `slate-500`; no retirar esa política sin
volver a medir textos pequeños sobre superficies claras.
Reutilizar componentes y combinaciones existentes antes de introducir una variante visual.
Mantener loading, skeleton, empty state y error state en vistas de datos.
Diseñar tablas y gráficos responsive, con alternativa legible en pantallas pequeñas.
Preservar foco visible, labels, semántica, navegación por teclado y atributos ARIA básicos.
El `Modal` compartido implementa nombre accesible, foco inicial, focus trap, Escape,
restauración de foco y bloqueo de scroll. Los modales críticos del examen son flujos
especializados y no deben sustituirse sin preservar sus restricciones funcionales.
Los estados asíncronos deben distinguir `status`/`aria-live="polite"` de errores
urgentes con `alert`; evitar anunciar cada transición intermedia de un autoguardado.
Todo gráfico debe conservar una alternativa textual con los mismos datos relevantes.
Las tablas anchas deben permitir scroll horizontal sin comprimir columnas hasta volverlas ilegibles.
El bloqueo del menú contextual pertenece exclusivamente al entorno fullscreen del examen.
Respetar `prefers-reduced-motion`; no depender de animación para comunicar estado.

## Riesgos y zonas delicadas

- **Rotación concurrente de sesión:** varias pestañas o instancias pueden solicitar refresh simultáneamente.
  No reemplazar la clave idempotente ni el single-flight sin revisar el contrato de concurrencia de la API.
- **Errores de sesión durante exámenes:** un fallo definitivo de refresh no debe desmontar la vista,
  cerrar sesión, finalizar ni abandonar el intento automáticamente. La cola completa de respuestas
  pendientes debe conservarse y sincronizarse antes de finalizar.
- **Outbox de respuestas:** una confirmación solo puede confirmar la misma versión
  enviada; no eliminar ni sobrescribir una respuesta más nueva por una respuesta
  tardía. La pérdida de red no debe confundirse con expiración de sesión.
- **Credenciales solo server-side:** nunca exponer access/refresh tokens mediante `Session.user`,
  respuestas del BFF, logs, variables públicas o almacenamiento del navegador.
- **URLs y fetch fuera de la capa:** persisten URL hardcodeada y al menos una llamada directa legacy.
  No replicarlas; revisar el plan antes de centralizarlas.
- **Contratos estrictos:** `strict` está activo, no quedan `any` explícitos y los tipos
  están separados por dominio detrás de un barrel compatible. Verificar siempre
  el contrato efectivo antes de mover, reutilizar o eliminar tipos.
- **Aliases históricos de React Query:** algunos hooks conservan aliases de retorno por compatibilidad.
  Las implementaciones nuevas deben usar el resultado estándar y las fábricas de query keys existentes.
- **Banco y revisiones optimistas:** preguntas, grupos y borradores cambian mediante
  `RevisionEsperada`; un 409 exige conservar la edición local y recargar/reconciliar de forma explícita.
  No sobrescribir silenciosamente ni reintentar con una revisión inventada.
- **Copias independientes:** importar desde el banco crea IDs nuevos y no establece sincronización.
  No mezclar IDs del banco con IDs de evaluación ni presentar una copia adaptada como idéntica al origen.
- **Reemplazos completos:** los `PUT` del banco reemplazan opciones, etiquetas y composición;
  la edición completa de una evaluación elimina grupos omitidos. Construir siempre el payload desde
  el estado completo confirmado, no desde un parche parcial.
- **Publicación transaccional:** un borrador solo se publica mediante `publicar-completo`.
  `GuardarTodoEnBanco` es explícito y desmarcado por defecto en UI; la misma intención conserva
  `Idempotency-Key` para evitar duplicados y un fallo del banco debe impedir la publicación completa.
- **Errores especializados del examen:** el flujo de evaluación maneja sesión, conectividad,
  respuestas pendientes y fullscreen localmente para no desmontar el intento. No sustituirlo por
  un error boundary genérico ni eliminar sus avisos sin revisar la política antifraude.
- **Componentes y páginas monolíticas:** varias pantallas administrativas contienen UI y lógica repetida.
  No refactorizarlas incidentalmente al desarrollar otra feature.
- **Datos simulados:** los mocks están limitados a tests y E2E. No incorporar datos simulados en
  pantallas reales; si falta un contrato, registrar explícitamente la dependencia backend.
- **Accesibilidad incompleta:** modal, tablas, mensajes asíncronos y bloqueo global del menú contextual requieren cuidado.
- **Tests focalizados primero:** existe infraestructura Vitest/MSW/Playwright; ejecutar primero
  los tests del módulo y después ampliar a suite, E2E o build según el riesgo.
- **Codificación de texto:** existen caracteres mal codificados; no propagar mojibake al editar contenido.

Las acciones y prioridades para resolver estos riesgos están en `PLAN.md`.

## PLAN.md

`PLAN.md` es el plan técnico activo: registra problemas, recomendaciones, fases, prioridades y refactors pendientes.
Debe consultarse antes de comenzar refactors, resolver deuda o tocar una zona incluida entre los riesgos conocidos.
Antes de proponer una solución estructural, verificar si ya fue evaluada y si existe una decisión pendiente.
No reinterpretar todo el problema desde cero ni ejecutar una fase sin el análisis o aprobación indicados.
Este archivo resume precauciones; no reemplaza ni duplica el plan.

## Estado actual del proyecto

La fase de estabilización del entorno está completada.
El frontend dispone de `pnpm env:check`, `pnpm dev:checked` y documentación de diagnóstico.
La API expone un health check público que identifica `examio-api` y diferencia disponibilidad HTTP de SQL Server.
La documentación de frontend, API y base de datos ya está separada.

El backend del Banco privado de preguntas está implementado y sus migraciones y pruebas
fueron verificadas por el responsable del backend. `docs/API.md`, `docs/DATABASE.md` y
`docs/PLAN_API.md` están sincronizados. En frontend ya existen tipos, servicios, query keys,
hooks y pruebas focalizadas del banco; las rutas, editores e integración con borradores y
publicación continúan pendientes en la Fase 12 de `PLAN.md`.

Los reportes por alumno y por publicación de evaluación están integrados en
`/profesor/reportes`. Comparten layout, filtros, KPIs, tabla, skeleton y tarjetas
de gráficos; cada reporte conserva sus gráficos y reglas de dominio. Las series
del reporte por evaluación son agregaciones globales del backend. Las del reporte
por alumno todavía representan sólo la página visible y deben describirse como tales.
No se reemplazó la navegación completa del docente ni se creó un sidebar global.

Las fases de autenticación, cliente API, tipado, React Query, errores, testing y accesibilidad siguen gobernadas por `PLAN.md`.
No hay bypass de login activo.

## Forma de trabajar en este repositorio

1. Delimitar la ruta o feature y leer primero su página, layout inmediato y tests relacionados si existen.
2. Seguir imports concretos hacia componentes, hook, servicio, cliente y tipos; detenerse cuando el contrato quede claro.
3. Consultar la documentación del backend antes de inferir campos o comportamiento.
4. Buscar componentes, hooks y servicios equivalentes antes de crear archivos.
5. Mantener UI, estado remoto y acceso HTTP separados.
6. Diseñar loading, error, empty state, responsive y accesibilidad junto con el caso exitoso.
7. Mantener cambios pequeños; no mezclar una feature con saneamiento técnico no aprobado.
8. Explicar alternativas y pedir aprobación para arquitectura, dependencias o refactors amplios.
9. No modificar contratos de backend desde el frontend; documentar cualquier dato faltante.
10. Validar archivos tocados, TypeScript y build según el riesgo del cambio.
11. Actualizar la documentación correcta cuando una decisión persistente cambie.

## Contexto recomendado para agentes

Una nueva sesión debe seguir esta estrategia:

1. Leer `AGENTS.md`.
2. Consultar `PLAN.md` si la tarea toca deuda técnica, riesgos, refactors o trabajo pendiente.
3. Consultar `docs/API.md` si la tarea involucra endpoints, requests, responses, autenticación o contratos.
4. Consultar `docs/DATABASE.md` si necesita entender entidades o relaciones.
5. Identificar la ruta/feature afectada.
6. Abrir únicamente los archivos directamente relacionados.
7. Revisar componentes similares si necesita entender un patrón.
8. Revisar tests relacionados.
9. Buscar referencias concretas mediante nombres de símbolos.
10. Expandir la exploración solamente cuando una dependencia real lo justifique.

No recorrer todo `/src`, leer todas las páginas, inspeccionar todos los componentes ni relevar masivamente el proyecto.
Usar esta documentación como índice hacia el código.

## Estrategia de búsqueda

- Buscar con `rg` por símbolo, componente, hook, función, type, query key o fragmento de endpoint.
- Localizar referencias y consumidores antes de cambiar una firma o contrato.
- Buscar una implementación similar dentro del mismo dominio antes de ampliar la búsqueda.
- Revisar tests específicos cuando existan y ejecutar primero el alcance mínimo relevante.
- Consultar documentación antes de explorar módulos no relacionados.
- Evitar listados recursivos y lecturas amplias sin una dependencia concreta que los justifique.

## Decisiones arquitectónicas importantes

- App Router es la estrategia de routing; los route groups organizan sin alterar URLs.
- Server Components son el valor por defecto; los límites cliente deben ser explícitos y mínimos.
- NextAuth Credentials mantiene una cookie JWT HttpOnly como contenedor único de credenciales rotables.
- El navegador accede a la API exclusivamente mediante el BFF acotado `/api/examio/*`.
- La autorización definitiva pertenece al backend.
- React Query gestiona datos remotos; el estado UI permanece local.
- El acceso HTTP debe pasar por servicio de dominio y `apiFetch`.
- Los contratos compartidos se reutilizan desde `src/types`; no duplicar shapes localmente sin motivo.
- Requests y responses pueden usar casing distinto; la transformación ocurre en los límites de integración.
- El banco es privado por docente; admin solo consulta y alumnos no acceden. Reutilizar contenido
  siempre crea una copia independiente y toda publicación desde borrador es transaccional e idempotente.
- Los componentes se generalizan con evidencia de reutilización, no anticipadamente.
- Los cambios estructurales requieren justificación, propuesta y aprobación.

## Documentación disponible

### `AGENTS.md`

Arquitectura, convenciones, riesgos persistentes y estrategia de trabajo para agentes.

### `PLAN.md`

Plan técnico activo, deuda, recomendaciones, prioridades, decisiones pendientes y acciones de refactor.

### `README.md`

Instalación, scripts, variables de entorno y referencia general del frontend.

### `docs/DEVELOPMENT.md`

Puertos, health check, diagnóstico del entorno y resolución segura de conflictos de procesos.

### `docs/API.md`

Referencia sincronizada de endpoints, contratos HTTP, autenticación, RBAC y comportamiento de la API.

### `docs/DATABASE.md`

Referencia sincronizada de entidades, relaciones, restricciones y decisiones de persistencia.

### `docs/PLAN_API.md`

Estado técnico y pendientes sincronizados de la API. Consultarlo para distinguir capacidades
backend ya entregadas de validaciones o evoluciones todavía pendientes.

## Mantenimiento de la documentación

Actualizar `AGENTS.md` cuando cambien arquitectura, estructura importante, convenciones, patrones,
riesgos persistentes, testing, integración con la API o decisiones técnicas relevantes.

Actualizar `PLAN.md` cuando cambien tareas pendientes, prioridades, recomendaciones, problemas detectados
o refactors planificados; marcar allí cada punto completado y verificado.

`docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` se sincronizan desde la API y son documentación
externa de referencia para el frontend. No editar sus contratos ni su estado para adaptar
unilateralmente una implementación cliente.

No convertir `AGENTS.md` en changelog, backlog, lista de tickets, copia de `PLAN.md`,
catálogo de endpoints ni réplica del modelo de datos.
