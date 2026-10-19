import type { TipoEventoTelemetria } from "./telemetria";

export type MetricaSupervision =
  | "cantidad"
  | "duracion_individual"
  | "duracion_acumulada";

export type AccionSupervision =
  | "informar"
  | "advertir"
  | "bloquear_interfaz"
  | "anular_intento";

export type EstadoSupervision = "normal" | "advertido" | "bloqueado" | "anulado";
export type AccionOverrideSupervision = "desbloquear" | "reconocer" | "descartar";

export interface ReglaSupervision {
  id?: number;
  codigo: string;
  tipoEvento: TipoEventoTelemetria;
  metrica: MetricaSupervision;
  umbral: number;
  ventanaSegundos: number | null;
  prioridad: number;
  accion: AccionSupervision;
  activa: boolean;
}

export interface PoliticaSupervision {
  idPublicacion: number;
  pantallaCompletaObligatoria: boolean;
  codigoConfiguracion: string;
  revision: number;
  modificadoPor: number | null;
  fechaModificacion: string | null;
  reglas: ReglaSupervision[];
}

export interface ReglaSupervisionPayload {
  Codigo: string;
  TipoEvento: TipoEventoTelemetria;
  Metrica: MetricaSupervision;
  Umbral: number;
  VentanaSegundos: number | null;
  Prioridad: number;
  Accion: AccionSupervision;
  Activa: boolean;
}

export interface ActualizarPoliticaSupervisionPayload {
  PantallaCompletaObligatoria: boolean;
  RevisionEsperada: number;
  Reglas: ReglaSupervisionPayload[];
}

export interface InstruccionSupervision {
  accion: AccionSupervision;
  estado: EstadoSupervision;
  interaccionBloqueada: boolean;
  intentoAnulado: boolean;
  decisionId: number | null;
  replay: boolean;
}

export interface EstadoSupervisionIntento extends Omit<InstruccionSupervision, "decisionId" | "replay"> {
  idIntento: number;
  pantallaCompletaObligatoria: boolean;
  revision: number;
  fechaActualizacion: string;
}

export interface DecisionSupervision {
  id: number;
  eventoId: string;
  idReglaSnapshot: number | null;
  accion: AccionSupervision;
  valorMetrica: number | null;
  consecuenciaAplicada: boolean;
  resultado: string;
  estadoRevision: string;
  fechaDecision: string;
  fechaActualizacion: string;
}

export interface OverrideSupervision {
  id: number;
  idDecision: number | null;
  accion: AccionOverrideSupervision;
  motivo: string;
  actorId: number;
  actorRol: string;
  revisionAnterior: number;
  revisionNueva: number;
  fecha: string;
}

export interface DetalleSupervisionIntento {
  idIntento: number;
  estadoSupervision: EstadoSupervision;
  ultimaAccion: AccionSupervision;
  ultimoEventoId: string | null;
  revisionEstado: number;
  fechaActualizacion: string;
  idPublicacionOrigen: number;
  revisionOrigen: number;
  codigoConfiguracion: string;
  pantallaCompletaObligatoria: boolean;
  fechaSnapshot: string;
  reglas: ReglaSupervision[];
  decisiones: DecisionSupervision[];
  overrides: OverrideSupervision[];
}

export interface OverrideSupervisionPayload {
  Accion: AccionOverrideSupervision;
  EventoId: string | null;
  Motivo: string;
  RevisionEsperada: number;
}

export interface ResultadoOverrideSupervision {
  idIntento: number;
  estado: EstadoSupervision;
  revision: number;
  accionOverride: AccionOverrideSupervision;
  eventoId: string | null;
  replay?: boolean;
}
