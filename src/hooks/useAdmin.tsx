import { useQuery } from "@tanstack/react-query";
import { obtenerAnaliticaAdmin } from "@/services/api/admin.api";

export const useGetAdminAnalitica = (filtros: Record<string, string>) => {
  return useQuery({
    queryKey: ["admin", "analitica", filtros],
    queryFn: () => obtenerAnaliticaAdmin(filtros),
  });
};
