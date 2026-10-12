import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultExamSchedule,
  examDraftFormSchema,
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
    escalaCalificacion: 10,
    notaAprobacion: "4",
    modoPuntaje: "iguales",
    mostrarPuntajePorPregunta: false,
    correccionAutomaticaCerradas: true,
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

  it("rechaza opciones en preguntas a desarrollar", () => {
    const form = validForm();
    form.preguntas[0].variantes[0] = {
      id: "v1",
      enunciado: "Explicá el modelo",
      tipo: "abierta",
      opciones: [{ texto: "No corresponde", esCorrecta: true }],
    };

    expect(examFormSchema.safeParse(form).success).toBe(false);
  });

  it("permite varias opciones correctas en selección múltiple", () => {
    const form = validForm();
    form.preguntas[0].variantes[0] = {
      id: "v1",
      enunciado: "Elegí protocolos de transporte",
      tipo: "multiple",
      estrategiaCorreccion: "parcial_sin_penalizacion",
      opciones: [
        { texto: "TCP", esCorrecta: true },
        { texto: "UDP", esCorrecta: true },
        { texto: "HTTP", esCorrecta: false },
      ],
    };

    expect(examFormSchema.safeParse(form).success).toBe(true);
  });

  it("rechaza revisión manual sin justificación", () => {
    const form = validForm();
    form.preguntas[0].variantes[0].tratamientoJustificacion =
      "revision_manual";

    expect(examDraftFormSchema.safeParse(form).success).toBe(false);
  });

  it("rechaza justificación adicional en preguntas a desarrollar", () => {
    const form = validForm();
    form.preguntas[0].variantes[0] = {
      id: "v1",
      enunciado: "Explicá el modelo",
      tipo: "abierta",
      modoJustificacion: "opcional",
    };

    expect(examDraftFormSchema.safeParse(form).success).toBe(false);
  });

  it("crea una apertura futura y un cierre 24 horas posterior", () => {
    const schedule = defaultExamSchedule();
    expect(new Date(schedule.fechaInicio).getTime()).toBeGreaterThan(Date.now());
    expect(
      new Date(schedule.fechaFin).getTime() -
        new Date(schedule.fechaInicio).getTime(),
    ).toBe(24 * 60 * 60 * 1000);
  });

  it("permite guardar un borrador sin estructura completa y con fechas pasadas", () => {
    const result = examDraftFormSchema.safeParse({
      ...validForm(),
      fechaInicio: "2025-08-07T10:00",
      fechaFin: "2025-08-07T12:00",
      preguntas: [],
    });

    expect(result.success).toBe(true);
  });

  it("mantiene la validación estricta al publicar", () => {
    const result = examFormSchema.safeParse({
      ...validForm(),
      preguntas: [],
    });

    expect(result.success).toBe(false);
  });

  it("exige que los puntajes personalizados sumen exactamente la escala al publicar", () => {
    const form = validForm();
    form.modoPuntaje = "personalizados";
    form.preguntas[0].puntajeMaximo = "9.99";

    const result = examFormSchema.safeParse(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["puntajesPersonalizados"] }),
        ]),
      );
    }
  });

  it("permite guardar puntajes personalizados incompletos en borrador", () => {
    const form = validForm();
    form.modoPuntaje = "personalizados";
    form.preguntas[0].puntajeMaximo = "";

    expect(examDraftFormSchema.safeParse(form).success).toBe(true);
    expect(examFormSchema.safeParse(form).success).toBe(false);
  });

  it("valida la nota de aprobación contra la escala elegida", () => {
    const result = examFormSchema.safeParse({
      ...validForm(),
      escalaCalificacion: 10,
      notaAprobacion: "40",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["notaAprobacion"] }),
        ]),
      );
    }
  });
});
