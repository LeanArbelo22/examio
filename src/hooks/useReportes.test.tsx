import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reporteKeys } from "@/lib/query-keys";
import { createQueryTestHarness } from "@/test/query-client";
import {
  obtenerDetalleRendimientoAlumno,
  obtenerReporteRendimientoEvaluaciones,
} from "@/services/api/reportes.api";
import type {
  ReporteEvaluacionesFiltros,
  ReporteEvaluacionesListado,
  ReporteRendimientoDetalle,
} from "@/types";
import {
  useDetalleRendimientoAlumno,
  useReporteRendimientoEvaluaciones,
} from "./useReportes";

vi.mock("@/services/api/reportes.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/reportes.api")>();
  return {
    ...actual,
    obtenerDetalleRendimientoAlumno: vi.fn(),
    obtenerReporteRendimientoEvaluaciones: vi.fn(),
  };
});

const detalleMock = vi.mocked(obtenerDetalleRendimientoAlumno);
const evaluacionesMock = vi.mocked(obtenerReporteRendimientoEvaluaciones);

function reporteEvaluaciones(pagina: number): ReporteEvaluacionesListado {
  return {
    criterios: {
      alcanceIntentos: "todos",
      escalaPromedio: 10,
      conPendientesCorreccion: null,
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
});
