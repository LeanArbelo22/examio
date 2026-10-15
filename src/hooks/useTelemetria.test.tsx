import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { enqueueTelemetryEvent } from "@/lib/telemetry-event-outbox";
import {
  anularIntentoPorIncidente,
  guardarEventosTemporalesLote,
} from "@/services/api/evaluaciones.api";
import { useAttemptCancellation, useExamTemporalTelemetry } from "./useTelemetria";

vi.mock("@/services/api/evaluaciones.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/evaluaciones.api")>();
  return {
    ...actual,
    guardarEventosTemporalesLote: vi.fn(),
    anularIntentoPorIncidente: vi.fn(),
  };
});

const batchMock = vi.mocked(guardarEventosTemporalesLote);
const cancelMock = vi.mocked(anularIntentoPorIncidente);

describe("temporal exam telemetry", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    sessionStorage.clear();
    batchMock.mockReset().mockImplementation(async (_idIntento, eventos) => ({
      resultados: eventos.map((event) => ({
        eventoId: event.EventoId,
        resultado: event.FechaFinCliente ? "actualizado" as const : "creado" as const,
      })),
    }));
    cancelMock.mockReset().mockResolvedValue({
      idIntento: 74,
      eventoId: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      tipoIncidente: "focus_lost",
      motivo: "POLICY_FIRST_FOCUS_LOSS",
      estado: "anulado",
      replay: false,
    });
  });

  it("abre y cierra el mismo evento de foco", async () => {
    renderHook(() => useExamTemporalTelemetry(73, 83));

    fireEvent.blur(window);
    fireEvent.focus(window);

    await waitFor(() => {
      const focusEvents = batchMock.mock.calls
        .flatMap((call) => call[1])
        .filter((event) => event.Tipo === "focus_lost");
      expect(focusEvents.some((event) => event.FechaFinCliente)).toBe(true);
    });

    const focusEvents = batchMock.mock.calls
      .flatMap((call) => call[1])
      .filter((event) => event.Tipo === "focus_lost");
    expect(new Set(focusEvents.map((event) => event.EventoId)).size).toBe(1);
    expect(new Set(focusEvents.map((event) => event.SecuenciaCliente)).size).toBe(1);
  });

  it("registra una sola vez el inicio ante montajes repetidos del mismo documento", async () => {
    const firstRender = renderHook(() => useExamTemporalTelemetry(76, 86));

    await waitFor(() => {
      const startEvents = batchMock.mock.calls
        .flatMap((call) => call[1])
        .filter((event) => event.Tipo === "exam_resumed");
      expect(startEvents).toHaveLength(1);
      expect(startEvents[0].Codigo).toBe("initial_start");
    });

    firstRender.unmount();
    renderHook(() => useExamTemporalTelemetry(76, 86));

    await waitFor(() => {
      const startEvents = batchMock.mock.calls
        .flatMap((call) => call[1])
        .filter((event) => event.Tipo === "exam_resumed");
      expect(startEvents).toHaveLength(1);
    });
  });

  it("sincroniza respuestas y telemetría antes de solicitar la anulación", async () => {
    const eventoId = "4e096ceb-51fd-49a1-8f80-c3760edaf021";
    const synchronizeAnswers = vi.fn().mockResolvedValue({});
    await enqueueTelemetryEvent(74, {
      Tipo: "focus_lost",
      FechaInicioCliente: "2026-10-14T14:00:00.000Z",
    }, eventoId);
    const { result } = renderHook(() =>
      useAttemptCancellation(74, synchronizeAnswers),
    );

    act(() => {
      result.current.requestCancellation({
        eventoId,
        tipoIncidente: "focus_lost",
      });
    });

    await waitFor(() => expect(result.current.status).toBe("cancelled"));
    const attemptBatchIndex = batchMock.mock.calls.findIndex(
      (call) => call[0] === 74 && call[1].some((event) => event.EventoId === eventoId),
    );
    expect(attemptBatchIndex).toBeGreaterThanOrEqual(0);
    expect(synchronizeAnswers.mock.invocationCallOrder[0]).toBeLessThan(
      batchMock.mock.invocationCallOrder[attemptBatchIndex],
    );
    expect(batchMock.mock.invocationCallOrder[attemptBatchIndex]).toBeLessThan(
      cancelMock.mock.invocationCallOrder[0],
    );
    expect(cancelMock).toHaveBeenCalledWith(74, eventoId);
  });

  it("reintenta la anulación con el mismo evento ante una carrera de sincronización", async () => {
    const eventoId = "5a858777-04f1-45b5-b074-5cf542e1bca9";
    cancelMock.mockRejectedValueOnce(
      new ApiError(
        "El incidente todavía no está disponible",
        409,
        "INCIDENT_EVENT_NOT_ELIGIBLE",
      ),
    );
    await enqueueTelemetryEvent(75, {
      Tipo: "focus_lost",
      FechaInicioCliente: "2026-10-14T14:00:00.000Z",
    }, eventoId);
    const { result } = renderHook(() =>
      useAttemptCancellation(75, vi.fn().mockResolvedValue({})),
    );

    act(() => {
      result.current.requestCancellation({ eventoId, tipoIncidente: "focus_lost" });
    });

    await waitFor(() => expect(result.current.status).toBe("cancelled"));
    expect(cancelMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(cancelMock.mock.calls.every((call) => call[1] === eventoId)).toBe(true);
  });
});
