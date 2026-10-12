import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bancoPreguntasKeys,
  docenteKeys,
  evaluacionKeys,
  intentoKeys,
} from "@/lib/query-keys";
import { createQueryTestHarness } from "@/test/query-client";
import {
  finalizarExamenOficial,
  guardarEvaluacionCompleta,
  modificarBorradorCompleto,
  publicarEvaluacionCompleta,
  obtenerOpcionesPregunta,
  corregirPreguntaIntento,
  obtenerIntentosAlumnoPublicacion,
  obtenerMisIntentos,
  seleccionarIntentoValido,
} from "@/services/api/evaluaciones.api";
import {
  useFinalizarExamen,
  useCreateEvaluacion,
  useGetOpcionesPregunta,
  useModificarBorrador,
  usePublicarEvaluacion,
  useCorregirPreguntaIntento,
  useGetIntentosAlumnoPublicacion,
  useMisIntentos,
  useSeleccionarIntentoValido,
} from "./useEvaluaciones";

vi.mock("@/services/api/evaluaciones.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/evaluaciones.api")>();
  return {
    ...actual,
    finalizarExamenOficial: vi.fn(),
    guardarEvaluacionCompleta: vi.fn(),
    modificarBorradorCompleto: vi.fn(),
    publicarEvaluacionCompleta: vi.fn(),
    obtenerOpcionesPregunta: vi.fn(),
    corregirPreguntaIntento: vi.fn(),
    obtenerIntentosAlumnoPublicacion: vi.fn(),
    obtenerMisIntentos: vi.fn(),
    seleccionarIntentoValido: vi.fn(),
  };
});

const finalizarMock = vi.mocked(finalizarExamenOficial);
const guardarEvaluacionMock = vi.mocked(guardarEvaluacionCompleta);
const modificarBorradorMock = vi.mocked(modificarBorradorCompleto);
const publicarEvaluacionMock = vi.mocked(publicarEvaluacionCompleta);
const opcionesMock = vi.mocked(obtenerOpcionesPregunta);
const corregirPreguntaMock = vi.mocked(corregirPreguntaIntento);
const intentosAlumnoMock = vi.mocked(obtenerIntentosAlumnoPublicacion);
const misIntentosMock = vi.mocked(obtenerMisIntentos);
const seleccionarIntentoMock = vi.mocked(seleccionarIntentoValido);

describe("hooks de evaluaciones", () => {
  beforeEach(() => {
    finalizarMock.mockReset();
    guardarEvaluacionMock.mockReset();
    modificarBorradorMock.mockReset();
    publicarEvaluacionMock.mockReset();
    opcionesMock.mockReset();
    corregirPreguntaMock.mockReset();
    intentosAlumnoMock.mockReset();
    misIntentosMock.mockReset();
    seleccionarIntentoMock.mockReset();
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

  it("corrige por puntaje e invalida el detalle completo del intento", async () => {
    corregirPreguntaMock.mockResolvedValue({
      idIntento: 73,
      idPregunta: 502,
      puntajeMaximoSnapshot: 2,
      puntajeObtenido: 1.5,
      origenCorreccion: "manual",
      comentariosDocente: "Parcial",
      notaAutomatica: null,
      notaFinalCalculada: 8.5,
      notaFinalManual: null,
      notaFinal: 8.5,
      escalaCalificacion: 10,
      notaAprobacion: 4,
    });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const { result } = renderHook(() => useCorregirPreguntaIntento(73), { wrapper });

    await act(() => result.current.mutateAsync({
      idPregunta: 502,
      payload: { puntajeObtenido: 1.5, comentariosDocente: "Parcial" },
    }));

    expect(corregirPreguntaMock).toHaveBeenCalledWith(73, 502, {
      puntajeObtenido: 1.5,
      comentariosDocente: "Parcial",
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: intentoKeys.detail(73),
    });
  });

  it("crea un borrador con idempotencia e invalida las evaluaciones docentes", async () => {
    guardarEvaluacionMock.mockResolvedValue({
      idActividad: 4,
      idPublicacion: 8,
      estado: "borrador",
      revision: 1,
      escalaCalificacion: 10,
      notaAprobacion: 4,
      modoPuntaje: "iguales",
      mostrarPuntajePorPregunta: false,
      correccionAutomaticaCerradas: true,
      importaciones: [],
      banco: [],
    });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateEvaluacion(108991), {
      wrapper,
    });
    const payload = {
      Titulo: "Parcial",
      Tipo: "evaluacion" as const,
      CantidadIntentosMaximos: 1,
      DuracionMinutos: 90,
      IdMateriaDivision: 12,
      FechaInicio: "2026-08-07T13:00:00.000Z",
      FechaFin: "2026-08-07T15:00:00.000Z",
      Estado: "borrador" as const,
      GruposPreguntas: [],
    };

    await act(() =>
      result.current.mutateAsync({
        payload,
        idempotencyKey: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      }),
    );

    expect(guardarEvaluacionMock).toHaveBeenCalledWith(
      payload,
      "4e096ceb-51fd-49a1-8f80-c3760edaf021",
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: docenteKeys.evaluaciones(108991),
    });
  });

  it("invalida detalle y listado docente al modificar un borrador", async () => {
    modificarBorradorMock.mockResolvedValue({ revision: 3 });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useModificarBorrador(4, 8, 108991),
      { wrapper },
    );
    const payload = {
      Titulo: "Parcial",
      Tipo: "evaluacion" as const,
      CantidadIntentosMaximos: 1,
      DuracionMinutos: 90,
      IdMateriaDivision: 12,
      FechaInicio: "2026-08-07T13:00:00.000Z",
      FechaFin: "2026-08-07T15:00:00.000Z",
      GruposPreguntas: [],
      IdPublicacion: 8,
      RevisionEsperada: 2,
    };

    await act(() => result.current.mutateAsync(payload));

    expect(modificarBorradorMock).toHaveBeenCalledWith(4, payload);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: evaluacionKeys.detail(8),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: docenteKeys.evaluaciones(108991),
    });
  });

  it("publica transaccionalmente e invalida detalle y listado docente", async () => {
    publicarEvaluacionMock.mockResolvedValue({
      idActividad: 4,
      idPublicacion: 8,
      estado: "publicada",
      revision: 3,
      importaciones: [],
      banco: [],
    });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => usePublicarEvaluacion(4, 8, 108991),
      { wrapper },
    );
    const payload = {
      Titulo: "Parcial",
      Tipo: "evaluacion" as const,
      CantidadIntentosMaximos: 1,
      DuracionMinutos: 90,
      IdMateriaDivision: 12,
      FechaInicio: "2026-10-07T13:00:00.000Z",
      FechaFin: "2026-10-07T15:00:00.000Z",
      GruposPreguntas: [],
      IdPublicacion: 8,
      RevisionEsperada: 2,
      GuardarTodoEnBanco: true,
    };
    const idempotencyKey = "4e096ceb-51fd-49a1-8f80-c3760edaf021";

    await act(() => result.current.mutateAsync({ payload, idempotencyKey }));

    expect(publicarEvaluacionMock).toHaveBeenCalledWith(4, payload, idempotencyKey);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: evaluacionKeys.detail(8),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: docenteKeys.evaluaciones(108991),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: bancoPreguntasKeys.all,
    });
  });

  it("carga los intentos de un alumno con una query key específica", async () => {
    intentosAlumnoMock.mockResolvedValue([]);
    const { wrapper } = createQueryTestHarness();
    const { result } = renderHook(
      () => useGetIntentosAlumnoPublicacion(41, 30500),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(intentosAlumnoMock).toHaveBeenCalledWith(41, 30500);
  });

  it("invalida los intentos y el listado al elegir un intento válido", async () => {
    seleccionarIntentoMock.mockResolvedValue({
      idPublicacion: 41,
      idAlumno: 30500,
      idIntento: 73,
      esIntentoValido: true,
      seleccionIntentoValido: "manual",
    });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useSeleccionarIntentoValido(41, 30500),
      { wrapper },
    );

    await act(() => result.current.mutateAsync(73));

    expect(seleccionarIntentoMock).toHaveBeenCalledWith(41, 30500, 73);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: evaluacionKeys.intentosAlumno(41, 30500),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: evaluacionKeys.alumnos(41),
    });
  });

  it("consulta el historial propio con filtros dentro de la query key", async () => {
    const filters = { pagina: 2, limite: 10, resultado: "aprobado" as const };
    misIntentosMock.mockResolvedValue({
      items: [],
      resumen: {
        totalIntentos: 0,
        totalEvaluaciones: 0,
        evaluacionesAprobadas: 0,
        evaluacionesDesaprobadas: 0,
        evaluacionesPendientes: 0,
      },
      paginacion: { pagina: 2, limite: 10, total: 0, totalPaginas: 0 },
    });
    const { queryClient, wrapper } = createQueryTestHarness();
    const { result } = renderHook(() => useMisIntentos(filters), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(misIntentosMock).toHaveBeenCalledWith(filters);
    expect(queryClient.getQueryData(intentoKeys.mios(filters))).toEqual(
      result.current.data,
    );
  });
});
