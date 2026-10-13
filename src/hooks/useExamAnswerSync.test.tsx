import { IDBFactory } from "fake-indexeddb";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearExamOutbox,
  enqueuePendingAnswer,
  getPendingAnswer,
} from "@/lib/exam-answer-outbox";
import { evaluacionKeys } from "@/lib/query-keys";
import { guardarRespuestaAtomica } from "@/services/api/evaluaciones.api";
import { createQueryTestHarness } from "@/test/query-client";
import { useExamAnswerSync } from "./useEvaluaciones";

vi.mock("@/services/api/evaluaciones.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/evaluaciones.api")>();
  return { ...actual, guardarRespuestaAtomica: vi.fn() };
});

const guardarMock = vi.mocked(guardarRespuestaAtomica);

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

describe("useExamAnswerSync", () => {
  beforeAll(() => vi.stubGlobal("indexedDB", new IDBFactory()));
  afterAll(() => vi.unstubAllGlobals());

  beforeEach(() => {
    guardarMock.mockReset();
    setOnline(false);
  });

  it("mantiene respuesta y solicitud de entrega cuando está offline", async () => {
    const idIntento = 901;
    await enqueuePendingAnswer({
      IdIntento: idIntento,
      IdPregunta: 15,
      IdOpcionesSeleccionadas: [],
      RtaTexto: "respuesta offline",
      Justificacion: null,
      RevisionEsperada: 0,
      EventoId: "00000000-0000-4000-8000-000000000901",
    });
    const { wrapper } = createQueryTestHarness();
    const { result } = renderHook(() => useExamAnswerSync(idIntento), { wrapper });

    await waitFor(() => expect(result.current.snapshot.answers).toHaveLength(1));
    await act(() => result.current.requestFinalization());
    await waitFor(() => expect(result.current.snapshot.finalizeRequested).toBe(true));

    const synchronization = await act(() => result.current.syncNow());
    expect(synchronization.snapshot.answers).toHaveLength(1);
    expect(guardarMock).not.toHaveBeenCalled();
    expect(result.current.isOnline).toBe(false);
    await clearExamOutbox(idIntento);
  });

  it("registra Sin respuesta para una justificación obligatoria vacía", async () => {
    const idIntento = 903;
    const { wrapper } = createQueryTestHarness();
    const { result } = renderHook(() => useExamAnswerSync(idIntento), { wrapper });

    await act(() => result.current.completeMissingJustifications([{
      idPregunta: 17,
      enunciado: "Elegí las opciones correctas",
      tipo: "multiple",
      modoJustificacion: "obligatoria",
      respuesta: {
        idRespuesta: 60,
        idsOpcionesSeleccionadas: [4, 5],
        rtaTexto: null,
        justificacion: null,
        revision: 2,
      },
    }]));

    await expect(getPendingAnswer(idIntento, 17)).resolves.toMatchObject({
      state: "pending",
      payload: {
        IdOpcionesSeleccionadas: [4, 5],
        Justificacion: "Sin respuesta",
        RevisionEsperada: 2,
      },
    });
    await clearExamOutbox(idIntento);
  });

  it("sincroniza una sola vez ante llamadas concurrentes y actualiza la query relacionada", async () => {
    const idIntento = 902;
    await enqueuePendingAnswer({
      IdIntento: idIntento,
      IdPregunta: 16,
      IdOpcionesSeleccionadas: [9],
      RtaTexto: null,
      Justificacion: null,
      RevisionEsperada: 0,
      EventoId: "00000000-0000-4000-8000-000000000902",
    });
    let resolveRequest: (() => void) | undefined;
    guardarMock.mockImplementation(
      () => new Promise((resolve) => {
        resolveRequest = () => resolve({
          idRespuesta: 55,
          idIntento,
          idPregunta: 16,
          idsOpcionesSeleccionadas: [9],
          rtaTexto: null,
          justificacion: null,
          revision: 1,
          replay: false,
        });
      }),
    );
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();
    const { result } = renderHook(() => useExamAnswerSync(idIntento), { wrapper });
    await waitFor(() => expect(result.current.snapshot.answers).toHaveLength(1));

    setOnline(true);
    let first!: Awaited<ReturnType<typeof result.current.syncNow>>;
    let second!: Awaited<ReturnType<typeof result.current.syncNow>>;
    await act(async () => {
      const firstPromise = result.current.syncNow();
      const secondPromise = result.current.syncNow();
      await waitFor(() => expect(guardarMock).toHaveBeenCalledOnce());
      resolveRequest?.();
      [first, second] = await Promise.all([firstPromise, secondPromise]);
    });

    expect(first.snapshot.answers).toEqual([]);
    expect(second.snapshot.answers).toEqual([]);
    expect(guardarMock).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: evaluacionKeys.opciones(idIntento, 16),
    });
    await clearExamOutbox(idIntento);
  });
});
