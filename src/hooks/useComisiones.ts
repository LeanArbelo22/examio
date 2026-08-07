import { useQuery } from "@tanstack/react-query";
import { getComisiones, getAlumnosPorComision } from "@/services/api/comisiones.api";
import { comisionKeys, isValidId } from "@/lib/query-keys";

export const useGetComisiones = () => {
  const query = useQuery({
    queryKey: comisionKeys.all,
    queryFn: getComisiones,
  });
  return { ...query, comisiones: query.data };
};

export const useGetAlumnosPorComision = (comisionId: number | null) => {
  const query = useQuery({
    queryKey: comisionKeys.alumnos(comisionId!),
    queryFn: () => getAlumnosPorComision(comisionId!),
    enabled: isValidId(comisionId),
  });
  return {
    ...query,
    alumnos: query.data,
    isLoadingAlumnos: query.isLoading,
    isErrorAlumnos: query.isError,
  };
};
