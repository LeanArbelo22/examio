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
import { comisionKeys, isValidId, materiaKeys } from "@/lib/query-keys";
import { logClientError } from "@/lib/errors";

export const useGetMaterias = () => {
  const query = useQuery({
    queryKey: materiaKeys.all,
    queryFn: getMaterias,
  });

  return {
    ...query,
    materias: query.data,
  };
};

export const useCreateMateria = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateMateriaPayload) => postMateria(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materiaKeys.all });
    },
    onError: (error: Error) => {
      logClientError(error, { feature: "materias:create" });
    },
  });

  return {
    ...mutation,
    createMateria: mutation.mutate,
    isCreating: mutation.isPending,
  };
};

export const useUpdateMateria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMateriaPayload }) => updateMateria(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materiaKeys.all });
    },
    onError: (error: Error) => {
      logClientError(error, { feature: "materias:update" });
    },
  });
};

export const useDeleteMateria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMateria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materiaKeys.all });
    },
    onError: (error: Error) => {
      logClientError(error, { feature: "materias:delete" });
    },
  });
};

export const useGetComisionesPorMateria = (materiaId: number | null) => {
  return useQuery({
    queryKey: materiaKeys.comisiones(materiaId!),
    queryFn: () => getComisionesPorMateria(materiaId!),
    enabled: isValidId(materiaId),
  });
};

export const useGetAlumnosPorMateria = (materiaId: number | null) => {
  return useQuery({
    queryKey: materiaKeys.alumnos(materiaId!),
    queryFn: () => getAlumnosPorMateria(materiaId!),
    enabled: isValidId(materiaId),
  });
};

export const useAsignarDivisionAMateria = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idMateria, payload }: { idMateria: number; payload: AsignarDivisionPayload }) =>
      asignarDivisionAMateria(idMateria, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materiaKeys.all });
      queryClient.invalidateQueries({ queryKey: comisionKeys.all });
    },
  });
};
