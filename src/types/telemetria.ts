export type EstadoIncidenteFoco = "iniciado" | "completado";

export interface IncidenteFocoPayload {
  Tipo: "focus_lost";
  FechaInicioCliente?: string;
  FechaFinCliente?: string;
  DuracionMilisegundos?: number;
}

export interface IncidenteFoco {
  id: number;
  eventoId: string;
  idIntento: number;
  tipo: "focus_lost";
  fechaInicioCliente: string;
  fechaFinCliente: string | null;
  duracionMilisegundos: number | null;
  fechaRecepcionInicio: string;
  fechaRecepcionFin: string | null;
  estado: EstadoIncidenteFoco;
}

export interface ResumenIncidentesFoco {
  cantidadPerdidasFoco: number;
  segundosTotalesFuera: number;
  promedioSegundosFuera: number;
  maximoSegundosFuera: number;
}
