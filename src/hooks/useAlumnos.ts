import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAlumnos,
  getAlumnoPorMatricula,
  postAlumno,
  updateAlumno,
  deleteAlumno,
  getMateriasAlumno,
  inscribirAlumno,
} from "@/services/api/alumnos.api";
import type {
  CreateAlumnoPayload,
  InscribirAlumnoPayload,
  UpdateAlumnoPayload,
} from "@/types/index";
import { alumnoKeys, comisionKeys, isValidId } from "@/lib/query-keys";

export const useGetAlumnos = () => {
  const query = useQuery({
    queryKey: alumnoKeys.all,
    queryFn: getAlumnos,
  });
  return { ...query, alumnos: query.data };
};

export const useGetAlumno = (matricula: number | null) => {
  const query = useQuery({
    queryKey: alumnoKeys.detail(matricula!),
    queryFn: () => getAlumnoPorMatricula(matricula!),
    enabled: isValidId(matricula),
  });
  return { ...query, alumno: query.data };
};

export const useCreateAlumno = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlumnoPayload) => postAlumno(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alumnoKeys.all }),
  });
};

export const useUpdateAlumno = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matricula, data }: { matricula: number; data: UpdateAlumnoPayload }) =>
      updateAlumno(matricula, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: alumnoKeys.all });
      queryClient.invalidateQueries({ queryKey: alumnoKeys.detail(variables.matricula) });
    },
  });
};

export const useDeleteAlumno = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAlumno,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alumnoKeys.all }),
  });
};

export const useGetMateriasAlumno = (matricula: number | null) => {
  return useQuery({
    queryKey: alumnoKeys.materias(matricula!),
    queryFn: () => getMateriasAlumno(matricula!),
    enabled: isValidId(matricula),
  });
};

export const useInscribirAlumno = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matricula,
      payload,
    }: {
      matricula: number;
      payload: InscribirAlumnoPayload;
    }) => inscribirAlumno(matricula, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: alumnoKeys.materias(variables.matricula),
      });
      queryClient.invalidateQueries({ queryKey: alumnoKeys.all });
      queryClient.invalidateQueries({
        queryKey: comisionKeys.alumnos(variables.payload.IdMateriaDivision),
      });
    },
  });
};
