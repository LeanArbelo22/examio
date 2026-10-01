import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bancoPreguntasKeys, evaluacionKeys } from "@/lib/query-keys";
import { createQueryTestHarness } from "@/test/query-client";
import {
  crearPreguntaBanco,
  importarBancoEnEvaluacion,
  listarPreguntasBanco,
  obtenerPreguntaBanco,
} from "@/services/api/banco-preguntas.api";
import {
  useCrearPreguntaBanco,
  useImportarBancoEnEvaluacion,
  usePreguntaBanco,
  usePreguntasBanco,
} from "./useBancoPreguntas";

vi.mock("@/services/api/banco-preguntas.api", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/services/api/banco-preguntas.api")
  >();
  return {
    ...actual,
    crearPreguntaBanco: vi.fn(),
    importarBancoEnEvaluacion: vi.fn(),
    listarPreguntasBanco: vi.fn(),
    obtenerPreguntaBanco: vi.fn(),
  };
});

const crearPreguntaMock = vi.mocked(crearPreguntaBanco);
const importarMock = vi.mocked(importarBancoEnEvaluacion);
const listarMock = vi.mocked(listarPreguntasBanco);
const obtenerMock = vi.mocked(obtenerPreguntaBanco);
const idempotencyKey = "4e096ceb-51fd-49a1-8f80-c3760edaf021";

describe("hooks del banco de preguntas", () => {
  beforeEach(() => {
    crearPreguntaMock.mockReset();
    importarMock.mockReset();
    listarMock.mockReset();
    obtenerMock.mockReset();
  });

  it("incluye filtros y paginación en la query key", async () => {
    const filtros = { texto: "redes", estado: "disponible" as const, pagina: 2 };
    const response = { items: [], total: 0, pagina: 2, tamano: 20 };
    listarMock.mockResolvedValue(response);
    const { queryClient, wrapper } = createQueryTestHarness();

    const { result } = renderHook(() => usePreguntasBanco(filtros), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listarMock).toHaveBeenCalledWith(filtros);
    expect(
      queryClient.getQueryData(bancoPreguntasKeys.preguntasListado(filtros)),
    ).toEqual(response);
  });

  it("no solicita un detalle sin ID válido", () => {
    const { wrapper } = createQueryTestHarness();

    const { result } = renderHook(() => usePreguntaBanco(null), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(obtenerMock).not.toHaveBeenCalled();
  });

  it("invalida el namespace del banco después de crear una pregunta", async () => {
    crearPreguntaMock.mockResolvedValue({ id: 10 } as never);
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(useCrearPreguntaBanco, { wrapper });

    result.current.mutate({
      idempotencyKey,
      payload: { Titulo: "TCP", Tipo: "mc" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(crearPreguntaMock).toHaveBeenCalledWith(
      { Titulo: "TCP", Tipo: "mc" },
      idempotencyKey,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: bancoPreguntasKeys.all,
    });
  });

  it("invalida las evaluaciones después de importar", async () => {
    importarMock.mockResolvedValue({ importaciones: [], revision: 4 });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useImportarBancoEnEvaluacion(42), {
      wrapper,
    });

    result.current.mutate({
      idempotencyKey,
      payload: {
        ImportacionesBanco: [
          {
            Tipo: "pregunta",
            IdPregunta: 10,
            RevisionEsperada: 2,
            TituloReferencia: "Redes",
          },
        ],
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: evaluacionKeys.all,
    });
  });
});
