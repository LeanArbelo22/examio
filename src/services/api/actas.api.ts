import { ActaMateria, DetalleActa, CreateActaPayload, CargarDetalleActaPayload } from "@/types/index";
import { apiFetch } from "@/lib/api";

export const getActas = (): Promise<ActaMateria[]> => apiFetch<ActaMateria[]>("/actas");

export const getActaPorId = (id: number): Promise<ActaMateria> =>
  apiFetch<ActaMateria>(`/actas/${id}`);

export const cerrarActa = (id: number): Promise<void> =>
  apiFetch<void>(`/actas/${id}/cerrar`, { method: "PUT" });

export const crearActaCierre = (payload: CreateActaPayload): Promise<{ idActa: number }> =>
  apiFetch<{ idActa: number }>("/actas/crear-cierre", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const cargarDetalleActa = (payload: CargarDetalleActaPayload): Promise<void> =>
  apiFetch<void>("/actas/cargar-detalle", {
    method: "POST",
    body: JSON.stringify(payload),
  });
