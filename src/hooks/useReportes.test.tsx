import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reporteKeys } from "@/lib/query-keys";
import { createQueryTestHarness } from "@/test/query-client";
import {
  obtenerDetalleRendimientoAlumno,
  obtenerReporteRendimientoEvaluaciones,
  obtenerReporteRendimientoPreguntas,
} from "@/services/api/reportes.api";
import type {
  ReporteEvaluacionesFiltros,
  ReporteEvaluacionesListado,
  ReporteRendimientoDetalle,
  ReportePreguntasListado,
} from "@/types";
import {
  useDetalleRendimientoAlumno,
  useReporteRendimientoEvaluaciones,
  useReporteRendimientoPreguntas,
} from "./useReportes";

vi.mock("@/services/api/reportes.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/reportes.api")>();
  return {
    ...actual,
    obtenerDetalleRendimientoAlumno: vi.fn(),
    obtenerReporteRendimientoEvaluaciones: vi.fn(),
    obtenerReporteRendimientoPreguntas: vi.fn(),
  };
});

const detalleMock = vi.mocked(obtenerDetalleRendimientoAlumno);
const evaluacionesMock = vi.mocked(obtenerReporteRendimientoEvaluaciones);
const preguntasMock = vi.mocked(obtenerReporteRendimientoPreguntas);

function reporteEvaluaciones(pagina: number): ReporteEvaluacionesListado {
  return {
    criterios: {
      alcanceIntentos: "todos",
      escalaPromedio: 10,
      conPendientesCorreccion: null,
      conIncidentes: null,
      tipoIncidente: null,
      severidad: null,
      soloIncidentesSinRevisar: null,
    },
    kpis: {
      totalEvaluaciones: 2,
      totalAlumnosAlcanzados: 30,
      totalAlumnosUnicos: 20,
      totalIntentos: 25,
      totalEntregados: 20,
      totalEnProgreso: 2,
      totalVencidos: 1,
      totalAnulados: 2,
      totalIntentosAlcanceAcademico: 20,
      totalIntentosCalificados: 18,
      intentosPendientesCorreccion: 2,
      promedioIntentosCalificados: 7.5,
      promedioIntentosCalificadosBase10: 7.5,
      tasaAprobacionIntentos: 80,
      intentosAnulados: 2,
      alumnosConIncidentes: 4,
      totalIncidentes: 7,
      incidentesSinRevisar: 2,
      resultadosOficiales: {
        intentosValidosEntregados: 18,
        resultadosConsiderados: 16,
        resultadosPendientes: 2,
        intentosPendientesConfirmacion: 2,
        intentosConfirmadosSinNota: 0,
        intentosConPreguntasSinPuntaje: 1,
        preguntasSinPuntaje: 2,
        aprobados: 12,
        desaprobados: 4,
        porcentajeAprobacion: 75,
        porcentajeCoberturaConfirmada: 88.89,
        promedioNotaBase10: 6.75,
      },
      pendientesOperativos: {
        intentosEntregadosPendientes: 3,
        intentosPendientesConfirmacion: 2,
        intentosSinNotaFinal: 1,
        intentosConPreguntasSinPuntaje: 1,
        preguntasSinPuntaje: 2,
      },
    },
    graficos: { distribucionResultados: [] },
    evaluaciones: [],
    paginacion: { pagina, limite: 20, total: 2, totalPaginas: 2 },
  };
}

describe("hooks de reportes", () => {
  beforeEach(() => {
    detalleMock.mockReset();
    evaluacionesMock.mockReset();
    preguntasMock.mockReset();
  });

  it("incluye todos los filtros en la key y conserva la página anterior durante el cambio", async () => {
    evaluacionesMock
      .mockResolvedValueOnce(reporteEvaluaciones(1))
      .mockImplementationOnce(() => new Promise(() => undefined));
    const { queryClient, wrapper } = createQueryTestHarness();
    const initialFilters: ReporteEvaluacionesFiltros = {
      idMateria: "3",
      pagina: 1,
      ordenarPor: "promedio",
      ordenDireccion: "desc",
    };
    const { result, rerender } = renderHook(
      ({ filtros }) => useReporteRendimientoEvaluaciones(filtros),
      { initialProps: { filtros: initialFilters }, wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(reporteKeys.evaluaciones(initialFilters))).toEqual(
      reporteEvaluaciones(1),
    );

    const nextFilters = { ...initialFilters, pagina: 2 };
    rerender({ filtros: nextFilters });

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data?.paginacion.pagina).toBe(1);
    expect(evaluacionesMock).toHaveBeenNthCalledWith(2, nextFilters);
    expect(reporteKeys.evaluaciones(nextFilters)).not.toEqual(
      reporteKeys.evaluaciones(initialFilters),
    );
  });

  it("no solicita detalle sin matrícula y elimina filtros exclusivos del listado", async () => {
    const detail: ReporteRendimientoDetalle = {
      alumno: { matricula: 30123, nombre: "Ada", apellido: "Lovelace" },
      kpis: {
        totalIntentos: 1,
        intentosAlcanceAcademico: 1,
        totalCorregidos: 1,
        promedioGeneral: 9,
        escalaPromedio: 10,
        alcanceIntentos: "todos",
        aprobados: 1,
        desaprobados: 0,
        porcentajeAprobacion: 100,
      },
      actividades: [],
    };
    detalleMock.mockResolvedValue(detail);
    const { wrapper } = createQueryTestHarness();
    const filtros = {
      idMateria: "3",
      pagina: 4,
      limite: 20,
      promedioMin: "6",
      ordenarPor: "promedio" as const,
    };
    const { result, rerender } = renderHook(
      ({ matricula }: { matricula: number | null }) =>
        useDetalleRendimientoAlumno(matricula, filtros),
      { initialProps: { matricula: null as number | null }, wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(detalleMock).not.toHaveBeenCalled();

    rerender({ matricula: 30123 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(detalleMock).toHaveBeenCalledWith({
      idMateria: "3",
      matricula: "30123",
      pagina: undefined,
      limite: undefined,
      promedioMin: undefined,
      promedioMax: undefined,
      ordenarPor: undefined,
      ordenDireccion: undefined,
    });
  });

  it("incluye filtros, paginación y orden en la consulta de preguntas", async () => {
    const report: ReportePreguntasListado = {
      criterios: {
        alcanceIntentos: "validos",
        estadoCorreccion: "confirmada",
        normalizacionPuntaje: "porcentaje_puntaje_maximo",
        identidadContenido: "contenidoHashSnapshot",
      },
      kpis: {
        presentadas: 0,
        respondidas: 0,
        omitidas: 0,
        pendientesCorreccion: 0,
        correctas: 0,
        parciales: 0,
        incorrectas: 0,
        justificacionesEntregadas: 0,
        porcentajePuntajePromedio: null,
        tasaAcierto: null,
        muestrasTiempo: 0,
        muestrasTiempoNuevas: 0,
        muestrasTiempoLegacy: 0,
        coberturaTemporal: 0,
        tiempoPromedioMilisegundos: null,
        tiempoMaximoMilisegundos: null,
        presentacionesOficiales: 0,
        muestrasConfirmadas: 0,
        presentacionesExcluidasSinPuntaje: 0,
        presentacionesExcluidasSinMaximoPositivo: 0,
      },
      items: [],
      pagination: { page: 2, limit: 20, total: 0, totalPages: 0 },
    };
    preguntasMock.mockResolvedValue(report);
    const filtros = {
      idMateria: "3",
      alcanceIntentos: "validos" as const,
      estadoCorreccion: "confirmada" as const,
      pagina: 2,
      limite: 20,
      ordenarPor: "tasaAcierto" as const,
      ordenDireccion: "desc" as const,
    };
    const { queryClient, wrapper } = createQueryTestHarness();
    const { result } = renderHook(() => useReporteRendimientoPreguntas(filtros), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(preguntasMock).toHaveBeenCalledWith(filtros);
    expect(queryClient.getQueryData(reporteKeys.preguntas(filtros))).toEqual(report);
  });
});
