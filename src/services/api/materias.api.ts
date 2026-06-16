import { AlumnoMateria, ComisionMateria, Materia, CreateMateriaPayload, UpdateMateriaPayload, AsignarDivisionPayload } from "@/types/index";
import { apiFetch } from "@/lib/api";

export const getMaterias = (): Promise<Materia[]> => apiFetch<Materia[]>("/materias");

export const postMateria = (payload: CreateMateriaPayload): Promise<void> =>
  apiFetch<void>("/materias", { method: "POST", body: JSON.stringify(payload) });

export const updateMateria = (id: number, payload: UpdateMateriaPayload): Promise<void> =>
  apiFetch<void>(`/materias/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteMateria = (id: number): Promise<void> =>
  apiFetch<void>(`/materias/${id}`, { method: "DELETE" });

export const getComisionesPorMateria = (materiaId: number): Promise<ComisionMateria[]> =>
  apiFetch<ComisionMateria[]>(`/materias/${materiaId}/comisiones`);

export const getAlumnosPorMateria = (materiaId: number): Promise<AlumnoMateria[]> =>
  apiFetch<AlumnoMateria[]>(`/materias/${materiaId}/alumnos`);

export const asignarDivisionAMateria = (idMateria: number, payload: AsignarDivisionPayload): Promise<void> =>
  apiFetch<void>(`/materias/${idMateria}/division`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
