import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDivisiones,
  getDivisionPorId,
  createDivision,
  updateDivision,
  deleteDivision,
} from "@/services/api/divisiones.api";
import type { CreateDivisionPayload } from "@/types/index";
import { divisionKeys, isValidId } from "@/lib/query-keys";

export const useGetDivisiones = () => {
  const query = useQuery({
    queryKey: divisionKeys.all,
    queryFn: getDivisiones,
  });
  return { ...query, divisiones: query.data };
};

export const useGetDivisionPorId = (id: number | null) => {
  return useQuery({
    queryKey: divisionKeys.detail(id!),
    queryFn: () => getDivisionPorId(id!),
    enabled: isValidId(id),
  });
};

export const useCreateDivision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDivisionPayload) => createDivision(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: divisionKeys.all }),
  });
};

export const useUpdateDivision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => updateDivision(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: divisionKeys.all }),
  });
};

export const useDeleteDivision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDivision,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: divisionKeys.all }),
  });
};
