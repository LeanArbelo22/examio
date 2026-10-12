import { useQuery } from "@tanstack/react-query";
import {
  obtenerDetalleRendimientoAlumno,
  obtenerReporteRendimiento,
  obtenerReporteRendimientoEvaluaciones,
} from "@/services/api/reportes.api";
import type {
  ReporteEvaluacionesFiltros,
  ReporteRendimientoDetalle,
  ReporteRendimientoFiltros,
  ReporteRendimientoListado,
} from "@/types/index";
import { isValidId, reporteKeys } from "@/lib/query-keys";

function normalizarListado(data: ReporteRendimientoListado | ReporteRendimientoDetalle): ReporteRendimientoListado {
  if ("paginacion" in data) return data;
  return {
    paginacion: { pagina: 1, limite: 1, total: 1, totalPaginas: 1 },
    kpis: {
      totalAlumnos: 1,
      conIntentos: data.kpis.totalIntentos > 0 ? 1 : 0,
      totalIntentos: data.kpis.totalIntentos,
      intentosAlcanceAcademico: data.kpis.intentosAlcanceAcademico,
      promedioGeneral: data.kpis.promedioGeneral,
      escalaPromedio: data.kpis.escalaPromedio,
      alcanceIntentos: data.kpis.alcanceIntentos,
      tasaAprobacion: data.kpis.porcentajeAprobacion,
    },
    alumnos: [{ ...data.alumno, totalIntentos: data.kpis.totalIntentos, intentosAlcanceAcademico: data.kpis.intentosAlcanceAcademico, totalCorregidos: data.kpis.totalCorregidos, promedio: data.kpis.promedioGeneral, escalaPromedio: data.kpis.escalaPromedio, alcanceIntentos: data.kpis.alcanceIntentos, aprobados: data.kpis.aprobados, desaprobados: data.kpis.desaprobados, porcentajeAprobacion: data.kpis.porcentajeAprobacion }],
  };
}

export const useReporteRendimiento = (filtros: ReporteRendimientoFiltros) =>
  useQuery({
    queryKey: reporteKeys.listado(filtros),
    queryFn: () => obtenerReporteRendimiento(filtros),
    select: normalizarListado,
    placeholderData: (previousData) => previousData,
  });

export const useReporteRendimientoEvaluaciones = (
  filtros: ReporteEvaluacionesFiltros,
) =>
  useQuery({
    queryKey: reporteKeys.evaluaciones(filtros),
    queryFn: () => obtenerReporteRendimientoEvaluaciones(filtros),
    placeholderData: (previousData) => previousData,
  });

export const useDetalleRendimientoAlumno = (
  matricula: number | null,
  filtros: ReporteRendimientoFiltros,
) =>
  useQuery({
    queryKey: reporteKeys.detalle(matricula!, filtros),
    queryFn: () =>
      obtenerDetalleRendimientoAlumno({
        ...filtros,
        matricula: String(matricula),
        pagina: undefined,
        limite: undefined,
        promedioMin: undefined,
        promedioMax: undefined,
        ordenarPor: undefined,
        ordenDireccion: undefined,
      }),
    enabled: isValidId(matricula),
  });
