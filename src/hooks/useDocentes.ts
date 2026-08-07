import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDocentes,
  createDocente,
  updateDocente,
  deleteDocente,
  asignarDocenteAComision,
  getDocentesPorEstado,
  getMateriasPorDocente,
  obtenerComisionesPorDocente,
} from "@/services/api/docentes.api";
import type { CreateDocentePayload, UpdateDocentePayload } from "@/types/index";
import { comisionKeys, docenteKeys, isValidId } from "@/lib/query-keys";

export const useGetDocentes = () => {
  const query = useQuery({
    queryKey: docenteKeys.all,
    queryFn: getDocentes,
  });

  return { ...query, docentes: query.data };
};

export const useCreateDocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDocentePayload) => createDocente(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: docenteKeys.all }),
  });
};

export const useUpdateDocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ legajo, data }: { legajo: number; data: UpdateDocentePayload }) =>
      updateDocente(legajo, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: docenteKeys.all }),
  });
};

export const useDeleteDocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocente,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: docenteKeys.all }),
  });
};

export const useAssignDocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ Legajo, IdMateriaDivision }: { Legajo: number; IdMateriaDivision: number }) =>
      asignarDocenteAComision(Legajo, { IdMateriaDivision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comisionKeys.all });
    },
  });
};

export const useGetDocentesPorEstado = (estado: boolean) => {
  return useQuery({
    queryKey: docenteKeys.estado(estado),
    queryFn: () => getDocentesPorEstado(estado),
  });
};

export const useGetMateriasPorDocente = (legajo: number | null) => {
  return useQuery({
    queryKey: docenteKeys.materias(legajo!),
    queryFn: () => getMateriasPorDocente(legajo!),
    enabled: isValidId(legajo),
  });
};

export const useGetComisionesDocente = (legajo: number) => {
  return useQuery({
    queryKey: docenteKeys.comisiones(legajo),
    queryFn: () => obtenerComisionesPorDocente(legajo),
    enabled: isValidId(legajo),
  });
};
