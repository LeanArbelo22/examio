import { ApiError, type ApiValidationError } from "@/lib/api";

export type ErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "not-found"
  | "conflict"
  | "network"
  | "timeout"
  | "server"
  | "unknown";

const SAFE_CODE_MESSAGES: Record<string, string> = {
  FORBIDDEN: "No tenés permisos para realizar esta acción.",
  REPORT_SCOPE_FORBIDDEN:
    "Los filtros seleccionados están fuera de tu alcance docente.",
  STUDENT_NOT_FOUND: "No existe un alumno con esa matrícula.",
  MATERIA_DIVISION_NOT_FOUND: "La comisión seleccionada no existe.",
  STUDENT_INACTIVE: "El alumno no está habilitado para inscribirse.",
  MATERIA_INACTIVE: "La materia seleccionada no está activa.",
  NETWORK_UNAVAILABLE: "No hay conexión con Examio. Revisá tu red y volvé a intentar.",
  REQUEST_TIMEOUT: "La operación tardó demasiado. Podés volver a intentarla.",
  BFF_UPSTREAM_TIMEOUT: "La API tardó demasiado en responder. Volvé a intentar.",
  BFF_UPSTREAM_UNAVAILABLE: "Examio no está disponible temporalmente.",
  VALIDATION_ERROR: "Revisá los datos ingresados.",
  REQUEST_INVALID: "Revisá los datos ingresados.",
  QUESTION_SCORE_OUT_OF_RANGE:
    "El puntaje debe respetar el máximo de la pregunta y usar hasta dos decimales.",
  FINAL_GRADE_OUT_OF_RANGE:
    "La nota final debe respetar la escala de la evaluación y usar hasta dos decimales.",
  ATTEMPT_NOT_DELIVERED:
    "El intento todavía no fue entregado y no puede corregirse.",
  ATTEMPT_SCOPE_FORBIDDEN:
    "No tenés permisos para corregir este intento.",
  RESPONSE_REVISION_CONFLICT:
    "La respuesta cambió en otra pestaña. Elegí qué versión querés conservar.",
  RESPONSE_EVENT_CONFLICT:
    "No se pudo repetir el guardado porque la operación ya fue usada con otro contenido.",
  RESPONSE_CONTENT_INVALID: "La respuesta no corresponde al tipo de pregunta.",
  RESPONSE_OPTIONS_INVALID: "Una de las opciones seleccionadas no es válida.",
  JUSTIFICATION_NOT_ALLOWED: "Esta pregunta no admite justificación.",
  ATTEMPT_QUESTION_NOT_FOUND: "La pregunta ya no pertenece a este intento.",
  ATTEMPT_NOT_IN_PROGRESS: "El intento ya no admite nuevas respuestas.",
  REQUIRED_JUSTIFICATION_MISSING:
    "Completá la justificación de las preguntas respondidas antes de entregar.",
  CORRECTION_INCOMPLETE:
    "Corregí todas las preguntas antes de confirmar la corrección.",
  REVIEW_NOT_AVAILABLE:
    "La revisión no está disponible según la configuración de la evaluación.",
  REVIEW_POLICY_NEVER:
    "La revisión está deshabilitada para esta evaluación.",
  REVIEW_ACCESS_ALREADY_CONSUMED:
    "Ya utilizaste la única revisión disponible para este intento.",
  REVIEW_SESSION_REQUIRED:
    "Para consultar la revisión primero tenés que abrirla desde tu historial.",
  REVIEW_SESSION_NOT_FOUND:
    "La revisión solicitada no existe o ya no está disponible.",
  REVIEW_SESSION_CONSUMED:
    "Este acceso de una sola vez ya fue utilizado.",
  REVIEW_SESSION_EXPIRED:
    "El tiempo disponible para esta revisión terminó. Volvé al historial para consultar si podés abrirla nuevamente.",
  REVIEW_SESSION_REVOKED:
    "El docente revocó el acceso a esta revisión.",
  REVIEW_SCOPE_FORBIDDEN:
    "No tenés permisos para consultar esta revisión.",
  REVIEW_POLICY_REVISION_CONFLICT:
    "La configuración cambió mientras la editabas. Recargala antes de volver a guardar.",
  REVIEW_PERMISSION_REVISION_CONFLICT:
    "La autorización cambió mientras la editabas. Recargala antes de volver a guardar.",
  ATTEMPT_ALREADY_CANCELLED:
    "El intento ya fue anulado por un incidente anterior.",
  FOCUS_EVENT_NOT_FOUND:
    "El incidente todavía no fue sincronizado. Examio volverá a intentarlo automáticamente.",
  INCIDENT_EVENT_NOT_ELIGIBLE:
    "El incidente todavía no está disponible. Examio volverá a intentar la anulación automáticamente.",
  TELEMETRY_EVENT_INVALID:
    "No pudimos registrar uno de los eventos del examen.",
  TELEMETRY_TYPE_INVALID:
    "El tipo de evento del examen no es compatible.",
  TELEMETRY_QUESTION_INVALID:
    "No pudimos asociar el tiempo con la pregunta actual.",
  TELEMETRY_SYNC_WINDOW_EXPIRED:
    "Venció el plazo para sincronizar este evento del examen.",
  SUPERVISION_POLICY_NOT_FOUND:
    "No se encontró la configuración de supervisión de esta evaluación.",
  SUPERVISION_POLICY_REVISION_CONFLICT:
    "La configuración de supervisión cambió. Recargala antes de volver a guardar.",
  SUPERVISION_RULE_INVALID:
    "Una de las reglas de supervisión no es válida.",
  SUPERVISION_SNAPSHOT_MISSING:
    "El intento no tiene condiciones de supervisión disponibles.",
  SUPERVISION_SCOPE_FORBIDDEN:
    "No tenés permisos para consultar o modificar esta supervisión.",
  SUPERVISION_REVISION_CONFLICT:
    "El estado de supervisión cambió. Recargalo antes de intervenir.",
  SUPERVISION_DECISION_NOT_FOUND:
    "La decisión seleccionada ya no está disponible.",
  SUPERVISION_CANCELLED_IMMUTABLE:
    "La anulación es definitiva y no puede revertirse desde Supervisión.",
  INCIDENT_NOT_FOUND:
    "El incidente seleccionado ya no está disponible.",
  EVENT_NOT_INCIDENT:
    "El evento seleccionado no requiere revisión operativa.",
  INCIDENT_SCOPE_FORBIDDEN:
    "No tenés permisos para revisar este incidente.",
  INCIDENT_REVISION_CONFLICT:
    "La revisión del incidente cambió. Conservamos tu comentario para que puedas recargar y decidir nuevamente.",
  IDEMPOTENCY_KEY_REUSED:
    "La operación ya fue utilizada con otros datos. Revisá el estado actual antes de volver a intentar.",
  IDEMPOTENCY_OPERATION_IN_PROGRESS:
    "La revisión todavía se está procesando. Esperá un momento antes de volver a intentar.",
};

export function getErrorCategory(error: unknown): ErrorCategory {
  if (!(error instanceof ApiError)) return "unknown";
  if (error.statusCode === 0) return "network";
  if (error.code?.includes("TIMEOUT") || error.statusCode === 408) return "timeout";
  if (error.statusCode === 400 || error.statusCode === 422) return "validation";
  if (error.statusCode === 401) return "authentication";
  if (error.statusCode === 403) return "authorization";
  if (error.statusCode === 404) return "not-found";
  if (error.statusCode === 409) return "conflict";
  if (error.statusCode >= 500) return "server";
  return "unknown";
}

export function isRetryableError(error: unknown): boolean {
  const category = getErrorCategory(error);
  return category === "network" || category === "timeout" || category === "server";
}

export function getUserErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la operación.",
): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code && SAFE_CODE_MESSAGES[error.code]) {
    return SAFE_CODE_MESSAGES[error.code];
  }
  if (getErrorCategory(error) === "authorization") {
    return SAFE_CODE_MESSAGES.FORBIDDEN;
  }
  return error.statusCode >= 500 ? fallback : error.message || fallback;
}

export function validationErrorsByField(
  errors: ApiValidationError[] | undefined,
): Record<string, string> {
  return (errors ?? []).reduce<Record<string, string>>((result, error) => {
    const field = error.path.join(".");
    if (field && !result[field]) result[field] = error.message;
    return result;
  }, {});
}

export function logClientError(
  error: unknown,
  context: { feature: string },
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[Examio:${context.feature}]`, error);
}
