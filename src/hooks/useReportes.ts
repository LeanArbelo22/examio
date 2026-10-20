import { useQuery } from "@tanstack/react-query";
import {
  obtenerDetalleRendimientoAlumno,
  obtenerReporteRendimiento,
  obtenerReporteRendimientoEvaluaciones,
  obtenerReporteRendimientoGrupos,
  obtenerReporteRendimientoPreguntas,
  obtenerReporteOpcionesPregunta,
} from "@/services/api/reportes.api";
import type {
  ReporteEvaluacionesFiltros,
  ReporteGruposFiltros,
  ReporteOpcionesFiltros,
  ReportePreguntasFiltros,
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
  enabled = true,
) =>
  useQuery({
    queryKey: reporteKeys.evaluaciones(filtros),
    queryFn: () => obtenerReporteRendimientoEvaluaciones(filtros),
    enabled,
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

export const useReporteRendimientoPreguntas = (
  filtros: ReportePreguntasFiltros,
  enabled = true,
) =>
  useQuery({
    queryKey: reporteKeys.preguntas(filtros),
    queryFn: () => obtenerReporteRendimientoPreguntas(filtros),
    enabled,
    placeholderData: (previousData) => previousData,
  });

export const useReporteRendimientoGrupos = (
  filtros: ReporteGruposFiltros,
  enabled = true,
) =>
  useQuery({
    queryKey: reporteKeys.grupos(filtros),
    queryFn: () => obtenerReporteRendimientoGrupos(filtros),
    enabled,
    placeholderData: (previousData) => previousData,
  });

export const useReporteOpcionesPregunta = (
  idPregunta: number | null,
  filtros: ReporteOpcionesFiltros,
) =>
  useQuery({
    queryKey: reporteKeys.opcionesPregunta(idPregunta!, filtros),
    queryFn: () => obtenerReporteOpcionesPregunta(idPregunta!, filtros),
    enabled: isValidId(idPregunta),
    placeholderData: (previousData) => previousData,
  });
