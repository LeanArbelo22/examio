import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  deleteCarrera,
  getAlumnosInscriptos,
  getCarreras,
  getPlanDeEstudio,
  postCarrera,
  updateCarrera,
} from "@/services/api/carreras.api";
import type { CreateCarreraPayload, UpdateCarreraPayload } from "@/types/index";
import { carreraKeys, isValidId } from "@/lib/query-keys";

export const useGetCarreras = () => {
  const query = useQuery({
    queryKey: carreraKeys.all,
    queryFn: getCarreras,
  });
  return { ...query, carreras: query.data };
};

export const usePostCarrera = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: CreateCarreraPayload) => postCarrera(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: carreraKeys.all }),
  });
  return {
    ...mutation,
    createCarrera: mutation.mutate,
    isCreating: mutation.isPending,
  };
};

export const useUpdateCarrera = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCarreraPayload }) => updateCarrera(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: carreraKeys.all }),
  });
};

export const useDeleteCarrera = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCarrera,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: carreraKeys.all }),
  });
};

export const useGetPlanDeEstudio = (carreraId: number | null) => {
  const query = useQuery({
    queryKey: carreraKeys.plan(carreraId!),
    queryFn: () => getPlanDeEstudio(carreraId!),
    enabled: isValidId(carreraId),
  });
  return {
    ...query,
    plan: query.data,
    isLoadingPlan: query.isLoading,
    isErrorPlan: query.isError,
  };
};

export const useGetAlumnosInscriptos = (carreraId: number | null) => {
  const query = useQuery({
    queryKey: carreraKeys.alumnos(carreraId!),
    queryFn: () => getAlumnosInscriptos(carreraId!),
    enabled: isValidId(carreraId),
  });
  return {
    ...query,
    alumnos: query.data,
    isLoadingAlumnos: query.isLoading,
    isErrorAlumnos: query.isError,
  };
};
