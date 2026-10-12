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
  QUESTION_RUNTIME_NOT_AVAILABLE:
    "La evaluación usa selección múltiple o justificación. Podés guardarla como borrador, pero todavía no está disponible para ser respondida por alumnos.",
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
