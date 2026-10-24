import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReporteRendimientoEvaluaciones } from "@/hooks/useReportes";
import type {
  ComparativaCarrera,
  ComparativaComision,
  ComparativaMateria,
  PendientesOperativos,
  ReporteEvaluacionesListado,
  ResultadosOficiales,
  ResumenInstitucionalBase,
  ResumenInstitucionalCarrera,
  ResumenInstitucionalComision,
  ResumenInstitucionalMateria,
} from "@/types";
import { InstitutionalAnalyticsWorkspace } from "./InstitutionalAnalyticsWorkspace";

const navigation = { search: "", replace: vi.fn(), push: vi.fn() };
const FROM = "2025-11-01T03:00:00.000Z";
const TO = "2026-10-22T15:00:00.000Z";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analitica",
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock("@/hooks/useReportes", () => ({ useReporteRendimientoEvaluaciones: vi.fn() }));

vi.mock("./InstitutionalAnalyticsCharts", () => ({
  InstitutionalComparisonChart: ({ title, items, onSelect }: { title: string; items: Array<{ carrera?: string; materia?: string; division?: string }>; onSelect: (item: object) => void }) => (
    <section><h2>{title}</h2>{items.map((item, index) => <button key={index} onClick={() => onSelect(item)}>{item.division ? `Comisión ${item.division}` : item.materia ?? item.carrera}</button>)}</section>
  ),
  InstitutionalMonthlyChart: ({ points }: { points: Array<{ periodo: string; periodoCompleto: boolean; resultadosOficiales: { porcentajeAprobacion: number | null } }> }) => (
    <section><h2>Evolución mensual</h2>{points.map((point) => <p key={point.periodo}>{point.periodo} · {point.periodoCompleto ? "completo" : "parcial"} · {point.resultadosOficiales.porcentajeAprobacion === null ? "Sin resultados confirmados" : `${point.resultadosOficiales.porcentajeAprobacion}%`}</p>)}</section>
  ),
}));

const reportHook = vi.mocked(useReporteRendimientoEvaluaciones);

const official = (overrides: Partial<ResultadosOficiales> = {}): ResultadosOficiales => ({
  intentosValidosEntregados: 40,
  resultadosConsiderados: 30,
  resultadosPendientes: 10,
  intentosPendientesConfirmacion: 8,
  intentosConfirmadosSinNota: 2,
  intentosConPreguntasSinPuntaje: 3,
  preguntasSinPuntaje: 5,
  aprobados: 21,
  desaprobados: 9,
  porcentajeAprobacion: 70,
  porcentajeCoberturaConfirmada: 75,
  ...overrides,
});

const operational = (overrides: Partial<PendientesOperativos> = {}): PendientesOperativos => ({
  intentosEntregadosPendientes: 12,
  intentosPendientesConfirmacion: 10,
  intentosSinNotaFinal: 8,
  intentosConPreguntasSinPuntaje: 6,
  preguntasSinPuntaje: 9,
  ...overrides,
});

const base = (overrides: Partial<ResumenInstitucionalBase> = {}): ResumenInstitucionalBase => ({
  publicaciones: 4,
  publicacionesConResultadosPendientes: 2,
  publicacionesConPendientesOperativos: 3,
  resultadosOficiales: official(),
  pendientesOperativos: operational(),
  ...overrides,
});

const commission: ResumenInstitucionalComision = {
  ...base({ publicaciones: 2 }), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Matemática", idMateriaDivision: 101, division: "1° A",
};
const matter: ResumenInstitucionalMateria = {
  ...base(), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Matemática", comisiones: [commission],
};
const career: ResumenInstitucionalCarrera = {
  ...base(), idCarrera: 1, carrera: "Carrera Norte", materias: [matter],
};

const comparativeCareer: ComparativaCarrera = { ...base(), idCarrera: 1, carrera: "Carrera Norte" };
const comparativeMatter: ComparativaMateria = { ...base(), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Matemática" };
const comparativeCommission: ComparativaComision = { ...base(), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Matemática", idMateriaDivision: 101, division: "1° A" };

function report(overrides: Partial<ReporteEvaluacionesListado> = {}): ReporteEvaluacionesListado {
  return {
    criterios: {
      alcanceIntentos: "todos", escalaPromedio: 10, conPendientesCorreccion: null, conIncidentes: null, tipoIncidente: null, severidad: null, soloIncidentesSinRevisar: null, incluirResumenInstitucional: true, incluirSerieMensual: true,
    },
    kpis: {
      totalEvaluaciones: 4, totalAlumnosAlcanzados: 40, totalAlumnosUnicos: 30, totalIntentos: 50, totalEntregados: 40, totalEnProgreso: 2, totalVencidos: 1, totalAnulados: 1, totalIntentosAlcanceAcademico: 40, totalIntentosCalificados: 30, intentosPendientesCorreccion: 10, promedioIntentosCalificados: 7, promedioIntentosCalificadosBase10: 7, tasaAprobacionIntentos: 70, intentosAnulados: 1, alumnosConIncidentes: 2, totalIncidentes: 3, incidentesSinRevisar: 1, resultadosOficiales: official(), pendientesOperativos: operational(),
    },
    graficos: { distribucionResultados: [] },
    evaluaciones: [{
      idPublicacion: 900, idActividad: 90, idCarrera: 1, carrera: "Carrera Norte", titulo: "Parcial integrador", idMateria: 11, materia: "Matemática", idMateriaDivision: 101, division: "1° A", fechaInicio: "2026-10-20T12:00:00.000Z", fechaFin: "2026-10-20T14:00:00.000Z", estado: "publicada", escalaCalificacion: 10, notaAprobacion: 6, alumnosAlcanzados: 20, alumnosQueIniciaron: 18, sinIniciar: 2, intentosTotales: 20, entregados: 18, enProgreso: 1, vencidos: 0, anulados: 1, intentosAlcanceAcademico: 18, intentosCalificados: 15, intentosPendientesCorreccion: 3, promedioIntentosCalificados: 7, promedioIntentosCalificadosBase10: 7, intentosAprobados: 10, intentosDesaprobados: 5, porcentajeAprobacionIntentos: 66.67, intentosAnulados: 1, alumnosConIncidentes: 2, totalIncidentes: 3, incidentesSinRevisar: 1, resultadosOficiales: official(), pendientesOperativos: operational(),
    }],
    paginacion: { pagina: 1, limite: 10, total: 12, totalPaginas: 2 },
    resumenInstitucional: {
      unidadEvaluacion: "idPublicacion",
      dimensionTemporal: "publicacion.fechaInicio",
      periodoEfectivo: { desde: FROM, hasta: TO, zonaHoraria: "America/Argentina/Buenos_Aires", mesesCalendarioIncluidos: 12 },
      global: base(),
      materias: [matter],
      carreras: [career],
      comparativas: {
        criteriosElegibilidad: { muestraMinima: 10, coberturaMinimaPorcentaje: 70, naturaleza: "criterio_operativo_configurable" },
        carreras: { elegibles: [{ ...comparativeCareer, posicion: 1 }], evidenciaLimitada: [], sinResultados: [] },
        materias: { elegibles: [{ ...comparativeMatter, posicion: 1 }], evidenciaLimitada: [], sinResultados: [] },
        comisiones: { elegibles: [{ ...comparativeCommission, posicion: 1 }], evidenciaLimitada: [], sinResultados: [] },
      },
      serieMensual: [
        { periodo: "2026-09", periodoCompleto: true, publicaciones: 2, publicacionesConResultadosPendientes: 1, resultadosOficiales: official() },
        { periodo: "2026-10", periodoCompleto: false, publicaciones: 0, publicacionesConResultadosPendientes: 0, resultadosOficiales: official({ intentosValidosEntregados: 0, resultadosConsiderados: 0, resultadosPendientes: 0, aprobados: 0, desaprobados: 0, porcentajeAprobacion: null, porcentajeCoberturaConfirmada: null }) },
      ],
    },
    ...overrides,
  };
}

function setSearch(extra = "") {
  navigation.search = new URLSearchParams({ fechaDesde: FROM, fechaHasta: TO, ...Object.fromEntries(new URLSearchParams(extra)) }).toString();
}

function mockSuccess(data = report(), isPlaceholderData = false) {
  reportHook.mockReturnValue({ data, isLoading: false, isFetching: false, isError: false, error: null, isPlaceholderData, refetch: vi.fn() } as never);
}

describe("panorama institucional v1.2", () => {
  beforeEach(() => {
    setSearch();
    navigation.replace.mockReset();
    navigation.push.mockReset();
    reportHook.mockReset();
    mockSuccess();
  });

  it("solicita la jerarquía, comparativas y serie con límites estables", () => {
    setSearch("idCarrera=1&pagina=2");
    render(<InstitutionalAnalyticsWorkspace />);
    expect(reportHook).toHaveBeenCalledWith(expect.objectContaining({
      incluirResumenInstitucional: true,
      incluirSerieMensual: true,
      idCarrera: "1",
      fechaDesde: FROM,
      fechaHasta: TO,
      pagina: 2,
    }), true);
  });

  it("crea y conserva un período inicial de doce meses cuando la URL no lo define", () => {
    navigation.search = "";
    render(<InstitutionalAnalyticsWorkspace />);
    expect(reportHook).toHaveBeenCalledWith(expect.objectContaining({ incluirSerieMensual: true, fechaDesde: undefined, fechaHasta: undefined }), false);
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/admin\/analitica\?fechaDesde=.+&fechaHasta=.+&pagina=1$/), { scroll: false });
  });

  it("muestra el inicio institucional y navega desde la comparación de carreras", () => {
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByRole("heading", { name: "Toda la institución" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Comparación entre carreras" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Materias con menor aprobación observada" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Carrera Norte" }));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("idCarrera=1"), { scroll: false });
  });

  it("recorre carrera, materia y comisión conservando el período", () => {
    setSearch("idCarrera=1");
    const { rerender } = render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByRole("heading", { name: "Carrera Norte" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Matemática" })[0]);
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/fechaDesde=.*idMateria=11/), { scroll: false });

    setSearch("idCarrera=1&idMateria=11");
    rerender(<InstitutionalAnalyticsWorkspace />);
    fireEvent.click(screen.getAllByRole("button", { name: "Comisión 1° A" })[0]);
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("idMateriaDivision=101"), { scroll: false });

    setSearch("idCarrera=1&idMateria=11&idMateriaDivision=101");
    rerender(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByRole("heading", { name: "Evaluaciones de la comisión 1° A" })).toBeInTheDocument();
    expect(screen.getByText("Parcial integrador")).toBeInTheDocument();
  });

  it("presenta evidencia limitada y permite entrar sin recalcular elegibilidad", () => {
    const data = report();
    data.resumenInstitucional!.comparativas.carreras = {
      elegibles: [],
      evidenciaLimitada: [{ ...comparativeCareer, motivosNoElegibilidad: ["MUESTRA_INSUFICIENTE", "COBERTURA_INSUFICIENTE"] }],
      sinResultados: [],
    };
    mockSuccess(data);
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByRole("heading", { name: "Comparación entre carreras" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Resultados insuficientes para comparar"));
    expect(screen.getByText(/Pocos resultados confirmados/)).toBeInTheDocument();
    expect(screen.getByText(/Muchas correcciones pendientes/)).toBeInTheDocument();
  });

  it("distingue meses sin resultados de una aprobación real de cero y marca parciales", () => {
    const data = report();
    data.resumenInstitucional!.serieMensual = [
      { periodo: "2026-09", periodoCompleto: true, publicaciones: 1, publicacionesConResultadosPendientes: 0, resultadosOficiales: official({ porcentajeAprobacion: 0, aprobados: 0 }) },
      { periodo: "2026-10", periodoCompleto: false, publicaciones: 0, publicacionesConResultadosPendientes: 0, resultadosOficiales: official({ intentosValidosEntregados: 0, resultadosConsiderados: 0, resultadosPendientes: 0, aprobados: 0, desaprobados: 0, porcentajeAprobacion: null, porcentajeCoberturaConfirmada: null }) },
    ];
    mockSuccess(data);
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByText("2026-09 · completo · 0%")).toBeInTheDocument();
    expect(screen.getByText("2026-10 · parcial · Sin resultados confirmados")).toBeInTheDocument();
  });

  it("cambiar de página conserva alcance y período sin alterar el resumen", () => {
    setSearch("idCarrera=1&idMateria=11&idMateriaDivision=101&pagina=1");
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getAllByText("70%").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/idMateriaDivision=101.*pagina=2/), { scroll: false });
  });

  it("oculta los datos anteriores durante un cambio de alcance", () => {
    mockSuccess(report(), true);
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByLabelText("Cargando reporte")).toBeInTheDocument();
    expect(screen.queryByText("Carrera Norte")).not.toBeInTheDocument();
  });
});
