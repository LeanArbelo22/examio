import { IDBFactory } from "fake-indexeddb";
import { act, renderHook } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearExamOutbox,
  getExamOutboxSnapshot,
} from "@/lib/exam-answer-outbox";
import { evaluacionKeys } from "@/lib/query-keys";
import { createQueryTestHarness } from "@/test/query-client";
import { guardarRespuestaAtomica } from "@/services/api/evaluaciones.api";
import type { OpcionSorteada } from "@/types";
import { useGuardarRespuesta } from "./useEvaluaciones";

vi.mock("@/services/api/evaluaciones.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/evaluaciones.api")>();
  return { ...actual, guardarRespuestaAtomica: vi.fn() };
});

const guardarMock = vi.mocked(guardarRespuestaAtomica);
const options: OpcionSorteada[] = [
  { idOpcion: 8, texto: "A", fueSeleccionada: true },
  { idOpcion: 9, texto: "B", fueSeleccionada: false },
];

describe("useGuardarRespuesta", () => {
  beforeAll(() => vi.stubGlobal("indexedDB", new IDBFactory()));
  afterAll(() => vi.unstubAllGlobals());

  beforeEach(() => guardarMock.mockReset());

  it("actualiza la opción optimísticamente y confirma la misma versión", async () => {
    const idIntento = 801;
    guardarMock.mockResolvedValue(undefined);
    const { queryClient, wrapper } = createQueryTestHarness();
    const key = evaluacionKeys.opciones(idIntento, 15);
    queryClient.setQueryData(key, options);
    const { result } = renderHook(() => useGuardarRespuesta(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        IdIntento: idIntento,
        IdPregunta: 15,
        IdOpcionNueva: 9,
      }),
    );

    expect(queryClient.getQueryData<OpcionSorteada[]>(key)).toEqual([
      { idOpcion: 8, texto: "A", fueSeleccionada: false },
      { idOpcion: 9, texto: "B", fueSeleccionada: true },
    ]);
    expect((await getExamOutboxSnapshot(idIntento)).answers).toEqual([]);
    await clearExamOutbox(idIntento);
  });

});
