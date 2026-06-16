import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  guardarEvaluacionCompleta,
  actualizarEstadoEvaluacion,
  iniciarIntentoExamen,
  obtenerExamenSorteado,
  obtenerOpcionesPregunta,
  guardarRespuestaAtomica,
  finalizarExamenOficial,
  getHistorialPorAlumno,
  obtenerEvaluacionesPendientes,
  obtenerEstadisticasAlumno,
  obtenerIntentosDetallados,
  obtenerHistorialCorregido,
  obtenerEvaluacionesDocente,
  obtenerAlumnosInscriptos,
  obtenerIntentoCompleto,
  calificarIntento,
  obtenerDetallePublicacion,
  obtenerDetalleEvaluacion,
  registrarAlertaAntifraude,
  getAlertasByIntento,
  registrarMetricasNavegacion,
  corregirRespuestaAbierta,
} from "@/services/api/evaluaciones.api";
import type {
  GuardarEvaluacionPayload,
  IniciarIntentoPayload,
  GuardarRespuestaPayload,
  AlertaPayload,
  NavegacionPayload,
} from "@/types/index";

// --- HOOKS DEL PROFESOR ---

export const useCreateEvaluacion = () => {
  return useMutation({
    mutationFn: (payload: GuardarEvaluacionPayload) => guardarEvaluacionCompleta(payload),
  });
};

export const useActualizarEstadoEvaluacion = () => {
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      actualizarEstadoEvaluacion(id, estado),
  });
};

export const useGetEvaluacionesDocente = (legajo: number) => {
  return useQuery({
    queryKey: ["docente", legajo, "evaluaciones"],
    queryFn: () => obtenerEvaluacionesDocente(legajo),
    enabled: !!legajo,
  });
};

export const useGetAlumnosInscriptos = (idPublicacion: number) => {
  return useQuery({
    queryKey: ["evaluacion", idPublicacion, "alumnos"],
    queryFn: () => obtenerAlumnosInscriptos(idPublicacion),
    enabled: !!idPublicacion,
  });
};

// --- HOOKS DEL ALUMNO (EXAMEN EN VIVO) ---

export const useIniciarIntento = () => {
  return useMutation({
    mutationFn: (payload: IniciarIntentoPayload) => iniciarIntentoExamen(payload),
  });
};

export const useGetExamenSorteado = (idIntento: number) => {
  return useQuery({
    queryKey: ["examen", "sorteo", idIntento],
    queryFn: () => obtenerExamenSorteado(idIntento),
    enabled: !!idIntento,
  });
};

export const useGetOpcionesPregunta = (idPregunta: number, idIntento: number) => {
  return useQuery({
    queryKey: ["pregunta", idPregunta, "opciones", idIntento],
    queryFn: () => obtenerOpcionesPregunta(idPregunta, idIntento),
    enabled: !!idPregunta && !!idIntento,
  });
};

export const useGuardarRespuesta = () => {
  return useMutation({
    mutationFn: (payload: GuardarRespuestaPayload) => guardarRespuestaAtomica(payload),
  });
};

export const useFinalizarExamen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: finalizarExamenOficial,
    onSuccess: (_, idIntento) => {
      queryClient.invalidateQueries({ queryKey: ["examen", "sorteo", idIntento] });
    },
  });
};

export const useGetHistorialPorAlumno = (idAlumno: number) => {
  return useQuery({
    queryKey: ["intentos", "alumno", idAlumno],
    queryFn: () => getHistorialPorAlumno(idAlumno),
    enabled: !!idAlumno,
  });
};

export const useGetIntentoCompleto = (idIntento: number) => {
  return useQuery({
    queryKey: ["intento", idIntento, "completo"],
    queryFn: () => obtenerIntentoCompleto(idIntento),
    enabled: !!idIntento,
  });
};

export const useMutateCalificarIntento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idIntento, notaFinal }: { idIntento: number; notaFinal: number }) =>
      calificarIntento(idIntento, notaFinal),
    onSuccess: (_, { idIntento }) => {
      queryClient.invalidateQueries({ queryKey: ["intento", idIntento, "completo"] });
    },
  });
};

export const useGetExamenesPendientes = (matricula: number) => {
  return useQuery({
    queryKey: ["alumno", matricula, "pendientes"],
    queryFn: () => obtenerEvaluacionesPendientes(matricula),
    enabled: !!matricula,
  });
};

export const useGetEstadisticasAlumno = (matricula: number) => {
  return useQuery({
    queryKey: ["alumno", matricula, "estadisticas"],
    queryFn: () => obtenerEstadisticasAlumno(matricula),
    enabled: !!matricula,
  });
};

export const useGetIntentosDetallados = (idAlumno: number) => {
  return useQuery({
    queryKey: ["alumno", idAlumno, "intentos", "detallados"],
    queryFn: () => obtenerIntentosDetallados(idAlumno),
    enabled: !!idAlumno,
  });
};

export const useGetHistorialCorregido = (idAlumno: number) => {
  return useQuery({
    queryKey: ["alumno", idAlumno, "historial", "corregido"],
    queryFn: () => obtenerHistorialCorregido(idAlumno),
    enabled: !!idAlumno,
  });
};

export const useGetDetallePublicacion = (idPublicacion: number) => {
  return useQuery({
    queryKey: ["publicacion", idPublicacion],
    queryFn: () => obtenerDetallePublicacion(idPublicacion),
    enabled: !!idPublicacion,
  });
};

export const useGetDetalleEvaluacion = (id: number) => {
  return useQuery({
    queryKey: ["evaluacion", id, "detalle"],
    queryFn: () => obtenerDetalleEvaluacion(id),
    enabled: !!id,
  });
};
  
export const useCorregirRespuestaAbierta = (idIntento: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idPregunta,
      esCorrecta,
      comentariosDocente,
    }: {
      idPregunta: number;
      esCorrecta: boolean | null;
      comentariosDocente: string | null;
    }) =>
      corregirRespuestaAbierta(idIntento, idPregunta, {
        esCorrecta,
        comentariosDocente,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intento", idIntento, "completo"] });
    },
  });
};
// --- HOOKS DE TELEMETRÍA Y SEGURIDAD ---

export const useRegistrarAlerta = () => {
  return useMutation({
    mutationFn: (payload: AlertaPayload) => registrarAlertaAntifraude(payload),
  });
};

export const useGetAlertasByIntento = (idIntento: number) => {
  return useQuery({
    queryKey: ["alertas", idIntento],
    queryFn: () => getAlertasByIntento(idIntento),
    enabled: !!idIntento,
  });
};

export const useRegistrarNavegacion = () => {
  return useMutation({
    mutationFn: (payload: NavegacionPayload) => registrarMetricasNavegacion(payload),
  });
};
