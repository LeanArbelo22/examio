# Plan de acción técnico de Examio

Este documento es el registro vivo del plan de estabilización y evolución del frontend de Examio. Debe actualizarse cada vez que se complete una fase o un punto específico.

## Estados

- `[x]` Completado y verificado.
- `[~]` En progreso o completado parcialmente.
- `[ ]` Pendiente.
- `[!]` Bloqueado o dependiente de otro repositorio/equipo.

## Principios de ejecución

- Realizar cambios pequeños, verificables y fáciles de revertir.
- No mezclar saneamiento técnico con funcionalidades grandes sin una justificación clara.
- Mantener compatibilidad con los contratos actuales de la API.
- Reutilizar componentes, hooks, servicios, tipos y layouts existentes.
- Centralizar acceso a la API y evitar URLs hardcodeadas.
- No introducir abstracciones sin casos reales de reutilización.
- Verificar TypeScript, ESLint focalizado, build y tests aplicables en cada iteración.
- Proponer y aprobar refactorizaciones importantes antes de implementarlas.

---

## Fase 0 — Estabilización del entorno de desarrollo

**Estado: COMPLETADA — 2026-07-23**

### Frontend

- [x] Documentar puertos esperados: frontend `3000`, API `55803`.
- [x] Crear `pnpm env:check` para comprobar conectividad, endpoint y proceso del puerto.
- [x] Crear `pnpm dev:checked` para verificar el entorno antes de iniciar Next.js.
- [x] Mostrar ambiente y URL esperada en la salida de diagnóstico.
- [x] Detectar procesos Jest, ts-jest o Vitest cuando el sistema permite leer su comando.
- [x] Documentar inspección manual y finalización segura por PID.
- [x] Documentar que un puerto abierto no prueba la identidad del backend.
- [x] Documentar el flujo real del login y la diferencia entre `/login 200` y autenticación válida.

### Backend

- [x] Separar la construcción de Express (`src/app.ts`) del arranque (`src/index.ts`).
- [x] Garantizar que importar la aplicación no ejecute `listen()`.
- [x] Hacer que todas las suites importen `src/app.ts`.
- [x] Limitar el puerto fijo a la ejecución normal.
- [x] Agregar manejo explícito de `EADDRINUSE` sin finalizar procesos ajenos.
- [x] Agregar `GET /api/health` público e identificable.
- [x] Identificar el servicio como `examio-api`.
- [x] Comprobar SQL Server con `SELECT 1` y timeout de 2 segundos.
- [x] Responder `200` cuando API y base están disponibles.
- [x] Responder `503` cuando la API está activa pero SQL Server no está disponible.
- [x] Evitar secretos y configuración sensible en el health check.
- [x] Agregar cinco tests del health check.
- [x] Ejecutar la suite con `--runInBand --detectOpenHandles`.
- [x] Verificar 10 suites y 171 tests aprobados sin handles abiertos reportados.

### Causa resuelta

Los tests importaban `src/index.ts`, que conectaba la base y ejecutaba `app.listen(PORT)` como efecto lateral. Con `connectDB` mockeado, Jest abría el puerto fijo y dejaba un `http.Server` sin cerrar. Supertest no era la causa.

### Archivos relevantes

- Frontend: `scripts/check-development-environment.mjs`, `docs/DEVELOPMENT.md`.
- Backend: `src/app.ts`, `src/index.ts`, `src/controllers/health.controller.ts`, `src/routes/health.routes.ts`, `tests/health.test.ts`.

### Deuda transversal registrada

- [ ] Normalizar la configuración TypeScript del backend para recuperar un `npm run build` operativo. El README de la API documenta conflictos preexistentes entre CommonJS, `module: "nodenext"`, `verbatimModuleSyntax`, alcance de `rootDir` y tipado de `mssql`. Esta deuda no fue causada por la fase 0 y no afecta la suite Jest, pero debe resolverse antes de considerar listo un despliegue productivo.

---

## Fase 1 — Consolidación de autenticación y sesión

**Estado: COMPLETADA — 2026-07-24**

- [x] Diagramar el flujo actual entre Server Action, `signIn`, CredentialsProvider, JWT y sesión.
- [x] Aprobar una capa BFF de Next.js basada en la sesión de NextAuth como único límite del navegador con la API.
- [x] Aprobar renovación silenciosa mediante refresh token como complemento del BFF, sin almacenar tokens ni contraseñas en el navegador.
- [x] Implementar el BFF acotado sin convertirlo en un open proxy y conservando método, query string, body, status y contrato JSON.
- [x] Eliminar `examio_api_token`, `setApiToken`, `clearApiToken` y toda exposición del access token mediante `Session.user`.
- [x] Evitar divergencias entre la cookie/JWT de NextAuth y `localStorage`.
- [x] Diferenciar credenciales inválidas, API no disponible y contrato inválido en `authorize()`.
- [x] Eliminar el `catch` silencioso sin exponer información sensible.
- [x] Corregir la detección global de 401 mediante `ApiError.statusCode` y códigos estables.
- [x] Unificar logout y redirección mediante el evento `signOut` de NextAuth y logout backend idempotente.
- [x] Confirmar que el botón actual “Extender sesión” no renueva el JWT backend y no debe presentarse como funcional.
- [x] Implementar y validar renovación silenciosa, rotación y revocación contra la API.
- [x] Reemplazar “Extender sesión” por recuperación real; nunca expulsar automáticamente a un alumno de una evaluación ante el primer 401.
- [x] Comparar expiraciones: access token de 15 minutos, sesión backend absoluta de 12 horas y `session.maxAge` alineado a 12 horas.
- [x] Tipar callbacks JWT y sesión sin `any`.
- [x] Validar manualmente login por rol, refresh exitoso y fallido, logout y expiración dentro y fuera de una evaluación.

### Arquitectura aprobada

```text
React Query / servicio
  → apiFetch
  → BFF interno de Next.js
  → JWT/cookie HttpOnly de NextAuth
  → access token server-side
  → Examio API
```

- El navegador no debe leer, persistir ni enviar directamente access tokens o refresh tokens de la API.
- `Session.user` conserva exclusivamente datos funcionales (`id`, `name`, `email`, `role`, `identificadorInstitucional`, `idAlumno`).
- El BFF solo puede reenviar hacia la URL configurada de Examio API.
- Ante expiración, la renovación debe actualizar atómicamente access token, refresh token rotado y vencimiento, y reintentar la solicitud original como máximo una vez.
- Un 403 no debe iniciar refresh. Un 401 tampoco debe provocar logout automático durante una evaluación.
- NextAuth renueva de forma anticipada desde el callback `jwt`; ante un 401 de access token vencido, `apiFetch` fuerza la actualización de sesión y reintenta una vez.
- La clave de idempotencia se deriva en servidor del refresh token y las renovaciones simultáneas se agrupan por token dentro del proceso. La API conserva la coordinación entre procesos.

### Contrato backend requerido para completar la estrategia

- [x] `POST /api/auth/refresh` con `Idempotency-Key` obligatorio.
- [x] Emisión de refresh token opaco junto con access token y expiraciones explícitas.
- [x] Rotación, idempotencia y detección de reutilización del refresh token.
- [x] `POST /api/auth/logout` idempotente y revocación de la sesión.
- [x] Códigos que distinguen access vencido, refresh vencido/revocado/reutilizado, credenciales inválidas y permisos insuficientes.
- [x] Concurrencia definida mediante clave idempotente, conflicto acotado y revocación ante replay.
- [x] Pruebas backend de renovación válida, rotación, reutilización, revocación y expiración.

**Contrato habilitado:** la API implementó y documentó login, refresh y logout con persistencia server-side. La implementación frontend utiliza ese contrato sin simular renovación ni conservar contraseñas.

### Continuidad y protección de evaluaciones

Auditoría frontend realizada sobre el flujo concreto de inicio, guardado de respuestas y finalización.

- [x] Mantener localmente cada respuesta pendiente hasta confirmación. Implementado con outbox IndexedDB por intento/pregunta y fallback explícito a memoria; recarga, desconexión y recuperación verificadas manualmente.
- [x] Diferenciar visualmente “Guardando”, “Guardado”, “Pendiente de sincronización” y rechazo no recuperable.
- [x] Reintentar autoguardados con una política acotada: tres intentos con espera progresiva, single-flight por intento y nuevo ciclo cada 30 segundos. Opciones y texto abierto con envío automático tras 750 ms sin escritura verificados manualmente.
- [x] Ante `401 ACCESS_TOKEN_EXPIRED`, renovar y repetir una sola vez; flujo integrado validado manualmente.
- [x] Evitar cualquier redirección automática fuera de la ruta de examen por el primer 401.
- [x] Conservar respuestas pendientes cuando falle refresh o conectividad mediante IndexedDB, incluyendo opciones y texto; navegación offline, recarga y recuperación verificadas manualmente.
- [~] Mostrar recuperación de sesión sobre el examen sin desmontar la vista. El modal preserva la vista; una reautenticación interactiva sin desmontaje continúa pendiente.
- [x] Mantener contenido y temporizador visibles durante recuperación de sesión.
- [x] No finalizar ni abandonar el intento cuando falla manualmente la operación de entrega; la vista permanece abierta y permite reintentar.
- [x] No finalizar, anular, abandonar ni ejecutar `signOut()` automáticamente por errores de sesión dentro de una ruta de examen.
- [!] Definir con backend cómo se computa el tiempo durante fallas de sesión, red o sincronización.
- [x] Proteger contra recarga o cierre de pestaña mediante `beforeunload` cuando existen respuestas no confirmadas; la outbox permite restaurarlas.
- [x] Evitar envíos duplicados mediante última versión por pregunta, confirmación condicionada por versión y single-flight; cambios rápidos verificados manualmente.
- [x] Sincronizar respuestas pendientes al recuperar sesión o conectividad mediante evento `online`, reintento manual y ciclos acotados; recuperación de conexión verificada manualmente.
- [x] Informar claramente cuándo una respuesta está guardando, fue confirmada o todavía permanece pendiente.
- [~] Si vence el tiempo con respuestas pendientes, registrar la solicitud de entrega, sincronizar primero y finalizar después. El cómputo académico del tiempo continúa bajo autoridad backend.
- [~] La finalización espera la outbox, queda durablemente solicitada si no hay conexión y ofrece reintento o salida controlada; falta validación manual offline.
- [x] Guardado de respuestas abiertas: borrador durable por pulsación, autoguardado HTTP tras 750 ms de inactividad, envío en `blur`/navegación, restauración tras recarga y conservación de la versión confirmada; verificado manualmente.
- [x] Guardado de opciones: actualización optimista, outbox durable, restauración, reintento acotado y persistencia visual al navegar; verificado manualmente.
- [x] Precargar y conservar las opciones de todas las preguntas durante el intento para que una sesión degradada no vacíe preguntas ya preparadas.
- [x] Suprimir la repetición del modal de sesión una vez aceptado el modo degradado para el intento completo.

### Continuidad ante pérdida de conectividad

- [x] Normalizar la imposibilidad del navegador de alcanzar Next.js como `NETWORK_UNAVAILABLE`, diferenciándola de errores HTTP y `REQUEST_ABORTED`.
- [x] Tratar `BFF_UPSTREAM_UNAVAILABLE` como indisponibilidad temporal de la API, no como prueba de sesión vencida.
- [x] No iniciar refresh ni ejecutar `signOut()` por pérdida de red; esperar conectividad o una respuesta efectiva de autenticación.
- [x] Mostrar durante el examen un único estado no bloqueante de conectividad degradada, manteniendo contenido, opciones, navegación y temporizador visibles.
- [x] Mantener respuestas nuevas en la outbox durable sin conectividad y marcarlas como pendientes; verificado manualmente.
- [x] Escuchar recuperación `online` y reanudar sincronización con reintentos acotados y single-flight; verificado manualmente.
- [~] Mantener fuera del examen los errores de red como errores recuperables sin cerrar sesión; la normalización es global y cada vista conserva su acción local de reintento.
- [~] Impedir una falsa entrega exitosa: conservar la solicitud, sincronizar primero y finalizar después; falta prueba manual offline.
- [x] Ofrecer salida controlada manteniendo el intento abierto e informar cuántas respuestas siguen sin confirmación.
- [x] Detectar recarga de un intento y mostrar “Reanudar evaluación”, informando restauración de respuestas y continuidad del temporizador.

La protección de respuestas pendientes está implementada sin cambios de backend, auth, BFF, middleware, Navbar ni logout. Navegación offline, recuperación, recarga, concurrencia, fallback y autoguardado de texto abierto fueron verificados; resta validar la entrega iniciada sin conexión.

### Auditoría y política configurable de continuidad y supervisión

- [~] La pérdida de foco ya se persiste con inicio, fin, duración, UUID idempotente y timestamps del servidor. Continúan pendientes conectividad, sesión, recarga, errores de sincronización/entrega y salida de pantalla completa como incidentes estructurados.
- [x] Registrar la pérdida de foco sin respuestas, tokens ni contenido del examen, usando timestamps cliente validados y recepción del servidor.
- [!] Definir una configuración por evaluación elegida por el docente para cada clase de incidente: solo registrar, advertir y solicitar retorno, permitir una cantidad acotada o aplicar una consecuencia. Requiere modelo de datos, API, validación server-side y una política funcional explícita.
- [!] Definir límites independientes y acumulativos cuando corresponda —por ejemplo, una salida de pantalla completa permitida y entrega ante una reincidencia— evitando que el cliente sea la única autoridad para contabilizarlos.
- [ ] Reemplazar en una etapa posterior el tratamiento actual de salida de pantalla completa como fraude inmediato por una máquina de estados no destructiva: advertir, conservar contenido, respuestas y temporizador, y solicitar volver a pantalla completa. La restricción permanece habilitada hasta abordar ese rediseño.
- [!] Definir qué consecuencias pueden ejecutarse automáticamente. Una entrega, anulación o penalización por incidentes de navegador no debe implementarse sin reglas backend autoritativas, tolerancia a falsos positivos y aprobación funcional.
- [ ] Detectar recargas y reanudaciones como incidentes diferenciados. La recuperación durable actual preserva el intento, pero una recarga también puede utilizarse para abandonar pantalla completa sin generar la señal de salida esperada.
- [ ] Al reanudar después de una recarga, volver a solicitar pantalla completa cuando la evaluación lo requiera y mantener visible la advertencia hasta que el alumno retome, sin descartar respuestas ni reiniciar el temporizador.
- [~] La pérdida de foco usa una outbox IndexedDB independiente, UUID idempotente, control de versión y sincronización al recuperar conectividad. Extender el mismo patrón a otras clases de incidente cuando exista contrato.
- [ ] Informar al alumno de manera clara qué incidente se detectó, qué acción debe realizar, cuántas tolerancias quedan si aplica y si el evento está pendiente de sincronización.
- [x] Mostrar al docente resumen y detalle cronológico de pérdidas de foco dentro de la corrección, aclarando que son señales informativas sin consecuencia académica automática.
- [ ] Diseñar pruebas manuales específicas para recarga, salida de fullscreen, cambio de pestaña, minimización, pérdida de foco, desconexión, sesión vencida y combinaciones concurrentes, incluyendo el tiempo hasta retomar.

### Backlog funcional de evaluaciones detectado en validación

- [x] Permitir al docente corregir y comentar una pregunta sin respuesta mediante `IntentoPregunta`, sin crear una `Respuesta` artificial. Resuelto en la Fase 13, etapa 2.
- [ ] Renderizar preguntas de programación/SQL como desarrollo y no como opción múltiple; confirmar los valores efectivos de `Tipo` y reutilizar el guardado de texto/código.
- [ ] Eliminar nombres y títulos de evaluaciones hardcodeados y mostrarlos desde publicación/actividad.
- [!] Definir la semántica de múltiples intentos: un único examen visible con historial de intentos y una regla explícita para promedio, mejor intento, último intento o intento válido. Requiere decisión funcional y revisión de API/SQL.
- [x] Inicializar fecha de inicio y fin al crear una evaluación con un rango editable válido. Resuelto posteriormente en la Fase 7.
- [x] Limitar años y rangos de fecha a valores académicamente razonables en el frontend. La API conserva la validación autoritativa. Resuelto posteriormente en la Fase 7.
- [x] Validar inputs de creación al perder foco y al enviar, conservando la revalidación final del backend. Resuelto posteriormente en la Fase 7.
- [ ] Permitir a docente y alumno filtrar o agrupar actividades del dashboard por comisión y materia.
- [!] Definir la política de revisión posterior a la entrega: habilitar una única consulta cuando todo sea autocorregible o después de la corrección docente si existen respuestas abiertas. Requiere persistir autorización/consumo de esa visualización en backend.
- [!] Agregar una devolución general opcional del examen además de comentarios por pregunta. Requiere contrato y persistencia backend.
- [ ] Al continuar un intento abierto después de sesión expirada, desconexión o salida controlada, omitir la pantalla informativa y navegar directamente a la actividad pendiente.

---

## Fase 2 — Configuración y acceso centralizado a la API

**Estado: COMPLETADA — 2026-07-25**

- [x] Mover la URL de la API a `EXAMIO_API_URL`, configuración exclusiva del servidor y validada.
- [x] Eliminar las URLs `http://localhost:55803/api` del código productivo; solo permanecen como ejemplos de desarrollo documentados.
- [x] Mantener `apiFetch` como único cliente HTTP para servicios y consumidores de UI.
- [x] Eliminar llamadas `fetch` directas desde páginas y componentes; los `fetch` restantes pertenecen a NextAuth, `apiFetch` y el BFF.
- [x] Verificar que la pantalla de docentes consume servicios y hooks existentes y retirar la referencia visual al puerto local.
- [x] Mover la inscripción de alumnos a `alumnos.api` y `useAlumnos`, consumiendo `POST /alumnos/:matricula/inscripciones`.
- [x] Corregir la interpolación de matrícula, eliminar el fallo silencioso y usar el contrato backend idempotente con rol `admin`.
- [x] Soportar respuestas JSON, cuerpos vacíos y errores de parseo mediante el contrato común de `apiFetch`.
- [x] Incorporar timeout por defecto, timeout configurable y composición con `AbortSignal`; el BFF también limita la espera del upstream.
- [x] Normalizar códigos fallback para 400/422, 401, 403, 404, 409, 429 y 500 sin reemplazar códigos estables del backend.
- [x] Centralizar construcción de query strings en `src/lib/query-string.ts`.
- [x] Exponer el contrato común `ApiError` y `ApiValidationError`, preservando `statusCode`, `code`, `message`, `path` y errores de validación.
- [x] Integrar `GET /api/health` en el diagnóstico frontend mediante `pnpm env:check` y `pnpm dev:checked`.

**Criterio de finalización verificado:** ninguna página o componente realiza `fetch` directo, ningún endpoint contiene una URL hardcodeada y la inscripción utiliza el contrato efectivo documentado por la API.

---

## Fase 3 — Tipado y contratos

**Estado: COMPLETADA — 2026-07-25**

- [x] Eliminar interfaces duplicadas de `src/types/index.ts`.
- [x] Confirmar el contrato correcto antes de eliminar cada duplicado.
- [x] Separar tipos por dominio manteniendo exports compatibles mediante el barrel `src/types/index.ts`.
- [x] Distinguir entidades, respuestas y payloads en `shared`, `api`, `auth`, `alumnos`, `academic`, `evaluaciones`, `administracion` y `reportes`.
- [x] Reemplazar todos los `any` explícitos de `src`.
- [x] Estabilizar PascalCase para requests y camelCase para responses.
- [x] Evitar compatibilidad simultánea PascalCase/camelCase en componentes.
- [x] Activar `noImplicitAny`.
- [x] Activar `strictNullChecks` después de resolver la nulabilidad detectada.
- [x] Activar y validar `strict: true`.

---

## Fase 4 — Convenciones de TanStack Query

**Estado: COMPLETADA — 2026-07-25**

- [x] Crear fábricas jerárquicas de query keys por dominio en `src/lib/query-keys.ts`.
- [x] Normalizar el retorno de hooks exponiendo el objeto estándar de React Query; se conservan aliases existentes como compatibilidad transitoria.
- [x] Normalizar condiciones `enabled` mediante validación explícita de identificadores positivos.
- [x] Auditar invalidaciones después de mutaciones y alinearlas con las mismas fábricas de keys.
- [x] Usar `placeholderData` solo en la paginación del reporte, donde evita parpadeos y conserva contexto.
- [x] Renombrar todos los hooks sin JSX de `.tsx` a `.ts`.
- [x] Eliminar imports no utilizados detectados por ESLint.
- [x] Documentar la separación entre estado remoto de React Query, estado local de UI y outbox durable del examen.

---

## Fase 5 — Errores y feedback al usuario

**Estado: COMPLETADA (2026-07-25)**

- [x] Consolidar `ApiError` en categorías funcionales y mensajes seguros mediante `src/lib/errors.ts`.
- [x] Crear estados reutilizables de carga, vacío y error.
- [x] Integrar `ErrorMessage` con el sistema común de feedback accesible.
- [x] Eliminar `alert()` de los flujos normales migrados en esta fase.
- [x] Evaluar un sistema de toast accesible: no se agrega una dependencia global; el feedback
  inline con regiones `alert`/`status` cubre los flujos actuales sin introducir estado transversal.
- [x] Agregar `error.tsx` en los segmentos críticos de administración y docente.
  No se agrega un límite genérico al segmento alumno porque podría desmontar una evaluación activa;
  ese flujo conserva su tratamiento local especializado.
- [x] Registrar detalles técnicos del cliente solo en desarrollo.
- [x] Mantener mensajes funcionales seguros en producción y preservar errores de validación por campo.

El `alert()` que solicita permiso de pantalla completa permanece como excepción explícita del
flujo antifraude del examen. Su reemplazo depende de la revisión funcional ya planificada de
fullscreen, pérdida de foco, recargas e incidentes; no corresponde modificarlo como saneamiento
general de feedback.

---

## Fase 6 — Componentes reutilizables y consistencia visual

**Estado: COMPLETADA — 2026-08-06**

- [x] Crear la primera familia reutilizable de reportes: `ReportLayout`, `ReportFilterPanel`, `ReportKpiGrid`, `ReportTable` y `ChartCard`.
- [x] Validar esas APIs con el reporte de rendimiento por publicación de evaluación.
- [x] Consumir KPIs y distribución global del nuevo reporte sin recalcular agregados desde la página visible.
- [x] Comparar patrones repetidos en alumnos, carreras, materias, docentes y usuarios.
- [x] Implementar `ManagementPageHeader` y validarlo en alumnos y materias.
- [x] Evaluar `DataTable` administrativo: se difiere porque filas, acciones y estados todavía varían demasiado.
- [x] Implementar `ManagementFilterPanel` estructural y `Pagination` compartida sin mezclar filtros locales con filtros URL de reportes.
- [x] Implementar `StatusBadge`; cada dominio conserva la traducción de estado a etiqueta y tono.
- [x] Evaluar campos de formulario reutilizables: se difieren a la fase 7 junto con schemas y errores por campo.
- [x] Reutilizar `EmptyState`, `LoadingState` y un `ReportSkeleton` compartido. `ConfirmDialog` se difiere hasta corregir accesibilidad de `Modal`.
- [x] Evitar un componente de tabla excesivamente configurable.
- [!] Los gráficos del reporte anterior por alumno continúan describiendo únicamente la página visible porque su endpoint no entrega series globales. Sus KPIs sí son globales. Corregir esa diferencia requiere ampliar el contrato backend existente; el nuevo reporte no tiene esta limitación.

---

## Fase 7 — Formularios y validación

**Estado: COMPLETADA — 2026-08-06**

- [x] Crear `examFormSchema` con Zod para información, publicación y estructura dinámica de preguntas.
- [x] Reutilizar tipos inferidos del schema para el estado y las preguntas del examen.
- [x] Crear `FormFieldError` y asociar errores mediante labels, `aria-invalid` y `aria-describedby`.
- [x] Separar la transformación al `GuardarEvaluacionPayload` en `src/lib/exam-form.ts`.
- [x] Separar validación del renderizado y reutilizar el mapeo de errores Zod por path.
- [x] Dividir la creación de examen en información básica, editor de preguntas y configuración lateral.
- [x] Inicializar apertura y cierre con fechas editables válidas, limitar el año a una ventana lógica y validar relaciones al perder foco y al enviar.
- [x] Eliminar el título y descripción generados automáticamente; ahora son datos explícitos del formulario.
- [x] Evaluar React Hook Form: no se incorpora porque Zod y estado controlado resolvieron el caso sin otra dependencia.
- [x] Validar el patrón reducido en materias con schema pequeño, transformación numérica y errores por campo.
- [x] Mantener formularios CRUD simples sin convertirlos en una abstracción universal.

---

## Fase 8 — Testing frontend

**Estado: COMPLETADA**

- [x] Aprobar e instalar infraestructura de testing.
- [x] Incorporar Vitest, jsdom, React Testing Library, `user-event` y `jest-dom`.
- [x] Incorporar Mock Service Worker para contratos HTTP sin depender de la API activa.
- [x] Evaluar e incorporar Playwright para flujos críticos.
- [x] Probar cliente HTTP y servicios críticos: `apiFetch`, errores HTTP, timeout, cancelación, red, refresh/reintento y normalización del inicio de intento.
- [x] Probar autenticación y manejo de errores: clasificación, caches, UX dentro/fuera del examen, callbacks JWT, login, rotación, single-flight y sesión pública sin credenciales.
- [x] Probar hooks principales: alumnos, evaluaciones, reportes, outbox, sincronización offline/concurrente y finalización coordinada.
- [x] Probar componentes reutilizables: `Pagination`, `FormFieldError`, filtros y tabla de reportes, providers de sesión y modal de expiración.
- [x] Probar los reportes de rendimiento por alumno y evaluación.
- [x] Agregar E2E aislados de login por rol, rutas protegidas, examen, corrección y reportes.

### Etapa 1 — Base unitaria y de componentes

- [x] Configurar entorno `jsdom`, setup común, limpieza automática, alias `@/` y matchers de DOM.
- [x] Agregar scripts para modo interactivo y ejecución única reproducible.
- [x] Probar schemas de examen y materia, incluyendo fechas, tipos de pregunta y opciones correctas.
- [x] Probar valores iniciales y transformación del formulario de examen al payload HTTP.
- [x] Probar construcción centralizada de query strings.
- [x] Probar categorización, mensajes seguros, reintentos y errores de validación.
- [x] Probar la adaptación del contrato real de `POST /intentos/iniciar`.
- [x] Probar interacción básica y estados deshabilitados de paginación, y el error accesible de campo.
- [x] Incorporar MSW 2 en modo Node para interceptar el `fetch` real de tests, rechazar requests no declarados y simular exclusivamente el BFF same-origin y la sesión NextAuth.
- [x] Cubrir éxito, cuerpo vacío, validación, JSON inválido, 403 funcional, 401 no renovable, refresh exitoso/fallido, límite de un reintento y single-flight concurrente.
- [x] Cubrir timeout, `AbortSignal`, pérdida de red y rechazo de endpoints que podrían evitar el BFF.
- [x] Incorporar Playwright como etapa separada para los flujos críticos de navegador.

### Etapa 2 — Hooks de React Query

- [x] Crear un `QueryClientProvider` aislado por test, sin reintentos y sin caché compartida entre casos.
- [x] Verificar `enabled` y activación posterior con identificadores válidos en alumnos y opciones de examen.
- [x] Verificar payload e invalidaciones relacionadas de la inscripción de alumnos.
- [x] Verificar la invalidación del sorteo después de finalizar un intento.
- [x] Verificar que filtros y paginación produzcan query keys diferentes en reportes.
- [x] Verificar `placeholderData` durante un cambio de página del reporte por evaluación.
- [x] Verificar que el detalle de alumno omita filtros exclusivos del listado.
- [x] Probar la outbox con IndexedDB realista: reemplazo por versión, confirmación tardía, aislamiento por intento, solicitud de entrega, limpieza, suscripción y fallback no durable.
- [x] Probar guardado optimista exitoso y confirmación de la misma versión desde el hook.
- [x] Probar sincronización offline, conservación de la solicitud de entrega, recuperación manual, single-flight e invalidación de opciones confirmadas.
- [x] Probar en el layout real el orden registrar → sincronizar → finalizar → limpiar.
- [x] Probar que respuestas pendientes bloqueen la entrega sin borrar la outbox y mantengan una salida controlada.
- [x] Probar la propagación integrada de errores terminales desde QueryCache y MutationCache.
- [x] Verificar que 403, access inválido, red y validación no se conviertan en expiración de sesión.
- [x] Probar el modal fuera del examen, continuación degradada sin repetición y recuperación transitoria dentro del examen.
- [x] Probar callbacks JWT, login y refresh server-side de NextAuth sin exponer credenciales.

### Etapa 3 — Componentes, autenticación y navegador

- [x] Cubrir filtros con borrador, limpieza, orden, paginación, filas activables por teclado y estados vacíos de reportes.
- [x] Verificar que el reporte por evaluación use KPIs y distribución globales del backend y que el reporte por alumno describa gráficos limitados a la página visible.
- [x] Cubrir login válido e inválido, errores seguros, renovación anticipada, rotación, idempotencia, concurrencia y logout tolerante a fallas de infraestructura.
- [x] Verificar que `Session.user` exponga identidad funcional pero no access token ni refresh token.
- [x] Incorporar Playwright con Chromium, servidor Next.js y API efímera local sin SQL Server ni cuentas reales.
- [x] Verificar en navegador login por `admin`, `docente` y `alumno`, cookie HttpOnly, redirección RBAC y bloqueo de rutas protegidas.
- [x] Verificar en navegador reporte docente mediante BFF, respuesta de examen atravesando fullscreen/outbox/BFF y corrección de respuesta abierta.
- [x] Verificar que el flujo E2E de examen no escriba credenciales en `localStorage` ni `sessionStorage`.

---

## Fase 9 — Accesibilidad y UX

**Estado: COMPLETADA**

- [x] Agregar focus trap, Escape, restauración de foco y `aria-labelledby` a `Modal`.
- [x] Revisar navegación por teclado en tablas interactivas y mantener foco visible.
- [x] Agregar semántica `aria-live`, `status` o `alert` a estados asíncronos y errores compartidos.
- [x] Asociar errores de login y creación de evaluación con `aria-invalid` y `aria-describedby`.
- [x] Revisar contraste y foco visible. Los tonos heredados de texto y placeholder demasiado claros se elevan globalmente al contraste de `slate-500` mediante una política CSS prioritaria.
- [x] Evitar emojis como único indicador en los flujos revisados; los símbolos conservados están ocultos semánticamente o acompañados por texto.
- [x] Revisar responsive de tablas y gráficos: tablas con overflow horizontal y ancho mínimo; gráficos con contenedores adaptables y alternativa textual.
- [x] Limitar el bloqueo del menú contextual al entorno fullscreen del examen y registrar allí el incidente.
- [x] Respetar `prefers-reduced-motion` globalmente para animaciones, transiciones y scroll suave.

### Implementación y verificación

- [x] El modal bloquea el scroll de fondo mientras está abierto y devuelve el foco al disparador al cerrar.
- [x] Los gráficos de reportes exponen listas o resúmenes equivalentes para lectores de pantalla sin duplicar el SVG de Recharts.
- [x] El detalle de alumno anuncia su carga y el login anuncia errores funcionales sin depender del color.
- [x] Se agregaron pruebas de nombre accesible, foco inicial, Escape, ciclo de Tab y alternativas textuales de gráficos.

---

## Fase 10 — Mocks, documentación y limpieza

**Estado: EN PROGRESO**

- [x] Crear documentación operativa del entorno frontend.
- [x] Crear README específico del frontend.
- [x] Separar claramente documentación frontend, API y base de datos.
- [x] Separar mocks de código productivo; MSW y datos simulados permanecen exclusivamente en tests y E2E.
- [x] Eliminar mocks usados por pantallas reales cuando existe integración y retirar de la UI las simulaciones sin contrato real.
- [x] Documentar variables de entorno y aclarar cuáles tienen efecto actual.
- [x] Documentar arquitectura, routing, layouts y providers.
- [x] Documentar autenticación, sesión y roles.
- [x] Documentar cliente HTTP y servicios por dominio.
- [x] Documentar hooks y convenciones de TanStack Query.
- [x] Documentar el inventario y las reglas actuales de query keys.
- [x] Corregir caracteres mal codificados. La auditoría de fuentes y documentación no encontró secuencias mojibake residuales; los archivos revisados permanecen en UTF-8.
- [x] Eliminar comentarios temporales del dashboard, creación de evaluaciones y provider global.
- [ ] Resolver o retirar Teams, Moodle, recuperación de contraseña y “Recordar sesión”.

### Limpieza de mocks productivos

- [x] Eliminar `src/lib/db-mock.ts` y confirmar que no quedan imports productivos.
- [x] Retirar cifras institucionales simuladas del dashboard administrativo; los accesos de gestión ya no presentan conteos ficticios.
- [x] Retirar el banco de preguntas simulado de la creación de evaluaciones.
- [x] Retirar el selector decorativo de formato: el tipo efectivo continúa definiéndose por pregunta y se persiste mediante el contrato existente.
- [x] Reemplazar los controles de seguridad simulados por el campo real `RecursosPermitidos`, aclarando que es información para el alumno y no una política antifraude.

### Dependencias backend diferenciadas

- [!] Si se requieren conteos reales de carreras, alumnos activos, docentes y comisiones en `/admin`, ampliar un contrato de resumen institucional. `GET /api/admin/dashboard/analitica` entrega métricas de intentos y evaluaciones, pero no esos conteos estructurales.
- [x] El backend del Banco de preguntas ya implementa persistencia, búsqueda/filtros, RBAC, borradores, revisiones, copias independientes, idempotencia y publicación transaccional. Las migraciones, verificaciones SQL y pruebas fueron ejecutadas correctamente por el responsable del backend. La integración frontend continúa en la Fase 12.
- [!] Para configurar fullscreen, portapapeles, orden o variantes por evaluación, definir persistencia y aplicación efectiva de políticas antifraude en backend. `RecursosPermitidos` es texto informativo y no debe reutilizarse como configuración de seguridad.

Teams, Moodle, recuperación de contraseña y “Recordar sesión” quedan deliberadamente fuera de esta iteración y continúan pendientes.

---

## Fase 11 — Rendimiento

**Estado: PENDIENTE**

- [ ] Medir antes de memoizar.
- [ ] Dividir páginas monolíticas para reducir renders.
- [ ] Evitar objetos inestables en query keys.
- [ ] Revisar tamaño y carga de Recharts.
- [ ] Cargar gráficos únicamente en rutas que los usan.
- [ ] Mantener paginación server-side en reportes.
- [ ] Evaluar virtualización solo con volúmenes que la justifiquen.
- [ ] Considerar el React Compiler antes de agregar memoización manual.

---

## Fase 12 — Banco privado de preguntas y borradores de evaluación

**Estado: EN PROGRESO — 2026-09-30**

### Contrato y base de integración

- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` desde la documentación del backend.
- [x] Verificar que el backend soporte preguntas, grupos, etiquetas, filtros, revisiones optimistas, copias desde/hacia evaluaciones, borradores reales y publicación completa transaccional.
- [x] Crear tipos estrictos del banco para listados, detalles, filtros, payloads, importaciones, mappings e idempotencia.
- [x] Crear servicios de dominio sobre `apiFetch`, sin URLs externas ni `fetch` directo.
- [x] Verificar que el BFF existente reenvía `Idempotency-Key` hacia la API sin exponer el bearer al navegador.
- [x] Crear la fábrica `bancoPreguntasKeys` y hooks React Query para consultas, CRUD, estados, etiquetas, copias e importación.
- [x] Cubrir la capa de servicio y hooks con pruebas focalizadas de contratos, query keys, `enabled`, invalidaciones e `Idempotency-Key`.

### Rutas y vistas del banco

- [x] Agregar el acceso desde la navegación docente existente, sin crear un layout o sidebar global nuevo.
- [x] Crear `/profesor/banco-preguntas` como workspace responsive con pestañas accesibles para Preguntas y Grupos, filtros sincronizables con URL, paginación server-side, loading, error y empty states.
- [x] Crear `/profesor/banco-preguntas/preguntas/nueva` y `/profesor/banco-preguntas/preguntas/[id]/editar` reutilizando `QuestionContentEditor` con la creación de evaluaciones.
- [x] Crear `/profesor/banco-preguntas/grupos/nuevo` y `/profesor/banco-preguntas/grupos/[id]/editar`; la creación permite combinar preguntas existentes y nuevas de forma transaccional y la edición reemplaza la composición con preguntas existentes.
- [ ] Incorporar gestión accesible de etiquetas sin desviar al docente del editor; soportar creación, renombrado, eliminación y conflictos 409.
- [ ] Mostrar estado, revisión y procedencia con texto además de color; confirmar archivado/restauración y comunicar los grupos afectados por cambios de una variante.
- [ ] Tratar un 409 de revisión como conflicto visible: conservar la edición local, ofrecer recarga explícita y no sobrescribir silenciosamente.

### Creación y edición de evaluaciones

- [x] Extender tipos, schemas y transformadores con `RevisionEsperada`, IDs anidados, `ImportacionesBanco`, referencias de procedencia y publicación completa sin mezclar shapes de UI con payloads HTTP.
- [x] Implementar “Guardar borrador” en `/profesor/crear-examen`: persiste estructura incompleta y configuraciones ingresadas, con defaults visibles de un intento, 90 minutos, apertura +5 minutos y cierre +24 horas.
- [x] Crear `/profesor/examen/[idPublicacion]/editar` para editar únicamente borradores, conservar IDs anidados y revisión, y reemplazar la estructura completa desde el estado cargado.
- [!] Limitación backend detectada: `GET /api/evaluaciones/:id/detalle` no devuelve `idMateriaDivision` y usa `INNER JOIN` para grupos/preguntas. El frontend resuelve la comisión solo si materia/división tiene una coincidencia única y mantiene al menos una variante por grupo, pero el contrato debería devolver el ID y representar grupos vacíos para garantizar round-trip fiel de cualquier borrador.
- [x] Agregar un selector de banco accesible dentro del editor, con búsqueda, filtros, selección múltiple, resumen previo e importación como copia independiente; los IDs del banco solo viajan en referencias/importaciones.
- [x] Permitir “Guardar en mi banco” sobre una pregunta o grupo específico durante creación o edición, sin exigir guardar ni publicar antes la evaluación completa. Los grupos usan la unión discriminada del endpoint compuesto.
- [x] Mantener la edición local después de guardar en el banco y reflejar la referencia de procedencia sin prometer sincronización futura.
- [x] Mover “+ Añadir Pregunta Estructural” debajo del último grupo/pregunta, manteniendo una acción visible y alcanzable por teclado al final de la estructura.

### Publicación transaccional

- [x] Sustituir la publicación legacy por `POST /api/evaluaciones/:idActividad/publicar-completo`; una evaluación nueva se guarda primero como borrador.
- [x] Mostrar “Guardar todas las preguntas en mi banco” desmarcado por defecto y explicar que lo guardado individualmente se conserva aunque no se active.
- [x] Enviar contenido final, publicación, revisión, importaciones y `GuardarTodoEnBanco` en una única operación transaccional.
- [x] Generar una `Idempotency-Key` UUID por intención del usuario, bloquear doble clic y conservar exactamente la misma clave y body ante reintentos de resultado incierto.
- [ ] No reintentar automáticamente con clave nueva ante 409; distinguir revisión del borrador, revisión del banco y reutilización inválida de clave.
- [x] Tras éxito, invalidar detalle, evaluaciones docentes y banco, y navegar únicamente cuando la publicación haya sido confirmada. Los mappings se recuperan desde el detalle de la evaluación de destino.

### Calidad y verificación

- [x] Agregar pruebas focalizadas de schemas de banco/borrador, transformadores con IDs, servicios, hooks, idempotencia y editor compartido de contenido.
- [ ] Probar editores de pregunta/grupo, filtros, paginación, selección por teclado, estados y conflictos de revisión.
- [x] Probar borrador incompleto, conservación de configuración, importación, guardado individual y publicación con la opción desmarcada/marcada mediante schemas, transformadores, hooks, componentes y E2E.
- [!] Idempotencia estable, bloqueo de doble clic y rollback funcional quedan cubiertos por hooks/UI y el contrato backend; resta una prueba frontend específica de respuesta 409 con recarga explícita.
- [x] Agregar E2E del flujo crítico docente: guardar contenido individual → seleccionar/importar → guardar borrador → publicar transaccionalmente con opción de banco explícita.
- [x] Validar ESLint focalizado, 111 tests Vitest, typecheck, 9 E2E y build de producción aislado.

---

## Fase 13 — Calificación configurable e intentos válidos

**Estado: EN PROGRESO — 2026-10-12**

### Etapa 1 — Configuración y persistencia fundacional

- [x] Backend: incorporar escalas 10/100, nota de aprobación, puntajes iguales o personalizados por grupo, visibilidad para el alumno y corrección automática configurable, sin recalificar intentos históricos.
- [x] Backend: ampliar snapshots y persistencia de corrección, preparar auditorías, override de intento válido e incidentes de foco para etapas posteriores, y actualizar los SP existentes de inicio/render/finalización.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` después de la entrega backend.
- [x] Extender tipos, schemas y transformadores del formulario con la configuración de calificación y `PuntajeMaximo` por grupo.
- [x] Incorporar el editor accesible de escala, umbral, distribución, visibilidad y corrección automática en creación y edición de borradores.
- [x] Permitir puntajes personalizados incompletos al guardar borrador y exigir suma exacta en centavos al publicar.
- [x] Ajustar proporcionalmente la nota de aprobación y los puntajes cargados al cambiar entre escala 10 y 100, notificando el cambio al docente.
- [x] En modo personalizado, exigir guardar primero las importaciones pendientes del banco para poder asignarles puntaje antes de publicar.
- [x] Mostrar la configuración y puntajes en el detalle docente y el puntaje máximo en el examen del alumno únicamente cuando el backend lo incluye.
- [x] Agregar pruebas focalizadas para distribución decimal, cambio proporcional, validación, transformación de payloads, editor y render del alumno.
- [x] Validar la etapa: ESLint focalizado sin errores, 120 tests Vitest, los 9 escenarios E2E y build de producción con TypeScript completado.

### Etapa 2 — Corrección por pregunta y override final

- [x] Backend: corregir por `puntajeObtenido` sobre `IntentoPregunta`, admitir omisiones y reemplazo de autocorrecciones, recalcular notas y auditar cada modificación.
- [x] Backend: convertir `calificar` en un override final auditado que conserva separadas nota calculada, manual y efectiva.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` después de la entrega backend.
- [x] Extender tipos, servicio y hook con el contrato canónico camelCase y las respuestas de calificación.
- [x] Rehacer la pantalla docente para corregir todas las preguntas con puntaje parcial y comentario, incluyendo cerradas automáticas y preguntas omitidas.
- [x] Mostrar desglose de nota automática, calculada, manual y efectiva usando escala y umbral reales.
- [x] Incorporar confirmación explícita para el override final y bloquearlo mientras no exista nota calculada completa.
- [x] Actualizar la revisión del alumno para usar escala, umbral y comentario canónico, sin ampliar todavía la política de acceso a revisiones.
- [x] Agregar pruebas unitarias de validación, servicios, hooks y componentes, y adaptar el E2E de corrección al contrato por puntaje.
- [x] Validar la etapa: ESLint focalizado sin errores, 131 tests Vitest, 9 escenarios E2E y build de producción con TypeScript completado.
- [!] El contrato efectivo de `GET /intentos/:idIntento/completo` no expone todavía `idIntentoPregunta` ni `estadoCorreccion` aunque fueron mencionados en el resumen de entrega. La UI opera por `idPregunta` y deriva el estado desde `puntajeObtenido`; solicitar esos campos sólo si un flujo futuro los necesita de forma explícita.
- [ ] Validar manualmente contra SQL Server real: puntaje parcial, pregunta omitida, reemplazo de autocorrección, escala 100 y override final. Ejecutar nuevamente el verificador SQL ampliado.

### Etapa 3 — Intento académicamente válido

- [x] Backend: entregar listado resumido por alumno/publicación, selección manual auditada y reversión a la regla automática del último intento entregado.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` después de las etapas 3 y 4.
- [x] Incorporar tipos, servicios, query keys y hooks para consultar, seleccionar y restaurar el intento válido.
- [x] Agrupar la gestión docente por alumno y ofrecer un modal accesible que conserva todos los intentos, sólo permite seleccionar entregados y confirma cambios académicos explícitamente.
- [x] Invalidar tanto el detalle de intentos como el listado de alumnos después de cada cambio.
- [x] Validar la integración con pruebas de servicio, hook, componente y E2E.
- [!] Backend pendiente de validación manual contra SQL Server real para selección/reemplazo/eliminación y una carrera concurrente; el frontend no depende de esa validación para compilar.

### Etapa 4 — Historial filtrable del alumno

- [x] Backend: entregar `GET /api/intentos/mios` paginado, filtrable, ordenable, identificado por JWT y basado en el intento válido.
- [x] Incorporar tipos, servicio, query key y hook del historial propio sin enviar matrícula desde el navegador.
- [x] Rehacer `/alumno/resultados` con resumen académico, filtros combinables sincronizados con URL, ordenamiento, paginación, loading, error y empty state.
- [x] Mostrar escala, umbral, estado, resultado e intento académico sin volver a calcular aprobación en cliente.
- [x] Tratar defensivamente los intentos anulados en el historial: mostrar su existencia y fecha, pero ocultar nota, aprobado/desaprobado, umbral y revisión porque no participan del resultado académico.
- [x] Reorganizar el inicio del alumno alrededor de acciones pendientes, resumen y resultados académicos recientes; retirar el listado legacy de “Exámenes entregados” que mezclaba estados no académicos y duplicaba el historial.
- [ ] Backend: no devolver `resultado=aprobado|desaprobado` para intentos `anulado`, `vencido` o `en_progreso`; representar el resultado académico como no aplicable sin reutilizar una nota cargada durante una corrección informativa.
- [x] Reutilizar `ReportFilterPanel`, `ReportKpiGrid`, `Pagination`, estados comunes y catálogos actuales de materias/comisiones.
- [x] Validar la etapa: ESLint focalizado sin errores, 144 tests Vitest, 11 escenarios E2E y build de producción con TypeScript completado.
- [!] Backend pendiente de validación manual de filtros combinados y plan de ejecución con volumen representativo.

### Etapa 5 — Reportes operativos y escalas mixtas

- [x] Backend: incorporar `alcanceIntentos=todos|validos`, filtro de pendientes, umbrales configurables y normalización base 10 entre escalas.
- [x] Sincronizar la documentación backend y ampliar contratos TypeScript sin recalcular métricas en cliente.
- [x] Agregar a ambos reportes el selector de alcance académico sincronizado con URL y el filtro de publicaciones con/sin correcciones pendientes.
- [x] Presentar agregados globales normalizados sobre 10 y promedios de cada publicación en su escala original.
- [x] Mantener contadores operativos de todos los intentos y explicar cuántos participan en el cálculo académico.
- [!] Backend pendiente de comprobación manual con escalas mixtas, overrides y volumen representativo.

### Etapa 6 — Incidentes de pérdida de foco

- [x] Backend: entregar escritura idempotente y lecturas docentes de resumen/listado sin consecuencias académicas automáticas.
- [x] Incorporar tipos, servicios, query keys y hooks de lectura/escritura.
- [x] Registrar `blur/focus` y cambios de visibilidad sin duplicar el evento, con UUID estable y cierre sobre el mismo recurso.
- [x] Incorporar una outbox IndexedDB independiente para sincronización offline, replay seguro y protección frente a confirmaciones tardías.
- [x] Mostrar resumen y cronología informativa en la pantalla docente de corrección.
- [x] Agregar pruebas focalizadas de contrato, outbox, listeners, filtros y flujo E2E.
- [x] Validar la integración: ESLint focalizado, TypeScript, 149 tests Vitest, 3 E2E afectados y build de producción.
- [!] El controlador backend efectivo responde `200` también en la primera creación, aunque el resumen de entrega indicó `201`; el frontend admite ambos estados y no depende de esa diferencia.
- [!] El listado efectivo de incidentes devuelve un array completo sin paginación, pese a que el diseño inicial la mencionaba. La UI lo consume así; paginar requiere una evolución coordinada del contrato.
- [!] Backend pendiente de validación contra SQL Server real para concurrencia, sincronización tardía y volumen. La ventana efectiva documentada es de siete días.

---

## Fase 14 — Respuestas múltiples, justificación y revisión

**Estado: EN PROGRESO — 2026-10-13**

### Etapa 1 — Edición y persistencia fundacional

- [x] Backend: incorporar `multiple`, modos de justificación, estrategias de corrección, tratamiento manual/informativo y hash de contenido, preservando defaults legacy.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` después de la entrega backend.
- [x] Ampliar tipos, schemas y transformadores de evaluación y banco sin crear endpoints ni query keys nuevos.
- [x] Reutilizar `QuestionContentEditor` para selección única/múltiple, varias respuestas correctas y configuración accesible de justificación y corrección. La justificación se ofrece después de las opciones únicamente en `mc`, `multiple` y `vf`; desarrollo y programación fuerzan `sin_justificacion`.
- [x] Conservar la configuración en preguntas independientes, grupos compuestos, borradores y copias entre banco y evaluación; `contenidoHash` permanece de solo lectura y no se calcula en cliente.
- [x] Permitir guardar contenido nuevo en borradores/banco y bloquear su publicación con un mensaje funcional mientras el runtime de alumno no esté disponible.
- [x] Proteger el runtime actual del alumno para que `multiple` no se interprete como selección única ni como respuesta abierta.
- [x] Agregar pruebas focalizadas de UI, schemas, defaults, transformadores, copias, bloqueo temporal y mensaje `QUESTION_RUNTIME_NOT_AVAILABLE`.
- [x] Requisito de despliegue: las migraciones `20261013_respuestas_multiples_justificacion.sql` y `20261014_runtime_respuestas_multiples.sql` fueron aplicadas en la base real.

### Etapa 2 — Resolución, entrega y corrección

- [x] Backend: renderizar desde snapshots, persistir el conjunto completo de opciones y justificación, aplicar revisión optimista e idempotencia por `EventoId`, y habilitar publicación de `multiple`.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` después de la entrega backend.
- [x] Ampliar tipos y servicio sobre los endpoints efectivos existentes, sin crear rutas ni query keys nuevas.
- [x] Evolucionar la outbox de respuestas para conservar por separado el evento en vuelo y la edición más reciente, rebasar revisiones confirmadas y proteger cambios tardíos.
- [x] Implementar selección única, selección múltiple, omisión explícita, texto y justificación con restauración desde snapshot/outbox.
- [x] Conservar exactamente los espacios internos y finales durante el autoguardado de respuestas abiertas y justificaciones, sin convertir un texto compuesto sólo por espacios en respuesta válida.
- [x] Tratar conflictos de revisión de forma visible, conservando la edición local y ofreciendo restaurar servidor o reenviar explícitamente la versión local.
- [x] Completar al entregar las justificaciones obligatorias vacías con `"Sin respuesta"`, sincronizarlas antes del cierre y conservar el intento ante cualquier rechazo.
- [x] Retirar el bloqueo temporal de publicación y ampliar corrección/revisión con justificación y puntaje sugerido por opciones.
- [x] Agregar y ejecutar tests Vitest focalizados y ESLint sobre los archivos modificados.
- [x] Actualizar el escenario E2E del examen para selección múltiple, justificación y respuesta canónica; su ejecución queda delegada a la validación manual de esta iteración.
- [ ] Completar la comprobación manual contra la API y SQL Server reales: publicación, recarga, offline/replay, conflicto entre pestañas, entrega y revisión manual.
- [x] Evitar que el cleanup de navegación vuelva a encolar un `EventoId` ya confirmado y genere conflictos falsos de revisión al regresar a una pregunta.
- [x] Diferenciar en la corrección docente opciones correctas elegidas/no elegidas y mostrar cuántas respuestas correctas fueron efectivamente seleccionadas.
- [x] Mostrar en cada pregunta el criterio congelado que se aplicó: coincidencia exacta, puntaje parcial con/sin descuento, corrección docente y uso informativo/manual de la justificación.
- [x] Presentar de forma neutral la revisión del alumno cuando el backend omite `esCorrecta`; no inferir una respuesta incorrecta desde un campo ausente.
- [ ] Simplificar visualmente las opciones en la revisión: distinguir de forma inmediata lo que eligió el alumno de las respuestas correctas, sin depender únicamente de leyendas casi idénticas ni aplicar el mismo tratamiento visual a ambos estados.

### Etapa 2.1 — Anulación, confirmación y revisión segura

- [x] Backend: incorporar anulación autoritativa e idempotente por incidente, confirmación auditada de corrección y revisión condicionada por `revisionDisponible`.
- [x] Aplicar la migración `20261015_anulacion_confirmacion_revision.sql` y su verificador en las bases correspondientes.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` con la entrega backend.
- [x] Ampliar contratos, servicios y hooks sin crear rutas ni clientes HTTP paralelos.
- [x] Incorporar “Confirmar corrección” al final de la pantalla docente, deshabilitado mientras existan puntajes pendientes, y presentar el estado confirmado.
- [x] Ofrecer revisión al alumno sólo cuando `revisionDisponible` sea verdadero y traducir `REVIEW_NOT_AVAILABLE` a un mensaje funcional.
- [x] Congelar el examen ante la primera pérdida de foco o salida de fullscreen, sincronizar respuestas e incidente y solicitar la anulación autoritativa.
- [x] Persistir la solicitud de anulación en una outbox IndexedDB independiente para conservar la intención sin conexión y evitar duplicados.
- [x] Agregar pruebas focalizadas de contratos, confirmación, visibilidad de revisión, outbox y orden de sincronización.
- [ ] Validar manualmente contra API y SQL Server reales: pérdida de foco online/offline, replay, intento anulado sin nota, confirmación, reapertura posterior y revisión del alumno.
- [ ] Backend: definir una resolución docente explícita y auditada para un intento anulado que se considere académicamente aceptable. Corregir o confirmar no debe cambiarlo silenciosamente a `entregado`; la operación debe conservar el incidente, registrar actor/motivo y decidir su participación como intento válido, historial y reportes.
- [ ] Frontend posterior: presentar por separado el estado operativo `anulado`, el estado de corrección y la eventual resolución académica; no usar “corregido” como reemplazo del estado del intento porque actualmente no forma parte de `EstadoIntento`.
- [x] Sustituir la política temporal y la solicitud local de anulación por las instrucciones autoritativas de la Etapa 6. La outbox de anulación queda fuera del runtime activo; se conserva sólo como compatibilidad histórica hasta su limpieza específica.

### Etapa 3 — Telemetría temporal confiable

- [x] Backend: entregar catálogo temporal, escritura individual y batch, listado paginado y métricas con unión de intervalos.
- [x] Aplicar la migración `20261016_telemetria_temporal.sql`, actualizar el SP de render y ejecutar su verificador.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` con la entrega backend.
- [x] Exponer `idIntentoPregunta` en el contrato del runtime sin inferirlo desde `idPregunta`.
- [x] Incorporar tipos, servicios y query keys para escritura batch y lectura paginada.
- [x] Reemplazar la cola específica de foco en el runtime por una outbox temporal uniforme con sesión y secuencia persistentes.
- [x] Registrar tiempos por pregunta, foco, fullscreen, conectividad, recarga/reanudación, errores de entrega y finalización.
- [x] Conservar la anulación en una outbox independiente y ordenar respuestas → telemetría → anulación.
- [x] Reemplazar posteriormente esa consecuencia local por evaluación backend después de persistir cada evento; la outbox temporal continúa siendo la única cola activa de supervisión.
- [x] Rehacer el panel docente para mostrar cronología paginada, intervalos abiertos y tiempos por pregunta.
- [x] Simplificar el panel docente: retirar métricas técnicas, ocultar `question_active` detrás de “Más detalles” y normalizar duraciones `BIGINT` antes de agregarlas.
- [x] Registrar una sola apertura por documento y distinguir “Examen iniciado” de reanudaciones por recarga, reconexión o retorno al intento.
- [x] Agregar pruebas focalizadas de sesión/secuencia, apertura/cierre, batch, retry, servicios y runtime.
- [ ] Validar manualmente offline/reload, cierre posterior, replay, secuencias concurrentes y métricas contra SQL Server real.

### Etapa 4 — Rendimiento por pregunta y grupo

- [x] Implementar en backend reportes agregados server-side de eficiencia por pregunta, grupo estructural y distribución de opciones, sin consultas N+1 desde el cliente.
- [x] Incluir apariciones, respuestas, omisiones, correcciones correctas/parciales/incorrectas, pendientes, puntaje relativo y tiempos agregados obtenidos desde la telemetría temporal.
- [x] Soportar filtros por materia, comisión, actividad, publicación, grupo, pregunta, rango de fechas, estado, corrección y alcance académico `todos|validos`.
- [ ] Incorporar filtro por tipo de pregunta cuando el backend lo exponga; no forma parte del contrato efectivo de la etapa entregada.
- [x] Agrupar variantes por grupo estructural y contenido histórico por `ContenidoHashSnapshot`, sin depender del enunciado ni del ID de una copia.
- [!] `ContenidoHashSnapshot` identifica contenido idéntico histórico, pero no representa un linaje vivo si una copia independiente se modifica. No presentar derivados distintos como la misma pregunta del banco.
- [x] Reutilizar en frontend layout, filtros, KPIs, tablas y gráficos para las vistas “Por pregunta” y “Por grupo”, con opciones/distractores en detalle accesible.
- [ ] Validar manualmente los tres reportes con datos reales, escalas mixtas, intentos válidos, correcciones pendientes y muestras temporales parciales.

### Etapa 5 — Políticas y sesiones de revisión

- [x] Backend: persistir políticas por publicación, permisos individuales, auditoría y sesiones de revisión de cinco minutos construidas desde snapshots.
- [x] Aplicar la migración `20261018_revision_examen.sql` y su verificador en las bases correspondientes.
- [x] Aplicar la migración correctiva `20261019_semantica_revision_unica.sql` y su verificador para persistir el consumo único por intento y limitar la expiración por ventana o permiso.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` con la entrega backend.
- [x] Incorporar tipos, servicios, query keys y hooks para políticas, permisos, disponibilidad, auditoría, emisión y consumo de sesiones.
- [x] Configurar desde la gestión docente los modos `nunca`, `al_corregir`, `ventana` y `manual`, el acceso `unico|libre` y consultar el historial funcional de cambios.
- [x] Permitir autorización, actualización y revocación individual desde la corrección de un intento, respetando confirmación y revisión optimista.
- [x] Reemplazar en el alumno el acceso directo a `/intentos/:id/completo` por disponibilidad, apertura deliberada, emisión idempotente y consumo de contenido desde snapshots.
- [x] Separar en la UI “confirmar corrección” de “habilitar revisión”; la visibilidad depende exclusivamente de política, permiso, intento válido y sesión.
- [x] Agregar mensajes funcionales para sesión requerida, vencida, consumida, revocada y conflictos de revisión.
- [x] Alinear la interfaz con la semántica definitiva: `nunca` absoluto, `manual` sólo individual, acceso único persistente por intento y retiro automático del contenido al alcanzar `fechaExpiracion`.
- [x] Simplificar la configuración docente: ocultar la cantidad de accesos cuando no aplica y reemplazar términos internos de sesiones por opciones funcionales.
- [x] Validar la integración con ESLint focalizado y 22 pruebas Vitest de contratos, política, permiso, confirmación y apertura del alumno.
- [ ] Validar manualmente contra API y SQL Server real: los cuatro modos, ventana, permiso/revocación, cambio de intento válido, sesión libre, sesión única, expiración y consumo concurrente.
- [!] `pnpm typecheck` global continúa bloqueado por errores preexistentes en tests y outboxes ajenos a esta etapa; no reportó errores en los archivos nuevos de revisión.

### Etapa 6 — Políticas configurables de supervisión

- [x] Backend: persistir políticas versionadas, snapshots por intento, decisiones, estado operativo y overrides auditados.
- [x] Aplicar dos veces `20261019_politicas_supervision.sql` y ejecutar su verificador en las bases correspondientes.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` con la entrega backend.
- [x] Incorporar tipos, servicio, query keys y hooks para política, estado del alumno, detalle docente y overrides.
- [x] Agregar a la gestión de la evaluación un editor funcional de pantalla completa, incidentes, tolerancia, ventana y consecuencia, con revisión optimista.
- [x] Congelar la configuración sólo en backend: comunicar al docente que los cambios afectan intentos futuros y consultar el snapshot real al corregir.
- [x] Eliminar del runtime la decisión local “primer incidente anula” y obedecer exclusivamente `informar|advertir|bloquear_interfaz|anular_intento` devuelto por la telemetría.
- [x] Modelar la salida y recuperación de pantalla completa como un mismo intervalo temporal y permitir que el backend libere bloqueos al cerrarlo.
- [x] Corregir la outbox para conservar también `fullscreen_exit` después de sincronizar su apertura, enviar el cierre con el mismo UUID/secuencia y reconciliar periódicamente el estado autoritativo aunque se pierda una respuesta HTTP.
- [x] Asociar el aviso del alumno al `decisionId` real para que descartarlo no vuelva a mostrarlo ante navegación, respuestas o revisiones informativas posteriores.
- [x] Mantener el guardado y la sincronización de respuestas durante bloqueos visuales sin ofrecer interacción académica hasta la recuperación.
- [x] Mostrar al docente estado, decisiones y acciones auditadas de desbloqueo, reconocimiento y descarte; nunca reabrir intentos anulados.
- [x] Priorizar en el panel docente advertencias, bloqueos y anulaciones; omitir de la interfaz las decisiones técnicas `informar` hasta que el backend pueda describirlas funcionalmente.
- [x] Plegar la cronología bajo “Ver eventos registrados”, en paralelo con los tiempos por pregunta, y retirar también la etiqueta interna “Sin revisar” de las consecuencias pendientes.
- [ ] Rediseñar “Más detalles” de actividad como navegación consolidada por pregunta: sumar tiempos, contar visitas reales, fusionar intervalos consecutivos y omitir aperturas técnicas de duración despreciable; no presentar por defecto una fila con timestamp por cada `question_active`.
- [ ] Evaluar una vista compacta opcional del recorrido (`P1 → P2 → P1`) para mostrar regresos y saltos sin convertir la telemetría cruda en una tabla técnica; mantener los horarios exactos sólo cuando ayuden a relacionar una navegación con un incidente.
- [ ] Corregir en origen el intervalo inicial de 0 ms generado por el ciclo de montaje de desarrollo, evitando persistir el `question_active` de prueba sin perder visitas reales.
- [ ] Analizar la fusión de “Actividad durante el examen” y “Supervisión del intento” en una sola sección con resumen temporal, incidentes relevantes, consecuencias y detalles progresivos, sin duplicar información.
- [x] Validar con ESLint focalizado y 10 pruebas Vitest de contratos, editor, override, telemetría autoritativa y finalización.
- [ ] Validar manualmente: pantalla completa opcional/obligatoria, cada consecuencia, recuperación de bloqueo, replay, offline y override docente contra API y SQL Server reales.
- [ ] Backend: diagnosticar el `TELEMETRY_PERSISTENCE_ERROR` observado durante una anulación, registrando de forma segura el error SQL real; comprobar que ninguna transacción o conexión quede retenida y que el detalle docente continúe disponible sin reiniciar la API.
- [ ] Retirar en una limpieza aprobada el archivo y tests de la antigua outbox de anulación, que ya no participa del runtime.

### Etapa 7 — Visibilidad operativa de incidentes

- [x] Backend: entregar historial append-only, revisión optimista e idempotente y listado paginado por publicación.
- [x] Aplicar `20261020_visibilidad_incidentes.sql` y su verificador en la base correspondiente.
- [x] Sincronizar `docs/API.md`, `docs/DATABASE.md` y `docs/PLAN_API.md` con la entrega backend.
- [x] Incorporar tipos, servicio, query keys y hooks para listado y revisión operativa de incidentes.
- [x] Agregar a la gestión de la evaluación un resumen con incidentes, alumnos afectados, intentos anulados y pendientes de revisión.
- [x] Permitir filtrar, paginar, navegar al intento y cambiar el estado `pendiente|revisado|descartado` con comentario opcional.
- [x] Mantener separadas la revisión operativa de la Etapa 7 y las intervenciones de supervisión de la Etapa 6.
- [x] Integrar en rendimiento por evaluación los filtros y agregados de incidentes calculados antes de paginar.
- [x] Traducir conflictos de revisión, alcance e idempotencia a mensajes funcionales sin inferir fraude.
- [x] Validar contratos, hooks, panel y reporte mediante pruebas Vitest focalizadas y ESLint de archivos modificados.
- [ ] Validar manualmente con API real: filtros, paginación, revisión, descarte, conflicto concurrente y actualización del reporte.

### Mejora transversal pendiente — Filtros y visualizaciones de reportes

#### Entrega 1 completada — Análisis docente por publicación

- [x] Agregar en `/profesor/reportes` el recorrido publicación → resultados oficiales → preguntas → evidencia histórica y variantes.
- [x] Seleccionar publicaciones desde el listado completo autorizado del docente, con filtros dependientes propios y `idPublicacion` como unidad.
- [x] Separar resultados oficiales, pendientes operativos superpuestos y distribución legacy no oficial.
- [x] Consumir la regla y el ranking server-side de bajo rendimiento sin recalcular hallazgos en cliente, distinguiendo falta de datos, muestra insuficiente y ausencia/presencia de hallazgos.
- [x] Consultar opciones por `claveContenido`, aislar errores de evidencia histórica en su panel y presentar variantes sólo como comparación descriptiva.
- [x] Mantener los reportes anteriores disponibles y conservar en URL los filtros de retorno sin trasladar fechas al análisis de preguntas.
- [ ] Validar el recorrido completo contra API y SQL Server reales con un dataset controlado; backend todavía no confirmó compilación, consistencia ni planes de las consultas nuevas en SQL Server real.

#### Entrega 2 completada — Seguimiento institucional administrativo

- [x] Integrar `/admin/analitica` con `incluirResumenInstitucional=true` mediante el servicio, hook y query keys existentes.
- [x] Implementar el recorrido institución → materia → comisión → evaluaciones usando IDs estables y distinguiendo materias homónimas por carrera.
- [x] Separar resultados oficiales de pendientes operativos en todos los niveles, sin sumar categorías superpuestas.
- [x] Mantener el resumen independiente de la página del listado y ocultar datos anteriores durante cambios de alcance.
- [x] Conservar período, estado y jerarquía en la URL, reiniciando la página al cambiar el alcance.
- [x] Cubrir con pruebas focalizadas valores nulos, conjuntos vacíos, navegación jerárquica, filtros y separación de pendientes.
- [ ] Validar manualmente el recorrido frontend completo contra la API y SQL Server reales. Backend confirmó exactitud funcional; el rendimiento a escala continúa pendiente.

#### Rediseño institucional v1.2.0

- [x] Extender el recorrido a institución → carrera → materia → comisión → evaluaciones usando la jerarquía canónica del backend.
- [x] Sustituir la grilla de materias por comparaciones navegables, un ranking acotado de materias y acceso separado a entidades con evidencia limitada o sin resultados.
- [x] Incorporar la serie mensual con aprobación, resultados confirmados, pendientes, meses parciales y cortes cuando no existe denominador.
- [x] Mantener el período efectivo estable en URL y separar la paginación de evaluaciones del resumen, las comparativas y la serie.
- [x] Conservar resultados oficiales y pendientes operativos como dimensiones diferentes, sin sumar subcategorías superpuestas.
- [ ] Validar tiempos y planes con volumen representativo; la validación backend actual acredita exactitud funcional, no rendimiento a escala.

#### Configuración institucional v1.3.0

- [x] Incorporar períodos rápidos y personalizados de hasta 60 meses, conservando límites exactos en URL y distinguiendo mes actual de meses completos.
- [x] Unificar comparación y ranking con dimensión, orden autoritativo y cantidad visible configurables, sin enviar opciones puramente visuales a la API.
- [x] Consumir `serieTemporal` mensual, semestral o anual sin reagrupar ni recalcular porcentajes en el cliente.
- [x] Integrar muestra, cobertura y visibilidad como un único borrador avanzado con Aplicar y Cancelar.
- [x] Permitir restablecer la configuración conservando el alcance académico y copiar localmente un enlace reproducible.
- [ ] Validar manualmente el diseño responsive y el recorrido completo contra el backend v1.3.0 desplegado.

#### Promedio institucional v1.4.0

- [x] Integrar `promedioNotaBase10` oficial en resumen, comparativas, directorios y evaluaciones sin recalcular valores en cliente.
- [x] Incorporar el promedio como serie opcional de la evolución, con escala 0–10 y selección independiente de aprobación y cantidades.
- [x] Conservar URLs anteriores, persistir las nuevas series visibles en URL y mantenerlas fuera de la consulta remota.
- [x] Distinguir promedio nulo de cero real y mostrar la cantidad de resultados considerados.
- [ ] Validar manualmente el diseño responsive y el recorrido completo contra el backend v1.4.0 desplegado.

- [ ] Al finalizar la mejora de reportes, revisar todas las pantallas de los tres roles y retirar textos técnicos que describan API, servidor, frontend, contratos, caché, paginación interna, snapshots o procesos; conservar sólo criterios funcionales, significado de los datos y acciones útiles para cada usuario.

- [x] Reemplazar en los reportes docentes los catálogos institucionales de materias y comisiones por opciones derivadas exclusivamente de las evaluaciones autorizadas del docente.
- [x] Implementar filtros dependientes `materia → comisión → actividad → publicación`, limpiando valores inferiores incompatibles al aplicar la búsqueda.
- [ ] Solicitar al backend un catálogo de filtros del historial del alumno, obtenido desde su JWT y su historial completo, con `idMateria` e `idMateriaDivision`; no construirlo desde la página visible ni desde catálogos globales.
- [ ] Sustituir los inputs técnicos de ID de grupo/pregunta por opciones con nombres cuando exista un catálogo autorizado para ese nivel.
- [ ] Ampliar `ReportFilterPanel` con opciones dependientes, estados de carga/vacío, resumen de filtros aplicados y sección de filtros avanzados.
- [x] Eliminar gráficos derivados de la página actual cuando puedan interpretarse como una visión global.
- [ ] En rendimiento por alumno, reemplazar las series visibles por un ranking server-side acotado y claramente identificado como Top N; conservar KPIs globales.
- [x] En el análisis de una publicación, mantener la distribución global e incorporar una visualización de participación: alcanzados, iniciaron y entregaron.
- [x] En rendimiento por pregunta, presentar rankings server-side de menor rendimiento y mayor tiempo promedio, independientes de la paginación de la tabla.
- [ ] Identificar preguntas y grupos en los gráficos mediante referencias cortas (`P1`, `G1`) acompañadas por una leyenda accesible con el texto completo, muestra y valor exacto.
- [ ] En rendimiento por grupo, agregar detalle de variantes y solicitar al backend ordenamiento por diferencia entre variantes antes de presentar un ranking global de esa métrica.
- [x] En rendimiento por grupo, presentar rankings server-side de menor rendimiento y mayor tiempo promedio, independientes de la paginación de la tabla.
- [ ] Mantener el gráfico de opciones/distractores únicamente en el detalle de preguntas cerradas, donde el conjunto es finito y se acompaña con tabla textual.
- [x] Reemplazar los gráficos paginados de preguntas y grupos por distribuciones globales de corrección y respuesta ya provistas por sus KPIs.
- [x] Diferenciar “Comparar evaluaciones” del análisis individual de una publicación mediante propósito y textos propios, sin duplicar el recorrido detallado.
- [x] En “Comparar evaluaciones”, contrastar participación y resultados oficiales entre las publicaciones visibles, con referencias estables y alcance de página explícito.
- [!] Agrupar el reporte por alumno y la comparación de evaluaciones primero por materia y comisión requiere agregados o navegación server-side que conserven totales fuera de la página visible; no reconstruir esos grupos desde una página paginada.
- [ ] Indicar en toda visualización si los datos son globales, Top N o pertenecen a una página; mostrar tamaño de muestra, cobertura temporal y diferenciar cero de “Sin datos”.
- [ ] Mantener puntajes de preguntas/grupos como porcentajes normalizados y tratar diferencias entre variantes como descriptivas, sin afirmar significancia estadística.
- [ ] Agregar pruebas focalizadas de alcance por rol, limpieza de filtros dependientes, URLs con IDs ajenos, rankings server-side y equivalentes textuales accesibles.

---

## Orden de ejecución acordado

1. [x] Fase 0 — Entorno de desarrollo.
2. [x] Analizar y aprobar el alcance exacto de la fase 1.
3. [x] Ejecutar fase 1 — Autenticación, refresh, logout y expiración validados manualmente.
4. [x] Ejecutar fase 2 — Cliente API y configuración cerrados en frontend; inscripción registrada como dependencia backend.
5. [x] Ejecutar fase 3 — Contratos estrictos, sin `any` y separados por dominio.
6. [x] Normalizar React Query y errores — Fases 4 y 5 completadas.
7. [x] Componentes, formularios y accesibilidad transversal consolidados en las Fases 6, 7 y 9.
8. [x] Incorporar testing frontend — cobertura unitaria, integración y E2E crítica completada.
9. [ ] Completar Fase 12 — Banco privado de preguntas y borradores de evaluación.
10. [ ] Completar Fase 13 — Calificación configurable, corrección e intentos válidos por etapas coordinadas con backend.
11. [ ] Completar Fase 14 — Respuestas múltiples, justificación y revisión por etapas coordinadas con backend.
12. [ ] Completar documentación, limpieza y rendimiento medido.

## Próximo paso

Completar la gestión de etiquetas/estados y el tratamiento explícito de conflictos 409 del banco y de borradores, sin ampliar incidentalmente el alcance de los editores ya integrados.
