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

**Estado: EN PROGRESO — IMPLEMENTACIÓN FRONTEND COMPLETA, VALIDACIÓN MANUAL PENDIENTE**

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
- [~] Implementar renovación silenciosa, rotación y revocación. Implementado y validado estáticamente; falta validar el flujo frontend integrado contra la API.
- [x] Reemplazar “Extender sesión” por recuperación real; nunca expulsar automáticamente a un alumno de una evaluación ante el primer 401.
- [x] Comparar expiraciones: access token de 15 minutos, sesión backend absoluta de 12 horas y `session.maxAge` alineado a 12 horas.
- [x] Tipar callbacks JWT y sesión sin `any`.
- [x] Definir pruebas mínimas del flujo por rol; su ejecución manual integrada sigue pendiente.

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

- [~] Mantener localmente cada respuesta pendiente hasta confirmación. El texto abierto conserva su borrador y las opciones permanecen optimistamente en el caché del intento al navegar; todavía falta una cola durable y confirmación común.
- [ ] Diferenciar visualmente “Guardando”, “Guardado” y “Pendiente de sincronización”.
- [ ] Reintentar autoguardados con una política acotada y sin loops.
- [~] Ante `401 ACCESS_TOKEN_EXPIRED`, renovar y repetir una sola vez. Implementado y validado estáticamente; falta prueba integrada.
- [x] Evitar cualquier redirección automática fuera de la ruta de examen por el primer 401.
- [~] Conservar respuestas pendientes cuando falle refresh o conectividad. Las selecciones ya no se revierten ante errores recuperables mientras el intento permanece montado; falta persistencia durable y resincronización automática.
- [~] Mostrar recuperación de sesión sobre el examen sin desmontar la vista. El modal preserva la vista; una reautenticación interactiva sin desmontaje continúa pendiente.
- [x] Mantener contenido y temporizador visibles durante recuperación de sesión.
- [x] No finalizar ni abandonar el intento cuando falla manualmente la operación de entrega; la vista permanece abierta y permite reintentar.
- [x] No finalizar, anular, abandonar ni ejecutar `signOut()` automáticamente por errores de sesión dentro de una ruta de examen.
- [!] Definir con backend cómo se computa el tiempo durante fallas de sesión, red o sincronización.
- [ ] Proteger contra recarga, cierre de pestaña y desconexión cuando existan respuestas no confirmadas.
- [~] Evitar envíos duplicados e implementar idempotencia. El backend documenta idempotencia para iniciar/finalizar intento y para repetir la misma opción; el caché evita perder la selección visual, pero falta una estrategia cliente para solicitudes concurrentes y respuestas abiertas.
- [ ] Sincronizar respuestas pendientes al recuperar sesión o conectividad.
- [ ] Informar claramente cuándo una respuesta todavía no fue confirmada por el servidor.
- [!] Definir qué sucede si vence el tiempo mientras existen respuestas pendientes; hoy el temporizador ejecuta finalización automática sin esperar guardados.
- [~] Hacer que la finalización espere o resuelva explícitamente todas las respuestas pendientes. Ante fallo ya permite seguir revisando, reintentar o salir de forma controlada conservando el intento abierto; todavía no espera una cola de guardados.
- [~] Guardado actual de respuestas abiertas: persiste el borrador local y envía en `blur` o al desmontar la pregunta, pero el envío al desmontar no espera confirmación y el borrador no representa estado confirmado.
- [~] Guardado actual de opciones: actualización optimista en el caché por pregunta, restauración al navegar y conservación ante errores recuperables; falta estado visible de sincronización, cola durable y reintento.
- [x] Precargar y conservar las opciones de todas las preguntas durante el intento para que una sesión degradada no vacíe preguntas ya preparadas.
- [x] Suprimir la repetición del modal de sesión una vez aceptado el modo degradado para el intento completo.

La protección de respuestas pendientes se implementará como una etapa separada después de estabilizar BFF y refresh. No debe mezclarse con refactors visuales ni generales.

---

## Fase 2 — Configuración y acceso centralizado a la API

**Estado: PENDIENTE**

- [ ] Mover la URL de la API a configuración por entorno validada.
- [ ] Eliminar las URLs `http://localhost:55803/api` duplicadas.
- [ ] Mantener un único cliente HTTP.
- [ ] Eliminar llamadas `fetch` directas desde páginas y componentes.
- [ ] Migrar la pantalla de docentes a servicios y hooks existentes.
- [ ] Mover la inscripción de alumnos al servicio de su dominio.
- [ ] Corregir la interpolación de matrícula detectada en la inscripción.
- [ ] Soportar respuestas JSON, cuerpos vacíos y errores de parseo.
- [ ] Incorporar timeout y `AbortSignal` cuando corresponda.
- [ ] Normalizar 401, 403, 404, validación y errores 500.
- [ ] Centralizar construcción de query strings.
- [ ] Definir contrato común para errores de validación de la API.
- [ ] Integrar `GET /api/health` en el diagnóstico frontend.

**Criterio de finalización:** ninguna página o componente realiza `fetch` directo y ningún endpoint contiene una URL hardcodeada.

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
3. [~] Ejecutar fase 1 — Implementada; validación manual integrada pendiente.
4. [ ] Ejecutar fase 2 — Cliente API y configuración.
5. [ ] Ejecutar fase 3 — Tipado y contratos.
6. [ ] Normalizar React Query y errores.
7. [ ] Consolidar componentes, formularios y accesibilidad.
8. [ ] Incorporar testing frontend.
9. [ ] Completar documentación, limpieza y rendimiento medido.

## Próximo paso

Ejecutar la matriz manual integrada de autenticación y sesión. Después, iniciar
como etapa separada la protección de respuestas pendientes durante evaluaciones.
