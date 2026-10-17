import { apiFetch } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type {
  ActualizarPoliticaRevisionPayload,
  AuditoriaRevisionResultado,
  ContenidoSesionRevision,
  DisponibilidadRevision,
  FiltrosPermisosRevision,
  GuardarPermisoRevisionPayload,
  PermisoRevision,
  PoliticaRevision,
  SesionRevision,
} from "@/types";

export const obtenerPoliticaRevision = (idPublicacion: number) =>
  apiFetch<PoliticaRevision>(
    `/evaluaciones/publicaciones/${idPublicacion}/politica-revision`,
  );

export const actualizarPoliticaRevision = (
  idPublicacion: number,
  payload: ActualizarPoliticaRevisionPayload,
) =>
  apiFetch<PoliticaRevision>(
    `/evaluaciones/publicaciones/${idPublicacion}/politica-revision`,
    { method: "PUT", body: JSON.stringify(payload) },
  );

export const obtenerPermisosRevision = (
  idPublicacion: number,
  filtros: FiltrosPermisosRevision = {},
) =>
  apiFetch<PermisoRevision[]>(
    `/evaluaciones/publicaciones/${idPublicacion}/permisos-revision${buildQueryString(filtros)}`,
  );

export const guardarPermisoRevision = (
  idIntento: number,
  payload: GuardarPermisoRevisionPayload,
) =>
  apiFetch<PermisoRevision>(`/intentos/${idIntento}/permiso-revision`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const revocarPermisoRevision = (idIntento: number) =>
  apiFetch<PermisoRevision>(`/intentos/${idIntento}/permiso-revision`, {
    method: "DELETE",
  });

export const obtenerAuditoriaRevision = (
  idPublicacion: number,
  filtros: { idIntento?: number; accion?: string; pagina?: number; limite?: number } = {},
) =>
  apiFetch<AuditoriaRevisionResultado>(
    `/evaluaciones/publicaciones/${idPublicacion}/auditoria-revision${buildQueryString(filtros)}`,
  );

export const obtenerDisponibilidadRevision = (idIntento: number) =>
  apiFetch<DisponibilidadRevision>(`/intentos/${idIntento}/revision-disponible`);

export const emitirSesionRevision = (idIntento: number, idempotencyKey: string) =>
  apiFetch<SesionRevision>(`/revisiones/intentos/${idIntento}/sesiones`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });

export const obtenerContenidoRevision = (idSesion: string) =>
  apiFetch<ContenidoSesionRevision>(`/revisiones/sesiones/${idSesion}/contenido`);
