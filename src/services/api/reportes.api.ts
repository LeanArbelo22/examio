import { apiFetch } from "@/lib/api";
import type {
  ReporteRendimientoDetalle,
  ReporteRendimientoFiltros,
  ReporteRendimientoListado,
} from "@/types/index";

function buildQueryString(filtros: ReporteRendimientoFiltros): string {
  const params = new URLSearchParams();

  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export const obtenerReporteRendimiento = (
  filtros: ReporteRendimientoFiltros,
): Promise<ReporteRendimientoListado | ReporteRendimientoDetalle> =>
  apiFetch<ReporteRendimientoListado | ReporteRendimientoDetalle>(`/reportes/rendimiento${buildQueryString(filtros)}`);

export const obtenerDetalleRendimientoAlumno = (
  filtros: ReporteRendimientoFiltros & { matricula: string },
): Promise<ReporteRendimientoDetalle> =>
  apiFetch<ReporteRendimientoDetalle>(`/reportes/rendimiento${buildQueryString(filtros)}`);
