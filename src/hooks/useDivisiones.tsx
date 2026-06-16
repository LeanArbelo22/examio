import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDivisiones,
  getDivisionPorId,
  createDivision,
  updateDivision,
  deleteDivision,
} from "@/services/api/divisiones.api";
import type { CreateDivisionPayload } from "@/types/index";

export const useGetDivisiones = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["divisiones"],
    queryFn: getDivisiones,
  });
  return { divisiones: data, isLoading, isError };
};

export const useGetDivisionPorId = (id: number | null) => {
  return useQuery({
    queryKey: ["division", id],
    queryFn: () => getDivisionPorId(id!),
    enabled: !!id,
  });
};

export const useCreateDivision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDivisionPayload) => createDivision(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisiones"] }),
  });
};

export const useUpdateDivision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => updateDivision(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisiones"] }),
  });
};

export const useDeleteDivision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDivision,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisiones"] }),
  });
};
