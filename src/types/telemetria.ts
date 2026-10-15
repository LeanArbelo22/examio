export type EstadoIncidenteFoco = "iniciado" | "completado";
export type TipoIncidenteSeguridad = "focus_lost" | "fullscreen_exit";

export interface IncidenteFocoPayload {
  Tipo: TipoIncidenteSeguridad;
  FechaInicioCliente?: string;
  FechaFinCliente?: string;
  DuracionMilisegundos?: number;
}

export interface IncidenteFoco {
  id: number;
  eventoId: string;
  idIntento: number;
  tipo: TipoIncidenteSeguridad;
  fechaInicioCliente: string;
  fechaFinCliente: string | null;
  duracionMilisegundos: number | null;
  fechaRecepcionInicio: string;
  fechaRecepcionFin: string | null;
  estado: EstadoIncidenteFoco;
}

export interface ResumenIncidentesFoco {
  cantidadPerdidasFoco: number;
  segundosTotalesFuera: number;
  promedioSegundosFuera: number;
  maximoSegundosFuera: number;
}

export interface ResultadoAnulacionIntento {
  idIntento: number;
  eventoId: string;
  tipoIncidente: TipoIncidenteSeguridad;
  motivo: string;
  estado: "anulado";
  replay: boolean;
}

export type TipoEventoTelemetria =
  | "question_active"
  | "focus_lost"
  | "fullscreen_exit"
  | "connectivity_lost"
  | "auth_session_unavailable"
  | "exam_resumed"
  | "page_reload"
  | "sync_error"
  | "submission_failed"
  | "attempt_finished";

export interface EventoTemporalPayload {
  Tipo: TipoEventoTelemetria;
  IdIntentoPregunta?: number | null;
  SesionClienteId: string;
  SecuenciaCliente: number;
  FechaInicioCliente?: string;
  FechaFinCliente?: string;
  DuracionMilisegundos?: number;
  Codigo?: string | null;
  VersionContrato: 1;
}

export interface EventoTemporalLoteItem extends EventoTemporalPayload {
  EventoId: string;
}

export type ResultadoEventoTemporal =
  | "creado"
  | "actualizado"
  | "replay"
  | "conflicto"
  | "rechazado";

export interface ResultadoEventoTemporalLote {
  eventoId: string | null;
  resultado: ResultadoEventoTemporal;
  codigo?: string;
  message?: string;
}

export interface RespuestaLoteEventosTemporales {
  resultados: ResultadoEventoTemporalLote[];
}

export interface EventoTemporal {
  id: number;
  eventoId: string;
  idIntento: number;
  tipo: TipoEventoTelemetria;
  idIntentoPregunta: number | null;
  sesionClienteId: string | null;
  secuenciaCliente: number | null;
  fechaInicioCliente: string;
  fechaFinCliente: string | null;
  duracionMilisegundos: number | null;
  codigo: string | null;
  versionContrato: 1;
  fechaRecepcionInicio: string;
  fechaRecepcionFin: string | null;
  estado: EstadoIncidenteFoco;
  esIntervalo: boolean;
  esIncidente: boolean;
}

export interface DuracionEventoTemporal {
  tipo: TipoEventoTelemetria;
  duracionMilisegundos: number;
}

export interface TiempoPreguntaTemporal {
  idIntentoPregunta: number;
  idPregunta: number;
  duracionMilisegundos: number | null;
  fuente: "nueva" | "legacy" | "sin_datos";
}

export interface ListaEventosTemporales {
  items: EventoTemporal[];
  resumen: {
    total: number;
    intervalosAbiertos: number;
    duracionesPorTipo: DuracionEventoTemporal[];
    tiemposPorPregunta: TiempoPreguntaTemporal[];
  };
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
}
