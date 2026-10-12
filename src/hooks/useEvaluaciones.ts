import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  guardarEvaluacionCompleta,
  modificarBorradorCompleto,
  publicarEvaluacionCompleta,
  actualizarEstadoEvaluacion,
  iniciarIntentoExamen,
  obtenerExamenSorteado,
  obtenerOpcionesPregunta,
  guardarRespuestaAtomica,
  finalizarExamenOficial,
  obtenerEvaluacionesPendientes,
  obtenerEstadisticasAlumno,
  obtenerIntentosDetallados,
  obtenerHistorialCorregido,
  obtenerEvaluacionesDocente,
  obtenerAlumnosInscriptos,
  obtenerIntentoCompleto,
  calificarIntento,
  obtenerDetalleEvaluacion,
  registrarAlertaAntifraude,
  getAlertasByIntento,
  registrarMetricasNavegacion,
  corregirPreguntaIntento,
  obtenerIntentosAlumnoPublicacion,
  seleccionarIntentoValido,
  restaurarSeleccionAutomaticaIntento,
  obtenerMisIntentos,
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
  EvaluacionOperacionIdempotente,
  ModificarBorradorPayload,
  PublicarEvaluacionPayload,
  IniciarIntentoPayload,
  GuardarRespuestaPayload,
  AlertaPayload,
  NavegacionPayload,
  OpcionSorteada,
  PreguntaSorteada,
  CorreccionPreguntaIntentoPayload,
  MisIntentosFiltros,
  MisIntentosResultado,
} from "@/types/index";
import {
  alumnoKeys,
  bancoPreguntasKeys,
  docenteKeys,
  evaluacionKeys,
  intentoKeys,
  isValidId,
} from "@/lib/query-keys";

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

export const useCreateEvaluacion = (legajo?: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: EvaluacionOperacionIdempotente<GuardarEvaluacionPayload>) =>
      guardarEvaluacionCompleta(payload, idempotencyKey),
    onSuccess: () => {
      if (isValidId(legajo)) {
        queryClient.invalidateQueries({
          queryKey: docenteKeys.evaluaciones(legajo),
        });
      }
    },
  });
};

export const useModificarBorrador = (
  idActividad: number,
  idPublicacion: number,
  legajo?: number,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModificarBorradorPayload) =>
      modificarBorradorCompleto(idActividad, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: evaluacionKeys.detail(idPublicacion),
      });
      if (isValidId(legajo)) {
        queryClient.invalidateQueries({
          queryKey: docenteKeys.evaluaciones(legajo),
        });
      }
    },
  });
};

export const usePublicarEvaluacion = (
  idActividad: number,
  idPublicacion: number,
  legajo?: number,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: EvaluacionOperacionIdempotente<PublicarEvaluacionPayload>) =>
      publicarEvaluacionCompleta(idActividad, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: evaluacionKeys.detail(idPublicacion),
      });
      queryClient.invalidateQueries({ queryKey: bancoPreguntasKeys.all });
      if (isValidId(legajo)) {
        queryClient.invalidateQueries({
          queryKey: docenteKeys.evaluaciones(legajo),
        });
      }
    },
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
    queryKey: docenteKeys.evaluaciones(legajo),
    queryFn: () => obtenerEvaluacionesDocente(legajo),
    enabled: isValidId(legajo),
  });
};

export const useGetAlumnosInscriptos = (idPublicacion: number) => {
  return useQuery({
    queryKey: evaluacionKeys.alumnos(idPublicacion),
    queryFn: () => obtenerAlumnosInscriptos(idPublicacion),
    enabled: isValidId(idPublicacion),
  });
};

export const useGetIntentosAlumnoPublicacion = (
  idPublicacion: number,
  matricula: number | null,
) =>
  useQuery({
    queryKey: evaluacionKeys.intentosAlumno(idPublicacion, matricula!),
    queryFn: () => obtenerIntentosAlumnoPublicacion(idPublicacion, matricula!),
    enabled: isValidId(idPublicacion) && isValidId(matricula),
  });

export const useSeleccionarIntentoValido = (
  idPublicacion: number,
  matricula: number,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idIntento: number) =>
      seleccionarIntentoValido(idPublicacion, matricula, idIntento),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: evaluacionKeys.intentosAlumno(idPublicacion, matricula),
      });
      queryClient.invalidateQueries({
        queryKey: evaluacionKeys.alumnos(idPublicacion),
      });
    },
  });
};

export const useRestaurarSeleccionAutomaticaIntento = (
  idPublicacion: number,
  matricula: number,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      restaurarSeleccionAutomaticaIntento(idPublicacion, matricula),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: evaluacionKeys.intentosAlumno(idPublicacion, matricula),
      });
      queryClient.invalidateQueries({
        queryKey: evaluacionKeys.alumnos(idPublicacion),
      });
    },
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
    queryKey: evaluacionKeys.sorteo(idIntento),
    queryFn: () => obtenerExamenSorteado(idIntento),
    enabled: isValidId(idIntento),
  });
};

export const useGetOpcionesPregunta = (idPregunta: number, idIntento: number) => {
  return useQuery({
    queryKey: evaluacionKeys.opciones(idIntento, idPregunta),
    queryFn: () => obtenerOpcionesPregunta(idPregunta, idIntento),
    enabled: isValidId(idPregunta) && isValidId(idIntento),
    staleTime: Infinity,
  });
};

export const usePrecargarOpcionesExamen = (
  idIntento: number,
  preguntas: PreguntaSorteada[] | undefined,
) => {
  return useQueries({
    queries: (preguntas ?? []).map((pregunta) => ({
      queryKey: evaluacionKeys.opciones(idIntento, pregunta.idPregunta),
      queryFn: () => obtenerOpcionesPregunta(pregunta.idPregunta, idIntento),
      enabled: isValidId(idIntento) && isValidId(pregunta.idPregunta),
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

      const queryKey = evaluacionKeys.opciones(
        payload.IdIntento,
        payload.IdPregunta,
      );
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
            queryKey: evaluacionKeys.opciones(idIntento, idPregunta),
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
      queryClient.invalidateQueries({ queryKey: evaluacionKeys.sorteo(idIntento) });
    },
  });
};

export const useGetIntentoCompleto = (idIntento: number) => {
  return useQuery({
    queryKey: intentoKeys.detail(idIntento),
    queryFn: () => obtenerIntentoCompleto(idIntento),
    enabled: isValidId(idIntento),
  });
};

export const useMutateCalificarIntento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idIntento, notaFinal }: { idIntento: number; notaFinal: number }) =>
      calificarIntento(idIntento, notaFinal),
    onSuccess: (_, { idIntento }) => {
      queryClient.invalidateQueries({ queryKey: intentoKeys.detail(idIntento) });
    },
  });
};

export const useGetExamenesPendientes = (matricula: number) => {
  return useQuery({
    queryKey: alumnoKeys.pendientes(matricula),
    queryFn: () => obtenerEvaluacionesPendientes(matricula),
    enabled: isValidId(matricula),
  });
};

export const useGetEstadisticasAlumno = (matricula: number) => {
  return useQuery({
    queryKey: alumnoKeys.estadisticas(matricula),
    queryFn: () => obtenerEstadisticasAlumno(matricula),
    enabled: isValidId(matricula),
  });
};

export const useGetIntentosDetallados = (idAlumno: number) => {
  return useQuery({
    queryKey: alumnoKeys.intentosDetallados(idAlumno),
    queryFn: () => obtenerIntentosDetallados(idAlumno),
    enabled: isValidId(idAlumno),
  });
};

export const useGetHistorialCorregido = (idAlumno: number) => {
  return useQuery({
    queryKey: alumnoKeys.historialCorregido(idAlumno),
    queryFn: () => obtenerHistorialCorregido(idAlumno),
    enabled: isValidId(idAlumno),
  });
};

export const useMisIntentos = (filtros: MisIntentosFiltros) =>
  useQuery({
    queryKey: intentoKeys.mios(filtros),
    queryFn: () => obtenerMisIntentos(filtros),
    placeholderData: (previousData: MisIntentosResultado | undefined) => previousData,
  });

export const useGetDetalleEvaluacion = (id: number) => {
  return useQuery({
    queryKey: evaluacionKeys.detail(id),
    queryFn: () => obtenerDetalleEvaluacion(id),
    enabled: isValidId(id),
  });
};
  
export const useCorregirPreguntaIntento = (idIntento: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idPregunta,
      payload,
    }: {
      idPregunta: number;
      payload: CorreccionPreguntaIntentoPayload;
    }) =>
      corregirPreguntaIntento(idIntento, idPregunta, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intentoKeys.detail(idIntento) });
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
    queryKey: intentoKeys.alertas(idIntento),
    queryFn: () => getAlertasByIntento(idIntento),
    enabled: isValidId(idIntento),
  });
};

export const useRegistrarNavegacion = () => {
  return useMutation({
    mutationFn: (payload: NavegacionPayload) => registrarMetricasNavegacion(payload),
  });
};
