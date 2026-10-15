import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import {
  guardarEvaluacionCompleta,
  iniciarIntentoExamen,
  modificarBorradorCompleto,
  publicarEvaluacionCompleta,
  calificarIntento,
  corregirPreguntaIntento,
  obtenerIntentosAlumnoPublicacion,
  obtenerMisIntentos,
  restaurarSeleccionAutomaticaIntento,
  seleccionarIntentoValido,
  guardarIncidenteFoco,
  obtenerIncidentesFoco,
  obtenerResumenIncidentesFoco,
  guardarRespuestaAtomica,
  anularIntentoPorIncidente,
  confirmarCorreccionIntento,
  guardarEventoTemporal,
  guardarEventosTemporalesLote,
  obtenerEventosTemporales,
} from "./evaluaciones.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);

describe("iniciarIntentoExamen", () => {
  beforeEach(() => apiFetchMock.mockReset());

  it("normaliza el array de un elemento del contrato efectivo", async () => {
    apiFetchMock.mockResolvedValue([{ idIntento: 73, status: "OK" }]);

    await expect(
      iniciarIntentoExamen({ IdPublicacion: 47, IdAlumno: 30123 }),
    ).resolves.toEqual({ idIntento: 73 });

    expect(apiFetchMock).toHaveBeenCalledWith("/intentos/iniciar", {
      method: "POST",
      body: JSON.stringify({ IdPublicacion: 47, IdAlumno: 30123 }),
    });
  });

  it("rechaza una respuesta upstream sin un intento válido", async () => {
    apiFetchMock.mockResolvedValue([]);

    await expect(
      iniciarIntentoExamen({ IdPublicacion: 47, IdAlumno: 30123 }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "INVALID_UPSTREAM_RESPONSE",
    } satisfies Partial<ApiError>);
  });

  it("crea un borrador con la clave idempotente", async () => {
    apiFetchMock.mockResolvedValue({
      idActividad: 4,
      idPublicacion: 8,
      estado: "borrador",
      revision: 1,
      importaciones: [],
      banco: [],
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

    await guardarEvaluacionCompleta(
      payload,
      "4e096ceb-51fd-49a1-8f80-c3760edaf021",
    );

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/evaluaciones/guardar-completo",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Idempotency-Key": "4e096ceb-51fd-49a1-8f80-c3760edaf021",
        },
        body: JSON.stringify(payload),
      }),
    );
  });

  it("modifica el borrador completo por actividad", async () => {
    apiFetchMock.mockResolvedValue({ revision: 3 });
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

    await modificarBorradorCompleto(4, payload);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/evaluaciones/4/modificar-completo",
      { method: "PUT", body: JSON.stringify(payload) },
    );
  });

  it("publica el borrador completo con una clave idempotente", async () => {
    apiFetchMock.mockResolvedValue({
      idActividad: 4,
      idPublicacion: 8,
      estado: "publicada",
      revision: 3,
      importaciones: [],
      banco: [],
    });
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
      GuardarTodoEnBanco: false,
    };
    const key = "4e096ceb-51fd-49a1-8f80-c3760edaf021";

    await publicarEvaluacionCompleta(4, payload, key);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/evaluaciones/4/publicar-completo",
      {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(payload),
      },
    );
  });

  it("envía una respuesta completa con revisión e idempotencia", async () => {
    apiFetchMock.mockResolvedValue({
      idRespuesta: 21,
      idIntento: 73,
      idPregunta: 15,
      idsOpcionesSeleccionadas: [3, 5],
      rtaTexto: null,
      justificacion: "Ambas cumplen.",
      revision: 4,
      replay: false,
    });
    const payload = {
      IdIntento: 73,
      IdPregunta: 15,
      IdOpcionesSeleccionadas: [3, 5],
      RtaTexto: null,
      Justificacion: "Ambas cumplen.",
      RevisionEsperada: 3,
      EventoId: "00000000-0000-4000-8000-000000000073",
    };

    await expect(guardarRespuestaAtomica(payload)).resolves.toMatchObject({
      idsOpcionesSeleccionadas: [3, 5],
      revision: 4,
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/intentos/guardar-respuesta", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("envía la corrección canónica por puntaje y comentario", async () => {
    apiFetchMock.mockResolvedValue({
      idIntento: 73,
      idPregunta: 502,
      puntajeMaximoSnapshot: 2,
      puntajeObtenido: 1.5,
      origenCorreccion: "manual",
      comentariosDocente: "Parcialmente correcta",
      notaAutomatica: null,
      notaFinalCalculada: 8.5,
      notaFinalManual: null,
      notaFinal: 8.5,
      escalaCalificacion: 10,
      notaAprobacion: 4,
    });

    await corregirPreguntaIntento(73, 502, {
      puntajeObtenido: 1.5,
      comentariosDocente: "Parcialmente correcta",
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/intentos/73/preguntas/502/corregir",
      {
        method: "PUT",
        body: JSON.stringify({
          puntajeObtenido: 1.5,
          comentariosDocente: "Parcialmente correcta",
        }),
      },
    );
  });

  it("envía el override de nota con el body legacy compatible", async () => {
    apiFetchMock.mockResolvedValue({
      idIntento: 73,
      notaAutomatica: 4,
      notaFinalCalculada: 8.5,
      notaFinalManual: 9,
      notaFinal: 9,
      escalaCalificacion: 10,
      notaAprobacion: 4,
    });

    await calificarIntento(73, 9);

    expect(apiFetchMock).toHaveBeenCalledWith("/intentos/73/calificar", {
      method: "PUT",
      body: JSON.stringify({ notaFinal: 9 }),
    });
  });

  it("consulta y modifica el intento académico válido por alumno", async () => {
    apiFetchMock.mockResolvedValue([]);

    await obtenerIntentosAlumnoPublicacion(41, 30500);
    await seleccionarIntentoValido(41, 30500, 73);
    await restaurarSeleccionAutomaticaIntento(41, 30500);

    const basePath = "/evaluaciones/publicaciones/41/alumnos/30500";
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      `${basePath}/intentos`,
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      `${basePath}/intento-valido`,
      {
        method: "PUT",
        body: JSON.stringify({ IdIntento: 73 }),
      },
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      `${basePath}/intento-valido`,
      { method: "DELETE" },
    );
  });

  it("serializa todos los filtros del historial propio", async () => {
    apiFetchMock.mockResolvedValue({ items: [], resumen: {}, paginacion: {} });

    await obtenerMisIntentos({
      idMateria: 4,
      idMateriaDivision: 9,
      fechaDesde: "2026-10-01",
      fechaHasta: "2026-10-31",
      estado: "entregado",
      resultado: "aprobado",
      pagina: 2,
      limite: 10,
      ordenarPor: "nota",
      ordenDireccion: "desc",
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/intentos/mios?idMateria=4&idMateriaDivision=9&fechaDesde=2026-10-01&fechaHasta=2026-10-31&estado=entregado&resultado=aprobado&pagina=2&limite=10&ordenarPor=nota&ordenDireccion=desc",
    );
  });

  it("usa el UUID como recurso idempotente de telemetría", async () => {
    apiFetchMock.mockResolvedValue({});
    const eventoId = "4e096ceb-51fd-49a1-8f80-c3760edaf021";
    const payload = {
      Tipo: "focus_lost" as const,
      FechaInicioCliente: "2026-10-12T10:15:00.000Z",
      FechaFinCliente: "2026-10-12T10:15:23.500Z",
      DuracionMilisegundos: 23500,
    };

    await guardarIncidenteFoco(73, eventoId, payload);
    await obtenerResumenIncidentesFoco(73);
    await obtenerIncidentesFoco(73);

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      `/telemetria/intentos/73/incidentes/${eventoId}`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      "/telemetria/intentos/73/resumen",
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      "/telemetria/intentos/73/incidentes",
    );
  });

  it("usa los endpoints autoritativos de anulación y confirmación", async () => {
    apiFetchMock.mockResolvedValue({});
    const eventoId = "4e096ceb-51fd-49a1-8f80-c3760edaf021";

    await anularIntentoPorIncidente(73, eventoId);
    await confirmarCorreccionIntento(73);

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      `/intentos/73/anular-por-incidente/${eventoId}`,
      { method: "PUT" },
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      "/intentos/73/confirmar-correccion",
      { method: "PUT" },
    );
  });

  it("usa los contratos individual, batch y paginado de telemetría temporal", async () => {
    apiFetchMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        items: [{ duracionMilisegundos: "31800" }],
        resumen: {
          total: 1,
          intervalosAbiertos: 0,
          duracionesPorTipo: [{ tipo: "question_active", duracionMilisegundos: "31800" }],
          tiemposPorPregunta: [{
            idIntentoPregunta: 83,
            idPregunta: 15,
            duracionMilisegundos: "31800",
            fuente: "nueva",
          }],
        },
        paginacion: { pagina: 2, limite: 20, total: 1, totalPaginas: 1 },
      });
    const eventoId = "4e096ceb-51fd-49a1-8f80-c3760edaf021";
    const payload = {
      Tipo: "question_active" as const,
      IdIntentoPregunta: 83,
      SesionClienteId: "50f8b18c-c03a-46fd-b830-ea3fc2d53f50",
      SecuenciaCliente: 12,
      FechaInicioCliente: "2026-10-14T14:05:00.000Z",
      VersionContrato: 1 as const,
    };

    await guardarEventoTemporal(73, eventoId, payload);
    await guardarEventosTemporalesLote(73, [{ EventoId: eventoId, ...payload }]);
    const events = await obtenerEventosTemporales(73, 2, 20);

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      `/telemetria/intentos/73/eventos/${eventoId}`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      "/telemetria/intentos/73/eventos/lote",
      {
        method: "POST",
        body: JSON.stringify({ Eventos: [{ EventoId: eventoId, ...payload }] }),
      },
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      "/telemetria/intentos/73/eventos?pagina=2&limite=20",
    );
    expect(events.items[0].duracionMilisegundos).toBe(31_800);
    expect(events.resumen.tiemposPorPregunta[0].duracionMilisegundos).toBe(31_800);
  });
});
