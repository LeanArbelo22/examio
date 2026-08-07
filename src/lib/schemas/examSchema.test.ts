import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultExamSchedule,
  examFormSchema,
  type ExamFormValues,
} from "./examSchema";

function validForm(): ExamFormValues {
  return {
    titulo: "Primer parcial",
    descripcion: "Evaluación de prueba",
    idMateriaDivision: "12",
    duracionMinutos: "90",
    cantidadIntentos: "1",
    fechaInicio: "2026-08-07T10:00",
    fechaFin: "2026-08-07T12:00",
    preguntas: [
      {
        id: 1,
        tituloReferencia: "SQL",
        variantes: [
          {
            id: "v1",
            enunciado: "Seleccioná la consulta correcta",
            tipo: "mc",
            opciones: [
              { texto: "SELECT * FROM Alumno", esCorrecta: true },
              { texto: "DELETE Alumno", esCorrecta: false },
            ],
          },
        ],
      },
    ],
  };
}

describe("examFormSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T12:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("acepta una evaluación completa válida", () => {
    expect(examFormSchema.safeParse(validForm()).success).toBe(true);
  });

  it("asocia el cierre anterior con fechaFin", () => {
    const result = examFormSchema.safeParse({
      ...validForm(),
      fechaFin: "2026-08-07T09:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["fechaFin"] }),
        ]),
      );
    }
  });

  it("rechaza años fuera de la ventana lógica", () => {
    const result = examFormSchema.safeParse({
      ...validForm(),
      fechaFin: "2040-08-07T12:00",
    });
    expect(result.success).toBe(false);
  });

  it("exige exactamente una opción correcta", () => {
    const form = validForm();
    form.preguntas[0].variantes[0].opciones![1].esCorrecta = true;
    const result = examFormSchema.safeParse(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["preguntas", 0, "variantes", 0, "opciones"],
          }),
        ]),
      );
    }
  });

  it("permite preguntas de programación sin opciones", () => {
    const form = validForm();
    form.preguntas[0].variantes[0] = {
      id: "v1",
      enunciado: "Escribí una consulta SQL",
      tipo: "code",
    };
    expect(examFormSchema.safeParse(form).success).toBe(true);
  });

  it("crea una apertura futura y un cierre 24 horas posterior", () => {
    const schedule = defaultExamSchedule();
    expect(new Date(schedule.fechaInicio).getTime()).toBeGreaterThan(Date.now());
    expect(
      new Date(schedule.fechaFin).getTime() -
        new Date(schedule.fechaInicio).getTime(),
    ).toBe(24 * 60 * 60 * 1000);
  });
});
