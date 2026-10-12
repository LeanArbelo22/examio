import { fireEvent, renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardarIncidenteFoco } from "@/services/api/evaluaciones.api";
import { useFocusIncidentTracking } from "./useTelemetria";

vi.mock("@/services/api/evaluaciones.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/evaluaciones.api")>();
  return { ...actual, guardarIncidenteFoco: vi.fn() };
});

const guardarMock = vi.mocked(guardarIncidenteFoco);

describe("useFocusIncidentTracking", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    guardarMock.mockReset();
    guardarMock.mockResolvedValue({
      id: 1,
      eventoId: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      idIntento: 73,
      tipo: "focus_lost",
      fechaInicioCliente: "2026-10-12T10:15:00.000Z",
      fechaFinCliente: null,
      duracionMilisegundos: null,
      fechaRecepcionInicio: "2026-10-12T10:15:00.000Z",
      fechaRecepcionFin: null,
      estado: "iniciado",
    });
  });

  it("deduplica blur/visibility y completa el mismo evento al volver", async () => {
    renderHook(() => useFocusIncidentTracking(73));

    fireEvent.blur(window);
    fireEvent.blur(window);
    fireEvent.focus(window);

    await waitFor(() =>
      expect(guardarMock).toHaveBeenCalledWith(
        73,
        expect.any(String),
        expect.objectContaining({
          Tipo: "focus_lost",
          FechaInicioCliente: expect.any(String),
          FechaFinCliente: expect.any(String),
          DuracionMilisegundos: expect.any(Number),
        }),
      ),
    );
    const eventIds = guardarMock.mock.calls.map((call) => call[1]);
    expect(new Set(eventIds).size).toBe(1);
  });
});
