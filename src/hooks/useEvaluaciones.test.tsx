import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluacionKeys } from "@/lib/query-keys";
import { createQueryTestHarness } from "@/test/query-client";
import {
  finalizarExamenOficial,
  obtenerOpcionesPregunta,
} from "@/services/api/evaluaciones.api";
import {
  useFinalizarExamen,
  useGetOpcionesPregunta,
} from "./useEvaluaciones";

vi.mock("@/services/api/evaluaciones.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/evaluaciones.api")>();
  return {
    ...actual,
    finalizarExamenOficial: vi.fn(),
    obtenerOpcionesPregunta: vi.fn(),
  };
});

const finalizarMock = vi.mocked(finalizarExamenOficial);
const opcionesMock = vi.mocked(obtenerOpcionesPregunta);

describe("hooks de evaluaciones", () => {
  beforeEach(() => {
    finalizarMock.mockReset();
    opcionesMock.mockReset();
  });

  it("solo obtiene opciones cuando intento y pregunta son válidos", async () => {
    opcionesMock.mockResolvedValue([
      { idOpcion: 9, texto: "Opción A", fueSeleccionada: false },
    ]);
    const { queryClient, wrapper } = createQueryTestHarness();
    const { result, rerender } = renderHook(
      ({ idPregunta, idIntento }) =>
        useGetOpcionesPregunta(idPregunta, idIntento),
      {
        initialProps: { idPregunta: 0, idIntento: 73 },
        wrapper,
      },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(opcionesMock).not.toHaveBeenCalled();

    rerender({ idPregunta: 15, idIntento: 73 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(opcionesMock).toHaveBeenCalledWith(15, 73);
    expect(
      queryClient.getQueryData(evaluacionKeys.opciones(73, 15)),
    ).toEqual(result.current.data);
  });

  it("invalida el sorteo del intento después de finalizar", async () => {
    finalizarMock.mockResolvedValue({ notaFinal: 8 });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();
    const { result } = renderHook(() => useFinalizarExamen(), { wrapper });

    await act(() => result.current.mutateAsync(73));

    expect(finalizarMock.mock.calls[0]?.[0]).toBe(73);
    expect(invalidate).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: evaluacionKeys.sorteo(73),
    });
  });
});
