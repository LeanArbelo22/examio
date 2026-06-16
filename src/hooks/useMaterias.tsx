import {
  deleteMateria,
  getAlumnosPorMateria,
  getComisionesPorMateria,
  getMaterias,
  postMateria,
  updateMateria,
  asignarDivisionAMateria,
} from "@/services/api/materias.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMateriaPayload, UpdateMateriaPayload, AsignarDivisionPayload } from "@/types/index";

export const useGetMaterias = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["materias"],
    queryFn: getMaterias,
  });

  return {
    materias: data,
    isLoading,
    isError,
  };
};

export const useCreateMateria = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateMateriaPayload) => postMateria(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materias"] });
    },
    onError: (error: Error) => {
      console.error("Error al crear la materia:", error.message);
    },
  });

  return {
    createMateria: mutate,
    isCreating: isPending,
  };
};

export const useUpdateMateria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMateriaPayload }) => updateMateria(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materias"] });
    },
    onError: (error: Error) => {
      console.error("Error al actualizar la materia:", error.message);
    },
  });
};

export const useDeleteMateria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMateria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materias"] });
    },
    onError: (error: Error) => {
      console.error("Error al eliminar la materia:", error.message);
    },
  });
};

export const useGetComisionesPorMateria = (materiaId: number | null) => {
  return useQuery({
    queryKey: ["comisionesMateria", materiaId],
    queryFn: () => getComisionesPorMateria(materiaId!),
    enabled: !!materiaId,
  });
};

export const useGetAlumnosPorMateria = (materiaId: number | null) => {
  return useQuery({
    queryKey: ["alumnosMateria", materiaId],
    queryFn: () => getAlumnosPorMateria(materiaId!),
    enabled: !!materiaId,
  });
};

export const useAsignarDivisionAMateria = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idMateria, payload }: { idMateria: number; payload: AsignarDivisionPayload }) =>
      asignarDivisionAMateria(idMateria, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comisionesMateria"] });
      queryClient.invalidateQueries({ queryKey: ["comisiones"] });
    },
  });
};
