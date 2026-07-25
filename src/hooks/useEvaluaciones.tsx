import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
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
import {
  clearExamFinalizationRequest,
  clearExamOutbox,
  confirmPendingAnswer,
  enqueuePendingAnswer,
  getExamOutboxSnapshot,
  getPendingAnswer,
  requestExamFinalization,
  subscribeExamOutbox,
  updatePendingAnswerState,
  type ExamOutboxSnapshot,
  type PendingAnswerRecord,
} from "@/lib/exam-answer-outbox";
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
  "BFF_UPSTREAM_TIMEOUT",
  "NETWORK_UNAVAILABLE",
  "REQUEST_TIMEOUT",
]);

function shouldKeepPendingAnswer(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (RECOVERABLE_ANSWER_ERROR_CODES.has(error.code ?? "") ||
      error.statusCode >= 500)
  );
}

const syncPromises = new Map<number, Promise<number[]>>();

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function synchronizePendingAnswers(
  idIntento: number,
): Promise<number[]> {
  const existing = syncPromises.get(idIntento);
  if (existing) return existing;

  const operation = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return [];

    const snapshot = await getExamOutboxSnapshot(idIntento);
    const synchronizedQuestions: number[] = [];

    for (const record of snapshot.answers) {
      if (record.state === "failed") continue;

      let synchronized = false;
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await guardarRespuestaAtomica(record.payload);
          synchronized = await confirmPendingAnswer(
            record.key,
            record.version,
          );
          if (synchronized) synchronizedQuestions.push(record.idPregunta);
          break;
        } catch (error: unknown) {
          lastError = error;
          if (!shouldKeepPendingAnswer(error)) {
            await updatePendingAnswerState(
              record,
              "failed",
              error instanceof Error ? error.message : "Respuesta rechazada",
            );
            break;
          }
          if (attempt < 2) await wait(750 * 2 ** attempt);
        }
      }

      if (!synchronized && shouldKeepPendingAnswer(lastError)) {
        await updatePendingAnswerState(
          record,
          "pending",
          lastError instanceof Error
            ? lastError.message
            : "Sin conexión para sincronizar",
        );
        break;
      }
    }

    return synchronizedQuestions;
  })().finally(() => {
    syncPromises.delete(idIntento);
  });

  syncPromises.set(idIntento, operation);
  return operation;
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

  const mutation = useMutation({
    mutationFn: (payload: GuardarRespuestaPayload) => guardarRespuestaAtomica(payload),
    onMutate: async (payload) => {
      const outboxRecord = await enqueuePendingAnswer(payload);
      if (payload.IdOpcionNueva === undefined) return { outboxRecord };

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

      return { previousOptions, queryKey, outboxRecord };
    },
    onSuccess: async (_data, _payload, context) => {
      if (!context?.outboxRecord) return;
      await confirmPendingAnswer(
        context.outboxRecord.key,
        context.outboxRecord.version,
      );
    },
    onError: async (error, _payload, context) => {
      if (!context?.outboxRecord) return;
      if (shouldKeepPendingAnswer(error)) {
        await updatePendingAnswerState(
          context.outboxRecord,
          "pending",
          error instanceof Error ? error.message : "Sin conexión para guardar",
        );
        return;
      }

      await updatePendingAnswerState(
        context.outboxRecord,
        "failed",
        error instanceof Error ? error.message : "Respuesta rechazada",
      );
      if (context.previousOptions) {
        queryClient.setQueryData(context.queryKey, context.previousOptions);
      }
    },
  });

  const persistPending = useCallback(
    (payload: GuardarRespuestaPayload) => enqueuePendingAnswer(payload),
    [],
  );

  return { ...mutation, persistPending };
};

export const usePendingAnswer = (
  idIntento: number,
  idPregunta: number,
) => {
  const [record, setRecord] = useState<PendingAnswerRecord>();

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void getPendingAnswer(idIntento, idPregunta).then((nextRecord) => {
        if (active) setRecord(nextRecord);
      });
    };
    refresh();
    const unsubscribe = subscribeExamOutbox(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [idIntento, idPregunta]);

  return record;
};

export const useExamAnswerSync = (idIntento: number) => {
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState<ExamOutboxSnapshot>({
    answers: [],
    finalizeRequested: false,
    durable: true,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncRevision, setSyncRevision] = useState(0);
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  const refreshSnapshot = useCallback(async () => {
    if (!idIntento) return;
    setSnapshot(await getExamOutboxSnapshot(idIntento));
  }, [idIntento]);

  const syncNow = useCallback(async () => {
    if (!idIntento) {
      return {
        synchronizedQuestions: [],
        snapshot: {
          answers: [],
          finalizeRequested: false,
          durable: true,
        } satisfies ExamOutboxSnapshot,
      };
    }
    setIsSyncing(true);
    try {
      const synchronizedQuestions =
        await synchronizePendingAnswers(idIntento);
      await Promise.all(
        synchronizedQuestions.map((idPregunta) =>
          queryClient.invalidateQueries({
            queryKey: ["pregunta", idPregunta, "opciones", idIntento],
          }),
        ),
      );
      const nextSnapshot = await getExamOutboxSnapshot(idIntento);
      setSnapshot(nextSnapshot);
      setSyncRevision((revision) => revision + 1);
      return { synchronizedQuestions, snapshot: nextSnapshot };
    } finally {
      setIsSyncing(false);
    }
  }, [idIntento, queryClient]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refreshSnapshot();
    }, 0);
    const unsubscribe = subscribeExamOutbox(() => {
      void refreshSnapshot();
    });
    return () => {
      window.clearTimeout(initialRefresh);
      unsubscribe();
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    if (!isOnline) return;
    const initialSync = window.setTimeout(() => {
      void syncNow();
    }, 0);
    return () => window.clearTimeout(initialSync);
  }, [isOnline, syncNow]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncNow();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow]);

  useEffect(() => {
    if (!isOnline || snapshot.answers.length === 0) return;
    const interval = window.setInterval(() => {
      void syncNow();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [isOnline, snapshot.answers.length, syncNow]);

  useEffect(() => {
    if (snapshot.answers.length === 0) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [snapshot.answers.length]);

  const requestFinalization = useCallback(async () => {
    await requestExamFinalization(idIntento);
    await refreshSnapshot();
  }, [idIntento, refreshSnapshot]);

  const cancelFinalization = useCallback(async () => {
    await clearExamFinalizationRequest(idIntento);
    await refreshSnapshot();
  }, [idIntento, refreshSnapshot]);

  const clearOutbox = useCallback(async () => {
    await clearExamOutbox(idIntento);
    await refreshSnapshot();
  }, [idIntento, refreshSnapshot]);

  return {
    snapshot,
    isOnline,
    isSyncing,
    syncRevision,
    syncNow,
    requestFinalization,
    cancelFinalization,
    clearOutbox,
  };
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
