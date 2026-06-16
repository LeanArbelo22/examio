import { Division, CreateDivisionPayload } from "@/types/index";
import { apiFetch } from "@/lib/api";

export const getDivisiones = (): Promise<Division[]> => apiFetch<Division[]>("/divisiones");

export const getDivisionPorId = (id: number): Promise<Division> =>
  apiFetch<Division>(`/divisiones/${id}`);

export const createDivision = (payload: CreateDivisionPayload): Promise<void> =>
  apiFetch<void>("/divisiones", { method: "POST", body: JSON.stringify(payload) });

export const updateDivision = (id: number): Promise<void> =>
  apiFetch<void>(`/divisiones/${id}`, { method: "PUT" });

export const deleteDivision = (id: number): Promise<void> =>
  apiFetch<void>(`/divisiones/${id}`, { method: "DELETE" });
