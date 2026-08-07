import { useQuery } from "@tanstack/react-query";
import { obtenerAnaliticaAdmin } from "@/services/api/admin.api";
import { adminKeys } from "@/lib/query-keys";

export const useGetAdminAnalitica = (filtros: Record<string, string>) => {
  return useQuery({
    queryKey: adminKeys.analitica(filtros),
    queryFn: () => obtenerAnaliticaAdmin(filtros),
  });
};
