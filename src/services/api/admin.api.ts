import { AdminAnalyticsResponse } from "@/types/index";
import { apiFetch } from "@/lib/api";

function buildQueryString(params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== "" && v != null);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

export const obtenerAnaliticaAdmin = (filtros: Record<string, string>): Promise<AdminAnalyticsResponse> =>
  apiFetch<AdminAnalyticsResponse>(`/admin/dashboard/analitica${buildQueryString(filtros)}`);
