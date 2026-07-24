import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
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
import { ApiError } from "@/lib/api";
import type {
  GuardarEvaluacionPayload,
  IniciarIntentoPayload,
  GuardarRespuestaPayload,
  AlertaPayload,
  NavegacionPayload,
  OpcionSorteada,
  PreguntaSorteada,
} from "@/types/index";

const RECOVERABLE_ANSWER_ERROR_CODES = new Set([
  "ACCESS_TOKEN_EXPIRED",
  "REFRESH_CONFLICT",
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_EXPIRED",
  "REFRESH_TOKEN_REVOKED",
  "REFRESH_TOKEN_REUSED",
  "SESSION_REVOKED",
  "SESSION_UNAVAILABLE",
  "USER_INACTIVE",
  "RATE_LIMITED",
  "AUTH_INFRASTRUCTURE_ERROR",
  "BFF_UPSTREAM_UNAVAILABLE",
]);

function shouldKeepPendingAnswer(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (RECOVERABLE_ANSWER_ERROR_CODES.has(error.code ?? "") ||
      error.statusCode >= 500)
  );
}

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
    staleTime: Infinity,
  });
};

export const usePrecargarOpcionesExamen = (
  idIntento: number,
  preguntas: PreguntaSorteada[] | undefined,
) => {
  return useQueries({
    queries: (preguntas ?? []).map((pregunta) => ({
      queryKey: ["pregunta", pregunta.idPregunta, "opciones", idIntento],
      queryFn: () => obtenerOpcionesPregunta(pregunta.idPregunta, idIntento),
      enabled: Boolean(idIntento && pregunta.idPregunta),
      staleTime: Infinity,
    })),
  });
};

export const useGuardarRespuesta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GuardarRespuestaPayload) => guardarRespuestaAtomica(payload),
    onMutate: async (payload) => {
      if (payload.IdOpcionNueva === undefined) return;

      const queryKey = [
        "pregunta",
        payload.IdPregunta,
        "opciones",
        payload.IdIntento,
      ] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousOptions =
        queryClient.getQueryData<OpcionSorteada[]>(queryKey);

      queryClient.setQueryData<OpcionSorteada[]>(queryKey, (options) =>
        options?.map((option) => ({
          ...option,
          fueSeleccionada: option.idOpcion === payload.IdOpcionNueva,
        })),
      );

      return { previousOptions, queryKey };
    },
    onError: (error, _payload, context) => {
      if (!context?.previousOptions || shouldKeepPendingAnswer(error)) return;
      queryClient.setQueryData(context.queryKey, context.previousOptions);
    },
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
