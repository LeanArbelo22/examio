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
      pagina: 2,
      limite: 20,
      ordenarPor: "tasaAcierto",
      ordenDireccion: "asc",
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reportes/rendimiento-preguntas?idMateria=3&idGrupoPregunta=8&idPregunta=12&alcanceIntentos=validos&estadoCorreccion=confirmada&pagina=2&limite=20&ordenarPor=tasaAcierto&ordenDireccion=asc",
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
      pagina: 1,
      limite: 100,
      ordenarPor: "posicion",
      ordenDireccion: "asc",
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reportes/rendimiento-preguntas/12/opciones?idMateriaDivision=4&pagina=1&limite=100&ordenarPor=posicion&ordenDireccion=asc",
    );
  });
});
