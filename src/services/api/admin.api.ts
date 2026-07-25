import { AdminAnalyticsResponse } from "@/types/index";
import { apiFetch } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";

export const obtenerAnaliticaAdmin = (filtros: Record<string, string>): Promise<AdminAnalyticsResponse> =>
  apiFetch<AdminAnalyticsResponse>(`/admin/dashboard/analitica${buildQueryString(filtros)}`);
