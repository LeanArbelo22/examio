import { describe, expect, it, vi } from "vitest";
import { getAlumnosPorComision } from "@/services/api/comisiones.api";
import { loadPeopleReportIds, type PeopleReportCatalogs } from "./people-report-scope";

vi.mock("@/services/api/comisiones.api", () => ({ getComisiones: vi.fn(), getAlumnosPorComision: vi.fn() }));
const catalog: PeopleReportCatalogs = {
  careers: [1, 2].map((id) => ({ id, nombre: `Carrera ${id}`, descripcion: "", duracionSemestres: 6 })),
  matters: [1, 2].map((id) => ({ id, nombre: "Materia homónima", idCarrera: id, estado: true, semestre: 1 })),
  commissions: [
    { idMateriaDivision: 10, idMateria: 1, idDocente: 100, materia: "Materia homónima", division: "A", docenteAsignado: "Homónimo" },
    { idMateriaDivision: 11, idMateria: 1, idDocente: 100, materia: "Materia homónima", division: "B", docenteAsignado: "Homónimo" },
    { idMateriaDivision: 20, idMateria: 2, idDocente: 200, materia: "Materia homónima", division: "A", docenteAsignado: "Homónimo" },
  ],
};
describe("alcance académico de personas", () => {
  it("relaciona docentes por IDs sin mezclar homónimos ni duplicar asignaciones", async () => {
    expect(await loadPeopleReportIds("docentes", { career: "1", matter: "", commission: "" }, catalog)).toEqual([100]);
  });
  it("rechaza jerarquías incompatibles antes de consultar inscriptos", async () => {
    await expect(loadPeopleReportIds("alumnos", { career: "1", matter: "", commission: "20" }, catalog)).rejects.toThrow("no son compatibles");
    expect(getAlumnosPorComision).not.toHaveBeenCalled();
  });
  it("no convierte un contrato docente incompleto en una lista vacía", async () => {
    await expect(loadPeopleReportIds("docentes", { career: "1", matter: "", commission: "" }, { ...catalog, commissions: catalog.commissions.map((x) => ({ ...x, idDocente: undefined })) })).rejects.toThrow("asignaciones necesarias");
  });
});
