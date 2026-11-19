import { getCarreras, getAlumnosInscriptos } from "@/services/api/carreras.api";
import { getMaterias, getAlumnosPorMateria } from "@/services/api/materias.api";
import { getComisiones, getAlumnosPorComision } from "@/services/api/comisiones.api";
import type { Comision } from "@/types";

export interface PeopleScope { career: string; matter: string; commission: string }
// Campos aditivos del contrato de comisiones; nunca se relacionan personas por nombre.
type AssignedCommission = Comision & { idMateria?: number; idDocente?: number | null };

export async function loadPeopleReportCatalogs() {
  const [careers, matters, commissions] = await Promise.all([getCarreras(), getMaterias(), getComisiones()]);
  return { careers, matters, commissions: commissions as AssignedCommission[] };
}
export type PeopleReportCatalogs = Awaited<ReturnType<typeof loadPeopleReportCatalogs>>;

export async function loadPeopleReportIds(section: "alumnos" | "docentes", scope: PeopleScope, catalog: PeopleReportCatalogs): Promise<number[]> {
  const matter = catalog.matters.find((x) => String(x.id) === scope.matter);
  const commission = catalog.commissions.find((x) => String(x.idMateriaDivision) === scope.commission);
  const commissionMatter = catalog.matters.find((x) => x.id === commission?.idMateria);
  if ((scope.career && !catalog.careers.some((x) => String(x.id) === scope.career)) || (scope.matter && (!matter || (scope.career && String(matter.idCarrera) !== scope.career))) || (scope.commission && (!commission || (scope.matter && String(commission.idMateria) !== scope.matter) || (scope.career && String(commissionMatter?.idCarrera) !== scope.career)))) throw new Error("Los filtros académicos no son compatibles. Revisá carrera, materia y comisión.");
  if (section === "alumnos") {
    const students = scope.commission ? await getAlumnosPorComision(Number(scope.commission)) : scope.matter ? await getAlumnosPorMateria(Number(scope.matter)) : await getAlumnosInscriptos(Number(scope.career));
    return [...new Set(students.map((x) => x.matricula))];
  }
  if (catalog.commissions.some((x) => x.idMateria == null || x.idDocente === undefined)) throw new Error("Todavía no están disponibles las asignaciones necesarias para filtrar docentes. Reintentá cuando se actualicen los datos.");
  const matterIds = new Set(catalog.matters.filter((x) => (!scope.career || String(x.idCarrera) === scope.career) && (!scope.matter || String(x.id) === scope.matter)).map((x) => x.id));
  return [...new Set(catalog.commissions.filter((x) => matterIds.has(x.idMateria!) && (!scope.commission || String(x.idMateriaDivision) === scope.commission)).flatMap((x) => x.idDocente == null ? [] : [x.idDocente]))];
}
