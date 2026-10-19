import type {
  EscalaCalificacion,
  OpcionIntento,
  OrigenCorreccion,
  RespuestaIntento,
} from "./evaluaciones";
import type { EstadoIntento, EstrategiaCorreccion, ModoJustificacion, TipoPregunta } from "./shared";

export type ModoRevision = "nunca" | "al_corregir" | "ventana" | "manual";
export type AccesoRevision = "unico" | "libre";
export type EstadoPermisoRevision = "activo" | "revocado";

export interface PoliticaRevision {
  idPublicacion: number;
  modo: ModoRevision;
  acceso: AccesoRevision;
  ventanaDesde: string | null;
  ventanaHasta: string | null;
  revision: number;
  modificadoPor: number | null;
  fechaModificacion: string | null;
  replay?: boolean;
}

export interface ActualizarPoliticaRevisionPayload {
  Modo: ModoRevision;
  Acceso: AccesoRevision;
  VentanaDesde: string | null;
  VentanaHasta: string | null;
  RevisionEsperada: number;
}

export interface PermisoRevision {
  id: number;
  idIntento: number;
  idAlumno?: number;
  nombre?: string;
  apellido?: string;
  estado: EstadoPermisoRevision;
  acceso: AccesoRevision;
  fechaDesde: string | null;
  fechaHasta: string | null;
  motivo: string | null;
  revision: number;
  modificadoPor: number | null;
  fechaModificacion: string;
  replay?: boolean;
}

export interface GuardarPermisoRevisionPayload {
  Acceso: AccesoRevision;
  FechaDesde: string | null;
  FechaHasta: string | null;
  Motivo: string | null;
  RevisionEsperada: number;
}

export interface FiltrosPermisosRevision {
  estado?: EstadoPermisoRevision;
  idAlumno?: number;
}

export type AccionAuditoriaRevision =
  | "politica_backfill"
  | "politica_actualizada"
  | "permiso_otorgado"
  | "permiso_reactivado"
  | "permiso_revocado"
  | "sesion_emitida"
  | "sesion_reutilizada"
  | "sesion_abierta"
  | "sesion_consumida"
  | "sesion_expirada"
  | "sesion_revocada"
  | "contenido_consultado"
  | "emision_denegada_unico"
  | "emision_denegada_nunca"
  | "permiso_denegado_nunca";

export interface AuditoriaRevisionItem {
  id: number;
  idPublicacion: number;
  idIntento: number | null;
  idSesion: string | null;
  idUsuario: number | null;
  actorRol: string | null;
  accion: AccionAuditoriaRevision;
  detalle: unknown;
  fecha: string;
}

export interface AuditoriaRevisionResultado {
  items: AuditoriaRevisionItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface DisponibilidadRevision {
  idIntento: number;
  idPublicacion: number;
  revisionDisponible: boolean;
  motivo: string | null;
  acceso: AccesoRevision | null;
  origen: "individual" | "general" | null;
  modo: ModoRevision;
  revisionPolitica: number;
  idPermiso: number | null;
  esIntentoValido: boolean;
  disponibleDesde: string | null;
  disponibleHasta: string | null;
  duracionSesionSegundos: number;
  accesoUnicoConsumido: boolean;
}

export interface SesionRevision {
  idSesion: string;
  idIntento: number;
  acceso: AccesoRevision;
  fechaEmision: string;
  fechaExpiracion: string;
  reutilizada: boolean;
}

export interface PreguntaContenidoRevision {
  idIntentoPregunta: number;
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  grupo: string | null;
  modoJustificacion?: ModoJustificacion;
  estrategiaCorreccion?: EstrategiaCorreccion;
  puntajeMaximo: number | null;
  puntajeObtenido: number | null;
  puntajeAutomaticoOpciones?: number | null;
  origenCorreccion: OrigenCorreccion;
  comentariosDocente: string | null;
  respuesta: RespuestaIntento | null;
  opciones: OpcionIntento[];
}

export interface ContenidoRevisionIntento {
  idIntento: number;
  idPublicacion: number;
  estado: EstadoIntento;
  notaFinal: number | null;
  notaAutomatica: number | null;
  notaFinalCalculada: number | null;
  notaFinalManual: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  numeroIntento: number;
  correccionConfirmada: boolean;
  tituloEvaluacion: string;
  escalaCalificacion: EscalaCalificacion;
  notaAprobacion: number;
  preguntas: PreguntaContenidoRevision[];
}

export interface ContenidoSesionRevision {
  idSesion: string;
  acceso: AccesoRevision;
  contenido: ContenidoRevisionIntento;
}
