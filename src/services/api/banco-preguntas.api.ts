import { apiFetch } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type {
  BancoDesdeEvaluacionPayload,
  BancoDesdeEvaluacionResultado,
  BancoEstadoPayload,
  BancoEtiqueta,
  BancoEtiquetaPayload,
  BancoGrupoDesdeContenidoPayload,
  BancoGrupoDesdeContenidoResultado,
  BancoGrupoDetalle,
  BancoGrupoFiltros,
  BancoGrupoListado,
  BancoGrupoPayload,
  BancoGrupoUpdatePayload,
  BancoImportarEnEvaluacionPayload,
  BancoImportarEnEvaluacionResultado,
  BancoListaPaginada,
  BancoPreguntaDetalle,
  BancoPreguntaFiltros,
  BancoPreguntaListado,
  BancoPreguntaPayload,
  BancoPreguntaUpdatePayload,
} from "@/types";

function idempotencyHeaders(idempotencyKey: string): HeadersInit {
  return { "Idempotency-Key": idempotencyKey };
}

export const listarPreguntasBanco = (
  filtros: BancoPreguntaFiltros,
): Promise<BancoListaPaginada<BancoPreguntaListado>> =>
  apiFetch<BancoListaPaginada<BancoPreguntaListado>>(
    `/banco-preguntas/preguntas${buildQueryString(filtros)}`,
  );

export const obtenerPreguntaBanco = (
  id: number,
): Promise<BancoPreguntaDetalle> =>
  apiFetch<BancoPreguntaDetalle>(`/banco-preguntas/preguntas/${id}`);

export const crearPreguntaBanco = (
  payload: BancoPreguntaPayload,
  idempotencyKey: string,
): Promise<BancoPreguntaDetalle> =>
  apiFetch<BancoPreguntaDetalle>("/banco-preguntas/preguntas", {
    method: "POST",
    headers: idempotencyHeaders(idempotencyKey),
    body: JSON.stringify(payload),
  });

export const actualizarPreguntaBanco = (
  id: number,
  payload: BancoPreguntaUpdatePayload,
): Promise<BancoPreguntaDetalle> =>
  apiFetch<BancoPreguntaDetalle>(`/banco-preguntas/preguntas/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const cambiarEstadoPreguntaBanco = (
  id: number,
  payload: BancoEstadoPayload,
): Promise<BancoPreguntaDetalle> =>
  apiFetch<BancoPreguntaDetalle>(
    `/banco-preguntas/preguntas/${id}/estado`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );

export const listarGruposBanco = (
  filtros: BancoGrupoFiltros,
): Promise<BancoListaPaginada<BancoGrupoListado>> =>
  apiFetch<BancoListaPaginada<BancoGrupoListado>>(
    `/banco-preguntas/grupos${buildQueryString(filtros)}`,
  );

export const obtenerGrupoBanco = (id: number): Promise<BancoGrupoDetalle> =>
  apiFetch<BancoGrupoDetalle>(`/banco-preguntas/grupos/${id}`);

export const crearGrupoBanco = (
  payload: BancoGrupoPayload,
  idempotencyKey: string,
): Promise<BancoGrupoDetalle> =>
  apiFetch<BancoGrupoDetalle>("/banco-preguntas/grupos", {
    method: "POST",
    headers: idempotencyHeaders(idempotencyKey),
    body: JSON.stringify(payload),
  });

export const actualizarGrupoBanco = (
  id: number,
  payload: BancoGrupoUpdatePayload,
): Promise<BancoGrupoDetalle> =>
  apiFetch<BancoGrupoDetalle>(`/banco-preguntas/grupos/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const cambiarEstadoGrupoBanco = (
  id: number,
  payload: BancoEstadoPayload,
): Promise<BancoGrupoDetalle> =>
  apiFetch<BancoGrupoDetalle>(`/banco-preguntas/grupos/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const crearGrupoBancoDesdeContenido = (
  payload: BancoGrupoDesdeContenidoPayload,
  idempotencyKey: string,
): Promise<BancoGrupoDesdeContenidoResultado> =>
  apiFetch<BancoGrupoDesdeContenidoResultado>(
    "/banco-preguntas/grupos/desde-contenido",
    {
      method: "POST",
      headers: idempotencyHeaders(idempotencyKey),
      body: JSON.stringify(payload),
    },
  );

export const listarEtiquetasBanco = (): Promise<BancoEtiqueta[]> =>
  apiFetch<BancoEtiqueta[]>("/banco-preguntas/etiquetas");

export const crearEtiquetaBanco = (
  payload: BancoEtiquetaPayload,
): Promise<BancoEtiqueta> =>
  apiFetch<BancoEtiqueta>("/banco-preguntas/etiquetas", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const actualizarEtiquetaBanco = (
  id: number,
  payload: BancoEtiquetaPayload,
): Promise<BancoEtiqueta> =>
  apiFetch<BancoEtiqueta>(`/banco-preguntas/etiquetas/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const eliminarEtiquetaBanco = (id: number): Promise<{ id: number }> =>
  apiFetch<{ id: number }>(`/banco-preguntas/etiquetas/${id}`, {
    method: "DELETE",
  });

export const guardarDesdeEvaluacionEnBanco = (
  payload: BancoDesdeEvaluacionPayload,
  idempotencyKey: string,
): Promise<BancoDesdeEvaluacionResultado> =>
  apiFetch<BancoDesdeEvaluacionResultado>("/banco-preguntas/desde-evaluacion", {
    method: "POST",
    headers: idempotencyHeaders(idempotencyKey),
    body: JSON.stringify(payload),
  });

export const importarBancoEnEvaluacion = (
  idActividad: number,
  payload: BancoImportarEnEvaluacionPayload,
  idempotencyKey: string,
): Promise<BancoImportarEnEvaluacionResultado> =>
  apiFetch<BancoImportarEnEvaluacionResultado>(
    `/evaluaciones/${idActividad}/importar-banco`,
    {
      method: "POST",
      headers: idempotencyHeaders(idempotencyKey),
      body: JSON.stringify(payload),
    },
  );
