import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { incidenteKeys, isValidId, reporteKeys } from "@/lib/query-keys";
import {
  obtenerIncidentesPublicacion,
  revisarIncidente,
} from "@/services/api/incidentes.api";
import type {
  FiltrosIncidentesPublicacion,
  RevisarIncidentePayload,
} from "@/types";

export const useIncidentesPublicacion = (
  idPublicacion: number,
  filtros: FiltrosIncidentesPublicacion,
) =>
  useQuery({
    queryKey: incidenteKeys.publicacion(idPublicacion, filtros),
    queryFn: () => obtenerIncidentesPublicacion(idPublicacion, filtros),
    enabled: isValidId(idPublicacion),
    placeholderData: (previousData) => previousData,
  });

interface RevisarIncidenteVariables {
  idIntento: number;
  eventoId: string;
  payload: RevisarIncidentePayload;
  idempotencyKey: string;
}

export const useRevisarIncidente = (idPublicacion: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idIntento,
      eventoId,
      payload,
      idempotencyKey,
    }: RevisarIncidenteVariables) =>
      revisarIncidente(idIntento, eventoId, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: incidenteKeys.publicacionRoot(idPublicacion),
      });
      queryClient.invalidateQueries({
        queryKey: reporteKeys.rendimientoEvaluaciones,
      });
    },
  });
};
