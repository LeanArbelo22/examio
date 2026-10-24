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
- No hay formatter dedicado. El testing frontend usa Vitest/RTL/MSW y Playwright.
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
  Los editores del banco viven en `src/components/question-bank`; `src/components/evaluaciones`
  compone el editor de borradores y comparte campos de preguntas desde `src/components/forms`.
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

## Testing y validación

El frontend utiliza Vitest, React Testing Library, MSW y Playwright. La configuración y los tests existentes deben reutilizarse; no agregar infraestructura de testing ni dependencias sin justificación y aprobación.

Aplicar una validación proporcional al cambio:

1. Ejecutar primero el test específico del módulo modificado, si existe.
2. Ejecutar ESLint sobre los archivos modificados.
3. Ampliar a la suite completa, E2E, typecheck o build únicamente cuando el alcance del cambio lo justifique.

### Manejo de errores

* Si aparece un error, identificar primero si está relacionado directamente con el cambio realizado.
* Investigar únicamente los archivos y dependencias necesarios para determinar su causa.
* Realizar como máximo dos intentos de diagnóstico o corrección por problema, salvo que exista una causa concreta y una solución clara.
* No repetir el mismo comando sin modificar la hipótesis o las condiciones relevantes.
* Si el error es preexistente, externo al cambio o requiere una investigación amplia, documentarlo brevemente y continuar cuando sea seguro.
* No corregir problemas ajenos a la tarea ni iniciar refactors para resolverlos incidentalmente.
* No ejecutar repetidamente toda la suite, E2E o build para diagnosticar un error localizado.

Al finalizar, informar brevemente qué validaciones se ejecutaron y cuáles quedaron pendientes, con el motivo. No afirmar que una validación pasó si no se ejecutó correctamente.


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
Los textos visibles para alumnos, docentes y administradores deben explicar qué significa
la información o qué acción pueden realizar. No describir arquitectura, contratos, API,
servidor, frontend, caché, paginación interna, snapshots, versiones técnicas ni procesos
de implementación salvo que ese concepto sea imprescindible para una decisión del usuario.
Traducir las reglas de negocio a criterios claros —por ejemplo, porcentaje y tamaño de
muestra— sin narrar qué capa las calcula.
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
- **Outbox temporal:** la telemetría del examen usa una base IndexedDB independiente y uniforme.
  Cada intento conserva sesión UUID y secuencia creciente; inicio y cierre mantienen el mismo
  evento. La confirmación de una versión abierta no puede borrar un cierre posterior. El batch
  procesa hasta 500 elementos y los conflictos terminales permanecen visibles en la cola.
- **Identidad de pregunta:** `idIntentoPregunta` identifica la instancia sorteada y se usa para
  `question_active`; `idPregunta` identifica el origen. Nunca inferir ni intercambiar ambos IDs.
- **Supervisión autoritativa:** el frontend nunca decide por sí mismo que una pérdida de foco o salida
  de fullscreen anula. Cada intento usa el snapshot congelado por backend y la respuesta de telemetría
  ordena `informar|advertir|bloquear_interfaz|anular_intento`. Un bloqueo visual no impide sincronizar
  respuestas; una anulación no se revierte. Inicio y cierre de un intervalo conservan UUID y secuencia,
  y los replays no deben duplicar decisiones ni consecuencias.
- **Revisión operativa de incidentes:** sólo se presentan eventos clasificados por backend como
  incidentes. `pendiente|revisado|descartado` describe seguimiento docente y no implica fraude ni
  modifica nota, intento o consecuencia. La revisión usa `RevisionEsperada` e `Idempotency-Key`;
  ante conflicto se conserva el comentario local y se exige reconciliación explícita. No confundir
  este historial append-only con los overrides de supervisión usados para intervenir en vivo.
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
- **Detalle incompleto de borradores:** el detalle de evaluación todavía no devuelve
  `idMateriaDivision` y omite grupos sin variantes por sus joins. El editor exige una
  selección inequívoca de comisión y conserva al menos una variante por grupo; no relajar
  esa protección hasta que el backend represente todo el borrador sin pérdida.
- **Publicación transaccional:** un borrador solo se publica mediante `publicar-completo`.
  `GuardarTodoEnBanco` es explícito y desmarcado por defecto en UI; la misma intención conserva
  `Idempotency-Key` para evitar duplicados y un fallo del banco debe impedir la publicación completa.
- **Calificación por grupo:** el puntaje pertenece a `GrupoPregunta` porque cada intento sortea una
  variante. En modo personalizado, el borrador puede estar incompleto, pero la publicación exige
  valores con hasta dos decimales cuya suma exacta coincida con la escala 10/100. No asignar puntajes
  diferentes a variantes del mismo grupo ni sustituir la validación autoritativa del backend.
- **Cambio de escala:** el editor convierte proporcionalmente la nota de aprobación y todos los
  puntajes personalizados ya cargados, y notifica al docente. Nunca cambiar la escala enviando el
  umbral anterior ni convertir valores silenciosamente fuera del editor.
- **Importaciones y puntajes personalizados:** el contenido pendiente del banco todavía no tiene un
  grupo editable al que asignar puntaje. Debe guardarse primero como borrador, recargar el detalle y
  recién entonces publicarse.
- **Selección múltiple y justificación:** `mc` sigue siendo selección única y `multiple` permite
  varias selecciones. La UI sólo ofrece justificación en `mc`, `multiple` y `vf`; `abierta` y `code`
  fuerzan `sin_justificacion`. El alumno guarda siempre el estado completo mediante
  `IdOpcionesSeleccionadas`, texto, justificación, `RevisionEsperada` y un `EventoId` estable por
  intención. El hash de contenido y los snapshots pertenecen al backend. No volver al payload legacy
  para el runtime ni exponer `esCorrecta` en contratos del alumno.
- **Concurrencia de respuestas:** la outbox conserva por separado el evento exacto en vuelo y la
  edición local más reciente. Un reintento incierto mantiene UUID y body; una confirmación tardía
  sólo confirma su versión y rebasa cualquier edición posterior. Un `RESPONSE_REVISION_CONFLICT`
  conserva la respuesta local y exige que el alumno elija explícitamente entre servidor y versión
  local. Reencolar el mismo `EventoId` y contenido es un no-op, incluso después de confirmarlo;
  nunca resucitarlo desde el cleanup de navegación ni reintentar un 409 generando silenciosamente
  otra revisión o UUID.
- **Compatibilidad histórica de notas:** no se recalifican intentos anteriores. Los nuevos intentos
  conservan snapshot del puntaje y la corrección canónica opera sobre `IntentoPregunta`. El detalle
  efectivo no expone `idIntentoPregunta` ni un `estadoCorreccion` literal: la UI escribe por
  `idPregunta` y deriva pendiente/corregida desde `puntajeObtenido`.
- **Override de nota final:** la nota manual es una excepción auditada que prevalece sobre la
  calculada sin borrarla. No habilitar el override en UI hasta que todas las preguntas posean
  puntaje definitivo; validar siempre contra la escala 10/100 real.
- **Confirmación y revisión:** una nota completa no equivale a devolución publicada. La corrección
  docente debe confirmarse sin preguntas pendientes; cualquier modificación posterior la reabre.
  Confirmar no habilita por sí solo la revisión: rigen política, permiso individual, intento válido
  y un acceso temporal de hasta cinco minutos. `nunca` bloquea también permisos anteriores y `manual`
  sólo autoriza mediante un permiso individual vigente. El acceso `unico` se consume de forma persistente
  por intento; cambiar temporalmente a `libre` no elimina ese consumo. El alumno debe consultar disponibilidad, emitir la sesión con una
  `Idempotency-Key` estable y consumir `/revisiones/sesiones/:id/contenido`; nunca debe usar
  `/intentos/:id/completo`. `fechaExpiracion` es el límite autoritativo calculado por el backend como
  el mínimo entre cinco minutos, la ventana general y el permiso individual; la UI debe retirar el
  contenido al alcanzarlo y revalidar disponibilidad. En acceso único, no consumir automáticamente al
  montar la ruta ni reintentar el GET a ciegas. La ausencia de claves correctas nunca implica respuesta incorrecta.
- **Intento académicamente válido:** la selección automática considera sólo el último intento
  `entregado`; un override manual persiste hasta que el docente lo elimine. No ocultar intentos
  anteriores, no permitir elegir estados no entregados y no recalcular esta selección en cliente.
- **Resumen del historial propio:** `GET /intentos/mios` resuelve el intento válido antes de aplicar
  filtros. Los contadores académicos pueden no sumar `totalEvaluaciones`; mostrar el resumen del
  backend sin inferir categorías ni aplicar umbrales globales 4/6.
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
hooks y pruebas focalizadas del banco. Las rutas y editores independientes, borradores,
selector, guardado individual y publicación transaccional están integrados. La gestión
completa de estados/etiquetas y los conflictos 409 continúan en la Fase 12 de `PLAN.md`.

Los reportes por alumno, publicación, pregunta y grupo están integrados en
`/profesor/reportes`. Comparten layout, filtros, KPIs, tabla, skeleton y tarjetas
de gráficos; cada reporte conserva sus gráficos y reglas de dominio. Preguntas y grupos
consumen agregados server-side normalizados por porcentaje del puntaje máximo; el detalle
de una pregunta cerrada muestra opciones y distractores desde snapshots históricos. “Comparar
evaluaciones” contrasta participación y resultados entre las publicaciones visibles y declara ese
alcance; la distribución global se conserva en el análisis individual. Se retiraron los gráficos por
alumno derivados de la página visible para no presentarlos como una visión global. Preguntas y
grupos muestran distribuciones globales disponibles en sus KPIs y rankings server-side de menor
puntaje y mayor tiempo; no construyen rankings desde la página paginada. Los filtros docentes usan exclusivamente las evaluaciones autorizadas y
limpian selecciones inferiores incompatibles al aplicar la búsqueda.
Los filtros permiten alternar métricas académicas entre todos los intentos y el intento
válido; los contadores operativos siempre incluyen todos. Los promedios globales entre
escalas 10/100 se interpretan sobre 10, mientras cada publicación conserva escala y umbral.
No se reemplazó la navegación completa del docente ni se creó un sidebar global.
La identidad transversal del reporte de preguntas es `ContenidoHashSnapshot`: agrupa contenido
idéntico, pero no debe interpretarse como linaje vivo de copias que luego fueron modificadas.
El contrato actual no expone filtro por tipo de pregunta; no simularlo sobre la página visible.
La pestaña `analisis` agrega el recorrido docente por una publicación concreta. Usa el
listado completo autorizado para sus filtros dependientes y separa resultados oficiales
de pendientes operativos y gráficos legacy. Las preguntas siempre se consultan con
`validos + confirmada`; el ranking de bajo rendimiento, su regla y los estados de
evidencia vienen del backend. El detalle de opciones debe enviar `claveContenido`, y una
incompatibilidad de snapshots se resuelve localmente sin bloquear el resto del análisis.
No trasladar fechas del listado a las preguntas. La vista `/admin/analitica` implementa
el recorrido institución → carrera → materia → comisión → evaluaciones con el resumen,
las comparativas y la serie mensual independientes de la página. Usa la jerarquía canónica
`carreras → materias → comisiones`, respeta la elegibilidad y las posiciones devueltas por
backend y conserva `porcentajeCoberturaConfirmada`. El período efectivo debe permanecer
estable en la URL al navegar y paginar. Los meses sin denominador no se representan como
cero ni se conectan en la línea de aprobación. Resultados oficiales y pendientes operativos
son dimensiones separadas; las subcategorías operativas pueden superponerse y nunca deben sumarse.

El inicio `/profesor` agrupa las actividades por `idMateria` y mantiene la barra de
gestión visible. Materias, comisiones y actividades cambian como vistas internas del
mismo componente, con retorno explícito en cada nivel y sin crear rutas adicionales.
Una materia con una sola comisión muestra directamente sus actividades. La agrupación
usa IDs entregados por el backend; nunca debe reconstruirse por nombres de materia,
carrera o división.

El Banco privado está disponible en `/profesor/banco-preguntas`, con workspace de
preguntas/grupos y rutas independientes de creación/edición. `QuestionContentEditor`
es el límite reutilizable entre banco y evaluación. La creación de grupos puede mezclar
preguntas existentes y nuevas mediante la operación compuesta transaccional.

La creación de evaluación permite guardar borrador y `/profesor/examen/[idPublicacion]/editar`
edita borradores con revisión optimista e IDs anidados. El selector mantiene importaciones
versionadas pendientes hasta guardar/publicar; los botones individuales crean contenido
del banco sin exigir persistir antes la evaluación. Publicar usa exclusivamente
`publicar-completo`, con `GuardarTodoEnBanco` desmarcado por defecto y una clave idempotente
estable. `useIdempotencyKey` conserva la misma clave para el mismo payload tras un resultado incierto.

Las primeras siete etapas de calificación, intentos, reportes y telemetría están integradas en el frontend. El editor permite
escala 10/100, nota de aprobación, reparto igual o personalizado por grupo, visibilidad del puntaje
y activación de corrección automática de cerradas. Cambiar la escala convierte proporcionalmente
los valores existentes y lo comunica al docente. El detalle docente siempre presenta la configuración;
el examen del alumno muestra `puntajeMaximo` solo si el backend lo incluyó. La pantalla de corrección
docente asigna puntaje y comentario sobre `IntentoPregunta`, admite omisiones y reemplazo de
autocorrecciones, muestra el desglose de notas y confirma el override final auditado. Desde la gestión
de una evaluación, el docente puede consultar todos los intentos de cada alumno, elegir uno entregado
como resultado académico y restaurar la selección automática. `/alumno/resultados` consume el historial
propio server-side, con resumen, filtros, orden y paginación sincronizados con la URL.
Durante el examen una outbox temporal IndexedDB registra tiempos por pregunta, foco, fullscreen,
conectividad, reanudaciones, recargas y fallos operativos mediante sesión/secuencia estables. Los
intervalos conservan el mismo UUID al cerrarse y se sincronizan por lotes al recuperar conectividad;
nunca alteran estado, nota o validez por sí solos sin la evaluación autoritativa del backend. Cada intento
congela la política de supervisión al iniciar; la telemetría devuelve la instrucción efectiva y el frontend
informa, advierte, bloquea o presenta la anulación según corresponda. La pantalla completa puede ser
opcional u obligatoria. Las respuestas continúan sincronizándose durante bloqueos visuales. La corrección docente muestra
un resumen funcional y la cronología de interrupciones; los intervalos `question_active` quedan detrás
de “Más detalles”, junto con el snapshot de supervisión, sus decisiones y overrides auditados. Las duraciones `BIGINT` se normalizan en el servicio antes de agregarse y la apertura
del examen se registra una sola vez por documento, diferenciando inicio de reanudaciones reales.

La selección múltiple y justificación está integrada de punta a punta. `QuestionContentEditor`
diferencia selección única (`mc`) de selección múltiple (`multiple`), conserva configuración en
banco/borradores y nunca calcula el hash. El runtime del alumno restaura respuestas desde snapshots,
guarda conjuntos completos con revisión e idempotencia durable, permite justificación sólo en
preguntas cerradas y, al entregar, registra `"Sin respuesta"` en las justificaciones obligatorias
vacías antes de sincronizar y finalizar. La publicación ya no
posee el bloqueo temporal de Etapa 1. La corrección docente presenta la justificación y diferencia el
puntaje sugerido por opciones de la corrección definitiva cuando se requiere revisión manual.
La vista del alumno trata la ausencia de `esCorrecta` como información no disponible y nunca como
una respuesta incorrecta. La corrección
manual incorpora una confirmación explícita y el historial sólo ofrece la revisión cuando el backend
devuelve `revisionDisponible: true`; una edición posterior vuelve a abrir la corrección. La gestión
docente configura revisión `nunca|al_corregir|ventana|manual`, acceso `unico|libre`, permisos por intento
y auditoría. `nunca` es absoluto, `manual` se gestiona sólo por intento y el acceso único queda consumido
para ese intento después de mostrar el contenido. El alumno abre deliberadamente una revisión idempotente
de hasta cinco minutos; el frontend la oculta al vencer el límite efectivo informado por la API y el contenido
se reconstruye desde snapshots. `/intentos/:id/completo` queda reservado para docente y administrador.

Playwright usa `.next-e2e` mediante `EXAMIO_NEXT_DIST_DIR`, por lo que los E2E y builds
de validación pueden ejecutarse sin finalizar un `next dev` activo sobre `.next`.

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

## Eficiencia de trabajo

* Delimitar el alcance antes de investigar y modificar.
* Leer primero los archivos directamente relacionados con la tarea.
* No relevar nuevamente la arquitectura ni recorrer todo el repositorio si AGENTS.md y la documentación disponible ya resuelven esas dudas.
* No investigar errores preexistentes que no afecten el objetivo solicitado.
* Evitar ciclos repetitivos de diagnóstico, ejecución y lectura de logs. Si no hay avances concretos, detenerse, registrar la limitación y continuar con el trabajo independiente.
* Mantener los cambios acotados y evitar refactors no solicitados.
* Priorizar una implementación correcta y validada proporcionalmente antes que una investigación exhaustiva de problemas ajenos.


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
