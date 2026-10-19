"use client";

import { FullscreenWrapper } from "@/components/ui/FullscreenWrapper";
import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useGetExamenSorteado,
  useExamAnswerSync,
  useFinalizarExamen,
  usePrecargarOpcionesExamen,
} from "@/hooks/useEvaluaciones";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import {
  useExamTemporalTelemetry,
} from "@/hooks/useTelemetria";
import { useEstadoSupervision } from "@/hooks/useSupervision";
import type { InstruccionSupervision } from "@/types";

type ExamDocument = Document & { isExitingLegitimately?: boolean };

export default function ActivityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const urlParams = useParams();

  const idIntento = Number(id);
  const currentActivityId = parseInt(urlParams.actividadId as string) || 1;

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPreparingDelivery, setIsPreparingDelivery] = useState(false);
  const autoSubmittedRef = useRef(false);
  const deliveryRunningRef = useRef(false);
  const lastAutomaticSyncRevisionRef = useRef(0);
  const lastSupervisionRevisionRef = useRef<number | null>(null);
  const securityInterruptedRef = useRef(false);
  const [liveSupervision, setLiveSupervision] = useState<{
    instruction: InstruccionSupervision;
    sequence: number;
  } | null>(null);
  const [warningDecisionId, setWarningDecisionId] = useState<number | null>(null);

  const { data: preguntas, isLoading } = useGetExamenSorteado(idIntento);
  usePrecargarOpcionesExamen(idIntento, preguntas);
  const { mutateAsync: finalizarExamen, isPending: finalizando } =
    useFinalizarExamen();
  const {
    snapshot: outbox,
    isOnline,
    isSyncing,
    syncRevision,
    syncNow,
    completeMissingJustifications,
    requestFinalization,
    cancelFinalization,
    clearOutbox,
  } = useExamAnswerSync(idIntento);
  const supervisionQuery = useEstadoSupervision(idIntento);
  const refetchSupervision = supervisionQuery.refetch;
  const handleSupervision = useCallback((instruction: InstruccionSupervision) => {
    setLiveSupervision((current) => ({
      instruction,
      sequence: (current?.sequence ?? 0) + 1,
    }));
    if (
      instruction.accion === "advertir" &&
      instruction.decisionId !== null
    ) {
      setWarningDecisionId(instruction.decisionId);
    }
    if (instruction.intentoAnulado) securityInterruptedRef.current = true;
    void refetchSupervision();
  }, [refetchSupervision]);
  const currentQuestion = preguntas?.[currentActivityId - 1];
  const {
    recordFullscreenExit,
    recordFullscreenRestored,
    recordPointEvent,
    flushTelemetry,
    durable: telemetryDurable,
  } = useExamTemporalTelemetry(
    idIntento,
    currentQuestion?.idIntentoPregunta,
    Number.isInteger(idIntento) && idIntento > 0,
    handleSupervision,
  );

  const supervision = supervisionQuery.data
    ? {
        ...supervisionQuery.data,
        ...(liveSupervision?.instruction ?? {}),
        revision: supervisionQuery.data.revision + (liveSupervision?.sequence ?? 0),
      }
    : null;

  useEffect(() => {
    const serverRevision = supervisionQuery.data?.revision;
    if (serverRevision === undefined) return;
    if (lastSupervisionRevisionRef.current === null) {
      lastSupervisionRevisionRef.current = serverRevision;
      return;
    }
    if (lastSupervisionRevisionRef.current !== serverRevision) {
      lastSupervisionRevisionRef.current = serverRevision;
      setLiveSupervision(null);
    }
  }, [supervisionQuery.data?.revision]);

  const totalQuestions = preguntas?.length || 0;
  const isDelivering = finalizando || isSyncing || isPreparingDelivery;

  const handlePrevious = () => {
    if (currentActivityId > 1) {
      router.push(`/alumno/examen/${id}/actividad/${currentActivityId - 1}`);
    }
  };

  const handleNext = () => {
    if (currentActivityId < totalQuestions) {
      router.push(`/alumno/examen/${id}/actividad/${currentActivityId + 1}`);
    }
  };

  const ejecutarCierreTransaccional = useCallback(async () => {
    if (
      deliveryRunningRef.current ||
      securityInterruptedRef.current ||
      supervision?.intentoAnulado
    ) return;
    deliveryRunningRef.current = true;
    setIsPreparingDelivery(true);
    setErrorServidor(null);
    setShowConfirmModal(true);

    try {
      await completeMissingJustifications(preguntas ?? []);
      await requestFinalization();
      if (!isOnline) {
        setErrorServidor(
          "No hay conexión. La entrega quedó pendiente y se retomará cuando vuelva la conectividad.",
        );
        return;
      }
      const synchronization = await syncNow();
      if (synchronization.snapshot.answers.length > 0) {
        setErrorServidor(
          isOnline
            ? "Todavía hay respuestas pendientes. Revisalas o reintentá la sincronización antes de entregar."
            : "No hay conexión. Tus respuestas permanecen guardadas en este dispositivo y la entrega sigue pendiente.",
        );
        return;
      }

      await finalizarExamen(idIntento);
      await recordPointEvent("attempt_finished").catch(() => undefined);
      await flushTelemetry().catch(() => undefined);
      await clearOutbox();
      sessionStorage.removeItem(`examio_exam_entered_${idIntento}`);
      sessionStorage.removeItem(`examio_deadline_${idIntento}`);
      for (const pregunta of preguntas ?? []) {
        localStorage.removeItem(
          `examio_rta_abierta_${idIntento}_${pregunta.idPregunta}`,
        );
      }

      const doc = document as ExamDocument;
      doc.isExitingLegitimately = true;
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // La entrega ya fue confirmada; la navegación no depende de fullscreen.
        }
      }
      router.replace("/alumno");
    } catch (error: unknown) {
      const errorCode = error instanceof ApiError ? error.code : undefined;
      void recordPointEvent("submission_failed", errorCode ?? "unknown");
      if (
        error instanceof ApiError &&
        [
          "SESSION_UNAVAILABLE",
          "AUTH_INFRASTRUCTURE_ERROR",
          "AUTH_CONTRACT_ERROR",
          "REFRESH_CONFLICT",
        ].includes(error.code ?? "")
      ) {
        void recordPointEvent("auth_session_unavailable", error.code);
      } else if (
        error instanceof ApiError &&
        (error.statusCode === 0 || error.statusCode === 408)
      ) {
        void recordPointEvent("sync_error", error.code);
      }
      setErrorServidor(
        error instanceof ApiError && error.code === "REQUIRED_JUSTIFICATION_MISSING"
          ? "No pudimos registrar las justificaciones vacías. El intento sigue abierto y podés reintentar la entrega."
          : error instanceof ApiError &&
          (error.statusCode === 0 ||
            error.statusCode === 401 ||
            error.statusCode === 409 ||
            error.statusCode === 429 ||
            error.statusCode >= 500)
          ? "No pudimos completar la entrega. El intento y las respuestas pendientes permanecen protegidos."
          : error instanceof Error
            ? error.message
            : "Error de comunicación transaccional con el backend.",
      );
    } finally {
      deliveryRunningRef.current = false;
      setIsPreparingDelivery(false);
    }
  }, [
    clearOutbox,
    completeMissingJustifications,
    finalizarExamen,
    idIntento,
    isOnline,
    preguntas,
    requestFinalization,
    router,
    syncNow,
    supervision?.intentoAnulado,
    flushTelemetry,
    recordPointEvent,
  ]);

  useEffect(() => {
    if (supervision?.intentoAnulado) securityInterruptedRef.current = true;
  }, [supervision?.intentoAnulado]);

  useEffect(() => {
    if (
      !outbox.finalizeRequested ||
      outbox.answers.length > 0 ||
      syncRevision === 0 ||
      lastAutomaticSyncRevisionRef.current === syncRevision
    ) {
      return;
    }
    lastAutomaticSyncRevisionRef.current = syncRevision;
    void ejecutarCierreTransaccional();
  }, [
    ejecutarCierreTransaccional,
    outbox.answers.length,
    outbox.finalizeRequested,
    syncRevision,
  ]);

  const salirConIntentoAbierto = async () => {
    await cancelFinalization();
    const doc = document as Document & { isExitingLegitimately?: boolean };
    doc.isExitingLegitimately = true;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // La navegación controlada sigue siendo válida si el navegador rechaza la salida.
      }
    }
    router.replace("/alumno");
  };

  useEffect(() => {
    if (!idIntento || isNaN(idIntento)) return;

    const stored = sessionStorage.getItem(`examio_deadline_${idIntento}`);
    if (!stored) return;

    const deadline = parseInt(stored, 10);
    const update = () => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        ejecutarCierreTransaccional();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [ejecutarCierreTransaccional, idIntento]);

  if (!idIntento || isNaN(idIntento)) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
        Error: ID de intento inválido.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
        Ejecutando algoritmo de aleatoriedad perimetral en SQL Server...
      </div>
    );
  }

  if (supervisionQuery.isError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 text-center text-sm font-bold text-red-700">
        No pudimos confirmar las condiciones de supervisión. Recargá la página antes de continuar.
      </div>
    );
  }

  if (supervisionQuery.isLoading || !supervision) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
        Preparando las condiciones de supervisión…
      </div>
    );
  }

  return (
    <FullscreenWrapper
      idIntento={idIntento}
      supervision={supervision}
      warningDecisionId={warningDecisionId}
      telemetryDurable={telemetryDurable}
      onFullscreenViolation={recordFullscreenExit}
      onFullscreenRestored={recordFullscreenRestored}
    >
      <div className="flex flex-col h-screen max-h-screen w-full bg-slate-50 text-slate-900 select-none overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex justify-between items-center z-10 shadow-sm shrink-0">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              Entorno Seguro de Evaluación
            </span>
            <h1 className="text-base font-bold text-slate-800 tracking-tight leading-tight">
              Parcial Especializado — EXAMIO Entorno Seguro Activo
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl">
            <span className="text-sm">⏱️</span>
            <span className={`font-mono text-sm font-bold tracking-tight ${timeRemaining !== null && timeRemaining <= 120 ? 'text-red-600' : 'text-slate-700'}`}>
              {timeRemaining !== null ? `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}` : "Entorno Protegido"}
            </span>
          </div>
        </header>

        {/* Cuerpo */}
        <main className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 bg-transparent">
            <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              {children}
            </div>
          </div>

          {/* Panel de Control */}
          <div className="w-80 md:w-96 bg-white border-l border-slate-200/80 p-6 flex flex-col justify-between shadow-[-4px_0_12px_rgba(0,0,0,0.01)] shrink-0">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-2">
                📋 Registro de Respuestas
              </h2>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {preguntas?.map((_, idx) => {
                  const stepNum = idx + 1;
                  const isCurrent = stepNum === currentActivityId;
                  return (
                    <button
                      key={stepNum}
                      disabled={isDelivering}
                      onClick={() =>
                        router.push(`/alumno/examen/${id}/actividad/${stepNum}`)
                      }
                      className={`h-9 rounded-lg text-xs font-bold transition-all border ${
                        isCurrent
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm scale-105"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      } disabled:opacity-50`}
                    >
                      {stepNum}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 font-medium text-center">
                Pregunta {currentActivityId} de {totalQuestions}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentActivityId === 1 || isDelivering}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1 py-2 px-3 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={isDelivering}
                onClick={
                  currentActivityId === totalQuestions
                    ? () => setShowConfirmModal(true)
                    : handleNext
                }
                className={`text-xs font-bold transition-all flex items-center gap-1 py-2 px-4 rounded-lg shadow-sm ${
                  currentActivityId === totalQuestions
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                } disabled:opacity-50`}
              >
                {currentActivityId === totalQuestions
                  ? isDelivering
                    ? "Procesando..."
                    : "Finalizar Examen ✓"
                  : "Siguiente →"}
              </button>
            </div>
          </div>
        </main>
      </div>

      {(!isOnline || outbox.answers.length > 0 || !outbox.durable) && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,42rem)] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 shadow-lg"
        >
          {!outbox.durable
            ? "El navegador no permite almacenamiento durable. No cierres ni recargues esta pestaña."
            : !isOnline
              ? `Sin conexión. ${outbox.answers.length} respuesta(s) permanecen pendientes en este dispositivo.`
              : `${outbox.answers.length} respuesta(s) pendiente(s) de sincronización.`}
          {isOnline && outbox.answers.length > 0 && (
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={isSyncing}
              className="ml-2 underline underline-offset-2 disabled:opacity-50"
            >
              {isSyncing ? "Sincronizando…" : "Reintentar ahora"}
            </button>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN IN-DOM */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center">
              {/* Ícono Dinámico según el estado */}
              <div
                className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 border ${
                  errorServidor
                    ? "bg-rose-50 border-rose-100 text-rose-600"
                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                }`}
              >
                {errorServidor ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {errorServidor
                  ? "Falla en la Entrega"
                  : "¿Confirmás la entrega definitiva?"}
              </h3>

              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {errorServidor
                  ? "El servidor central rechazó la operación. El intento sigue abierto y protegido, no perdiste tus respuestas."
                  : "Se enviarán todas tus respuestas guardadas al servidor central. Las justificaciones obligatorias que dejes vacías se registrarán como “Sin respuesta”."}
              </p>

              {/* Alerta interna sin romper el foco */}
              {errorServidor && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-left">
                  <span className="block font-mono text-[10px] font-bold text-rose-700 uppercase">
                    Detalle del Backend:
                  </span>
                  <span className="block font-medium text-[11px] text-rose-600 mt-0.5 leading-tight">
                    {errorServidor}
                  </span>
                </div>
              )}

              <div className="flex gap-3 w-full mt-6">
                <Button
                  disabled={isDelivering}
                  onClick={() => {
                    void cancelFinalization();
                    setShowConfirmModal(false);
                    setErrorServidor(null);
                  }}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-700 py-2.5 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  {errorServidor ? "Cerrar" : "Seguir revisando"}
                </Button>

                <Button
                  onClick={ejecutarCierreTransaccional}
                  disabled={isDelivering}
                  className={`w-full text-white py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all ${
                    errorServidor
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  } disabled:opacity-50`}
                >
                  {isDelivering
                    ? "Procesando..."
                    : errorServidor
                      ? "Reintentar Entrega"
                      : "Entregar Examen"}
                </Button>
              </div>

              {errorServidor && (
                <button
                  type="button"
                  onClick={salirConIntentoAbierto}
                  className="mt-4 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-700"
                >
                  Salir al panel y mantener el intento abierto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </FullscreenWrapper>
  );
}
