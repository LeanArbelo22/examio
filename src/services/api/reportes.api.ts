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
  ReportePreguntaItem,
  ReporteContenidoFiltrosBase,
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

// Las variantes del endpoint de grupos describen un grupo de origen. Sus
// métricas no representan necesariamente el contenido agregado del reporte.
export async function obtenerResultadosVariantes(
  filtros: ReporteContenidoFiltrosBase,
  clavesContenido: string[],
): Promise<ReportePreguntaItem[]> {
  const pendientes = new Set(clavesContenido);
  const resultados: ReportePreguntaItem[] = [];
  for (let pagina = 1; pendientes.size > 0; pagina += 1) {
    const reporte = await obtenerReporteRendimientoPreguntas({
      ...filtros,
      pagina,
      limite: 100,
      ordenarPor: "pregunta",
      ordenDireccion: "asc",
    });
    for (const item of reporte.items) {
      if (pendientes.delete(item.claveContenido)) resultados.push(item);
    }
    if (pagina >= reporte.pagination.totalPages) break;
  }
  return resultados;
}

export const obtenerReporteOpcionesPregunta = (
  idPregunta: number,
  filtros: ReporteOpcionesFiltros,
): Promise<ReporteOpcionesListado> =>
  apiFetch<ReporteOpcionesListado>(
    `/reportes/rendimiento-preguntas/${idPregunta}/opciones${buildQueryString(filtros)}`,
  );
