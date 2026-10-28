import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReporteRendimientoEvaluaciones } from "@/hooks/useReportes";
import type { PendientesOperativos, ReporteEvaluacionesListado, ResultadosOficiales, ResumenInstitucionalBase } from "@/types";
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
  InstitutionalRankingView: ({ items, onSelect, requestedLabel }: { items: Array<{ carrera?: string; materia?: string; division?: string }>; onSelect: (item: object) => void; requestedLabel: string }) => <section><p>Selección {requestedLabel}</p>{items.map((item, index) => <button key={index} onClick={() => onSelect(item)}>{item.division ? `Comisión ${item.division}` : item.materia ?? item.carrera}</button>)}</section>,
  InstitutionalTemporalChart: ({ points }: { points: Array<{ periodo: string; etiqueta: string; periodoCompleto: boolean; resultadosOficiales: { porcentajeAprobacion: number | null } }> }) => <section>{points.map((point) => <p key={point.periodo}>{point.etiqueta} · {point.periodoCompleto ? "completo" : "parcial"} · {point.resultadosOficiales.porcentajeAprobacion === null ? "Sin resultados confirmados" : `${point.resultadosOficiales.porcentajeAprobacion}%`}</p>)}</section>,
}));

const reportHook = vi.mocked(useReporteRendimientoEvaluaciones);
const official = (overrides: Partial<ResultadosOficiales> = {}): ResultadosOficiales => ({ intentosValidosEntregados: 40, resultadosConsiderados: 30, resultadosPendientes: 10, intentosPendientesConfirmacion: 8, intentosConfirmadosSinNota: 2, intentosConPreguntasSinPuntaje: 3, preguntasSinPuntaje: 5, aprobados: 21, desaprobados: 9, porcentajeAprobacion: 70, porcentajeCoberturaConfirmada: 75, promedioNotaBase10: 6.5, ...overrides });
const operational = (): PendientesOperativos => ({ intentosEntregadosPendientes: 12, intentosPendientesConfirmacion: 10, intentosSinNotaFinal: 8, intentosConPreguntasSinPuntaje: 6, preguntasSinPuntaje: 9 });
const base = (overrides: Partial<ResumenInstitucionalBase> = {}): ResumenInstitucionalBase => ({ publicaciones: 4, publicacionesConResultadosPendientes: 2, publicacionesConPendientesOperativos: 3, resultadosOficiales: official(), pendientesOperativos: operational(), ...overrides });
const commission = { ...base({ publicaciones: 2 }), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Matemática", idMateriaDivision: 101, division: "1° A" };
const matter = { ...base(), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Matemática", comisiones: [commission] };
const career = { ...base(), idCarrera: 1, carrera: "Carrera Norte", materias: [matter] };
const rankedCareer = { ...base(), idCarrera: 1, carrera: "Carrera Norte", posicion: 1 };
const rankedMatter = { ...base(), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Matemática", posicion: 1 };
const rankedCommission = { ...base(), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Matemática", idMateriaDivision: 101, division: "1° A", posicion: 1 };

function report(): ReporteEvaluacionesListado {
  return {
    criterios: { alcanceIntentos: "todos", escalaPromedio: 10, conPendientesCorreccion: null, conIncidentes: null, tipoIncidente: null, severidad: null, soloIncidentesSinRevisar: null, incluirResumenInstitucional: true, agrupacionSerie: "mensual", ordenRanking: "aprobacion_asc" },
    kpis: { totalEvaluaciones: 4, totalAlumnosAlcanzados: 40, totalAlumnosUnicos: 30, totalIntentos: 50, totalEntregados: 40, totalEnProgreso: 2, totalVencidos: 1, totalAnulados: 1, totalIntentosAlcanceAcademico: 40, totalIntentosCalificados: 30, intentosPendientesCorreccion: 10, promedioIntentosCalificados: 7, promedioIntentosCalificadosBase10: 7, tasaAprobacionIntentos: 70, intentosAnulados: 1, alumnosConIncidentes: 2, totalIncidentes: 3, incidentesSinRevisar: 1, resultadosOficiales: official(), pendientesOperativos: operational() },
    graficos: { distribucionResultados: [] },
    evaluaciones: [{ idPublicacion: 900, idActividad: 90, idCarrera: 1, carrera: "Carrera Norte", titulo: "Parcial integrador", idMateria: 11, materia: "Matemática", idMateriaDivision: 101, division: "1° A", fechaInicio: "2026-10-20T12:00:00.000Z", fechaFin: "2026-10-20T14:00:00.000Z", estado: "publicada", escalaCalificacion: 10, notaAprobacion: 6, alumnosAlcanzados: 20, alumnosQueIniciaron: 18, sinIniciar: 2, intentosTotales: 20, entregados: 18, enProgreso: 1, vencidos: 0, anulados: 1, intentosAlcanceAcademico: 18, intentosCalificados: 15, intentosPendientesCorreccion: 3, promedioIntentosCalificados: 7, promedioIntentosCalificadosBase10: 7, intentosAprobados: 10, intentosDesaprobados: 5, porcentajeAprobacionIntentos: 66.67, intentosAnulados: 1, alumnosConIncidentes: 2, totalIncidentes: 3, incidentesSinRevisar: 1, resultadosOficiales: official(), pendientesOperativos: operational() }],
    paginacion: { pagina: 1, limite: 10, total: 12, totalPaginas: 2 },
    resumenInstitucional: {
      unidadEvaluacion: "idPublicacion",
      dimensionTemporal: "publicacion.fechaInicio",
      periodoEfectivo: { desde: FROM, hasta: TO, zonaHoraria: "America/Argentina/Buenos_Aires", mesesCalendarioIncluidos: 12 },
      global: base(), materias: [matter], carreras: [career],
      comparativas: {
        ordenRanking: "aprobacion_asc",
        criteriosElegibilidad: { muestraMinima: 10, coberturaMinimaPorcentaje: 70, naturaleza: "criterio_operativo_configurable" },
        carreras: { elegibles: [rankedCareer], evidenciaLimitada: [], sinResultados: [] },
        materias: { elegibles: [rankedMatter], evidenciaLimitada: [], sinResultados: [] },
        comisiones: { elegibles: [rankedCommission], evidenciaLimitada: [], sinResultados: [] },
      },
      serieTemporal: { agrupacion: "mensual", zonaHoraria: "America/Argentina/Buenos_Aires", puntos: [
        { periodo: "2026-09", etiqueta: "septiembre 2026", limitesCalendario: { desde: FROM, hastaExclusivo: "2026-10-01T03:00:00.000Z" }, limitesEfectivos: { desde: FROM, hasta: "2026-10-01T02:59:59.999Z" }, periodoCompleto: true, publicaciones: 2, publicacionesConResultadosPendientes: 1, resultadosOficiales: official({ porcentajeAprobacion: 0, aprobados: 0 }) },
        { periodo: "2026-10", etiqueta: "octubre 2026", limitesCalendario: { desde: "2026-10-01T03:00:00.000Z", hastaExclusivo: "2026-11-01T03:00:00.000Z" }, limitesEfectivos: { desde: "2026-10-01T03:00:00.000Z", hasta: TO }, periodoCompleto: false, publicaciones: 0, publicacionesConResultadosPendientes: 0, resultadosOficiales: official({ intentosValidosEntregados: 0, resultadosConsiderados: 0, resultadosPendientes: 0, aprobados: 0, desaprobados: 0, porcentajeAprobacion: null, porcentajeCoberturaConfirmada: null, promedioNotaBase10: null }) },
      ] },
    },
  };
}

function setSearch(extra = "") { navigation.search = new URLSearchParams({ fechaDesde: FROM, fechaHasta: TO, periodoModo: "current", periodoMeses: "12", ...Object.fromEntries(new URLSearchParams(extra)) }).toString(); }
function mockSuccess(isPlaceholderData = false) { reportHook.mockReturnValue({ data: report(), isLoading: false, isFetching: false, isError: false, error: null, isPlaceholderData, refetch: vi.fn() } as never); }

describe("panorama institucional configurable v1.4", () => {
  beforeEach(() => { setSearch(); navigation.replace.mockReset(); navigation.push.mockReset(); reportHook.mockReset(); mockSuccess(); });

  it("consulta serie temporal y orden de ranking sin solicitar la serie legacy", () => {
    setSearch("agrupacionSerie=semestral&ordenRanking=aprobacion_desc&idCarrera=1&pagina=2");
    render(<InstitutionalAnalyticsWorkspace />);
    expect(reportHook).toHaveBeenCalledWith(expect.objectContaining({ incluirResumenInstitucional: true, agrupacionSerie: "semestral", ordenRanking: "aprobacion_desc", idCarrera: "1", pagina: 2 }), true);
    expect(reportHook.mock.calls[0][0]).not.toHaveProperty("incluirSerieMensual");
  });

  it.each(["mensual", "semestral", "anual"] as const)("consulta y presenta la agrupación %s", (grouping) => {
    setSearch(`agrupacionSerie=${grouping}`);
    render(<InstitutionalAnalyticsWorkspace />);
    expect(reportHook).toHaveBeenCalledWith(expect.objectContaining({ agrupacionSerie: grouping }), true);
    expect(screen.getByRole("heading", { name: `Evolución ${grouping}` })).toBeInTheDocument();
  });

  it("crea un período inicial estable de doce meses cuando falta en la URL", () => {
    navigation.search = "";
    render(<InstitutionalAnalyticsWorkspace />);
    expect(reportHook).toHaveBeenCalledWith(expect.objectContaining({ fechaDesde: undefined, fechaHasta: undefined }), false);
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/periodoModo=current.*periodoMeses=12.*pagina=1/), { scroll: false });
  });

  it("restaura agrupación, dimensión, cantidad y visibilidad desde la URL", () => {
    setSearch("agrupacionSerie=semestral&dimensionRanking=materias&cantidadRanking=20&verResumen=0");
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.queryByRole("heading", { name: "Toda la institución" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evolución semestral" })).toBeInTheDocument();
    expect(screen.getByText("Selección 20")).toBeInTheDocument();
  });

  it("mantiene la compatibilidad de las vistas de evolución anteriores", () => {
    setSearch("vistaEvolucion=approval_confirmed");
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByLabelText("Aprobación (%)")).toBeChecked();
    expect(screen.getByLabelText("Resultados confirmados")).toBeChecked();
    expect(screen.getByLabelText("Promedio de notas")).not.toBeChecked();
    expect(screen.getByLabelText("Resultados pendientes")).not.toBeChecked();
  });

  it("normaliza parámetros inválidos de un enlace sin enviarlos a la consulta", () => {
    setSearch("agrupacionSerie=trimestral&ordenRanking=azar&dimensionRanking=alumnos&cantidadRanking=0&coberturaMinimaRanking=130");
    render(<InstitutionalAnalyticsWorkspace />);
    expect(reportHook).toHaveBeenCalledWith(expect.objectContaining({ agrupacionSerie: "mensual", ordenRanking: "aprobacion_asc", coberturaMinimaRanking: 70 }), true);
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/agrupacionSerie=mensual.*ordenRanking=aprobacion_asc/), { scroll: false });
  });

  it("aplica accesos rápidos inmediatamente y limita cantidades personalizadas a 60 meses", () => {
    render(<InstitutionalAnalyticsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "24 meses" }));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("periodoMeses=24"), { scroll: false });
    fireEvent.change(screen.getByLabelText("Cantidad personalizada"), { target: { value: "61" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Aplicar" })[0]);
    expect(screen.getByText("Ingresá una cantidad entre 1 y 60 meses.")).toBeInTheDocument();
  });

  it("aplica o cancela el borrador avanzado completo", () => {
    render(<InstitutionalAnalyticsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Opciones avanzadas" }));
    fireEvent.change(screen.getByLabelText("Muestra mínima"), { target: { value: "25" } });
    fireEvent.click(screen.getByLabelText("Resumen"));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(navigation.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Opciones avanzadas" }));
    fireEvent.change(screen.getByLabelText("Muestra mínima"), { target: { value: "25" } });
    fireEvent.click(screen.getByLabelText("Resumen"));
    const advancedPanel = screen.getByRole("heading", { name: "Opciones avanzadas" }).closest("section");
    expect(advancedPanel).not.toBeNull();
    fireEvent.click(within(advancedPanel!).getByRole("button", { name: "Aplicar" }));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/muestraMinimaRanking=25.*verResumen=0/), { scroll: false });
  });

  it("cambiar sólo visibilidad no incorpora parámetros visuales a la consulta", () => {
    setSearch("dimensionRanking=materias&cantidadRanking=20&vistaEvolucion=approval&verResumen=0&verOperativo=0");
    render(<InstitutionalAnalyticsWorkspace />);
    const remoteFilters = reportHook.mock.calls[0][0];
    expect(remoteFilters).not.toHaveProperty("dimensionRanking");
    expect(remoteFilters).not.toHaveProperty("cantidadRanking");
    expect(remoteFilters).not.toHaveProperty("verResumen");
    expect(remoteFilters).not.toHaveProperty("vistaEvolucion");
  });

  it("cambia las series del gráfico sin alterar la consulta remota", () => {
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByLabelText("Promedio de notas")).toBeChecked();
    expect(screen.getByLabelText("Resultados pendientes")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("Resultados pendientes"));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("seriesEvolucion=approval%2Caverage%2Cconfirmed%2Cpending"), { scroll: false });
    expect(reportHook.mock.calls[0][0]).not.toHaveProperty("seriesEvolucion");
    expect(reportHook).toHaveBeenCalledTimes(1);
  });

  it("mantiene al menos una serie visible", () => {
    setSearch("seriesEvolucion=average");
    render(<InstitutionalAnalyticsWorkspace />);
    fireEvent.click(screen.getByLabelText("Promedio de notas"));
    expect(screen.getByText("La evolución debe conservar al menos una serie visible.")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("muestra el promedio oficial con dos decimales y su muestra en resumen y evaluaciones", () => {
    setSearch("idCarrera=1&idMateria=11&idMateriaDivision=101");
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getAllByText("6,50").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("30 resultados considerados").length).toBeGreaterThanOrEqual(2);
  });

  it("oculta períodos sin información como una preferencia visual", () => {
    render(<InstitutionalAnalyticsWorkspace />);
    fireEvent.click(screen.getByLabelText("Ocultar períodos sin información"));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("ocultarPeriodosSinDatos=1"), { scroll: false });
    expect(reportHook.mock.calls[0][0]).not.toHaveProperty("ocultarPeriodosSinDatos");
  });

  it("restablece la configuración conservando carrera, materia y comisión", () => {
    setSearch("idCarrera=1&idMateria=11&idMateriaDivision=101&agrupacionSerie=anual&dimensionRanking=materias&verResumen=0");
    render(<InstitutionalAnalyticsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    const url = navigation.replace.mock.calls[0][0] as string;
    expect(url).toContain("idCarrera=1"); expect(url).toContain("idMateria=11"); expect(url).toContain("idMateriaDivision=101");
    expect(url).toContain("agrupacionSerie=mensual"); expect(url).not.toContain("dimensionRanking"); expect(url).not.toContain("verResumen");
  });

  it("conserva el período y la dimensión explícita al navegar", () => {
    setSearch("dimensionRanking=materias");
    render(<InstitutionalAnalyticsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Matemática" }));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/fechaDesde=.*dimensionRanking=materias.*idMateria=11/), { scroll: false });
  });

  it("oculta datos anteriores durante una actualización", () => {
    mockSuccess(true);
    render(<InstitutionalAnalyticsWorkspace />);
    expect(screen.getByLabelText("Cargando reporte")).toBeInTheDocument();
    expect(screen.queryByText("Carrera Norte")).not.toBeInTheDocument();
  });
});
