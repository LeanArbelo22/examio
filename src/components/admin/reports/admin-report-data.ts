import type { Alumno, Docente, ResumenInstitucional, ResumenInstitucionalBase, ResultadosOficiales } from "@/types";

export const reportSections = [
  { id: "carreras", label: "Carreras" },
  { id: "materias", label: "Materias" },
  { id: "comisiones", label: "Comisiones" },
  { id: "alumnos", label: "Alumnos" },
  { id: "docentes", label: "Docentes" },
] as const;
export type AdminReportSection = (typeof reportSections)[number]["id"];
export interface AdminReportRow {
  key: string;
  name: string;
  code: number;
  context: string;
  careerId?: number;
  matterId?: number;
  commissionId?: number;
  teacherId?: number | null;
  teacher?: string | null;
  email?: string;
  subjectCount?: number;
  state?: "activo" | "inactivo" | "suspendido";
  summary?: ResumenInstitucionalBase;
  officialResults?: ResultadosOficiales;
}

export function institutionalRows(data: ResumenInstitucional | undefined, section: AdminReportSection): AdminReportRow[] {
  const careers = data?.carreras ?? [];
  if (section === "carreras") return careers.map((c) => ({ key: String(c.idCarrera), code: c.idCarrera, name: c.carrera, context: "", subjectCount: c.materias.length, careerId: c.idCarrera, summary: c }));
  if (section === "materias") return careers.flatMap((c) => c.materias.map((m) => ({ key: String(m.idMateria), code: m.idMateria, name: m.materia, context: c.carrera, careerId: c.idCarrera, matterId: m.idMateria, summary: m })));
  if (section === "comisiones") return careers.flatMap((c) => c.materias.flatMap((m) => m.comisiones.map((x) => ({ key: String(x.idMateriaDivision), code: x.idMateriaDivision, name: `Comisión ${x.division}`, context: `${m.materia} · ${c.carrera}`, careerId: c.idCarrera, matterId: m.idMateria, commissionId: x.idMateriaDivision, teacherId: x.idDocente, teacher: x.docente, summary: x }))));
  return [];
}

export function personRows(people: Alumno[] | Docente[], section: "alumnos" | "docentes"): AdminReportRow[] {
  // El listado tiene una fila por identidad, no por inscripción o asignación.
  return [...new Map(people.map((person) => {
    const code = "matricula" in person ? person.matricula : person.legajo;
    const active = person.estado === "activo" || person.estado === true || Number(person.estado) === 1;
    return [code, { key: String(code), code, name: `${person.apellido}, ${person.nombre}`, context: `${section === "alumnos" ? "Matrícula" : "Legajo"} ${code}`, email: person.correo, state: person.estado === "suspendido" ? "suspendido" as const : active ? "activo" as const : "inactivo" as const }];
  })).values()];
}

export function reportPeriod(from: string, to: string) {
  const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(from) || !valid(to) || from > to) return null;
  return { fechaDesde: `${from}T03:00:00.000Z`, fechaHasta: new Date(Date.parse(`${to}T03:00:00.000Z`) + 86_400_000 - 1).toISOString() };
}

export function formatReportNumber(value: number | null | undefined, decimals = 0) {
  return value == null ? "Sin resultado" : value.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export const reportInputClass = "h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
export const reportActionClass = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
