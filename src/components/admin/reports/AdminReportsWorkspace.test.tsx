import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryTestHarness } from "@/test/query-client";
import { obtenerReporteRendimientoEvaluaciones } from "@/services/api/reportes.api";
import { getAlumnos } from "@/services/api/alumnos.api";
import { getDocentes } from "@/services/api/docentes.api";
import { getCarreras, getAlumnosInscriptos } from "@/services/api/carreras.api";
import { getMaterias } from "@/services/api/materias.api";
import { getComisiones, getAlumnosPorComision } from "@/services/api/comisiones.api";
import { ApiError } from "@/lib/api";
import type { ReporteEvaluacionesListado, ResultadosOficiales, PendientesOperativos } from "@/types";
import { AdminReportsWorkspace } from "./AdminReportsWorkspace";

const nav = vi.hoisted(() => ({ search: "", role: "admin", push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(nav.search), usePathname: () => "/admin/reportes", useRouter: () => ({ push: nav.push, replace: nav.replace }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { role: nav.role } } }) }));
vi.mock("@/services/api/reportes.api", () => ({ obtenerReporteRendimientoEvaluaciones: vi.fn() }));
vi.mock("@/services/api/alumnos.api", () => ({ getAlumnos: vi.fn(), getMateriasAlumno: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/api/docentes.api", () => ({ getDocentes: vi.fn(), getMateriasPorDocente: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/api/comisiones.api", () => ({ getAlumnosPorComision: vi.fn().mockResolvedValue([]), getComisiones: vi.fn() }));
vi.mock("@/services/api/carreras.api", () => ({ getCarreras: vi.fn(), getAlumnosInscriptos: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/api/materias.api", () => ({ getMaterias: vi.fn(), getAlumnosPorMateria: vi.fn().mockResolvedValue([]) }));

const official = (overrides: Partial<ResultadosOficiales> = {}): ResultadosOficiales => ({ intentosValidosEntregados: 5, resultadosConsiderados: 4, resultadosPendientes: 1, intentosPendientesConfirmacion: 1, intentosConfirmadosSinNota: 0, intentosConPreguntasSinPuntaje: 1, preguntasSinPuntaje: 2, aprobados: 3, desaprobados: 1, porcentajeAprobacion: 75, porcentajeCoberturaConfirmada: 80, promedioNotaBase10: 6.5, ...overrides });
const operational: PendientesOperativos = { intentosEntregadosPendientes: 3, intentosPendientesConfirmacion: 2, intentosSinNotaFinal: 2, intentosConPreguntasSinPuntaje: 1, preguntasSinPuntaje: 2 };
const summary = () => ({ publicaciones: 2, publicacionesConResultadosPendientes: 1, publicacionesConPendientesOperativos: 2, resultadosOficiales: official(), pendientesOperativos: operational });

function report(): ReporteEvaluacionesListado {
  const commission = { ...summary(), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Redes", idMateriaDivision: 101, division: "1NMS", idDocente: null, docente: null };
  const matter = { ...summary(), idCarrera: 1, carrera: "Carrera Norte", idMateria: 11, materia: "Redes", comisiones: [commission] };
  return {
    criterios: { alcanceIntentos: "validos", escalaPromedio: 10, conPendientesCorreccion: null, conIncidentes: null, tipoIncidente: null, severidad: null, soloIncidentesSinRevisar: null },
    kpis: { totalEvaluaciones: 2, totalAlumnosAlcanzados: 10, totalAlumnosUnicos: 5, totalIntentos: 8, totalEntregados: 7, totalEnProgreso: 1, totalVencidos: 0, totalAnulados: 0, totalIntentosAlcanceAcademico: 5, totalIntentosCalificados: 4, intentosPendientesCorreccion: 1, promedioIntentosCalificados: 9, promedioIntentosCalificadosBase10: 9, tasaAprobacionIntentos: 100, intentosAnulados: 0, alumnosConIncidentes: 0, totalIncidentes: 0, incidentesSinRevisar: 0, resultadosOficiales: official(), pendientesOperativos: operational },
    graficos: { distribucionResultados: [] }, evaluaciones: [],
    paginacion: { pagina: 1, limite: 10, total: 0, totalPaginas: 0 },
    resumenInstitucional: { unidadEvaluacion: "idPublicacion", dimensionTemporal: "publicacion.fechaInicio", periodoEfectivo: { desde: "2026-01-01T03:00:00.000Z", hasta: "2026-11-20T02:59:59.999Z", zonaHoraria: "America/Argentina/Buenos_Aires", mesesCalendarioIncluidos: 11 }, global: summary(), materias: [matter], carreras: [{ ...summary(), idCarrera: 1, carrera: "Carrera Norte", materias: [matter] }], comparativas: { criteriosElegibilidad: { muestraMinima: 10, coberturaMinimaPorcentaje: 70, naturaleza: "criterio_operativo_configurable" }, carreras: { elegibles: [], evidenciaLimitada: [], sinResultados: [] }, materias: { elegibles: [], evidenciaLimitada: [], sinResultados: [] }, comisiones: { elegibles: [], evidenciaLimitada: [], sinResultados: [] } } },
  };
}

const reportMock = vi.mocked(obtenerReporteRendimientoEvaluaciones);
function mount() {
  const { wrapper } = createQueryTestHarness();
  const result = render(<AdminReportsWorkspace />, { wrapper });
  return { ...result, refresh: () => result.rerender(<AdminReportsWorkspace />) };
}

describe("reportes administrativos con detalle", () => {
  beforeEach(() => {
    nav.search = "desde=2026-01-01&hasta=2026-11-19";
    nav.role = "admin";
    nav.push.mockReset().mockImplementation((url: string) => { nav.search = url.split("?")[1] ?? ""; });
    nav.replace.mockReset().mockImplementation((url: string) => { nav.search = url.split("?")[1] ?? ""; });
    reportMock.mockReset().mockResolvedValue(report());
    vi.mocked(getAlumnos).mockReset().mockResolvedValue([{ matricula: 30500, nombre: "Julieta", apellido: "Acosta", correo: "j@example.test", estado: "activo", cuil: "" }]);
    vi.mocked(getDocentes).mockReset().mockResolvedValue([{ legajo: 109000, nombre: "Florencia", apellido: "Balmaceda", correo: "f@example.test", estado: true, cuil: "" }]);
    vi.mocked(getCarreras).mockReset().mockResolvedValue([{ id: 1, nombre: "Carrera Norte", descripcion: "", duracionSemestres: 6 }]);
    vi.mocked(getMaterias).mockReset().mockResolvedValue([{ id: 11, nombre: "Redes", idCarrera: 1, semestre: 1, estado: true }]);
    vi.mocked(getComisiones).mockReset().mockResolvedValue([{ idMateriaDivision: 101, materia: "Redes", division: "1NMS", docenteAsignado: "Florencia Balmaceda", ...{ idMateria: 11, idDocente: 109000 } }]);
    vi.mocked(getAlumnosPorComision).mockReset().mockResolvedValue([{ matricula: 30500, materia: "Redes", nombreAlumno: "Julieta Acosta", division: "1NMS" }]);
    vi.mocked(getAlumnosInscriptos).mockReset().mockResolvedValue([{ matricula: 30500, nombreAlumno: "Julieta Acosta", carrera: "Carrera Norte" }]);
  });

  it.each(["carreras", "materias", "comisiones"])("muestra la tabla de %s y distingue docente sin asignar", async (section) => {
    nav.search += `&seccion=${section}`;
    mount();
    expect(await screen.findByRole("table", { name: `Tabla de ${section}` })).toBeVisible();
    expect(screen.queryByText(/Las entidades sin publicaciones todavía/)).not.toBeInTheDocument();
    expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ incluirResumenInstitucional: true, limite: 1 }));
    if (section === "comisiones") expect(screen.getByText("Sin docente asignado")).toBeVisible();
  });

  it.each([
    ["alumnos", "Acosta, Julieta", "matriculaAlumno", "30500"],
    ["docentes", "Balmaceda, Florencia", "legajoDocente", "109000"],
  ])("consulta resultados oficiales por identidad desde %s, sin utilizar métricas legacy", async (section, name, filter, id) => {
    nav.search += `&seccion=${section}`;
    const response = report();
    response.kpis.resultadosOficiales = official({ promedioNotaBase10: 0, porcentajeAprobacion: 0 });
    reportMock.mockResolvedValue(response);
    const ui = mount();
    const button = await screen.findByRole("button", { name: `Ver detalle de ${name}` });
    expect(reportMock).not.toHaveBeenCalled();
    await userEvent.click(button);
    ui.refresh();
    const detail = await screen.findByRole("region", { name });
    expect(await within(detail).findByText("0,00")).toBeVisible();
    expect(within(detail).getByText("0,0%")).toBeVisible();
    expect(within(detail).queryByText("9,00")).not.toBeInTheDocument();
    expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ [filter]: id, alcanceIntentos: "validos", fechaDesde: "2026-01-01T03:00:00.000Z", fechaHasta: "2026-11-20T02:59:59.999Z" }));
    await userEvent.click(within(detail).getByRole("button", { name: "Cerrar detalle" }));
    ui.refresh();
    expect(screen.queryByRole("region", { name })).not.toBeInTheDocument();
    expect(new URLSearchParams(nav.search).get("seccion")).toBe(section);
    expect(new URLSearchParams(nav.search).get("desde")).toBe("2026-01-01");
  });

  it("no presenta un error de consulta como una tabla vacía ni calificaciones cero", async () => {
    reportMock.mockRejectedValue(new ApiError("Sin conexión", 503, "NETWORK_UNAVAILABLE"));
    mount();
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("0 carreras")).not.toBeInTheDocument();
  });

  it("bloquea las consultas y el módulo para otros roles", () => {
    nav.role = "docente";
    mount();
    expect(screen.getByRole("alert")).toHaveTextContent("sólo para administradores");
    expect(reportMock).not.toHaveBeenCalled();
    expect(getAlumnos).not.toHaveBeenCalled();
    expect(getDocentes).not.toHaveBeenCalled();
  });

  it("mantiene los resultados académicos y reduce el listado al nombre y la acción al abrir el detalle", async () => {
    nav.search += "&seccion=comisiones&seleccion=101";
    mount();
    const detail = await screen.findByRole("region", { name: "Comisión 1NMS" });
    expect(await within(detail).findByText("6,50")).toBeVisible();
    expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ idMateriaDivision: "101", pagina: 1, limite: 10 }));
    expect(within(detail).getByText("Pendientes académicos")).toBeVisible();
    expect(within(detail).queryByText(/Pendientes operativos/)).not.toBeInTheDocument();
    const list = screen.getByRole("table", { name: "Tabla de comisiones" });
    expect(within(list).getAllByRole("columnheader")).toHaveLength(2);
    expect(within(list).queryByText("Confirmados")).not.toBeInTheDocument();
    expect(within(list).getByRole("button", { name: "Ver detalle de Comisión 1NMS" })).toBeVisible();
  });

  it("muestra la cantidad de materias en su propia columna y conserva los límites temporales", async () => {
    mount();
    const list = await screen.findByRole("table", { name: "Tabla de carreras" });
    expect(within(list).getByRole("columnheader", { name: "Materias" })).toBeVisible();
    expect(within(list).queryByText(/materias con publicaciones/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Resultados desde")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("Resultados hasta")).toHaveValue("2026-11-19");
    expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ fechaDesde: "2026-01-01T03:00:00.000Z", fechaHasta: "2026-11-20T02:59:59.999Z" }));
  });

  it.each(["alumnos", "docentes"])("filtra %s por relaciones actuales y conserva el alcance en los resultados del detalle", async (section) => {
    nav.search += `&seccion=${section}&carrera=1&materia=11&comision=101`;
    const ui = mount();
    const list = await screen.findByRole("table", { name: `Tabla de ${section}` });
    expect(screen.getByLabelText("Carrera")).toHaveValue("1");
    expect(screen.getByLabelText("Materia")).toHaveValue("11");
    expect(screen.getByLabelText("Comisión")).toHaveValue("101");
    expect(reportMock).not.toHaveBeenCalled();
    await userEvent.click(within(list).getByRole("button", { name: /Ver detalle de/ }));
    ui.refresh();
    await screen.findByRole("heading", { name: "Resultados oficiales" });
    expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ idCarrera: "1", idMateria: "11", idMateriaDivision: "101", ...(section === "alumnos" ? { matriculaAlumno: "30500" } : { legajoDocente: "109000" }) }));
  });
});
