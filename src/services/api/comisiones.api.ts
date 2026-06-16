import { Comision, AlumnoMateria } from "@/types/index";
import { apiFetch } from "@/lib/api";

export const getComisiones = (): Promise<Comision[]> => apiFetch<Comision[]>("/comisiones");

export const getAlumnosPorComision = (comisionId: number): Promise<AlumnoMateria[]> =>
  apiFetch<AlumnoMateria[]>(`/comisiones/${comisionId}/alumnos`);
