import {
  GuardarEvaluacionPayload,
  GuardarEvaluacionResultado,
  ModificarBorradorPayload,
  ModificarBorradorResultado,
  PublicarEvaluacionPayload,
  PublicarEvaluacionResultado,
  PreguntaSorteada,
  OpcionSorteada,
  IniciarIntentoPayload,
  GuardarRespuestaPayload,
  GuardarRespuestaResultado,
  AlertaPayload,
  NavegacionPayload,
  EvaluacionPendiente,
  EvaluacionDocente,
  EvaluacionDetalle,
  AlumnoIntento,
  IntentoCompleto,
  EstadisticasAlumno,
  IntentoDetallado,
  HistorialCorregidoItem,
  AlertaAntifraude,
  CorreccionPreguntaIntentoPayload,
  ResultadoCalificacionIntento,
  ResultadoCorreccionPregunta,
  IntentoAlumnoPublicacion,
  MisIntentosFiltros,
  MisIntentosResultado,
  SeleccionIntentoValidoResultado,
  IncidenteFoco,
  IncidenteFocoPayload,
  ResumenIncidentesFoco,
  ResultadoAnulacionIntento,
  ResultadoConfirmacionCorreccion,
  EventoTemporalPayload,
  EventoTemporalLoteItem,
  RespuestaLoteEventosTemporales,
  ListaEventosTemporales,
  EventoTemporal,
} from "@/types/index";
import { ApiError, apiFetch } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";

interface IniciarIntentoApiResult {
  idIntento: number;
  status?: string;
}

// EVALUACIONES
export const guardarEvaluacionCompleta = (
  payload: GuardarEvaluacionPayload,
  idempotencyKey: string,
): Promise<GuardarEvaluacionResultado> =>
  apiFetch<GuardarEvaluacionResultado>("/evaluaciones/guardar-completo", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });

export const modificarBorradorCompleto = (
  idActividad: number,
  payload: ModificarBorradorPayload,
): Promise<ModificarBorradorResultado> =>
  apiFetch<ModificarBorradorResultado>(
    `/evaluaciones/${idActividad}/modificar-completo`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

export const publicarEvaluacionCompleta = (
  idActividad: number,
  payload: PublicarEvaluacionPayload,
  idempotencyKey: string,
): Promise<PublicarEvaluacionResultado> =>
  apiFetch<PublicarEvaluacionResultado>(
    `/evaluaciones/${idActividad}/publicar-completo`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    },
  );

export const actualizarEstadoEvaluacion = (id: number, estado: string): Promise<void> =>
  apiFetch<void>(`/evaluaciones/${id}/estado`, {
    method: "PUT",
    body: JSON.stringify({ estado }),
  });

export const obtenerExamenSorteado = (idIntento: number): Promise<PreguntaSorteada[]> =>
  apiFetch<PreguntaSorteada[]>(`/evaluaciones/intento/${idIntento}/renderizar`);

export const obtenerOpcionesPregunta = (idPregunta: number, idIntento: number): Promise<OpcionSorteada[]> =>
  apiFetch<OpcionSorteada[]>(`/evaluaciones/pregunta/${idPregunta}/opciones/${idIntento}`);

export const obtenerEvaluacionesPendientes = (matricula: number): Promise<EvaluacionPendiente[]> =>
  apiFetch<EvaluacionPendiente[]>(`/evaluaciones/pendientes/${matricula}`);

export const obtenerEstadisticasAlumno = (matricula: number): Promise<EstadisticasAlumno> =>
  apiFetch<EstadisticasAlumno>(`/alumnos/${matricula}/estadisticas`);

export const obtenerIntentosDetallados = (idAlumno: number): Promise<IntentoDetallado[]> =>
  apiFetch<IntentoDetallado[]>(`/intentos/alumno/${idAlumno}/detallados`);

export const obtenerHistorialCorregido = (idAlumno: number): Promise<HistorialCorregidoItem[]> =>
  apiFetch<HistorialCorregidoItem[]>(`/intentos/alumno/${idAlumno}/historial-corregido`);

export const obtenerMisIntentos = (
  filtros: MisIntentosFiltros,
): Promise<MisIntentosResultado> =>
  apiFetch<MisIntentosResultado>(
    `/intentos/mios${buildQueryString(filtros)}`,
  );

export const obtenerEvaluacionesDocente = (legajo: number): Promise<EvaluacionDocente[]> =>
  apiFetch<EvaluacionDocente[]>(`/docentes/${legajo}/evaluaciones`);

export const obtenerAlumnosInscriptos = (idPublicacion: number): Promise<AlumnoIntento[]> =>
  apiFetch<AlumnoIntento[]>(`/evaluaciones/${idPublicacion}/alumnos`);

export const obtenerIntentosAlumnoPublicacion = (
  idPublicacion: number,
  matricula: number,
): Promise<IntentoAlumnoPublicacion[]> =>
  apiFetch<IntentoAlumnoPublicacion[]>(
    `/evaluaciones/publicaciones/${idPublicacion}/alumnos/${matricula}/intentos`,
  );

export const seleccionarIntentoValido = (
  idPublicacion: number,
  matricula: number,
  idIntento: number,
): Promise<SeleccionIntentoValidoResultado> =>
  apiFetch<SeleccionIntentoValidoResultado>(
    `/evaluaciones/publicaciones/${idPublicacion}/alumnos/${matricula}/intento-valido`,
    {
      method: "PUT",
      body: JSON.stringify({ IdIntento: idIntento }),
    },
  );

export const restaurarSeleccionAutomaticaIntento = (
  idPublicacion: number,
  matricula: number,
): Promise<SeleccionIntentoValidoResultado> =>
  apiFetch<SeleccionIntentoValidoResultado>(
    `/evaluaciones/publicaciones/${idPublicacion}/alumnos/${matricula}/intento-valido`,
    { method: "DELETE" },
  );

export const obtenerDetalleEvaluacion = (id: number): Promise<EvaluacionDetalle> =>
  apiFetch<EvaluacionDetalle>(`/evaluaciones/${id}/detalle`);

// INTENTOS
export const iniciarIntentoExamen = async (
  payload: IniciarIntentoPayload,
): Promise<{ idIntento: number }> => {
  const results = await apiFetch<IniciarIntentoApiResult[]>(
    "/intentos/iniciar",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  const result = results[0];

  if (!result || !Number.isInteger(result.idIntento) || result.idIntento <= 0) {
    throw new ApiError(
      "La API no devolvió un intento válido",
      502,
      "INVALID_UPSTREAM_RESPONSE",
    );
  }

  return { idIntento: result.idIntento };
};

export const guardarRespuestaAtomica = (
  payload: GuardarRespuestaPayload,
): Promise<GuardarRespuestaResultado> =>
  apiFetch<GuardarRespuestaResultado>("/intentos/guardar-respuesta", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const finalizarExamenOficial = (idIntento: number): Promise<{ notaFinal: number }> =>
  apiFetch<{ notaFinal: number }>(`/intentos/${idIntento}/finalizar`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const obtenerIntentoCompleto = (idIntento: number): Promise<IntentoCompleto> =>
  apiFetch<IntentoCompleto>(`/intentos/${idIntento}/completo`);

export const calificarIntento = (
  idIntento: number,
  notaFinal: number,
): Promise<ResultadoCalificacionIntento> =>
  apiFetch<ResultadoCalificacionIntento>(`/intentos/${idIntento}/calificar`, {
    method: "PUT",
    body: JSON.stringify({ notaFinal }),
  });

export const corregirPreguntaIntento = (
  idIntento: number,
  idPregunta: number,
  payload: CorreccionPreguntaIntentoPayload,
): Promise<ResultadoCorreccionPregunta> =>
  apiFetch<ResultadoCorreccionPregunta>(
    `/intentos/${idIntento}/preguntas/${idPregunta}/corregir`,
    {
    method: "PUT",
    body: JSON.stringify(payload),
    },
  );

export const confirmarCorreccionIntento = (
  idIntento: number,
): Promise<ResultadoConfirmacionCorreccion> =>
  apiFetch<ResultadoConfirmacionCorreccion>(
    `/intentos/${idIntento}/confirmar-correccion`,
    { method: "PUT" },
  );

export const anularIntentoPorIncidente = (
  idIntento: number,
  eventoId: string,
): Promise<ResultadoAnulacionIntento> =>
  apiFetch<ResultadoAnulacionIntento>(
    `/intentos/${idIntento}/anular-por-incidente/${eventoId}`,
    { method: "PUT" },
  );

// TELEMETRÍA
export const registrarAlertaAntifraude = (payload: AlertaPayload): Promise<void> =>
  apiFetch<void>("/telemetria/alerta", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getAlertasByIntento = (idIntento: number): Promise<AlertaAntifraude[]> =>
  apiFetch<AlertaAntifraude[]>(`/telemetria/alerta/${idIntento}`);

export const registrarMetricasNavegacion = (payload: NavegacionPayload): Promise<void> =>
  apiFetch<void>("/telemetria/navegacion", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const guardarIncidenteFoco = (
  idIntento: number,
  eventoId: string,
  payload: IncidenteFocoPayload,
): Promise<IncidenteFoco> =>
  apiFetch<IncidenteFoco>(
    `/telemetria/intentos/${idIntento}/incidentes/${eventoId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

export const obtenerResumenIncidentesFoco = (
  idIntento: number,
): Promise<ResumenIncidentesFoco> =>
  apiFetch<ResumenIncidentesFoco>(
    `/telemetria/intentos/${idIntento}/resumen`,
  );

export const obtenerIncidentesFoco = (
  idIntento: number,
): Promise<IncidenteFoco[]> =>
  apiFetch<IncidenteFoco[]>(
    `/telemetria/intentos/${idIntento}/incidentes`,
  );

export const guardarEventoTemporal = (
  idIntento: number,
  eventoId: string,
  payload: EventoTemporalPayload,
): Promise<EventoTemporal & { resultado: "creado" | "actualizado" | "replay" }> =>
  apiFetch<EventoTemporal & { resultado: "creado" | "actualizado" | "replay" }>(
    `/telemetria/intentos/${idIntento}/eventos/${eventoId}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );

export const guardarEventosTemporalesLote = (
  idIntento: number,
  eventos: EventoTemporalLoteItem[],
): Promise<RespuestaLoteEventosTemporales> =>
  apiFetch<RespuestaLoteEventosTemporales>(
    `/telemetria/intentos/${idIntento}/eventos/lote`,
    { method: "POST", body: JSON.stringify({ Eventos: eventos }) },
  );

export const obtenerEventosTemporales = (
  idIntento: number,
  pagina = 1,
  limite = 50,
): Promise<ListaEventosTemporales> =>
  apiFetch<ListaEventosTemporales>(
    `/telemetria/intentos/${idIntento}/eventos${buildQueryString({ pagina, limite })}`,
  ).then((response) => ({
    ...response,
    items: response.items.map((item) => ({
      ...item,
      duracionMilisegundos: item.duracionMilisegundos === null
        ? null
        : Number(item.duracionMilisegundos),
    })),
    resumen: {
      ...response.resumen,
      duracionesPorTipo: response.resumen.duracionesPorTipo.map((item) => ({
        ...item,
        duracionMilisegundos: Number(item.duracionMilisegundos),
      })),
      tiemposPorPregunta: response.resumen.tiemposPorPregunta.map((item) => ({
        ...item,
        duracionMilisegundos: item.duracionMilisegundos === null
          ? null
          : Number(item.duracionMilisegundos),
      })),
    },
  }));
