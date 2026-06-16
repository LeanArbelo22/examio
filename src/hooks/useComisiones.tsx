import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getComisiones, getAlumnosPorComision } from "@/services/api/comisiones.api";

export const useGetComisiones = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["comisiones"],
    queryFn: getComisiones,
  });
  return { comisiones: data, isLoading, isError };
};

export const useGetAlumnosPorComision = (comisionId: number | null) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["alumnosComision", comisionId],
    queryFn: () => getAlumnosPorComision(comisionId!),
    enabled: !!comisionId,
  });
  return { alumnos: data, isLoadingAlumnos: isLoading, isErrorAlumnos: isError };
};
