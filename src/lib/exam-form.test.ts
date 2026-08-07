import { describe, expect, it } from "vitest";
import { toGuardarEvaluacionPayload } from "./exam-form";
import type { ExamFormValues } from "./schemas/examSchema";

describe("toGuardarEvaluacionPayload", () => {
  it("convierte el formulario al casing y tipos esperados por la API", () => {
    const form: ExamFormValues = {
      titulo: "Parcial SQL",
      descripcion: "Consultas y normalización",
      idMateriaDivision: "12",
      duracionMinutos: "90",
      cantidadIntentos: "2",
      fechaInicio: "2026-08-07T10:00",
      fechaFin: "2026-08-07T12:00",
      preguntas: [
        {
          id: 1,
          tituloReferencia: "Consultas",
          variantes: [
            { id: "v1", enunciado: "Consulta", tipo: "code" },
          ],
        },
      ],
    };

    const payload = toGuardarEvaluacionPayload(form, "Pantalla completa");
    expect(payload).toMatchObject({
      Titulo: "Parcial SQL",
      IdMateriaDivision: 12,
      DuracionMinutos: 90,
      CantidadIntentosMaximos: 2,
      RecursosPermitidos: "Pantalla completa",
      GruposPreguntas: [
        {
          TituloReferencia: "Consultas",
          Variantes: [{ Enunciado: "Consulta", Tipo: "code" }],
        },
      ],
    });
    expect(payload.FechaInicio).toBe(new Date(form.fechaInicio).toISOString());
  });

  it("convierte duración y descripción vacías a valores opcionales", () => {
    const form = {
      titulo: "Parcial",
      descripcion: "",
      idMateriaDivision: "1",
      duracionMinutos: "",
      cantidadIntentos: "1",
      fechaInicio: "2026-08-07T10:00",
      fechaFin: "2026-08-07T12:00",
      preguntas: [],
    } satisfies ExamFormValues;
    const payload = toGuardarEvaluacionPayload(form, "");
    expect(payload.DuracionMinutos).toBeNull();
    expect(payload.Descripcion).toBeUndefined();
    expect(payload.RecursosPermitidos).toBeUndefined();
  });
});
