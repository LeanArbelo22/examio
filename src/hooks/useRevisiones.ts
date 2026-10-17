import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { evaluacionKeys, intentoKeys, isValidId, revisionKeys } from "@/lib/query-keys";
import {
  actualizarPoliticaRevision,
  emitirSesionRevision,
  guardarPermisoRevision,
  obtenerAuditoriaRevision,
  obtenerContenidoRevision,
  obtenerDisponibilidadRevision,
  obtenerPermisosRevision,
  obtenerPoliticaRevision,
  revocarPermisoRevision,
} from "@/services/api/revisiones.api";
import type {
  ActualizarPoliticaRevisionPayload,
  FiltrosPermisosRevision,
  GuardarPermisoRevisionPayload,
} from "@/types";

export const usePoliticaRevision = (idPublicacion: number) =>
  useQuery({
    queryKey: revisionKeys.politica(idPublicacion),
    queryFn: () => obtenerPoliticaRevision(idPublicacion),
    enabled: isValidId(idPublicacion),
  });

export const useActualizarPoliticaRevision = (idPublicacion: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ActualizarPoliticaRevisionPayload) =>
      actualizarPoliticaRevision(idPublicacion, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revisionKeys.politica(idPublicacion) });
      queryClient.invalidateQueries({ queryKey: revisionKeys.auditoria(idPublicacion) });
      queryClient.invalidateQueries({ queryKey: intentoKeys.all });
    },
  });
};

export const usePermisosRevision = (
  idPublicacion: number,
  filtros: FiltrosPermisosRevision = {},
) =>
  useQuery({
    queryKey: revisionKeys.permisos(idPublicacion, filtros),
    queryFn: () => obtenerPermisosRevision(idPublicacion, filtros),
    enabled: isValidId(idPublicacion),
  });

export const useGuardarPermisoRevision = (idPublicacion: number, idIntento: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarPermisoRevisionPayload) =>
      guardarPermisoRevision(idIntento, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revisionKeys.all });
      queryClient.invalidateQueries({ queryKey: evaluacionKeys.alumnos(idPublicacion) });
      queryClient.invalidateQueries({ queryKey: intentoKeys.detail(idIntento) });
    },
  });
};

export const useRevocarPermisoRevision = (idPublicacion: number, idIntento: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => revocarPermisoRevision(idIntento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revisionKeys.all });
      queryClient.invalidateQueries({ queryKey: evaluacionKeys.alumnos(idPublicacion) });
      queryClient.invalidateQueries({ queryKey: intentoKeys.detail(idIntento) });
    },
  });
};

export const useAuditoriaRevision = (
  idPublicacion: number,
  filtros: { idIntento?: number; accion?: string; pagina?: number; limite?: number } = {},
  enabled = true,
) =>
  useQuery({
    queryKey: revisionKeys.auditoria(idPublicacion, filtros),
    queryFn: () => obtenerAuditoriaRevision(idPublicacion, filtros),
    enabled: enabled && isValidId(idPublicacion),
  });

export const useDisponibilidadRevision = (idIntento: number) =>
  useQuery({
    queryKey: revisionKeys.disponibilidad(idIntento),
    queryFn: () => obtenerDisponibilidadRevision(idIntento),
    enabled: isValidId(idIntento),
  });

export const useEmitirSesionRevision = (idIntento: number) =>
  useMutation({
    mutationFn: (idempotencyKey: string) => emitirSesionRevision(idIntento, idempotencyKey),
  });

export const useContenidoRevision = (idSesion: string | null) =>
  useQuery({
    queryKey: revisionKeys.contenido(idSesion ?? ""),
    queryFn: () => obtenerContenidoRevision(idSesion ?? ""),
    enabled: Boolean(idSesion),
    retry: false,
  });
