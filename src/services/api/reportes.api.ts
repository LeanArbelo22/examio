import { apiFetch } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type {
  ReporteRendimientoDetalle,
  ReporteRendimientoFiltros,
  ReporteRendimientoListado,
  ReporteEvaluacionesFiltros,
  ReporteEvaluacionesListado,
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
