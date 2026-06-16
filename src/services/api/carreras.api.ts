import { AlumnoInscripto, Carrera, MateriaPlan, CreateCarreraPayload, UpdateCarreraPayload } from "@/types/index";
import { apiFetch } from "@/lib/api";

export const getCarreras = (): Promise<Carrera[]> => apiFetch<Carrera[]>("/carreras");

export const postCarrera = (payload: CreateCarreraPayload): Promise<void> =>
  apiFetch<void>("/carreras", { method: "POST", body: JSON.stringify(payload) });

export const updateCarrera = (id: number, payload: UpdateCarreraPayload): Promise<void> =>
  apiFetch<void>(`/carreras/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteCarrera = (id: number): Promise<void> =>
  apiFetch<void>(`/carreras/${id}`, { method: "DELETE" });

export const getPlanDeEstudio = (carreraId: number): Promise<MateriaPlan[]> =>
  apiFetch<MateriaPlan[]>(`/carreras/${carreraId}/plan`);

export const getAlumnosInscriptos = (carreraId: number): Promise<AlumnoInscripto[]> =>
  apiFetch<AlumnoInscripto[]>(`/carreras/${carreraId}/alumnos`);
