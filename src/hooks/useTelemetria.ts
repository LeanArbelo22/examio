"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
  guardarEventosTemporalesLote,
  obtenerEventosTemporales,
} from "@/services/api/evaluaciones.api";
import type {
  InstruccionSupervision,
  TipoEventoTelemetria,
} from "@/types";

const telemetrySyncOperations = new Map<number, Promise<void>>();
const telemetrySyncReruns = new Set<number>();
const supervisionSubscribers = new Map<
  number,
  Set<(instruction: InstruccionSupervision) => void>
>();

function publishSupervision(idIntento: number, instruction?: InstruccionSupervision) {
  if (!instruction) return;
  supervisionSubscribers.get(idIntento)?.forEach((subscriber) => subscriber(instruction));
}

function subscribeSupervision(
  idIntento: number,
  subscriber: (instruction: InstruccionSupervision) => void,
) {
  const subscribers = supervisionSubscribers.get(idIntento) ?? new Set();
  subscribers.add(subscriber);
  supervisionSubscribers.set(idIntento, subscribers);
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) supervisionSubscribers.delete(idIntento);
  };
}

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
        publishSupervision(idIntento, result.supervision);
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
  onSupervision?: (instruction: InstruccionSupervision) => void,
): {
  recordFullscreenExit: () => void;
  recordFullscreenRestored: () => void;
  recordPointEvent: (tipo: TipoEventoTelemetria, codigo?: string) => Promise<void>;
  flushTelemetry: () => Promise<void>;
  durable: boolean;
} {
  const activeFocus = useRef<ActiveTelemetryInterval | null>(null);
  const activeConnectivity = useRef<ActiveTelemetryInterval | null>(null);
  const activeQuestion = useRef<ActiveTelemetryInterval | null>(null);
  const activeFullscreen = useRef<ActiveTelemetryInterval | null>(null);

  const enqueueInterval = useCallback((
    tipo: "focus_lost" | "fullscreen_exit" | "connectivity_lost" | "question_active",
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
    activeFocus.current = enqueueInterval("focus_lost");
    void activeFocus.current.record
      .then(() => synchronizeTemporalEvents(idIntento))
      .catch(() => undefined);
  }, [enabled, enqueueInterval, idIntento]);

  const finishIncident = useCallback(() => {
    const active = activeFocus.current;
    if (!active || !enabled || !isValidId(idIntento)) return;
    activeFocus.current = null;
    void closeInterval(active);
  }, [closeInterval, enabled, idIntento]);

  const recordFullscreenExit = useCallback(() => {
    if (!enabled || !isValidId(idIntento) || activeFullscreen.current) return;
    activeFullscreen.current = enqueueInterval("fullscreen_exit");
    void activeFullscreen.current.record
      .then(() => synchronizeTemporalEvents(idIntento))
      .catch(() => undefined);
  }, [enabled, enqueueInterval, idIntento]);

  const recordFullscreenRestored = useCallback(() => {
    const active = activeFullscreen.current;
    if (!active || !enabled || !isValidId(idIntento)) return;
    activeFullscreen.current = null;
    void closeInterval(active);
  }, [closeInterval, enabled, idIntento]);

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
        activeFullscreen.current,
      ].filter((active): active is ActiveTelemetryInterval => active !== null);
      activeFocus.current = null;
      activeConnectivity.current = null;
      activeQuestion.current = null;
      activeFullscreen.current = null;
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

  useEffect(() => {
    if (!enabled || !isValidId(idIntento) || !onSupervision) return;
    return subscribeSupervision(idIntento, onSupervision);
  }, [enabled, idIntento, onSupervision]);

  return {
    recordFullscreenExit,
    recordFullscreenRestored,
    recordPointEvent,
    flushTelemetry: () => synchronizeTemporalEvents(idIntento),
    durable: isTelemetryOutboxDurable(),
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
