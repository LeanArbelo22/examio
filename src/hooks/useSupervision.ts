import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isValidId, supervisionKeys } from "@/lib/query-keys";
import {
  actualizarPoliticaSupervision,
  aplicarOverrideSupervision,
  obtenerDetalleSupervision,
  obtenerEstadoSupervision,
  obtenerPoliticaSupervision,
} from "@/services/api/supervision.api";
import type { ActualizarPoliticaSupervisionPayload, OverrideSupervisionPayload } from "@/types";

export const usePoliticaSupervision = (idPublicacion: number) => useQuery({
  queryKey: supervisionKeys.politica(idPublicacion),
  queryFn: () => obtenerPoliticaSupervision(idPublicacion),
  enabled: isValidId(idPublicacion),
});

export const useActualizarPoliticaSupervision = (idPublicacion: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ActualizarPoliticaSupervisionPayload) =>
      actualizarPoliticaSupervision(idPublicacion, payload),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: supervisionKeys.politica(idPublicacion),
    }),
  });
};

export const useEstadoSupervision = (idIntento: number) => useQuery({
  queryKey: supervisionKeys.estado(idIntento),
  queryFn: () => obtenerEstadoSupervision(idIntento),
  enabled: isValidId(idIntento),
  refetchOnWindowFocus: true,
  refetchInterval: (query) => query.state.data?.intentoAnulado ? false : 2_000,
});

export const useDetalleSupervision = (idIntento: number) => useQuery({
  queryKey: supervisionKeys.detalle(idIntento),
  queryFn: () => obtenerDetalleSupervision(idIntento),
  enabled: isValidId(idIntento),
});

export const useOverrideSupervision = (idIntento: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OverrideSupervisionPayload) =>
      aplicarOverrideSupervision(idIntento, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supervisionKeys.estado(idIntento) });
      queryClient.invalidateQueries({ queryKey: supervisionKeys.detalle(idIntento) });
    },
  });
};
