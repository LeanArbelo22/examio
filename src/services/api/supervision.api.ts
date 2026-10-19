import { apiFetch } from "@/lib/api";
import type {
  ActualizarPoliticaSupervisionPayload,
  DetalleSupervisionIntento,
  EstadoSupervisionIntento,
  OverrideSupervisionPayload,
  PoliticaSupervision,
  ResultadoOverrideSupervision,
} from "@/types";

export const obtenerPoliticaSupervision = (idPublicacion: number) =>
  apiFetch<PoliticaSupervision>(
    `/evaluaciones/publicaciones/${idPublicacion}/politica-supervision`,
  );

export const actualizarPoliticaSupervision = (
  idPublicacion: number,
  payload: ActualizarPoliticaSupervisionPayload,
) => apiFetch<PoliticaSupervision>(
  `/evaluaciones/publicaciones/${idPublicacion}/politica-supervision`,
  { method: "PUT", body: JSON.stringify(payload) },
);

export const obtenerEstadoSupervision = (idIntento: number) =>
  apiFetch<EstadoSupervisionIntento>(`/intentos/${idIntento}/supervision`);

export const obtenerDetalleSupervision = (idIntento: number) =>
  apiFetch<DetalleSupervisionIntento>(`/intentos/${idIntento}/supervision/detalle`);

export const aplicarOverrideSupervision = (
  idIntento: number,
  payload: OverrideSupervisionPayload,
) => apiFetch<ResultadoOverrideSupervision>(`/intentos/${idIntento}/supervision/override`, {
  method: "PUT",
  body: JSON.stringify(payload),
});
