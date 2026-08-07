import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getActas,
  getActaPorId,
  cerrarActa,
  crearActaCierre,
  cargarDetalleActa,
} from "@/services/api/actas.api";
import type { CreateActaPayload, CargarDetalleActaPayload } from "@/types/index";
import { actaKeys, isValidId } from "@/lib/query-keys";

export const useGetActas = () => {
  return useQuery({
    queryKey: actaKeys.all,
    queryFn: getActas,
  });
};

export const useGetActaPorId = (id: number | null) => {
  return useQuery({
    queryKey: actaKeys.detail(id!),
    queryFn: () => getActaPorId(id!),
    enabled: isValidId(id),
  });
};

export const useCrearActaCierre = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateActaPayload) => crearActaCierre(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actaKeys.all });
    },
  });
};

export const useCargarDetalleActa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CargarDetalleActaPayload) => cargarDetalleActa(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: actaKeys.detail(variables.IdActa) });
    },
  });
};

export const useCerrarActa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cerrarActa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actaKeys.all });
    },
  });
};
