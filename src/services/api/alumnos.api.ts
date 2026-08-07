import {
  Alumno,
  AlumnoMateria,
  CreateAlumnoPayload,
  InscripcionAlumnoResult,
  InscribirAlumnoPayload,
  UpdateAlumnoPayload,
} from "@/types/index";
import { apiFetch } from "@/lib/api";

export const getAlumnos = (): Promise<Alumno[]> => apiFetch<Alumno[]>("/alumnos");

export const getAlumnoPorMatricula = (matricula: number): Promise<Alumno> =>
  apiFetch<Alumno>(`/alumnos/${matricula}`);

export const postAlumno = (payload: CreateAlumnoPayload): Promise<void> =>
  apiFetch<void>("/alumnos", { method: "POST", body: JSON.stringify(payload) });

export const updateAlumno = (matricula: number, payload: UpdateAlumnoPayload): Promise<void> =>
  apiFetch<void>(`/alumnos/${matricula}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteAlumno = (matricula: number): Promise<void> =>
  apiFetch<void>(`/alumnos/${matricula}`, { method: "DELETE" });

export const getMateriasAlumno = (matricula: number): Promise<AlumnoMateria[]> =>
  apiFetch<AlumnoMateria[]>(`/alumnos/${matricula}/materias`);

export const inscribirAlumno = (
  matricula: number,
  payload: InscribirAlumnoPayload,
): Promise<InscripcionAlumnoResult> =>
  apiFetch<InscripcionAlumnoResult>(`/alumnos/${matricula}/inscripciones`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
