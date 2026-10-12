import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ReporteEvaluacionesListado,
  ReporteRendimientoListado,
} from "@/types";
import { EvaluacionesReport } from "./EvaluacionesReport";
import { RendimientoReport } from "./RendimientoReport";

const reportMocks = vi.hoisted(() => ({
  pathname: "/profesor/reportes",
  search: "",
  replace: vi.fn(),
  push: vi.fn(),
  evaluacionesHook: vi.fn(),
  rendimientoHook: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => reportMocks.pathname,
  useRouter: () => ({ replace: reportMocks.replace, push: reportMocks.push }),
  useSearchParams: () => new URLSearchParams(reportMocks.search),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { identificadorInstitucional: 9001 } },
  }),
}));

vi.mock("@/hooks/useMaterias", () => ({
  useGetMaterias: () => ({ materias: [{ id: 3, nombre: "Programación" }] }),
}));

vi.mock("@/hooks/useComisiones", () => ({
  useGetComisiones: () => ({
    comisiones: [
      { idMateriaDivision: 44, materia: "Programación", division: "1A" },
    ],
  }),
}));

vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetEvaluacionesDocente: () => ({
    data: [
      {
        idActividad: 10,
        idPublicacion: 47,
        titulo: "Primer parcial",
        division: "1A",
      },
    ],
  }),
}));

vi.mock("@/hooks/useReportes", () => ({
  useReporteRendimientoEvaluaciones: (...args: unknown[]) =>
    reportMocks.evaluacionesHook(...args),
  useReporteRendimiento: (...args: unknown[]) =>
    reportMocks.rendimientoHook(...args),
}));

vi.mock("@/components/reports/EvaluationReportCharts", () => ({
  EvaluationReportCharts: ({ distribution }: { distribution: unknown[] }) => (
    <div>Distribución global: {distribution.length}</div>
  ),
}));

vi.mock("@/components/reports/ReportCharts", () => ({
  ReportCharts: ({ alumnos }: { alumnos: unknown[] }) => (
    <div>Gráficos de página: {alumnos.length}</div>
  ),
}));

vi.mock("@/components/reports/StudentReportDetail", () => ({
  StudentReportDetail: ({ matricula }: { matricula: number | null }) =>
    matricula ? <div>Detalle del alumno {matricula}</div> : null,
}));

const evaluationReport: ReporteEvaluacionesListado = {
  criterios: {
    alcanceIntentos: "todos",
    escalaPromedio: 10,
    conPendientesCorreccion: null,
  },
  kpis: {
    totalEvaluaciones: 2,
    totalAlumnosAlcanzados: 35,
    totalAlumnosUnicos: 30,
    totalIntentos: 28,
    totalEntregados: 24,
    totalEnProgreso: 2,
    totalVencidos: 1,
    totalAnulados: 1,
    totalIntentosAlcanceAcademico: 24,
    totalIntentosCalificados: 20,
    intentosPendientesCorreccion: 4,
    promedioIntentosCalificados: 7.25,
    promedioIntentosCalificadosBase10: 7.25,
    tasaAprobacionIntentos: 75,
  },
  graficos: {
    distribucionResultados: [
      { categoria: "Aprobados", cantidad: 15 },
      { categoria: "Desaprobados", cantidad: 5 },
    ],
  },
  evaluaciones: [
    {
      idPublicacion: 47,
      idActividad: 10,
      titulo: "Primer parcial",
      idMateria: 3,
      materia: "Programación",
      idMateriaDivision: 44,
      division: "1A",
      fechaInicio: "2026-08-01T12:00:00.000Z",
      fechaFin: "2026-08-01T14:00:00.000Z",
      estado: "publicada",
      escalaCalificacion: 10,
      notaAprobacion: 6,
      alumnosAlcanzados: 20,
      alumnosQueIniciaron: 18,
      sinIniciar: 2,
      intentosTotales: 18,
      entregados: 16,
      enProgreso: 1,
      vencidos: 1,
      anulados: 0,
      intentosAlcanceAcademico: 14,
      intentosCalificados: 14,
      intentosPendientesCorreccion: 2,
      promedioIntentosCalificados: 7.5,
      promedioIntentosCalificadosBase10: 7.5,
      intentosAprobados: 11,
      intentosDesaprobados: 3,
      porcentajeAprobacionIntentos: 78.57,
    },
  ],
  paginacion: { pagina: 2, limite: 20, total: 2, totalPaginas: 2 },
};

const studentReport: ReporteRendimientoListado = {
  kpis: {
    totalAlumnos: 30,
    conIntentos: 25,
    totalIntentos: 40,
    intentosAlcanceAcademico: 32,
    promedioGeneral: 7.4,
    escalaPromedio: 10,
    alcanceIntentos: "todos",
    tasaAprobacion: 72.5,
  },
  alumnos: [
    {
      matricula: 30123,
      nombre: "Ada",
      apellido: "Lovelace",
      totalIntentos: 2,
      intentosAlcanceAcademico: 2,
      totalCorregidos: 2,
      promedio: 9,
      escalaPromedio: 10,
      alcanceIntentos: "todos",
      aprobados: 2,
      desaprobados: 0,
      porcentajeAprobacion: 100,
    },
  ],
  paginacion: { pagina: 1, limite: 20, total: 30, totalPaginas: 2 },
};

function successfulQuery(data: unknown) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

describe("reportes docentes", () => {
  beforeEach(() => {
    reportMocks.search = "";
    reportMocks.replace.mockReset();
    reportMocks.push.mockReset();
    reportMocks.evaluacionesHook.mockReset();
    reportMocks.rendimientoHook.mockReset();
    reportMocks.evaluacionesHook.mockReturnValue(successfulQuery(evaluationReport));
    reportMocks.rendimientoHook.mockReturnValue(successfulQuery(studentReport));
  });

  it("usa KPIs y distribución global del backend en el reporte por evaluación", async () => {
    const user = userEvent.setup();
    reportMocks.search = "reporte=evaluaciones&pagina=2";
    render(<EvaluacionesReport />);

    expect(screen.getByText("30 alumnos únicos")).toBeVisible();
    expect(screen.getByText("Distribución global: 2")).toBeVisible();
    expect(screen.getAllByText("Primer parcial")).toHaveLength(2);
    expect(reportMocks.evaluacionesHook).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 2, limite: 20 }),
    );

    await user.click(
      screen.getByRole("button", { name: "Ordenar por Promedio por intento" }),
    );
    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("ordenarPor=promedio"),
      { scroll: false },
    );
  });

  it("valida el rango temporal antes de consultar otra página", async () => {
    const user = userEvent.setup();
    render(<EvaluacionesReport />);

    await user.type(screen.getByLabelText("Fecha desde"), "2026-08-20");
    await user.type(screen.getByLabelText("Fecha hasta"), "2026-08-10");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      screen.getByText("La fecha desde no puede ser posterior a la fecha hasta."),
    ).toBeVisible();
    expect(reportMocks.replace).not.toHaveBeenCalled();
  });

  it("sincroniza alcance académico y pendientes con la URL", async () => {
    const user = userEvent.setup();
    render(<EvaluacionesReport />);

    await user.selectOptions(screen.getByLabelText("Resultados académicos"), "validos");
    await user.selectOptions(screen.getByLabelText("Correcciones pendientes"), "true");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("alcanceIntentos=validos"),
      { scroll: false },
    );
    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("conPendientesCorreccion=true"),
      { scroll: false },
    );
  });

  it("presenta KPIs globales pero gráficos y tabla de la página del reporte por alumno", async () => {
    const user = userEvent.setup();
    render(<RendimientoReport />);

    expect(screen.getByText("30")).toBeVisible();
    expect(screen.getByText("Gráficos de página: 1")).toBeVisible();
    expect(screen.getByText("Lovelace, Ada")).toBeVisible();

    await user.click(screen.getByText("Lovelace, Ada"));
    expect(screen.getByText("Detalle del alumno 30123")).toBeVisible();
  });

  it("impide filtrar por actividad sin matrícula en el reporte por alumno", async () => {
    const user = userEvent.setup();
    render(<RendimientoReport />);

    await user.selectOptions(screen.getByLabelText("Actividad"), "10");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      screen.getByText(/El filtro Actividad requiere una matrícula/),
    ).toBeVisible();
    expect(reportMocks.replace).not.toHaveBeenCalled();
  });
});
