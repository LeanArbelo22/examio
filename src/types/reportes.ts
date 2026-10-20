import type { Alumno } from "./alumnos";
import type { TipoActividad, TipoPregunta } from "./shared";
import type { SeveridadIncidente } from "./incidentes";

export type ReporteRendimientoEstado =
  | "entregado"
  | "en_progreso"
  | "vencido"
  | "anulado";
export type ReporteRendimientoOrden =
  | "alumno"
  | "promedio"
  | "aprobados"
  | "intentos";
export type OrdenDireccion = "asc" | "desc";
export type AlcanceIntentosReporte = "todos" | "validos";

export type ReporteEvaluacionesEstado =
  | "borrador"
  | "publicada"
  | "archivada";
export type ReporteEvaluacionesOrden =
  | "evaluacion"
  | "fecha"
  | "promedio"
  | "entregados"
  | "aprobacion"
  | "pendientesCorreccion";

export interface ReporteEvaluacionesFiltros {
  idMateria?: string;
  idMateriaDivision?: string;
  idActividad?: string;
  idPublicacion?: string;
  estado?: ReporteEvaluacionesEstado | "";
  fechaDesde?: string;
  fechaHasta?: string;
  alcanceIntentos?: AlcanceIntentosReporte;
  conPendientesCorreccion?: boolean | "";
  conIncidentes?: boolean | "";
  tipoIncidente?: string;
  severidad?: SeveridadIncidente | "";
  soloIncidentesSinRevisar?: boolean | "";
  ordenarPor?: ReporteEvaluacionesOrden;
  ordenDireccion?: OrdenDireccion;
  pagina?: number;
  limite?: number;
}

export interface ResultadosOficiales {
  intentosValidosEntregados: number;
  resultadosConsiderados: number;
  resultadosPendientes: number;
  intentosPendientesConfirmacion: number;
  intentosConfirmadosSinNota: number;
  intentosConPreguntasSinPuntaje: number;
  preguntasSinPuntaje: number;
  aprobados: number;
  desaprobados: number;
  porcentajeAprobacion: number | null;
  porcentajeCoberturaConfirmada: number | null;
}

export interface PendientesOperativos {
  intentosEntregadosPendientes: number;
  intentosPendientesConfirmacion: number;
  intentosSinNotaFinal: number;
  intentosConPreguntasSinPuntaje: number;
  preguntasSinPuntaje: number;
}

export interface ReporteEvaluacionesKpis {
  totalEvaluaciones: number;
  totalAlumnosAlcanzados: number;
  totalAlumnosUnicos: number;
  totalIntentos: number;
  totalEntregados: number;
  totalEnProgreso: number;
  totalVencidos: number;
  totalAnulados: number;
  totalIntentosAlcanceAcademico: number;
  totalIntentosCalificados: number;
  intentosPendientesCorreccion: number;
  promedioIntentosCalificados: number | null;
  promedioIntentosCalificadosBase10: number | null;
  tasaAprobacionIntentos: number | null;
  intentosAnulados: number;
  alumnosConIncidentes: number;
  totalIncidentes: number;
  incidentesSinRevisar: number;
  resultadosOficiales: ResultadosOficiales;
  pendientesOperativos: PendientesOperativos;
}

export interface ReporteEvaluacionesDistribucionItem {
  categoria: string;
  cantidad: number;
}

export interface ReporteEvaluacionItem {
  idPublicacion: number;
  idActividad: number;
  titulo: string;
  idMateria: number;
  materia: string;
  idMateriaDivision: number;
  division: string;
  fechaInicio: string;
  fechaFin: string;
  estado: ReporteEvaluacionesEstado;
  escalaCalificacion: 10 | 100;
  notaAprobacion: number;
  alumnosAlcanzados: number;
  alumnosQueIniciaron: number;
  sinIniciar: number;
  intentosTotales: number;
  entregados: number;
  enProgreso: number;
  vencidos: number;
  anulados: number;
  intentosAlcanceAcademico: number;
  intentosCalificados: number;
  intentosPendientesCorreccion: number;
  promedioIntentosCalificados: number | null;
  promedioIntentosCalificadosBase10: number | null;
  intentosAprobados: number;
  intentosDesaprobados: number;
  porcentajeAprobacionIntentos: number | null;
  intentosAnulados: number;
  alumnosConIncidentes: number;
  totalIncidentes: number;
  incidentesSinRevisar: number;
  resultadosOficiales: ResultadosOficiales;
  pendientesOperativos: PendientesOperativos;
}

export interface ReporteEvaluacionesListado {
  criterios: {
    alcanceIntentos: AlcanceIntentosReporte;
    escalaPromedio: 10;
    conPendientesCorreccion: boolean | null;
    conIncidentes: boolean | null;
    tipoIncidente: string | null;
    severidad: SeveridadIncidente | null;
    soloIncidentesSinRevisar: boolean | null;
  };
  kpis: ReporteEvaluacionesKpis;
  graficos: {
    distribucionResultados: ReporteEvaluacionesDistribucionItem[];
  };
  evaluaciones: ReporteEvaluacionItem[];
  paginacion: ReporteRendimientoPaginacion;
}

export interface ReporteRendimientoFiltros {
  matricula?: string;
  idMateria?: string;
  idMateriaDivision?: string;
  idActividad?: string;
  estado?: ReporteRendimientoEstado | "";
  fechaDesde?: string;
  fechaHasta?: string;
  alcanceIntentos?: AlcanceIntentosReporte;
  promedioMin?: string;
  promedioMax?: string;
  ordenarPor?: ReporteRendimientoOrden;
  ordenDireccion?: OrdenDireccion;
  pagina?: number;
  limite?: number;
}

export interface ReporteRendimientoPaginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface ReporteRendimientoKpis {
  totalAlumnos: number;
  conIntentos: number;
  totalIntentos: number;
  intentosAlcanceAcademico: number;
  promedioGeneral: number;
  escalaPromedio: 10;
  alcanceIntentos: AlcanceIntentosReporte;
  tasaAprobacion: number;
}

export interface ReporteRendimientoAlumno {
  matricula: number;
  nombre: string;
  apellido: string;
  totalIntentos: number;
  intentosAlcanceAcademico: number;
  totalCorregidos: number;
  promedio: number;
  escalaPromedio: 10;
  alcanceIntentos: AlcanceIntentosReporte;
  aprobados: number;
  desaprobados: number;
  porcentajeAprobacion: number;
}

export interface ReporteRendimientoListado {
  paginacion: ReporteRendimientoPaginacion;
  kpis: ReporteRendimientoKpis;
  alumnos: ReporteRendimientoAlumno[];
}

export interface ReporteRendimientoDetalleKpis {
  totalIntentos: number;
  intentosAlcanceAcademico: number;
  totalCorregidos: number;
  promedioGeneral: number;
  escalaPromedio: 10;
  alcanceIntentos: AlcanceIntentosReporte;
  aprobados: number;
  desaprobados: number;
  porcentajeAprobacion: number;
}

export interface ReporteMejorIntento {
  numeroIntento: number;
  notaFinal: number;
  notaAutomatica: number | null;
  fechaFin: string;
  esIntentoValido: boolean;
  seleccionIntentoValido: "automatica" | "manual";
}

export interface ReporteActividadAlumno {
  idActividad: number;
  titulo: string;
  tipo: TipoActividad;
  escalaCalificacion: 10 | 100;
  notaAprobacion: number;
  materia: string;
  division: string;
  intentos: number;
  notaMaxima: number;
  notaPromedio: number;
  mejorIntento: ReporteMejorIntento | null;
}

export interface ReporteRendimientoDetalle {
  alumno: Pick<Alumno, "matricula" | "nombre" | "apellido">;
  kpis: ReporteRendimientoDetalleKpis;
  actividades: ReporteActividadAlumno[];
}

export type EstadoCorreccionReporteContenido =
  | "todas"
  | "pendiente"
  | "confirmada";

export type ReportePreguntasOrden =
  | "pregunta"
  | "presentadas"
  | "respondidas"
  | "omitidas"
  | "pendientesCorreccion"
  | "tasaAcierto"
  | "porcentajePuntaje"
  | "tiempoPromedio";

export type ReporteGruposOrden =
  | "grupo"
  | Exclude<ReportePreguntasOrden, "pregunta">;

export type ReporteOpcionesOrden =
  | "posicion"
  | "selecciones"
  | "porcentajeSeleccion";

export interface ReporteContenidoFiltrosBase {
  idMateria?: string;
  idMateriaDivision?: string;
  idActividad?: string;
  idPublicacion?: string;
  idGrupoPregunta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  estadoIntento?: ReporteRendimientoEstado | "";
  alcanceIntentos?: AlcanceIntentosReporte;
  estadoCorreccion?: EstadoCorreccionReporteContenido;
  pagina?: number;
  limite?: number;
  ordenDireccion?: OrdenDireccion;
}

export interface ReportePreguntasFiltros extends ReporteContenidoFiltrosBase {
  idPregunta?: string;
  soloHallazgosBajoRendimiento?: boolean;
  ordenarPor?: ReportePreguntasOrden;
}

export interface ReporteGruposFiltros extends ReporteContenidoFiltrosBase {
  ordenarPor?: ReporteGruposOrden;
}

export interface ReporteOpcionesFiltros extends ReporteContenidoFiltrosBase {
  claveContenido?: string;
  ordenarPor?: ReporteOpcionesOrden;
}

export interface ReporteContenidoCriterios {
  alcanceIntentos: AlcanceIntentosReporte;
  estadoCorreccion: EstadoCorreccionReporteContenido;
  normalizacionPuntaje: "porcentaje_puntaje_maximo";
  identidadContenido: "contenidoHashSnapshot";
  soloHallazgosBajoRendimiento?: boolean;
  alcanceIntentosAplicadoPorHallazgo?: boolean;
  estadoCorreccionAplicadoPorHallazgo?: boolean;
}

export interface ReporteMetricasOficialesPregunta {
  presentacionesOficiales: number;
  muestrasConfirmadas: number;
  presentacionesExcluidasSinPuntaje: number;
  presentacionesExcluidasSinMaximoPositivo: number;
}

export interface ReporteContenidoKpis extends ReporteMetricasOficialesPregunta {
  presentadas: number;
  respondidas: number;
  omitidas: number;
  pendientesCorreccion: number;
  correctas: number;
  parciales: number;
  incorrectas: number;
  justificacionesEntregadas: number;
  porcentajePuntajePromedio: number | null;
  tasaAcierto: number | null;
  muestrasTiempo: number;
  muestrasTiempoNuevas: number;
  muestrasTiempoLegacy: number;
  coberturaTemporal: number;
  tiempoPromedioMilisegundos: number | null;
  tiempoMaximoMilisegundos: number | null;
}

export interface ReporteContenidoMetricas extends ReporteMetricasOficialesPregunta {
  presentadas: number;
  respondidas: number;
  omitidas: number;
  pendientesCorreccion: number;
  correctas: number;
  parciales: number;
  incorrectas: number;
  porcentajePuntajePromedio: number | null;
  tasaAcierto: number | null;
  muestrasTiempo: number;
  muestrasTiempoNuevas: number;
  muestrasTiempoLegacy: number;
  coberturaTemporal: number;
  tiempoPromedioMilisegundos: number | null;
  tiempoMedianaMilisegundos: number | null;
  tiempoMaximoMilisegundos: number | null;
}

export interface ReportePreguntaItem extends ReporteContenidoMetricas {
  claveContenido: string;
  contenidoHashSnapshot: string | null;
  idPregunta: number;
  idGrupoPregunta: number;
  cantidadPreguntasOrigen: number;
  cantidadGrupos: number;
  enunciado: string;
  tipo: TipoPregunta;
  grupo: string;
  tieneProcedenciaBanco: boolean;
  cantidadOrigenesBanco: number;
  incluyeSnapshotReconstruido: boolean;
  justificacionesEntregadas: number;
  puntajePromedioObtenido: number | null;
  hallazgoBajoRendimiento: {
    detectado: boolean;
    codigo: "pregunta_bajo_rendimiento";
    version: number;
  };
}

export interface ReporteGrupoVariante extends ReporteContenidoMetricas {
  idGrupoPregunta: number;
  claveContenido: string;
  contenidoHashSnapshot: string | null;
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
}

export interface ReporteGrupoItem extends ReporteContenidoMetricas {
  idGrupoPregunta: number;
  idActividad: number;
  grupo: string;
  cantidadVariantes: number;
  tieneProcedenciaBanco: boolean;
  justificacionesEntregadas: number;
  diferenciaVariantesPuntosPorcentuales: number | null;
  variantes: ReporteGrupoVariante[];
}

export interface ReporteContenidoPaginacion {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReporteReglaHallazgo {
  codigo: "pregunta_bajo_rendimiento";
  version: number;
  porcentajePuntajeMaximoExclusivo: number;
  muestrasConfirmadasMinimas: number;
}

export interface ReporteResumenFiltroHallazgo {
  preguntasEnCoberturaGeneral: number;
  preguntasConMuestraSuficiente: number;
  preguntasConMuestraInsuficiente: number;
  preguntasCoincidentes: number;
  presentacionesCoincidentes: number;
  muestrasConfirmadasCoincidentes: number;
}

export interface ReportePreguntasListado {
  criterios: ReporteContenidoCriterios;
  reglaHallazgo?: ReporteReglaHallazgo;
  resumenFiltro?: ReporteResumenFiltroHallazgo;
  kpis: ReporteContenidoKpis;
  items: ReportePreguntaItem[];
  pagination: ReporteContenidoPaginacion;
}

export interface ReporteGruposListado {
  criterios: ReporteContenidoCriterios;
  kpis: ReporteContenidoKpis;
  items: ReporteGrupoItem[];
  pagination: ReporteContenidoPaginacion;
}

export interface ReporteOpcionItem {
  claveContenido: string;
  contenidoHashSnapshot: string | null;
  posicion: number;
  texto: string;
  esCorrecta: boolean;
  esDistractor: boolean;
  presentaciones: number;
  selecciones: number;
  porcentajeSeleccion: number | null;
}

export interface ReporteOpcionesKpis {
  presentadas: number;
  respondidas: number;
  omitidas: number;
  justificacionesEntregadas: number;
  totalSelecciones: number;
  seleccionesDistractores: number;
}

export interface ReporteOpcionesListado {
  criterios: ReporteContenidoCriterios & {
    idPregunta: number;
    claveContenido?: string;
  };
  kpis: ReporteOpcionesKpis;
  items: ReporteOpcionItem[];
  pagination: ReporteContenidoPaginacion;
}
