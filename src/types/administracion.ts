import type {
  CondicionFinal,
  EstadoActa,
  UserRole,
} from "./shared";

export interface Usuario {
  id: number;
  email: string;
  rol: UserRole;
  idDocente?: number;
  idAlumno?: number;
  activo: boolean;
}

export interface ActaMateria {
  id: number;
  idMateriaDivision: number;
  fechaCierre?: string;
  libro: string;
  folio: string;
  estado: EstadoActa;
}

export interface DetalleActa {
  idActa: number;
  idAlumno: number;
  notaCursada: number;
  notaFinalExamen?: number;
  condicionFinal: CondicionFinal;
}

export interface CreateUsuarioPayload {
  Email: string;
  PasswordHash: string;
  Rol: UserRole;
  IdDocente?: number;
  IdAlumno?: number;
  Activo: boolean;
}

export type UpdateUsuarioPayload = Partial<CreateUsuarioPayload>;

export interface CreateActaPayload {
  IdMateriaDivision: number;
  Libro: string;
  Folio: string;
}

export interface CargarDetalleActaPayload {
  IdActa: number;
  IdAlumno: number;
  NotaCursada: number;
  NotaFinalExamen?: number | null;
  CondicionFinal: CondicionFinal;
}

export interface AdminAnalyticsKPIs {
  totalIntentos: number;
  promedioGeneral: number;
  tasaAprobacion: number;
  totalAlertasFraude: number;
}

export interface AdminIntentoItem {
  idIntento: number;
  matricula: number;
  nombreAlumno: string;
  tituloEvaluacion: string;
  comisionMateria: string;
  fechaInicio: string;
  estado: string;
  notaFinal: number;
  totalAlertas: number;
}

export interface AdminEvaluacionItem {
  legajoDocente: number;
  nombreDocente: string;
  tituloEvaluacion: string;
  nombreMateria: string;
  nombreDivision: string;
  fechaPublicacion: string;
  estado: string;
  alumnosInscriptos: number;
}

export interface AdminAnalyticsResponse {
  kpis: AdminAnalyticsKPIs;
  intentos: AdminIntentoItem[];
  evaluaciones: AdminEvaluacionItem[];
}
