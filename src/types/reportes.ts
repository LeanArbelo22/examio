import type { Alumno } from "./alumnos";
import type { TipoActividad } from "./shared";

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
  ordenarPor?: ReporteEvaluacionesOrden;
  ordenDireccion?: OrdenDireccion;
  pagina?: number;
  limite?: number;
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
}

export interface ReporteEvaluacionesListado {
  criterios: {
    alcanceIntentos: AlcanceIntentosReporte;
    escalaPromedio: 10;
    conPendientesCorreccion: boolean | null;
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
