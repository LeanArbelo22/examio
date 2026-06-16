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
import type { CreateDocentePayload, UpdateDocentePayload, AsignarComisionPayload } from "@/types/index";

export const useGetDocentes = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["docentes"],
    queryFn: getDocentes,
  });

  return { docentes: data, isLoading, isError };
};

export const useCreateDocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDocentePayload) => createDocente(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docentes"] }),
  });
};

export const useUpdateDocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ legajo, data }: { legajo: number; data: UpdateDocentePayload }) =>
      updateDocente(legajo, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docentes"] }),
  });
};

export const useDeleteDocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocente,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docentes"] }),
  });
};

export const useAssignDocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ Legajo, IdMateriaDivision }: { Legajo: number; IdMateriaDivision: number }) =>
      asignarDocenteAComision(Legajo, { IdMateriaDivision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comisiones"] });
    },
  });
};

export const useGetDocentesPorEstado = (estado: boolean) => {
  return useQuery({
    queryKey: ["docentes", "estado", estado],
    queryFn: () => getDocentesPorEstado(estado),
  });
};

export const useGetMateriasPorDocente = (legajo: number | null) => {
  return useQuery({
    queryKey: ["docentes", legajo, "materias"],
    queryFn: () => getMateriasPorDocente(legajo!),
    enabled: !!legajo,
  });
};

export const useGetComisionesDocente = (legajo: number) => {
  return useQuery({
    queryKey: ["docente", legajo, "comisiones"],
    queryFn: () => obtenerComisionesPorDocente(legajo),
    enabled: !!legajo,
  });
};
