import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import {
  obtenerReporteRendimientoEvaluaciones,
  obtenerReporteOpcionesPregunta,
  obtenerReporteRendimientoGrupos,
  obtenerReporteRendimientoPreguntas,
  obtenerResultadosVariantes,
} from "./reportes.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);

describe("servicios de rendimiento por contenido", () => {
  beforeEach(() => {
    apiFetchMock.mockReset().mockResolvedValue({});
  });

  it.each([{ matriculaAlumno: "30500" }, { legajoDocente: "109000" }])("conserva el filtro administrativo de persona %j y el período", async (persona) => {
    await obtenerReporteRendimientoEvaluaciones({ ...persona, fechaDesde: "2026-03-01T03:00:00.000Z", alcanceIntentos: "validos", pagina: 2 });
    const params = new URL(String(apiFetchMock.mock.calls[0][0]), "http://examio.test").searchParams;
    for (const [key, value] of Object.entries(persona)) expect(params.get(key)).toBe(value);
    expect(params.get("fechaDesde")).toBe("2026-03-01T03:00:00.000Z");
    expect(params.get("alcanceIntentos")).toBe("validos");
    expect(params.get("pagina")).toBe("2");
  });

  it("serializa todos los filtros del reporte por pregunta", async () => {
    await obtenerReporteRendimientoPreguntas({
      idMateria: "3",
      idGrupoPregunta: "8",
      idPregunta: "12",
      alcanceIntentos: "validos",
      estadoCorreccion: "confirmada",
      soloHallazgosBajoRendimiento: true,
      pagina: 2,
      limite: 20,
      ordenarPor: "tasaAcierto",
      ordenDireccion: "asc",
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reportes/rendimiento-preguntas?idMateria=3&idGrupoPregunta=8&idPregunta=12&alcanceIntentos=validos&estadoCorreccion=confirmada&soloHallazgosBajoRendimiento=true&pagina=2&limite=20&ordenarPor=tasaAcierto&ordenDireccion=asc",
    );
  });

  it("recupera resultados por contenido más allá de la primera página, conservando el alcance original", async () => {
    const target = { claveContenido: "contenido-compartido", idPregunta: 950, idGrupoPregunta: 900, presentadas: 9, pendientesCorreccion: 4, porcentajePuntajePromedio: 60 };
    apiFetchMock
      .mockResolvedValueOnce({ items: [{ claveContenido: "otro" }], pagination: { totalPages: 3 } })
      .mockResolvedValueOnce({ items: [target], pagination: { totalPages: 3 } });
    const results = await obtenerResultadosVariantes({ idPublicacion: "47", fechaDesde: "2026-08-01", alcanceIntentos: "todos", estadoCorreccion: "todas", pagina: 9 }, ["contenido-compartido"]);
    expect(results).toEqual([target]);
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    for (const [index, [url]] of apiFetchMock.mock.calls.entries()) {
      const params = new URL(String(url), "http://examio.test").searchParams;
      expect(params.get("pagina")).toBe(String(index + 1));
      expect(params.get("limite")).toBe("100");
      expect(params.get("idPublicacion")).toBe("47");
      expect(params.get("fechaDesde")).toBe("2026-08-01");
      expect(params.get("alcanceIntentos")).toBe("todos");
      expect(params.has("idPregunta")).toBe(false);
      expect(params.has("idGrupoPregunta")).toBe(false);
    }
  });

  it("no convierte un error de otra página en resultados parciales ni inventa métricas", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [{ claveContenido: "a" }], pagination: { totalPages: 2 } })
      .mockRejectedValueOnce(new Error("Sin conexión"));
    await expect(obtenerResultadosVariantes({ idGrupoPregunta: "3" }, ["a", "b"])).rejects.toThrow("Sin conexión");
    expect(String(apiFetchMock.mock.calls[1][0])).toContain("idGrupoPregunta=3");
  });

  it("conserva cero y ausencia de puntaje como resultados distintos", async () => {
    apiFetchMock.mockResolvedValueOnce({ items: [{ claveContenido: "a", porcentajePuntajePromedio: 0 }, { claveContenido: "b", porcentajePuntajePromedio: null }], pagination: { totalPages: 1 } });
    expect(await obtenerResultadosVariantes({}, ["a", "b", "no-existe"])).toEqual([
      { claveContenido: "a", porcentajePuntajePromedio: 0 },
      { claveContenido: "b", porcentajePuntajePromedio: null },
    ]);
  });

  it("serializa los filtros operativos del reporte por evaluación", async () => {
    await obtenerReporteRendimientoEvaluaciones({
      conIncidentes: true,
      tipoIncidente: "focus_lost",
      severidad: "anular_intento",
      soloIncidentesSinRevisar: true,
      pagina: 1,
      limite: 20,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reportes/rendimiento-evaluaciones?conIncidentes=true&tipoIncidente=focus_lost&severidad=anular_intento&soloIncidentesSinRevisar=true&pagina=1&limite=20",
    );
  });

  it("solicita el resumen institucional junto con el alcance seleccionado", async () => {
    await obtenerReporteRendimientoEvaluaciones({
      incluirResumenInstitucional: true,
      incluirSerieMensual: true,
      idCarrera: "7",
      idMateria: "25",
      idMateriaDivision: "32",
      muestraMinimaRanking: 10,
      coberturaMinimaRanking: 70,
      fechaDesde: "2026-10-01T03:00:00.000Z",
      fechaHasta: "2026-11-01T02:59:59.999Z",
      pagina: 2,
      limite: 10,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reportes/rendimiento-evaluaciones?incluirResumenInstitucional=true&incluirSerieMensual=true&idCarrera=7&idMateria=25&idMateriaDivision=32&muestraMinimaRanking=10&coberturaMinimaRanking=70&fechaDesde=2026-10-01T03%3A00%3A00.000Z&fechaHasta=2026-11-01T02%3A59%3A59.999Z&pagina=2&limite=10",
    );
  });

  it("consume el endpoint paginado de grupos", async () => {
    await obtenerReporteRendimientoGrupos({
      idPublicacion: "47",
      ordenarPor: "tiempoPromedio",
      ordenDireccion: "desc",
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reportes/rendimiento-grupos?idPublicacion=47&ordenarPor=tiempoPromedio&ordenDireccion=desc",
    );
  });

  it("mantiene el identificador de pregunta en el path del detalle de opciones", async () => {
    await obtenerReporteOpcionesPregunta(12, {
      idMateriaDivision: "4",
      claveContenido: "hash-historico",
      pagina: 1,
      limite: 100,
      ordenarPor: "posicion",
      ordenDireccion: "asc",
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reportes/rendimiento-preguntas/12/opciones?idMateriaDivision=4&claveContenido=hash-historico&pagina=1&limite=100&ordenarPor=posicion&ordenDireccion=asc",
    );
  });
});
