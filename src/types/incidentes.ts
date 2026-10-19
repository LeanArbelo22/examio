import type { EstadoIntento } from "./shared";

export type EstadoRevisionIncidente = "pendiente" | "revisado" | "descartado";

export type SeveridadIncidente =
  | "sin_clasificar"
  | "informar"
  | "advertir"
  | "bloquear_interfaz"
  | "anular_intento";

export interface FiltrosIncidentesPublicacion {
  tipoIncidente?: string;
  severidad?: SeveridadIncidente | "";
  estadoRevision?: EstadoRevisionIncidente | "";
  soloIncidentesSinRevisar?: boolean;
  pagina?: number;
  limite?: number;
}

export interface ResumenIncidentesPublicacion {
  totalIncidentes: number;
  alumnosConIncidentes: number;
  intentosAnulados: number;
  incidentesSinRevisar: number;
}

export interface IncidentePublicacion {
  idIncidente: number;
  eventoId: string;
  idIntento: number;
  tipo: string;
  fechaInicioCliente: string;
  fechaFinCliente: string | null;
  duracionMilisegundos: number | null;
  estadoEvento: string;
  idAlumno: number;
  numeroIntento: number;
  estadoIntento: EstadoIntento;
  alumnoNombre: string;
  alumnoApellido: string;
  severidad: SeveridadIncidente;
  estadoRevision: EstadoRevisionIncidente;
  revision: number;
  comentario: string | null;
  actorId: number | null;
  actorRol: string | null;
  fechaRevision: string | null;
}

export interface ListadoIncidentesPublicacion {
  resumen: ResumenIncidentesPublicacion;
  incidentes: IncidentePublicacion[];
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
}

export interface RevisarIncidentePayload {
  Estado: EstadoRevisionIncidente;
  RevisionEsperada: number;
  Comentario?: string | null;
}

export interface ResultadoRevisionIncidente {
  id: number;
  idIncidente: number;
  idIntento: number;
  eventoId: string;
  revision: number;
  estado: EstadoRevisionIncidente;
  actorId: number;
  actorRol: string;
  comentario: string | null;
  fechaRevision: string;
  replay: boolean;
}
