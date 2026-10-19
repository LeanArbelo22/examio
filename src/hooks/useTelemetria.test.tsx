import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  guardarEventosTemporalesLote,
} from "@/services/api/evaluaciones.api";
import { useExamTemporalTelemetry } from "./useTelemetria";

vi.mock("@/services/api/evaluaciones.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/evaluaciones.api")>();
  return {
    ...actual,
    guardarEventosTemporalesLote: vi.fn(),
  };
});

const batchMock = vi.mocked(guardarEventosTemporalesLote);

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

  it("conserva y cierra el mismo evento al volver a pantalla completa", async () => {
    const { result } = renderHook(() => useExamTemporalTelemetry(74, 84));

    act(() => result.current.recordFullscreenExit());

    await waitFor(() => {
      const fullscreenEvents = batchMock.mock.calls
        .flatMap((call) => call[1])
        .filter((event) => event.Tipo === "fullscreen_exit");
      expect(fullscreenEvents.some((event) => !event.FechaFinCliente)).toBe(true);
    });

    act(() => result.current.recordFullscreenRestored());

    await waitFor(() => {
      const fullscreenEvents = batchMock.mock.calls
        .flatMap((call) => call[1])
        .filter((event) => event.Tipo === "fullscreen_exit");
      expect(fullscreenEvents.some((event) => event.FechaFinCliente)).toBe(true);
      expect(new Set(fullscreenEvents.map((event) => event.EventoId)).size).toBe(1);
      expect(new Set(fullscreenEvents.map((event) => event.SecuenciaCliente)).size).toBe(1);
    });
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

  it("entrega al runtime la consecuencia autoritativa devuelta por la API", async () => {
    const onSupervision = vi.fn();
    batchMock.mockImplementation(async (_idIntento, eventos) => ({
      resultados: eventos.map((event) => ({
        eventoId: event.EventoId,
        resultado: "creado" as const,
        supervision: {
          accion: "bloquear_interfaz" as const,
          estado: "bloqueado" as const,
          interaccionBloqueada: true,
          intentoAnulado: false,
          decisionId: 81,
          replay: false,
        },
      })),
    }));

    renderHook(() => useExamTemporalTelemetry(77, 87, true, onSupervision));
    fireEvent.blur(window);

    await waitFor(() => expect(onSupervision).toHaveBeenCalledWith(expect.objectContaining({
      accion: "bloquear_interfaz",
      interaccionBloqueada: true,
    })));
  });

});
