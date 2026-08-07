import type { EstadoAlumno } from "./shared";

export interface Alumno {
  matricula: number;
  nombre: string;
  apellido: string;
  cuil: string;
  correo: string;
  estado: EstadoAlumno;
}

export interface InscripcionMateria {
  idMateriaDivision: number;
  idAlumno: number;
}

export interface InscripcionAlumnoResult {
  matricula: number;
  idMateriaDivision: number;
}

export interface AlumnoMateria {
  materia: string;
  matricula: number;
  nombreAlumno: string;
  division: string;
}

export interface AlumnoInscripto {
  matricula: number;
  nombreAlumno: string;
  carrera: string;
}

export interface CreateAlumnoPayload {
  Matricula: number;
  Nombre: string;
  Apellido: string;
  Cuil?: string;
  Correo: string;
}

export type UpdateAlumnoPayload = Partial<CreateAlumnoPayload>;

export interface InscribirAlumnoPayload {
  IdMateriaDivision: number;
}
