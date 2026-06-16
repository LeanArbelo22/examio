import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getActas,
  getActaPorId,
  cerrarActa,
  crearActaCierre,
  cargarDetalleActa,
} from "@/services/api/actas.api";
import type { CreateActaPayload, CargarDetalleActaPayload } from "@/types/index";

export const useGetActas = () => {
  return useQuery({
    queryKey: ["actas"],
    queryFn: getActas,
  });
};

export const useGetActaPorId = (id: number | null) => {
  return useQuery({
    queryKey: ["acta", id],
    queryFn: () => getActaPorId(id!),
    enabled: !!id,
  });
};

export const useCrearActaCierre = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateActaPayload) => crearActaCierre(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actas"] });
    },
  });
};

export const useCargarDetalleActa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CargarDetalleActaPayload) => cargarDetalleActa(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["acta", variables.IdActa] });
    },
  });
};

export const useCerrarActa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cerrarActa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actas"] });
    },
  });
};
