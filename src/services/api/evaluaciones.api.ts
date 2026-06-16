import {
  GuardarEvaluacionPayload,
  PreguntaSorteada,
  OpcionSorteada,
  IniciarIntentoPayload,
  GuardarRespuestaPayload,
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
} from "@/types/index";
import { apiFetch } from "@/lib/api";

// EVALUACIONES
export const guardarEvaluacionCompleta = (payload: GuardarEvaluacionPayload): Promise<{ idActividad: number }> =>
  apiFetch<{ idActividad: number }>("/evaluaciones/guardar-completo", {
    method: "POST",
    body: JSON.stringify(payload),
  });

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

export const obtenerEvaluacionesDocente = (legajo: number): Promise<EvaluacionDocente[]> =>
  apiFetch<EvaluacionDocente[]>(`/docentes/${legajo}/evaluaciones`);

export const obtenerAlumnosInscriptos = (idPublicacion: number): Promise<AlumnoIntento[]> =>
  apiFetch<AlumnoIntento[]>(`/evaluaciones/${idPublicacion}/alumnos`);

export const obtenerDetallePublicacion = (idPublicacion: number): Promise<any> =>
  apiFetch<any>(`/evaluaciones/publicacion/${idPublicacion}`);

export const obtenerDetalleEvaluacion = (id: number): Promise<EvaluacionDetalle> =>
  apiFetch<EvaluacionDetalle>(`/evaluaciones/${id}/detalle`);

// INTENTOS
export const iniciarIntentoExamen = (payload: IniciarIntentoPayload): Promise<{ idIntento: number }> =>
  apiFetch<{ idIntento: number }>("/intentos/iniciar", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const guardarRespuestaAtomica = (payload: GuardarRespuestaPayload): Promise<void> =>
  apiFetch<void>("/intentos/guardar-respuesta", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const finalizarExamenOficial = (idIntento: number): Promise<{ notaFinal: number }> =>
  apiFetch<{ notaFinal: number }>(`/intentos/${idIntento}/finalizar`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const getHistorialPorAlumno = (idAlumno: number): Promise<any[]> =>
  apiFetch<any[]>(`/intentos/alumno/${idAlumno}`);

export const obtenerIntentoCompleto = (idIntento: number): Promise<IntentoCompleto> =>
  apiFetch<IntentoCompleto>(`/intentos/${idIntento}/completo`);

export const calificarIntento = (idIntento: number, notaFinal: number): Promise<void> =>
  apiFetch<void>(`/intentos/${idIntento}/calificar`, {
    method: "PUT",
    body: JSON.stringify({ notaFinal }),
  });
    
export const corregirRespuestaAbierta = (
  idIntento: number,
  idPregunta: number,
  payload: { esCorrecta: boolean | null; comentariosDocente: string | null }
): Promise<void> =>
  apiFetch<void>(`/intentos/${idIntento}/preguntas/${idPregunta}/corregir`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

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
