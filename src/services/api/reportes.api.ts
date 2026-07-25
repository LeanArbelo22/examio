import { apiFetch } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type {
  ReporteRendimientoDetalle,
  ReporteRendimientoFiltros,
  ReporteRendimientoListado,
} from "@/types/index";

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
