import { Docente, MateriaDocente, ComisionDocente, CreateDocentePayload, UpdateDocentePayload, AsignarComisionPayload } from "@/types/index";
import { apiFetch } from "@/lib/api";

export const getDocentes = (): Promise<Docente[]> => apiFetch<Docente[]>("/docentes");

export const getDocenteByLegajo = (legajo: number): Promise<Docente> =>
  apiFetch<Docente>(`/docentes/${legajo}`);

export const createDocente = (payload: CreateDocentePayload): Promise<void> =>
  apiFetch<void>("/docentes", { method: "POST", body: JSON.stringify(payload) });

export const updateDocente = (legajo: number, payload: UpdateDocentePayload): Promise<void> =>
  apiFetch<void>(`/docentes/${legajo}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteDocente = (legajo: number): Promise<void> =>
  apiFetch<void>(`/docentes/${legajo}`, { method: "DELETE" });

export const asignarDocenteAComision = (legajoDocente: number, payload: AsignarComisionPayload): Promise<void> =>
  apiFetch<void>(`/docentes/${legajoDocente}/asignar`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getDocentesPorEstado = (estado: boolean): Promise<Docente[]> =>
  apiFetch<Docente[]>(`/docentes/estado/${estado}`);

export const getMateriasPorDocente = (legajoDocente: number): Promise<MateriaDocente[]> =>
  apiFetch<MateriaDocente[]>(`/docentes/${legajoDocente}/materias`);

export const obtenerComisionesPorDocente = (legajo: number): Promise<ComisionDocente[]> =>
  apiFetch<ComisionDocente[]>(`/docentes/${legajo}/comisiones`);
