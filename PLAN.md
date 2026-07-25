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
- [~] Guardado de opciones: actualización optimista, outbox durable, restauración y reintento acotado.
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

- [!] Definir y persistir un registro auditable de incidentes durante el intento: pérdida y recuperación de conectividad, expiración o recuperación de sesión, recarga, errores de sincronización o entrega, salida de pantalla completa, minimización, cambio de pestaña o pérdida de foco. Requiere contrato backend, persistencia y criterios de privacidad.
- [!] Registrar para cada incidente tipo, instante de inicio, instante de recuperación, duración, resultado y contexto mínimo del intento, sin incluir respuestas, tokens ni datos sensibles. La autoridad temporal y el formato definitivo deben acordarse con backend.
- [!] Definir una configuración por evaluación elegida por el docente para cada clase de incidente: solo registrar, advertir y solicitar retorno, permitir una cantidad acotada o aplicar una consecuencia. Requiere modelo de datos, API, validación server-side y una política funcional explícita.
- [!] Definir límites independientes y acumulativos cuando corresponda —por ejemplo, una salida de pantalla completa permitida y entrega ante una reincidencia— evitando que el cliente sea la única autoridad para contabilizarlos.
- [ ] Reemplazar en una etapa posterior el tratamiento actual de salida de pantalla completa como fraude inmediato por una máquina de estados no destructiva: advertir, conservar contenido, respuestas y temporizador, y solicitar volver a pantalla completa. La restricción permanece habilitada hasta abordar ese rediseño.
- [!] Definir qué consecuencias pueden ejecutarse automáticamente. Una entrega, anulación o penalización por incidentes de navegador no debe implementarse sin reglas backend autoritativas, tolerancia a falsos positivos y aprobación funcional.
- [ ] Detectar recargas y reanudaciones como incidentes diferenciados. La recuperación durable actual preserva el intento, pero una recarga también puede utilizarse para abandonar pantalla completa sin generar la señal de salida esperada.
- [ ] Al reanudar después de una recarga, volver a solicitar pantalla completa cuando la evaluación lo requiera y mantener visible la advertencia hasta que el alumno retome, sin descartar respuestas ni reiniciar el temporizador.
- [!] Diseñar una entrega confiable de telemetría con cola durable, deduplicación e idempotencia. Los eventos ocurridos sin conexión deben sincronizarse al recuperarla y no pueden depender de un único `fetch` durante `beforeunload`.
- [ ] Informar al alumno de manera clara qué incidente se detectó, qué acción debe realizar, cuántas tolerancias quedan si aplica y si el evento está pendiente de sincronización.
- [!] Proveer al docente una vista o reporte cronológico de incidentes del intento, diferenciando señales técnicas de una determinación de fraude; requiere endpoint y autorización RBAC docente.
- [ ] Diseñar pruebas manuales específicas para recarga, salida de fullscreen, cambio de pestaña, minimización, pérdida de foco, desconexión, sesión vencida y combinaciones concurrentes, incluyendo el tiempo hasta retomar.

### Backlog funcional de evaluaciones detectado en validación

- [!] Permitir al docente corregir y comentar una pregunta abierta sin respuesta. Requiere definir si se crea una respuesta vacía o si la corrección/comentario pertenece a la relación intento-pregunta sin `Respuesta` existente.
- [ ] Renderizar preguntas de programación/SQL como desarrollo y no como opción múltiple; confirmar los valores efectivos de `Tipo` y reutilizar el guardado de texto/código.
- [ ] Eliminar nombres y títulos de evaluaciones hardcodeados y mostrarlos desde publicación/actividad.
- [!] Definir la semántica de múltiples intentos: un único examen visible con historial de intentos y una regla explícita para promedio, mejor intento, último intento o intento válido. Requiere decisión funcional y revisión de API/SQL.
- [ ] Inicializar fecha de inicio y fin al crear una evaluación, como mínimo con la fecha actual y un rango válido.
- [ ] Limitar años y rangos de fecha a valores académicamente razonables tanto en frontend como en validación backend.
- [ ] Validar inputs de creación al perder foco, sin esperar el submit, conservando la revalidación final del backend.
- [ ] Permitir a docente y alumno filtrar o agrupar actividades del dashboard por comisión y materia.
- [!] Definir la política de revisión posterior a la entrega: habilitar una única consulta cuando todo sea autocorregible o después de la corrección docente si existen respuestas abiertas. Requiere persistir autorización/consumo de esa visualización en backend.
- [!] Agregar una devolución general opcional del examen además de comentarios por pregunta. Requiere contrato y persistencia backend.
- [ ] Al continuar un intento abierto después de sesión expirada, desconexión o salida controlada, omitir la pantalla informativa y navegar directamente a la actividad pendiente.

---

## Fase 2 — Configuración y acceso centralizado a la API

**Estado: CERRADA EN FRONTEND — INSCRIPCIÓN BLOQUEADA POR CONTRATO BACKEND**

- [x] Mover la URL de la API a `EXAMIO_API_URL`, configuración exclusiva del servidor y validada.
- [x] Eliminar las URLs `http://localhost:55803/api` del código productivo; solo permanecen como ejemplos de desarrollo documentados.
- [x] Mantener `apiFetch` como único cliente HTTP para servicios y consumidores de UI.
- [x] Eliminar llamadas `fetch` directas desde páginas y componentes; los `fetch` restantes pertenecen a NextAuth, `apiFetch` y el BFF.
- [x] Verificar que la pantalla de docentes consume servicios y hooks existentes y retirar la referencia visual al puerto local.
- [!] Mover la inscripción de alumnos al servicio de su dominio y habilitarla correctamente. La API documentada no expone una operación para crear `InscripcionMateria`; requiere contrato backend `admin`, validación e idempotencia sobre `(IdMateriaDivision, IdAlumno)`.
- [x] Eliminar la interpolación defectuosa `"/alumnos/${matricula}/inscribir"` y el fallo silencioso. La UI informa el bloqueo y no llama una ruta inexistente.
- [x] Soportar respuestas JSON, cuerpos vacíos y errores de parseo mediante el contrato común de `apiFetch`.
- [x] Incorporar timeout por defecto, timeout configurable y composición con `AbortSignal`; el BFF también limita la espera del upstream.
- [x] Normalizar códigos fallback para 400/422, 401, 403, 404, 409, 429 y 500 sin reemplazar códigos estables del backend.
- [x] Centralizar construcción de query strings en `src/lib/query-string.ts`.
- [x] Exponer el contrato común `ApiError` y `ApiValidationError`, preservando `statusCode`, `code`, `message`, `path` y errores de validación.
- [x] Integrar `GET /api/health` en el diagnóstico frontend mediante `pnpm env:check` y `pnpm dev:checked`.

**Criterio de finalización frontend verificado:** ninguna página o componente realiza `fetch` directo y ningún endpoint contiene una URL hardcodeada. La inscripción queda explícitamente bloqueada hasta ampliar el contrato de la API; no se simula ni se apunta a una ruta inexistente.

---

## Fase 3 — Tipado y contratos

**Estado: PENDIENTE**

- [ ] Eliminar interfaces duplicadas de `src/types/index.ts`.
- [ ] Confirmar el contrato correcto antes de eliminar cada duplicado.
- [ ] Separar tipos por dominio manteniendo exports compatibles.
- [ ] Distinguir entidades, respuestas y payloads.
- [ ] Reemplazar `any` comenzando por auth, API, evaluaciones y reportes.
- [ ] Estabilizar PascalCase para requests y camelCase para responses.
- [ ] Evitar compatibilidad simultánea PascalCase/camelCase en componentes.
- [ ] Activar `noImplicitAny` de forma progresiva.
- [ ] Activar `strictNullChecks` después de resolver nulabilidad.
- [ ] Evaluar finalmente `strict: true`.

---

## Fase 4 — Convenciones de TanStack Query

**Estado: PENDIENTE**

- [ ] Crear fábricas de query keys por dominio.
- [ ] Normalizar el retorno de hooks.
- [ ] Normalizar condiciones `enabled`.
- [ ] Auditar invalidaciones después de mutaciones.
- [ ] Usar `placeholderData` solo cuando mejore UX.
- [ ] Crear nuevos hooks sin JSX como archivos `.ts`.
- [ ] Eliminar imports no utilizados.
- [ ] Documentar la separación entre estado remoto y estado local.

---

## Fase 5 — Errores y feedback al usuario

**Estado: PENDIENTE**

- [ ] Consolidar `ApiError` y categorías de error.
- [ ] Crear estados reutilizables de carga, vacío y error.
- [ ] Reutilizar `ErrorMessage` dentro del sistema común.
- [ ] Eliminar `alert()` de flujos normales.
- [ ] Evaluar un sistema de toast accesible.
- [ ] Agregar `error.tsx` en segmentos críticos.
- [ ] Registrar detalles técnicos solo en desarrollo.
- [ ] Mantener mensajes seguros en producción.

---

## Fase 6 — Componentes reutilizables y consistencia visual

**Estado: EN PROGRESO**

- [x] Crear la primera familia reutilizable de reportes: `ReportLayout`, `ReportFilterPanel`, `ReportKpiGrid`, `ReportTable` y `ChartCard`.
- [ ] Validar esas APIs al implementar un segundo reporte.
- [ ] Comparar patrones repetidos en alumnos, carreras, materias, docentes y usuarios.
- [ ] Evaluar `ManagementPageHeader`.
- [ ] Evaluar `DataTable` administrativo.
- [ ] Evaluar `FilterPanel` y `Pagination` compartidos.
- [ ] Evaluar `StatusBadge`.
- [ ] Evaluar campos de formulario reutilizables.
- [ ] Evaluar `EmptyState`, `LoadingSkeleton` y `ConfirmDialog`.
- [ ] Evitar un componente de tabla excesivamente configurable.

---

## Fase 7 — Formularios y validación

**Estado: PENDIENTE**

- [ ] Crear schemas Zod para formularios complejos.
- [ ] Reutilizar tipos inferidos cuando sea apropiado.
- [ ] Crear campos accesibles y consistentes.
- [ ] Separar transformación de formulario a payload.
- [ ] Separar validación del renderizado.
- [ ] Dividir la creación de examen en secciones mantenibles.
- [ ] Evaluar React Hook Form solo si reduce complejidad real.
- [ ] Mantener formularios CRUD simples sin dependencias innecesarias.

---

## Fase 8 — Testing frontend

**Estado: PENDIENTE**

- [ ] Aprobar e instalar infraestructura de testing.
- [ ] Evaluar Vitest, React Testing Library y `user-event`.
- [ ] Evaluar Mock Service Worker para contratos HTTP.
- [ ] Evaluar Playwright para flujos críticos.
- [ ] Probar cliente HTTP y servicios.
- [ ] Probar autenticación y manejo de errores.
- [ ] Probar hooks principales.
- [ ] Probar componentes reutilizables.
- [ ] Probar el reporte de rendimiento.
- [ ] Agregar E2E de login por rol, rutas protegidas, examen, corrección y reportes.

---

## Fase 9 — Accesibilidad y UX

**Estado: PENDIENTE**

- [ ] Agregar focus trap, Escape, restauración de foco y `aria-labelledby` a `Modal`.
- [ ] Revisar navegación por teclado en tablas.
- [ ] Agregar `aria-live` a estados asíncronos y errores.
- [ ] Asociar errores de formulario con `aria-describedby`.
- [ ] Revisar contraste y foco visible.
- [ ] Evitar emojis como único indicador.
- [ ] Revisar responsive de tablas y gráficos.
- [ ] Limitar el bloqueo del menú contextual al entorno de examen.
- [ ] Respetar `prefers-reduced-motion`.

---

## Fase 10 — Mocks, documentación y limpieza

**Estado: EN PROGRESO**

- [x] Crear documentación operativa del entorno frontend.
- [x] Crear README específico del frontend.
- [x] Separar claramente documentación frontend, API y base de datos.
- [ ] Separar mocks de código productivo.
- [ ] Eliminar mocks usados por pantallas reales cuando exista integración.
- [x] Documentar variables de entorno y aclarar cuáles tienen efecto actual.
- [x] Documentar arquitectura, routing, layouts y providers.
- [x] Documentar autenticación, sesión y roles.
- [x] Documentar cliente HTTP y servicios por dominio.
- [x] Documentar hooks y convenciones de TanStack Query.
- [x] Documentar el inventario y las reglas actuales de query keys.
- [ ] Corregir caracteres mal codificados.
- [ ] Eliminar comentarios temporales.
- [ ] Resolver o retirar Teams, Moodle, recuperación de contraseña y “Recordar sesión”.

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

## Orden de ejecución acordado

1. [x] Fase 0 — Entorno de desarrollo.
2. [x] Analizar y aprobar el alcance exacto de la fase 1.
3. [x] Ejecutar fase 1 — Autenticación, refresh, logout y expiración validados manualmente.
4. [x] Ejecutar fase 2 — Cliente API y configuración cerrados en frontend; inscripción registrada como dependencia backend.
5. [ ] Ejecutar fase 3 — Tipado y contratos.
6. [ ] Normalizar React Query y errores.
7. [ ] Consolidar componentes, formularios y accesibilidad.
8. [ ] Incorporar testing frontend.
9. [ ] Completar documentación, limpieza y rendimiento medido.

## Próximo paso

Iniciar la Fase 3 con una auditoría focalizada de tipos y contratos. En paralelo,
coordinar con backend el endpoint idempotente de inscripción de alumnos antes de
reactivar esa operación en la interfaz.
