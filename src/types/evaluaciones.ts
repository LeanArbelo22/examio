import type {
  EstadoActividad,
  EstadoIntento,
  EstrategiaCorreccion,
  ModoJustificacion,
  TipoActividad,
  TipoPregunta,
  TratamientoJustificacion,
} from "./shared";
import type {
  BancoImportacionPayload,
  BancoImportarEnEvaluacionResultado,
  BancoReferenciaGrupoPayload,
  BancoReferenciaPreguntaPayload,
} from "./banco-preguntas";

export type EscalaCalificacion = 10 | 100;
export type ModoPuntaje = "iguales" | "personalizados";

export interface ConfiguracionCalificacion {
  escalaCalificacion: EscalaCalificacion;
  notaAprobacion: number;
  modoPuntaje: ModoPuntaje;
  mostrarPuntajePorPregunta: boolean;
  correccionAutomaticaCerradas: boolean;
}

export interface Actividad extends ConfiguracionCalificacion {
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
  puntajeMaximo?: number;
  modoJustificacion?: ModoJustificacion;
  estrategiaCorreccion?: EstrategiaCorreccion;
  tratamientoJustificacion?: TratamientoJustificacion;
  respuesta?: RespuestaBorradorIntento | null;
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
  idMateria: number;
  idMateriaDivision: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  materia: string;
  carrera: string;
  division: string;
  fechaInicio: string;
  fechaFin: string;
  duracionMinutos: number | null;
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
  modoJustificacion?: ModoJustificacion;
  estrategiaCorreccion?: EstrategiaCorreccion;
  tratamientoJustificacion?: TratamientoJustificacion;
  contenidoHash?: string | null;
  idBancoPreguntaOrigen?: number | null;
  revisionBancoOrigen?: number | null;
  fechaIncorporacionBanco?: string | null;
  opciones: OpcionDetalle[];
}

export interface GrupoPreguntaDetalle {
  idGrupo: number;
  tituloReferencia: string;
  puntajeMaximo: number | null;
  idBancoGrupoOrigen?: number | null;
  revisionBancoOrigen?: number | null;
  fechaIncorporacionBanco?: string | null;
  preguntas: PreguntaDetalle[];
}

export interface EvaluacionDetalle extends ConfiguracionCalificacion {
  idActividad: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  duracionMinutos: number | null;
  cantidadIntentosMaximos: number;
  estado: EstadoActividad;
  revision: number;
  recursosPermitidos: string | null;
  idPublicacion: number;
  idMateriaDivision?: number;
  fechaInicio: string;
  fechaFin: string;
  materia: string;
  division: string;
  grupos: GrupoPreguntaDetalle[];
}

export interface OpcionIntento {
  idOpcion: number;
  texto: string;
  esCorrecta?: boolean;
  fueSeleccionada: boolean | number;
}

export interface RespuestaIntento {
  idRespuesta: number;
  rtaTexto: string | null;
  opcionesSeleccionadas?: OpcionIntento[];
  justificacion?: string | null;
  revision?: number;
  esCorrecta?: boolean | null;
  comentariosDocente?: string | null;
}

export type OrigenCorreccion = "automatica" | "manual" | null;

export interface PreguntaIntento {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  grupoConceptualmente: string;
  puntajeMaximo: number | null;
  puntajeObtenido: number | null;
  puntajeAutomaticoOpciones?: number | null;
  origenCorreccion: OrigenCorreccion;
  modoJustificacion?: ModoJustificacion;
  estrategiaCorreccion?: EstrategiaCorreccion;
  tratamientoJustificacion?: TratamientoJustificacion;
  comentariosDocente: string | null;
  corregidoPor: number | null;
  fechaCorreccion: string | null;
  respuesta: RespuestaIntento | null;
  opciones: OpcionIntento[];
}

export interface IntentoCompleto {
  idIntento: number;
  idAlumno: number;
  idPublicacion: number;
  estado: EstadoIntento;
  notaFinal: number | null;
  notaAutomatica: number | null;
  notaFinalCalculada: number | null;
  notaFinalManual: number | null;
  escalaCalificacion: EscalaCalificacion;
  notaAprobacion: number;
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

export interface CorreccionPreguntaIntentoPayload {
  puntajeObtenido: number | null;
  comentariosDocente: string | null;
}

export interface ResultadoCalificacionIntento {
  idIntento: number;
  notaAutomatica: number | null;
  notaFinalCalculada: number | null;
  notaFinalManual: number | null;
  notaFinal: number | null;
  escalaCalificacion: EscalaCalificacion;
  notaAprobacion: number;
}

export interface ResultadoCorreccionPregunta
  extends ResultadoCalificacionIntento {
  idPregunta: number;
  puntajeMaximoSnapshot: number;
  puntajeObtenido: number | null;
  origenCorreccion: OrigenCorreccion;
  comentariosDocente: string | null;
  corregidoPor?: number | null;
  fechaCorreccion?: string | null;
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

export type SeleccionIntentoValido = "automatica" | "manual" | null;

export interface IntentoAlumnoPublicacion {
  idIntento: number;
  idPublicacion: number;
  idAlumno: number;
  numeroIntento: number;
  estado: EstadoIntento;
  fechaInicio: string;
  fechaFin: string | null;
  notaAutomatica: number | null;
  notaFinalCalculada: number | null;
  notaFinalManual: number | null;
  notaFinal: number | null;
  escalaCalificacion: EscalaCalificacion;
  notaAprobacion: number;
  estadoCorreccion: "pendiente" | "completa" | null;
  preguntasPendientesCorreccion: number;
  esIntentoValido: boolean;
  seleccionIntentoValido: SeleccionIntentoValido;
}

export interface SeleccionIntentoValidoResultado {
  idPublicacion: number;
  idAlumno: number;
  idIntento: number | null;
  esIntentoValido: boolean;
  seleccionIntentoValido: SeleccionIntentoValido;
  fechaSeleccion?: string;
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

export type ResultadoIntentoAlumno = "aprobado" | "desaprobado" | "pendiente";
export type OrdenIntentosAlumno = "fecha" | "materia" | "evaluacion" | "nota";
export type DireccionOrdenIntentosAlumno = "asc" | "desc";

export interface MisIntentosFiltros {
  idMateria?: number;
  idMateriaDivision?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: EstadoIntento;
  resultado?: ResultadoIntentoAlumno;
  pagina?: number;
  limite?: number;
  ordenarPor?: OrdenIntentosAlumno;
  ordenDireccion?: DireccionOrdenIntentosAlumno;
}

export interface IntentoHistorialAlumno {
  idIntento: number;
  idActividad: number;
  idPublicacion: number;
  titulo: string;
  tipo: TipoActividad;
  idMateria: number;
  materia: string;
  idMateriaDivision: number;
  division: string;
  numeroIntento: number;
  cantidadIntentosMaximos: number;
  estado: EstadoIntento;
  fechaInicio: string;
  fechaFin: string | null;
  notaAutomatica: number | null;
  notaFinal: number | null;
  escalaCalificacion: EscalaCalificacion;
  notaAprobacion: number;
  resultado: ResultadoIntentoAlumno;
  estadoCorreccion: "pendiente" | "completa" | null;
  esIntentoValido: boolean;
  seleccionIntentoValido: SeleccionIntentoValido;
}

export interface ResumenIntentosAlumno {
  totalIntentos: number;
  totalEvaluaciones: number;
  evaluacionesAprobadas: number;
  evaluacionesDesaprobadas: number;
  evaluacionesPendientes: number;
}

export interface MisIntentosResultado {
  items: IntentoHistorialAlumno[];
  resumen: ResumenIntentosAlumno;
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
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
  Id?: number;
  Texto: string;
  EsCorrecta: boolean;
}

export interface PreguntaPayload {
  Id?: number;
  Enunciado: string;
  Tipo: TipoPregunta;
  ModoJustificacion?: ModoJustificacion;
  EstrategiaCorreccion?: EstrategiaCorreccion;
  TratamientoJustificacion?: TratamientoJustificacion;
  Opciones?: OpcionPayload[];
  ReferenciaBanco?: BancoReferenciaPreguntaPayload;
}

export interface GrupoPreguntaPayload {
  Id?: number;
  TituloReferencia: string;
  PuntajeMaximo?: number | null;
  Variantes: PreguntaPayload[];
  ReferenciaBanco?: BancoReferenciaGrupoPayload;
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
  Estado?: "borrador" | "publicada";
  EscalaCalificacion?: EscalaCalificacion;
  NotaAprobacion?: number;
  ModoPuntaje?: ModoPuntaje;
  MostrarPuntajePorPregunta?: boolean;
  CorreccionAutomaticaCerradas?: boolean;
  GruposPreguntas: GrupoPreguntaPayload[];
  ImportacionesBanco?: BancoImportacionPayload[];
}

export interface GuardarEvaluacionResultado {
  idActividad: number;
  idPublicacion: number;
  estado: "borrador" | "publicada";
  revision: number;
  escalaCalificacion: EscalaCalificacion;
  notaAprobacion: number;
  modoPuntaje: ModoPuntaje;
  mostrarPuntajePorPregunta: boolean;
  correccionAutomaticaCerradas: boolean;
  importaciones: unknown[];
  banco: unknown[];
}

export interface ModificarBorradorPayload
  extends Omit<GuardarEvaluacionPayload, "Estado"> {
  IdPublicacion: number;
  RevisionEsperada: number;
}

export interface ModificarBorradorResultado {
  revision: number;
  importaciones?: BancoImportarEnEvaluacionResultado["importaciones"];
}

export interface PublicarEvaluacionPayload extends ModificarBorradorPayload {
  GuardarTodoEnBanco: boolean;
}

export interface PublicarEvaluacionResultado {
  idActividad: number;
  idPublicacion: number;
  estado: "publicada";
  revision: number;
  importaciones: BancoImportarEnEvaluacionResultado["importaciones"];
  banco: unknown[];
}

export interface EvaluacionOperacionIdempotente<TPayload> {
  payload: TPayload;
  idempotencyKey: string;
}

export interface IniciarIntentoPayload {
  IdPublicacion: number;
  IdAlumno: number;
}

export interface GuardarRespuestaPayload {
  IdIntento: number;
  IdPregunta: number;
  IdOpcionesSeleccionadas?: number[];
  IdOpcionNueva?: number;
  RtaTexto?: string | null;
  Justificacion?: string | null;
  RevisionEsperada?: number;
  EventoId?: string;
}

export interface RespuestaBorradorIntento {
  idRespuesta: number | null;
  idsOpcionesSeleccionadas: number[];
  rtaTexto: string | null;
  justificacion: string | null;
  revision: number;
}

export interface GuardarRespuestaResultado extends RespuestaBorradorIntento {
  idIntento: number;
  idPregunta: number;
  replay: boolean;
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
