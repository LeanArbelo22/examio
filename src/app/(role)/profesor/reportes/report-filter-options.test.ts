import { describe, expect, it } from "vitest";
import type { EvaluacionDocente } from "@/types";
import { normalizeAuthorizedReportFilters } from "./report-filter-options";

const evaluations = [
  {
    idPublicacion: 10,
    idActividad: 100,
    idMateria: 1,
    idMateriaDivision: 11,
  },
  {
    idPublicacion: 20,
    idActividad: 200,
    idMateria: 2,
    idMateriaDivision: 22,
  },
] as EvaluacionDocente[];

describe("normalizeAuthorizedReportFilters", () => {
  it("limpia los filtros inferiores que no pertenecen a la materia elegida", () => {
    expect(
      normalizeAuthorizedReportFilters(
        {
          idMateria: "1",
          idMateriaDivision: "22",
          idActividad: "200",
          idPublicacion: "20",
        },
        evaluations,
      ),
    ).toMatchObject({
      idMateria: "1",
      idMateriaDivision: "",
      idActividad: "",
      idPublicacion: "",
    });
  });

  it("conserva una selección autorizada y compatible", () => {
    const filters = {
      idMateria: "2",
      idMateriaDivision: "22",
      idActividad: "200",
      idPublicacion: "20",
    };

    expect(normalizeAuthorizedReportFilters(filters, evaluations)).toEqual(filters);
  });
});
