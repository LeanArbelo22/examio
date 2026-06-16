import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAlumnos,
  getAlumnoPorMatricula,
  postAlumno,
  updateAlumno,
  deleteAlumno,
  getMateriasAlumno,
} from "@/services/api/alumnos.api";
import type { CreateAlumnoPayload, UpdateAlumnoPayload } from "@/types/index";

export const useGetAlumnos = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["alumnos"],
    queryFn: getAlumnos,
  });
  return { alumnos: data, isLoading, isError };
};

export const useGetAlumno = (matricula: number | null) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["alumno", matricula],
    queryFn: () => getAlumnoPorMatricula(matricula!),
    enabled: !!matricula,
  });
  return { alumno: data, isLoading, isError };
};

export const useCreateAlumno = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlumnoPayload) => postAlumno(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alumnos"] }),
  });
};

export const useUpdateAlumno = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matricula, data }: { matricula: number; data: UpdateAlumnoPayload }) =>
      updateAlumno(matricula, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["alumnos"] });
      queryClient.invalidateQueries({ queryKey: ["alumno", variables.matricula] });
    },
  });
};

export const useDeleteAlumno = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAlumno,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alumnos"] }),
  });
};

export const useGetMateriasAlumno = (matricula: number | null) => {
  return useQuery({
    queryKey: ["alumnos", matricula, "materias"],
    queryFn: () => getMateriasAlumno(matricula!),
    enabled: !!matricula,
  });
};
