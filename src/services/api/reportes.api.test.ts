import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import {
  obtenerReporteRendimientoEvaluaciones,
  obtenerReporteOpcionesPregunta,
  obtenerReporteRendimientoGrupos,
  obtenerReporteRendimientoPreguntas,
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
