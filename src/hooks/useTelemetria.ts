"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import {
  enqueueAttemptCancellation,
  failAttemptCancellation,
  getAttemptCancellation,
  isAttemptCancellationOutboxDurable,
  removeAttemptCancellation,
  subscribeAttemptCancellation,
} from "@/lib/attempt-cancellation-outbox";
import {
  acknowledgeTelemetryEvent,
  completeTelemetryEvent,
  createTelemetryEventId,
  enqueueTelemetryEvent,
  failTelemetryEvent,
  isTelemetryOutboxDurable,
  listTelemetryEvents,
  subscribeTelemetryOutbox,
  type TelemetryOutboxRecord,
} from "@/lib/telemetry-event-outbox";
import { intentoKeys, isValidId } from "@/lib/query-keys";
import {
  anularIntentoPorIncidente,
  guardarEventosTemporalesLote,
  obtenerEventosTemporales,
} from "@/services/api/evaluaciones.api";
import type { TipoEventoTelemetria, TipoIncidenteSeguridad } from "@/types";

const telemetrySyncOperations = new Map<number, Promise<void>>();
const telemetrySyncReruns = new Set<number>();

export interface SecurityViolationEvent {
  eventoId: string;
  tipoIncidente: TipoIncidenteSeguridad;
}

export type AttemptCancellationStatus =
  | "idle"
  | "pending"
  | "cancelled"
  | "failed";

export async function synchronizeTemporalEvents(idIntento: number): Promise<void> {
  const current = telemetrySyncOperations.get(idIntento);
  if (current) {
    telemetrySyncReruns.add(idIntento);
    await current;
    if (telemetrySyncReruns.delete(idIntento)) {
      return synchronizeTemporalEvents(idIntento);
    }
    return;
  }

  const operation = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const pending = (await listTelemetryEvents(idIntento))
      .filter((record) => record.state === "pending")
      .slice(0, 500);
    if (pending.length === 0) return;
    const response = await guardarEventosTemporalesLote(
      idIntento,
      pending.map((record) => ({
        EventoId: record.eventoId,
        ...record.payload,
      })),
    );
    const recordsByEvent = new Map(pending.map((record) => [record.eventoId, record]));
    for (const result of response.resultados) {
      if (!result.eventoId) continue;
      const record = recordsByEvent.get(result.eventoId);
      if (!record) continue;
      if (["creado", "actualizado", "replay"].includes(result.resultado)) {
        await acknowledgeTelemetryEvent(record);
      } else {
        await failTelemetryEvent(
          record,
          result.message ?? result.codigo ?? "Evento de telemetría rechazado",
        );
      }
    }
  })().finally(() => telemetrySyncOperations.delete(idIntento));
  telemetrySyncOperations.set(idIntento, operation);
  return operation;
}

interface ActiveTelemetryInterval {
  eventoId: string;
  inicioMs: number;
  record: Promise<TelemetryOutboxRecord>;
}

export function useExamTemporalTelemetry(
  idIntento: number,
  idIntentoPregunta: number | undefined,
  enabled = true,
  onViolation?: (event: SecurityViolationEvent) => void,
): {
  recordFullscreenExit: () => void;
  recordPointEvent: (tipo: TipoEventoTelemetria, codigo?: string) => Promise<void>;
  flushTelemetry: () => Promise<void>;
  durable: boolean;
} {
  const activeFocus = useRef<ActiveTelemetryInterval | null>(null);
  const activeConnectivity = useRef<ActiveTelemetryInterval | null>(null);
  const activeQuestion = useRef<ActiveTelemetryInterval | null>(null);

  const enqueueInterval = useCallback((
    tipo: "focus_lost" | "connectivity_lost" | "question_active",
    questionId?: number,
    eventoId = createTelemetryEventId(),
  ): ActiveTelemetryInterval => {
    const inicioMs = Date.now();
    return {
      eventoId,
      inicioMs,
      record: enqueueTelemetryEvent(idIntento, {
        Tipo: tipo,
        IdIntentoPregunta: questionId,
        FechaInicioCliente: new Date(inicioMs).toISOString(),
      }, eventoId),
    };
  }, [idIntento]);

  const closeInterval = useCallback(async (active: ActiveTelemetryInterval) => {
    const record = await active.record;
    const finMs = Math.max(Date.now(), active.inicioMs);
    await completeTelemetryEvent(
      record,
      new Date(finMs).toISOString(),
      finMs - active.inicioMs,
    );
    await synchronizeTemporalEvents(idIntento).catch(() => undefined);
  }, [idIntento]);

  const startIncident = useCallback(() => {
    if (!enabled || !isValidId(idIntento) || activeFocus.current) return;
    const eventoId = createTelemetryEventId();
    activeFocus.current = enqueueInterval("focus_lost", undefined, eventoId);
    onViolation?.({ eventoId, tipoIncidente: "focus_lost" });
    void activeFocus.current.record
      .then(() => synchronizeTemporalEvents(idIntento))
      .catch(() => undefined);
  }, [enabled, enqueueInterval, idIntento, onViolation]);

  const finishIncident = useCallback(() => {
    const active = activeFocus.current;
    if (!active || !enabled || !isValidId(idIntento)) return;
    activeFocus.current = null;
    void closeInterval(active);
  }, [closeInterval, enabled, idIntento]);

  const recordFullscreenExit = useCallback(() => {
    if (!enabled || !isValidId(idIntento)) return;
    const now = new Date().toISOString();
    const eventoId = createTelemetryEventId();
    onViolation?.({ eventoId, tipoIncidente: "fullscreen_exit" });
    void enqueueTelemetryEvent(idIntento, {
      Tipo: "fullscreen_exit",
      FechaInicioCliente: now,
      FechaFinCliente: now,
      DuracionMilisegundos: 0,
    }, eventoId)
      .then(() => synchronizeTemporalEvents(idIntento))
      .catch(() => undefined);
  }, [enabled, idIntento, onViolation]);

  const recordPointEvent = useCallback(async (
    tipo: TipoEventoTelemetria,
    codigo?: string,
  ) => {
    if (!enabled || !isValidId(idIntento)) return;
    const timestamp = new Date().toISOString();
    const instantInterval = tipo === "auth_session_unavailable";
    await enqueueTelemetryEvent(idIntento, {
      Tipo: tipo,
      FechaInicioCliente: timestamp,
      ...(instantInterval
        ? { FechaFinCliente: timestamp, DuracionMilisegundos: 0 }
        : {}),
      Codigo: codigo,
    });
    await synchronizeTemporalEvents(idIntento).catch(() => undefined);
  }, [enabled, idIntento]);

  useEffect(() => {
    if (!enabled || !isValidId(idIntento)) return;
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const documentMarkerKey = `examio_telemetry_document_${idIntento}`;
    const attemptStartedKey = `examio_telemetry_started_${idIntento}`;
    const documentMarker = String(performance.timeOrigin);
    if (sessionStorage.getItem(documentMarkerKey) !== documentMarker) {
      sessionStorage.setItem(documentMarkerKey, documentMarker);
      const attemptWasStarted = sessionStorage.getItem(attemptStartedKey) === "true";
      if (!attemptWasStarted) {
        sessionStorage.setItem(attemptStartedKey, "true");
        void recordPointEvent("exam_resumed", "initial_start");
      } else if (navigation?.type === "reload") {
        void recordPointEvent("page_reload", "browser_reload")
          .then(() => recordPointEvent("exam_resumed", "after_reload"));
      } else {
        void recordPointEvent("exam_resumed", "attempt_return");
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") startIncident();
      else finishIncident();
    };
    const onBlur = () => startIncident();
    const onFocus = () => {
      if (document.visibilityState === "visible") finishIncident();
    };
    const onOffline = () => {
      if (!activeConnectivity.current) {
        activeConnectivity.current = enqueueInterval("connectivity_lost");
      }
    };
    const onOnline = () => {
      const active = activeConnectivity.current;
      activeConnectivity.current = null;
      if (active) {
        void closeInterval(active)
          .then(() => recordPointEvent("exam_resumed", "after_connectivity"));
      }
      else void synchronizeTemporalEvents(idIntento);
    };
    const onPageHide = () => {
      const intervals = [
        activeFocus.current,
        activeConnectivity.current,
        activeQuestion.current,
      ].filter((active): active is ActiveTelemetryInterval => active !== null);
      activeFocus.current = null;
      activeConnectivity.current = null;
      activeQuestion.current = null;
      intervals.forEach((active) => void closeInterval(active));
    };

    if (!navigator.onLine) onOffline();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [closeInterval, enabled, enqueueInterval, finishIncident, idIntento, recordPointEvent, startIncident]);

  useEffect(() => {
    if (!enabled || !isValidId(idIntento) || !isValidId(idIntentoPregunta)) return;
    const active = enqueueInterval("question_active", idIntentoPregunta);
    activeQuestion.current = active;
    void active.record
      .then(() => synchronizeTemporalEvents(idIntento))
      .catch(() => undefined);
    return () => {
      if (activeQuestion.current?.eventoId === active.eventoId) {
        activeQuestion.current = null;
        void closeInterval(active);
      }
    };
  }, [closeInterval, enabled, enqueueInterval, idIntento, idIntentoPregunta]);

  useEffect(() => {
    if (!enabled || !isValidId(idIntento)) return;
    const sync = () => void synchronizeTemporalEvents(idIntento).catch(() => undefined);
    const unsubscribe = subscribeTelemetryOutbox(sync);
    const interval = window.setInterval(sync, 10_000);
    sync();
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [enabled, idIntento]);

  return {
    recordFullscreenExit,
    recordPointEvent,
    flushTelemetry: () => synchronizeTemporalEvents(idIntento),
    durable: isTelemetryOutboxDurable(),
  };
}

function isRetryableCancellationError(error: unknown): boolean {
  return error instanceof ApiError && (
    error.code === "INCIDENT_EVENT_NOT_ELIGIBLE" ||
    error.statusCode === 0 ||
    error.statusCode === 404 ||
    error.statusCode === 408 ||
    error.statusCode === 429 ||
    error.statusCode >= 500
  );
}

export function useAttemptCancellation(
  idIntento: number,
  synchronizeAnswers: () => Promise<unknown>,
) {
  const [status, setStatus] = useState<AttemptCancellationStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const firstViolation = useRef<SecurityViolationEvent | null>(null);
  const synchronizing = useRef<Promise<void> | null>(null);

  const synchronizeCancellation = useCallback(async () => {
    if (!isValidId(idIntento)) return;
    if (synchronizing.current) return synchronizing.current;

    const operation = (async () => {
      const record = await getAttemptCancellation(idIntento);
      if (!record || record.state === "failed") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("pending");
        return;
      }

      setStatus("pending");
      setLastError(null);
      try {
        try {
          await synchronizeAnswers();
        } catch {
          if (typeof navigator !== "undefined" && !navigator.onLine) return;
          // Un conflicto de una respuesta no puede impedir la anulación autoritativa.
        }
        await synchronizeTemporalEvents(idIntento);
        await anularIntentoPorIncidente(idIntento, record.eventoId);
        await removeAttemptCancellation(record);
        setStatus("cancelled");
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === "ATTEMPT_ALREADY_CANCELLED"
        ) {
          await removeAttemptCancellation(record);
          setStatus("cancelled");
          return;
        }
        if (isRetryableCancellationError(error)) {
          setStatus("pending");
          setLastError(error instanceof Error ? error.message : null);
          return;
        }
        const message = error instanceof Error
          ? error.message
          : "No se pudo anular el intento";
        await failAttemptCancellation(record, message);
        setStatus("failed");
        setLastError(message);
      }
    })().finally(() => {
      synchronizing.current = null;
    });
    synchronizing.current = operation;
    return operation;
  }, [idIntento, synchronizeAnswers]);

  const requestCancellation = useCallback((event: SecurityViolationEvent) => {
    if (firstViolation.current || !isValidId(idIntento)) return;
    firstViolation.current = event;
    setStatus("pending");
    void enqueueAttemptCancellation(
      idIntento,
      event.eventoId,
      event.tipoIncidente,
    ).then(() => synchronizeCancellation());
  }, [idIntento, synchronizeCancellation]);

  useEffect(() => {
    if (!isValidId(idIntento)) return;
    const restore = async () => {
      const record = await getAttemptCancellation(idIntento);
      if (!record) return;
      firstViolation.current = {
        eventoId: record.eventoId,
        tipoIncidente: record.tipoIncidente,
      };
      setStatus(record.state === "failed" ? "failed" : "pending");
      setLastError(record.lastError ?? null);
      if (record.state === "pending") await synchronizeCancellation();
    };
    const timer = window.setTimeout(() => void restore(), 0);
    const unsubscribe = subscribeAttemptCancellation(() => void restore());
    const onOnline = () => void synchronizeCancellation();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      window.removeEventListener("online", onOnline);
    };
  }, [idIntento, synchronizeCancellation]);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = window.setInterval(() => {
      void synchronizeCancellation();
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [status, synchronizeCancellation]);

  return {
    status,
    lastError,
    isInterrupted: status !== "idle",
    durable: isAttemptCancellationOutboxDurable(),
    requestCancellation,
    synchronizeCancellation,
  };
}

export const useEventosTemporales = (
  idIntento: number,
  pagina = 1,
  limite = 50,
) => useQuery({
  queryKey: intentoKeys.eventosTemporales(idIntento, pagina, limite),
  queryFn: () => obtenerEventosTemporales(idIntento, pagina, limite),
  enabled: isValidId(idIntento),
});
