import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { alumnoKeys, comisionKeys } from "@/lib/query-keys";
import { createQueryTestHarness } from "@/test/query-client";
import {
  getAlumnoPorMatricula,
  inscribirAlumno,
} from "@/services/api/alumnos.api";
import { useGetAlumno, useInscribirAlumno } from "./useAlumnos";

vi.mock("@/services/api/alumnos.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/alumnos.api")>();
  return {
    ...actual,
    getAlumnoPorMatricula: vi.fn(),
    inscribirAlumno: vi.fn(),
  };
});

const getAlumnoMock = vi.mocked(getAlumnoPorMatricula);
const inscribirAlumnoMock = vi.mocked(inscribirAlumno);

describe("hooks de alumnos", () => {
  beforeEach(() => {
    getAlumnoMock.mockReset();
    inscribirAlumnoMock.mockReset();
  });

  it("no consulta con matrícula inválida y se activa al recibir una válida", async () => {
    getAlumnoMock.mockResolvedValue({
      matricula: 30123,
      nombre: "Ada",
      apellido: "Lovelace",
      cuil: "",
      correo: "ada@examio.test",
      estado: "activo",
    });
    const { queryClient, wrapper } = createQueryTestHarness();
    const { result, rerender } = renderHook(
      ({ matricula }: { matricula: number | null }) => useGetAlumno(matricula),
      { initialProps: { matricula: null as number | null }, wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(getAlumnoMock).not.toHaveBeenCalled();

    rerender({ matricula: 30123 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getAlumnoMock).toHaveBeenCalledOnce();
    expect(getAlumnoMock).toHaveBeenCalledWith(30123);
    expect(result.current.alumno?.nombre).toBe("Ada");
    expect(queryClient.getQueryData(alumnoKeys.detail(30123))).toEqual(
      result.current.data,
    );
  });

  it("inscribe y actualiza únicamente las jerarquías relacionadas", async () => {
    inscribirAlumnoMock.mockResolvedValue({
      matricula: 30123,
      idMateriaDivision: 44,
    });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();
    const { result } = renderHook(() => useInscribirAlumno(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        matricula: 30123,
        payload: { IdMateriaDivision: 44 },
      }),
    );

    expect(inscribirAlumnoMock).toHaveBeenCalledWith(30123, {
      IdMateriaDivision: 44,
    });
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      alumnoKeys.materias(30123),
      alumnoKeys.all,
      comisionKeys.alumnos(44),
    ]);
  });
});
