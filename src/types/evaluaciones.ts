import type {
  EstadoActividad,
  EstadoIntento,
  TipoActividad,
  TipoPregunta,
} from "./shared";

export interface Actividad {
  id: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  cantidadIntentosMaximos: number;
  duracionMinutos?: number;
  recursosPermitidos?: string;
  estado: EstadoActividad;
}

export interface Publicacion {
  id: number;
  idActividad: number;
  idMateriaDivision: number;
  fechaInicio: string;
  fechaFin: string;
  visible: boolean;
}

export interface GrupoPregunta {
  id: number;
  idActividad: number;
  tituloReferencia: string;
}

export interface Pregunta {
  id: number;
  idGrupoPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
}

export interface Opcion {
  id: number;
  idPregunta: number;
  texto: string;
  esCorrecta: boolean;
}

export interface Intento {
  id: number;
  idPublicacion: number;
  idAlumno: number;
  numeroIntento: number;
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoIntento;
  notaFinal?: number;
}

export interface IntentoPregunta {
  id: number;
  idIntento: number;
  idPregunta: number;
}

export interface Respuesta {
  id: number;
  idIntento: number;
  idPregunta: number;
  rtaTexto?: string;
}

export interface RespuestaOpcion {
  idRespuesta: number;
  idOpcion: number;
}

export interface HistorialRespuesta {
  id: number;
  idRespuesta: number;
  idOpcionAnterior: number;
  idOpcionNueva: number;
  fechaCambio: string;
}

export interface AlertaFraude {
  id: number;
  idIntento: number;
  tipoIncidente: string;
  detalle?: string;
  timestamp: string;
}

export interface MetricasNavegacion {
  id: number;
  idIntento: number;
  idPregunta: number;
  fechaIngreso: string;
  fechaEgreso?: string;
  segundosPermanencia: number;
}

export interface PreguntaSorteada {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  grupoConceptualmente?: string;
}

export interface OpcionSorteada {
  idOpcion: number;
  texto: string;
  esCorrecta?: boolean;
  fueSeleccionada?: boolean;
}

export interface IntentoExamen {
  idIntento: number;
  idPublicacion: number;
  idAlumno: number;
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoIntento;
  nota?: number;
}

export interface AlertaAntifraude {
  idAlerta: number;
  idIntento: number;
  tipoIncidente: string;
  detalle: string;
  fechaRegistro: string;
}

export interface EvaluacionDocente {
  idPublicacion: number;
  idActividad: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  materia: string;
  carrera: string;
  division: string;
  fechaInicio: string;
  fechaFin: string;
  duracionMinutos: number;
  cantidadIntentosMaximos: number;
  recursosPermitidos: string | null;
  estado: EstadoActividad;
  alumnosInscriptos: number;
  totalIntentos: number;
}

export interface OpcionDetalle {
  idOpcion: number;
  texto: string;
  esCorrecta: boolean;
}

export interface PreguntaDetalle {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  opciones: OpcionDetalle[];
}

export interface GrupoPreguntaDetalle {
  idGrupo: number;
  tituloReferencia: string;
  preguntas: PreguntaDetalle[];
}

export interface EvaluacionDetalle {
  idActividad: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  duracionMinutos: number;
  cantidadIntentosMaximos: number;
  estado: EstadoActividad;
  recursosPermitidos: string | null;
  idPublicacion: number;
  fechaInicio: string;
  fechaFin: string;
  materia: string;
  division: string;
  grupos: GrupoPreguntaDetalle[];
}

export interface OpcionIntento {
  idOpcion: number;
  texto: string;
  esCorrecta: boolean;
  fueSeleccionada: boolean | number;
}

export interface RespuestaIntento {
  idRespuesta: number;
  rtaTexto: string | null;
  opcionesSeleccionadas: OpcionIntento[];
  esCorrecta?: boolean | null;
  comentariosDocente?: string | null;
}

export interface PreguntaIntento {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  grupoConceptualmente: string;
  respuesta: RespuestaIntento;
  opciones: OpcionIntento[];
}

export interface IntentoCompleto {
  idIntento: number;
  idAlumno: number;
  idPublicacion: number;
  estado: EstadoIntento;
  notaFinal: number | null;
  notaAutomatica: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  numeroIntento: number;
  nombre: string;
  apellido: string;
  correo: string;
  tituloEvaluacion: string;
  tipoEvaluacion: string;
  duracionMinutos: number;
  preguntas: PreguntaIntento[];
}

export interface AlumnoIntento {
  matricula: number;
  nombre: string;
  apellido: string;
  correo: string;
  idIntento: number | null;
  estadoIntento: string | null;
  notaFinal: number | null;
  notaAutomatica: number | null;
  fechaInicioIntento: string | null;
  fechaFinIntento: string | null;
  numeroIntento: number | null;
  cantidadIntentosMaximos: number;
  intentosAgotados: boolean;
}

export interface EstadisticasAlumno {
  totalCorregidos: number | null;
  promedioGeneral: number | null;
  aprobados: number | null;
  porcentajeAprobacion: number | null;
}

export interface IntentoDetallado {
  idIntento: number;
  idAlumno: number;
  idPublicacion: number;
  estado: EstadoIntento;
  notaFinal: number | null;
  notaAutomatica: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  numeroIntento: number;
  tituloEvaluacion: string;
  tipoEvaluacion: string;
  duracionMinutos: number;
  materia: string;
  division: string;
}

export interface HistorialCorregidoItem {
  idIntento: number;
  tituloEvaluacion: string;
  materia: string;
  division: string;
  fechaFin: string;
  notaFinal: number | null;
  numeroIntento: number;
}

export interface EvaluacionPendiente {
  idPublicacion: number;
  titulo: string;
  materia: string;
  carrera: string;
  docente: string;
  fechaInicio: string;
  fechaFin: string;
  duracionMinutos: number;
  recursosPermitidos: string | null;
  cantidadIntentosMaximos: number;
  intentosRealizados: number;
  estadoUltimoIntento: string | null;
  enProgreso: boolean;
  puedeReintentar: boolean;
  intentosAgotados: boolean;
}

export interface OpcionPayload {
  Texto: string;
  EsCorrecta: boolean;
}

export interface PreguntaPayload {
  Enunciado: string;
  Tipo: TipoPregunta;
  Opciones?: OpcionPayload[];
}

export interface GrupoPreguntaPayload {
  TituloReferencia: string;
  Variantes: PreguntaPayload[];
}

export interface GuardarEvaluacionPayload {
  Titulo: string;
  Descripcion?: string;
  Tipo: TipoActividad;
  CantidadIntentosMaximos: number;
  DuracionMinutos: number | null;
  RecursosPermitidos?: string;
  IdMateriaDivision: number;
  FechaInicio: string;
  FechaFin: string;
  GruposPreguntas: GrupoPreguntaPayload[];
}

export interface IniciarIntentoPayload {
  IdPublicacion: number;
  IdAlumno: number;
}

export interface GuardarRespuestaPayload {
  IdIntento: number;
  IdPregunta: number;
  IdOpcionNueva?: number;
  RtaTexto?: string;
}

export interface AlertaPayload {
  IdIntento: number;
  TipoIncidente: string;
  Detalle?: string;
}

export interface NavegacionPayload {
  IdIntento: number;
  IdPregunta: number;
  SegundosPermanencia: number;
}
