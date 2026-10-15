import { apiFetch } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type {
  ReporteRendimientoDetalle,
  ReporteRendimientoFiltros,
  ReporteRendimientoListado,
  ReporteEvaluacionesFiltros,
  ReporteEvaluacionesListado,
  ReporteGruposFiltros,
  ReporteGruposListado,
  ReporteOpcionesFiltros,
  ReporteOpcionesListado,
  ReportePreguntasFiltros,
  ReportePreguntasListado,
} from "@/types/index";

export const obtenerReporteRendimientoEvaluaciones = (
  filtros: ReporteEvaluacionesFiltros,
): Promise<ReporteEvaluacionesListado> =>
  apiFetch<ReporteEvaluacionesListado>(
    `/reportes/rendimiento-evaluaciones${buildQueryString(filtros)}`,
  );

export const obtenerReporteRendimiento = (
  filtros: ReporteRendimientoFiltros,
): Promise<ReporteRendimientoListado | ReporteRendimientoDetalle> =>
  apiFetch<ReporteRendimientoListado | ReporteRendimientoDetalle>(
    `/reportes/rendimiento${buildQueryString(filtros)}`,
  );

export const obtenerDetalleRendimientoAlumno = (
  filtros: ReporteRendimientoFiltros & { matricula: string },
): Promise<ReporteRendimientoDetalle> =>
  apiFetch<ReporteRendimientoDetalle>(
    `/reportes/rendimiento${buildQueryString(filtros)}`,
  );

export const obtenerReporteRendimientoPreguntas = (
  filtros: ReportePreguntasFiltros,
): Promise<ReportePreguntasListado> =>
  apiFetch<ReportePreguntasListado>(
    `/reportes/rendimiento-preguntas${buildQueryString(filtros)}`,
  );

export const obtenerReporteRendimientoGrupos = (
  filtros: ReporteGruposFiltros,
): Promise<ReporteGruposListado> =>
  apiFetch<ReporteGruposListado>(
    `/reportes/rendimiento-grupos${buildQueryString(filtros)}`,
  );

export const obtenerReporteOpcionesPregunta = (
  idPregunta: number,
  filtros: ReporteOpcionesFiltros,
): Promise<ReporteOpcionesListado> =>
  apiFetch<ReporteOpcionesListado>(
    `/reportes/rendimiento-preguntas/${idPregunta}/opciones${buildQueryString(filtros)}`,
  );
