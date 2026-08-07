export interface Docente {
  legajo: number;
  nombre: string;
  apellido: string;
  cuil: string;
  correo: string;
  estado: boolean;
}

export interface Carrera {
  id: number;
  nombre: string;
  descripcion: string;
  duracionSemestres: number;
  estado?: boolean;
}

export interface Materia {
  id: number;
  nombre: string;
  semestre: number;
  idCarrera: number;
  estado: boolean;
}

export interface Division {
  id: number;
  descripcion: string;
}

export interface MateriaDivision {
  id: number;
  idMateria: number;
  idDivision: number;
  idDocente?: number;
}

export interface Comision {
  idMateriaDivision: number;
  materia: string;
  division: string;
  docenteAsignado: string;
}

export interface ComisionMateria {
  idComision: number;
  division: string;
  docenteAsignado: string;
}

export interface MateriaPlan {
  nombreMateria: string;
  nroSemestre: number;
}

export interface MateriaDocente {
  idComision: number;
  nombreMateria: string;
  carrera: string;
  division: string;
}

export interface ComisionDocente {
  idComision: number;
  nombreMateria: string;
  division: string;
  docente: string;
  carrera: string;
}

export interface CreateDocentePayload {
  Legajo: number;
  Nombre: string;
  Apellido: string;
  Cuil?: string;
  Correo: string;
}

export type UpdateDocentePayload = Partial<CreateDocentePayload>;

export interface CreateCarreraPayload {
  Nombre: string;
  Descripcion?: string;
  DuracionSemestres?: number;
}

export type UpdateCarreraPayload = Partial<CreateCarreraPayload>;

export interface CreateMateriaPayload {
  Nombre: string;
  Semestre?: number;
  IdCarrera: number;
}

export type UpdateMateriaPayload = Partial<CreateMateriaPayload>;

export interface CreateDivisionPayload {
  Descripcion: string;
}

export interface AsignarComisionPayload {
  IdMateriaDivision: number;
}

export interface AsignarDivisionPayload {
  Id: number;
}
