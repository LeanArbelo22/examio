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
  confirmarCorreccionIntento,
} from "@/services/api/evaluaciones.api";
import { ApiError } from "@/lib/api";
import {
  clearExamFinalizationRequest,
  clearExamOutbox,
  claimPendingAnswer,
  completePendingAnswer,
  discardPendingAnswer,
  enqueuePendingAnswer,
  getExamOutboxSnapshot,
  getPendingAnswer,
  rebasePendingAnswer,
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
  GuardarRespuestaResultado,
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

const syncPromises = new Map<number, Promise<GuardarRespuestaResultado[]>>();

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createAnswerEventId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function synchronizePendingAnswers(
  idIntento: number,
): Promise<GuardarRespuestaResultado[]> {
  const existing = syncPromises.get(idIntento);
  if (existing) return existing;

  const operation = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return [];

    const synchronizedAnswers: GuardarRespuestaResultado[] = [];
    let continueSync = true;

    while (continueSync) {
      continueSync = false;
      const snapshot = await getExamOutboxSnapshot(idIntento);

      for (const record of snapshot.answers) {
        if (record.state === "failed" || record.state === "conflict") continue;
        if (
          record.payload.EventoId === undefined ||
          record.payload.RevisionEsperada === undefined
        ) continue;

        const sent = await claimPendingAnswer(record);
        if (!sent) continue;

        let synchronized = false;
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const result = await guardarRespuestaAtomica(sent.payload);
            const completion = await completePendingAnswer(
              record,
              sent,
              result.revision,
            );
            synchronizedAnswers.push(result);
            synchronized = true;
            continueSync ||= completion.hasNewer;
            break;
          } catch (error: unknown) {
            lastError = error;
            if (!shouldKeepPendingAnswer(error)) {
              const isConflict =
                error instanceof ApiError &&
                error.code === "RESPONSE_REVISION_CONFLICT";
              await updatePendingAnswerState(
                record,
                isConflict ? "conflict" : "failed",
                error instanceof Error ? error.message : "Respuesta rechazada",
                error instanceof ApiError ? error.code : undefined,
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
            lastError instanceof ApiError ? lastError.code : undefined,
          );
          return synchronizedAnswers;
        }
      }

      const remaining = await getExamOutboxSnapshot(idIntento);
      continueSync ||= remaining.answers.some(
        (answer) =>
          answer.state !== "failed" &&
          answer.state !== "conflict" &&
          answer.payload.EventoId !== undefined &&
          answer.payload.RevisionEsperada !== undefined,
      );
    }

    return synchronizedAnswers;
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

  const applyResult = useCallback((result: GuardarRespuestaResultado) => {
    queryClient.setQueryData<PreguntaSorteada[]>(
      evaluacionKeys.sorteo(result.idIntento),
      (questions) => questions?.map((question) =>
        question.idPregunta === result.idPregunta
          ? {
              ...question,
              respuesta: {
                idRespuesta: result.idRespuesta,
                idsOpcionesSeleccionadas: result.idsOpcionesSeleccionadas,
                rtaTexto: result.rtaTexto,
                justificacion: result.justificacion,
                revision: result.revision,
              },
            }
          : question,
      ),
    );
    queryClient.setQueryData<OpcionSorteada[]>(
      evaluacionKeys.opciones(result.idIntento, result.idPregunta),
      (options) => options?.map((option) => ({
        ...option,
        fueSeleccionada: result.idsOpcionesSeleccionadas.includes(option.idOpcion),
      })),
    );
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: async (payload: GuardarRespuestaPayload) => {
      const current = await getPendingAnswer(payload.IdIntento, payload.IdPregunta);
      if (current?.payload.EventoId !== payload.EventoId) {
        await enqueuePendingAnswer(payload);
      }
      return synchronizePendingAnswers(payload.IdIntento);
    },
    onSuccess: (results) => {
      results.forEach(applyResult);
    },
  });

  const persistPending = useCallback(
    (payload: GuardarRespuestaPayload) => enqueuePendingAnswer(payload),
    [],
  );

  const restoreServerAnswer = useCallback(async (
    idIntento: number,
    idPregunta: number,
  ) => {
    await discardPendingAnswer(idIntento, idPregunta);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: evaluacionKeys.sorteo(idIntento) }),
      queryClient.invalidateQueries({
        queryKey: evaluacionKeys.opciones(idIntento, idPregunta),
      }),
    ]);
  }, [queryClient]);

  const retryLocalAnswer = useCallback(async (
    idIntento: number,
    idPregunta: number,
    revision: number,
  ) => {
    const record = await rebasePendingAnswer(idIntento, idPregunta, revision);
    if (!record) return;
    const results = await synchronizePendingAnswers(idIntento);
    results.forEach(applyResult);
  }, [applyResult]);

  return { ...mutation, persistPending, restoreServerAnswer, retryLocalAnswer };
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
      const synchronizedAnswers =
        await synchronizePendingAnswers(idIntento);
      const synchronizedQuestions = [
        ...new Set(synchronizedAnswers.map((answer) => answer.idPregunta)),
      ];
      queryClient.setQueryData<PreguntaSorteada[]>(
        evaluacionKeys.sorteo(idIntento),
        (questions) => questions?.map((question) => {
          const result = [...synchronizedAnswers]
            .reverse()
            .find((answer) => answer.idPregunta === question.idPregunta);
          return result
            ? {
                ...question,
                respuesta: {
                  idRespuesta: result.idRespuesta,
                  idsOpcionesSeleccionadas: result.idsOpcionesSeleccionadas,
                  rtaTexto: result.rtaTexto,
                  justificacion: result.justificacion,
                  revision: result.revision,
                },
              }
            : question;
        }),
      );
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

  const completeMissingJustifications = useCallback(async (
    questions: PreguntaSorteada[],
  ) => {
    let completed = 0;
    for (const question of questions) {
      if (
        question.modoJustificacion !== "obligatoria" ||
        !["mc", "multiple", "vf"].includes(question.tipo)
      ) continue;

      const current = await getPendingAnswer(idIntento, question.idPregunta);
      if (current?.state === "conflict") continue;
      const selectedOptions = current?.payload.IdOpcionesSeleccionadas ??
        (current?.payload.IdOpcionNueva !== undefined
          ? [current.payload.IdOpcionNueva]
          : question.respuesta?.idsOpcionesSeleccionadas ?? []);
      const justification = current?.payload.Justificacion ??
        question.respuesta?.justificacion ?? "";
      if (selectedOptions.length === 0 || justification.trim().length > 0) continue;

      await enqueuePendingAnswer({
        IdIntento: idIntento,
        IdPregunta: question.idPregunta,
        IdOpcionesSeleccionadas: selectedOptions,
        RtaTexto: null,
        Justificacion: "Sin respuesta",
        RevisionEsperada: Math.max(
          current?.payload.RevisionEsperada ?? 0,
          question.respuesta?.revision ?? 0,
        ),
        EventoId: createAnswerEventId(),
      });
      completed += 1;
    }
    await refreshSnapshot();
    return completed;
  }, [idIntento, refreshSnapshot]);

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
    completeMissingJustifications,
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

export const useConfirmarCorreccionIntento = (idIntento: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => confirmarCorreccionIntento(idIntento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intentoKeys.all });
      queryClient.invalidateQueries({ queryKey: evaluacionKeys.all });
      queryClient.invalidateQueries({ queryKey: alumnoKeys.all });
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
