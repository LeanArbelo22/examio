"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import {
  failFocusIncident,
  listFocusIncidents,
  removeFocusIncident,
  saveFocusIncident,
} from "@/lib/focus-incident-outbox";
import { intentoKeys, isValidId } from "@/lib/query-keys";
import {
  guardarIncidenteFoco,
  obtenerIncidentesFoco,
  obtenerResumenIncidentesFoco,
} from "@/services/api/evaluaciones.api";

const syncOperations = new Map<number, Promise<void>>();
const syncReruns = new Set<number>();

function createUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isTerminalFocusError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500;
}

async function synchronizeFocusIncidents(idIntento: number): Promise<void> {
  const current = syncOperations.get(idIntento);
  if (current) {
    syncReruns.add(idIntento);
    await current;
    if (syncReruns.delete(idIntento)) {
      return synchronizeFocusIncidents(idIntento);
    }
    return;
  }

  const operation = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const incidents = await listFocusIncidents(idIntento);
    for (const incident of incidents) {
      if (incident.state === "failed") continue;
      try {
        await guardarIncidenteFoco(
          incident.idIntento,
          incident.eventoId,
          incident.payload,
        );
        await removeFocusIncident(incident);
      } catch (error) {
        if (isTerminalFocusError(error)) {
          await failFocusIncident(
            incident,
            error instanceof Error ? error.message : "Incidente rechazado",
          );
          continue;
        }
        break;
      }
    }
  })().finally(() => syncOperations.delete(idIntento));
  syncOperations.set(idIntento, operation);
  return operation;
}

export function useFocusIncidentTracking(
  idIntento: number,
  enabled = true,
): void {
  const activeIncident = useRef<{
    eventoId: string;
    fechaInicioCliente: string;
    inicioMs: number;
  } | null>(null);

  const startIncident = useCallback(() => {
    if (!enabled || !isValidId(idIntento) || activeIncident.current) return;
    const inicioMs = Date.now();
    const eventoId = createUuid();
    const fechaInicioCliente = new Date(inicioMs).toISOString();
    activeIncident.current = { eventoId, fechaInicioCliente, inicioMs };
    void saveFocusIncident(idIntento, eventoId, {
      Tipo: "focus_lost",
      FechaInicioCliente: fechaInicioCliente,
    }).then(() => synchronizeFocusIncidents(idIntento));
  }, [enabled, idIntento]);

  const finishIncident = useCallback(() => {
    const active = activeIncident.current;
    if (!active || !enabled || !isValidId(idIntento)) return;
    activeIncident.current = null;
    const finMs = Math.max(Date.now(), active.inicioMs);
    void saveFocusIncident(idIntento, active.eventoId, {
      Tipo: "focus_lost",
      FechaInicioCliente: active.fechaInicioCliente,
      FechaFinCliente: new Date(finMs).toISOString(),
      DuracionMilisegundos: finMs - active.inicioMs,
    }).then(() => synchronizeFocusIncidents(idIntento));
  }, [enabled, idIntento]);

  useEffect(() => {
    if (!enabled || !isValidId(idIntento)) return;
    let cancelled = false;
    void listFocusIncidents(idIntento).then((incidents) => {
      if (cancelled) return;
      const open = [...incidents].reverse().find(
        (incident) =>
          incident.state === "pending" &&
          !incident.payload.FechaFinCliente &&
          incident.payload.FechaInicioCliente,
      );
      if (open && !activeIncident.current) {
        const inicioMs = new Date(open.payload.FechaInicioCliente!).getTime();
        activeIncident.current = {
          eventoId: open.eventoId,
          fechaInicioCliente: open.payload.FechaInicioCliente!,
          inicioMs,
        };
        if (document.visibilityState === "visible") finishIncident();
      }
      void synchronizeFocusIncidents(idIntento);
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") startIncident();
      else finishIncident();
    };
    const onBlur = () => startIncident();
    const onFocus = () => {
      if (document.visibilityState === "visible") finishIncident();
    };
    const onOnline = () => void synchronizeFocusIncidents(idIntento);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, finishIncident, idIntento, startIncident]);
}

export const useResumenIncidentesFoco = (idIntento: number) =>
  useQuery({
    queryKey: intentoKeys.resumenFoco(idIntento),
    queryFn: () => obtenerResumenIncidentesFoco(idIntento),
    enabled: isValidId(idIntento),
  });

export const useIncidentesFoco = (idIntento: number) =>
  useQuery({
    queryKey: intentoKeys.incidentesFoco(idIntento),
    queryFn: () => obtenerIncidentesFoco(idIntento),
    enabled: isValidId(idIntento),
  });
