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

export const useGetCarreras = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["carreras"],
    queryFn: getCarreras,
  });
  return { carreras: data, isLoading, isError };
};

export const usePostCarrera = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateCarreraPayload) => postCarrera(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["carreras"] }),
  });
  return { createCarrera: mutate, isCreating: isPending };
};

export const useUpdateCarrera = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCarreraPayload }) => updateCarrera(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["carreras"] }),
  });
};

export const useDeleteCarrera = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCarrera,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["carreras"] }),
  });
};

export const useGetPlanDeEstudio = (carreraId: number | null) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["planDeEstudio", carreraId],
    queryFn: () => getPlanDeEstudio(carreraId!),
    enabled: !!carreraId,
  });
  return { plan: data, isLoadingPlan: isLoading, isErrorPlan: isError };
};

export const useGetAlumnosInscriptos = (carreraId: number | null) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["alumnosInscriptos", carreraId],
    queryFn: () => getAlumnosInscriptos(carreraId!),
    enabled: !!carreraId,
  });
  return {
    alumnos: data,
    isLoadingAlumnos: isLoading,
    isErrorAlumnos: isError,
  };
};
