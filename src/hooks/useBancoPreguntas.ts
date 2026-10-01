import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bancoPreguntasKeys, evaluacionKeys, isValidId } from "@/lib/query-keys";
import {
  actualizarEtiquetaBanco,
  actualizarGrupoBanco,
  actualizarPreguntaBanco,
  cambiarEstadoGrupoBanco,
  cambiarEstadoPreguntaBanco,
  crearEtiquetaBanco,
  crearGrupoBanco,
  crearGrupoBancoDesdeContenido,
  crearPreguntaBanco,
  eliminarEtiquetaBanco,
  guardarDesdeEvaluacionEnBanco,
  importarBancoEnEvaluacion,
  listarEtiquetasBanco,
  listarGruposBanco,
  listarPreguntasBanco,
  obtenerGrupoBanco,
  obtenerPreguntaBanco,
} from "@/services/api/banco-preguntas.api";
import type {
  BancoDesdeEvaluacionPayload,
  BancoEstadoPayload,
  BancoEtiquetaPayload,
  BancoGrupoDesdeContenidoPayload,
  BancoGrupoFiltros,
  BancoGrupoPayload,
  BancoGrupoUpdatePayload,
  BancoImportarEnEvaluacionPayload,
  BancoOperacionIdempotente,
  BancoPreguntaFiltros,
  BancoPreguntaPayload,
  BancoPreguntaUpdatePayload,
} from "@/types";

export const usePreguntasBanco = (filtros: BancoPreguntaFiltros) =>
  useQuery({
    queryKey: bancoPreguntasKeys.preguntasListado(filtros),
    queryFn: () => listarPreguntasBanco(filtros),
    placeholderData: (previousData) => previousData,
  });

export const usePreguntaBanco = (id: number | null) =>
  useQuery({
    queryKey: bancoPreguntasKeys.pregunta(id!),
    queryFn: () => obtenerPreguntaBanco(id!),
    enabled: isValidId(id),
  });

export const useGruposBanco = (filtros: BancoGrupoFiltros) =>
  useQuery({
    queryKey: bancoPreguntasKeys.gruposListado(filtros),
    queryFn: () => listarGruposBanco(filtros),
    placeholderData: (previousData) => previousData,
  });

export const useGrupoBanco = (id: number | null) =>
  useQuery({
    queryKey: bancoPreguntasKeys.grupo(id!),
    queryFn: () => obtenerGrupoBanco(id!),
    enabled: isValidId(id),
  });

export const useEtiquetasBanco = () =>
  useQuery({
    queryKey: bancoPreguntasKeys.etiquetas(),
    queryFn: listarEtiquetasBanco,
  });

function useInvalidarBanco() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: bancoPreguntasKeys.all });
}

export const useCrearPreguntaBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: BancoOperacionIdempotente<BancoPreguntaPayload>) =>
      crearPreguntaBanco(payload, idempotencyKey),
    onSuccess: invalidarBanco,
  });
};

export const useActualizarPreguntaBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BancoPreguntaUpdatePayload }) =>
      actualizarPreguntaBanco(id, payload),
    onSuccess: invalidarBanco,
  });
};

export const useCambiarEstadoPreguntaBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BancoEstadoPayload }) =>
      cambiarEstadoPreguntaBanco(id, payload),
    onSuccess: invalidarBanco,
  });
};

export const useCrearGrupoBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: BancoOperacionIdempotente<BancoGrupoPayload>) =>
      crearGrupoBanco(payload, idempotencyKey),
    onSuccess: invalidarBanco,
  });
};

export const useCrearGrupoBancoDesdeContenido = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: BancoOperacionIdempotente<BancoGrupoDesdeContenidoPayload>) =>
      crearGrupoBancoDesdeContenido(payload, idempotencyKey),
    onSuccess: invalidarBanco,
  });
};

export const useActualizarGrupoBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BancoGrupoUpdatePayload }) =>
      actualizarGrupoBanco(id, payload),
    onSuccess: invalidarBanco,
  });
};

export const useCambiarEstadoGrupoBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BancoEstadoPayload }) =>
      cambiarEstadoGrupoBanco(id, payload),
    onSuccess: invalidarBanco,
  });
};

export const useCrearEtiquetaBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: (payload: BancoEtiquetaPayload) => crearEtiquetaBanco(payload),
    onSuccess: invalidarBanco,
  });
};

export const useActualizarEtiquetaBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BancoEtiquetaPayload }) =>
      actualizarEtiquetaBanco(id, payload),
    onSuccess: invalidarBanco,
  });
};

export const useEliminarEtiquetaBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: eliminarEtiquetaBanco,
    onSuccess: invalidarBanco,
  });
};

export const useGuardarDesdeEvaluacionEnBanco = () => {
  const invalidarBanco = useInvalidarBanco();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: BancoOperacionIdempotente<BancoDesdeEvaluacionPayload>) =>
      guardarDesdeEvaluacionEnBanco(payload, idempotencyKey),
    onSuccess: invalidarBanco,
  });
};

export const useImportarBancoEnEvaluacion = (idActividad: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: BancoOperacionIdempotente<BancoImportarEnEvaluacionPayload>) =>
      importarBancoEnEvaluacion(idActividad, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evaluacionKeys.all });
    },
  });
};
