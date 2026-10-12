export type UserRole = "alumno" | "docente" | "admin";
export type TipoActividad = "evaluacion" | "tp" | "tarea";
export type EstadoActividad = "borrador" | "publicada" | "archivada";
export type TipoPregunta = "mc" | "multiple" | "vf" | "abierta" | "code";
export type ModoJustificacion =
  | "sin_justificacion"
  | "opcional"
  | "obligatoria";
export type EstrategiaCorreccion =
  | "exacta"
  | "parcial_sin_penalizacion"
  | "parcial_penalizada";
export type TratamientoJustificacion = "informativa" | "revision_manual";
export type EstadoIntento =
  | "en_progreso"
  | "entregado"
  | "vencido"
  | "anulado";
export type EstadoActa = "abierta" | "firmada" | "cerrada";
export type CondicionFinal = "regular" | "promocionado" | "libre";
export type EstadoAlumno = "activo" | "suspendido" | "inactivo";
