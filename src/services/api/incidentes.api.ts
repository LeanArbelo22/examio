import { apiFetch } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type {
  FiltrosIncidentesPublicacion,
  ListadoIncidentesPublicacion,
  ResultadoRevisionIncidente,
  RevisarIncidentePayload,
} from "@/types";

export const obtenerIncidentesPublicacion = (
  idPublicacion: number,
  filtros: FiltrosIncidentesPublicacion,
) =>
  apiFetch<ListadoIncidentesPublicacion>(
    `/evaluaciones/publicaciones/${idPublicacion}/incidentes${buildQueryString(filtros)}`,
  );

export const revisarIncidente = (
  idIntento: number,
  eventoId: string,
  payload: RevisarIncidentePayload,
  idempotencyKey: string,
) =>
  apiFetch<ResultadoRevisionIncidente>(
    `/telemetria/intentos/${idIntento}/incidentes/${eventoId}/revision`,
    {
      method: "PUT",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    },
  );
