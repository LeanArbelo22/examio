import { describe, expect, it } from "vitest";
import {
  bankGroupFormSchema,
  bankQuestionFormSchema,
} from "./questionBankSchema";

describe("questionBankSchema", () => {
  it("permite conservar una pregunta incompleta como borrador", () => {
    expect(
      bankQuestionFormSchema.safeParse({
        titulo: "TCP",
        enunciado: "",
        tipo: "mc",
        estado: "borrador",
        opciones: [],
        etiquetas: [],
      }).success,
    ).toBe(true);
  });

  it("exige contenido correcto antes de habilitar una pregunta", () => {
    expect(
      bankQuestionFormSchema.safeParse({
        titulo: "TCP",
        enunciado: "",
        tipo: "mc",
        estado: "disponible",
        opciones: [],
        etiquetas: [],
      }).success,
    ).toBe(false);
  });

  it("mantiene code exclusivamente como borrador", () => {
    expect(
      bankQuestionFormSchema.safeParse({
        titulo: "Consulta",
        enunciado: "SELECT 1",
        tipo: "code",
        estado: "disponible",
        opciones: [],
        etiquetas: [],
      }).success,
    ).toBe(false);
  });

  it("permite una selección múltiple disponible con varias correctas", () => {
    expect(
      bankQuestionFormSchema.safeParse({
        titulo: "Protocolos",
        enunciado: "Elegí protocolos de transporte",
        tipo: "multiple",
        estado: "disponible",
        estrategiaCorreccion: "parcial_sin_penalizacion",
        opciones: [
          { texto: "TCP", esCorrecta: true },
          { texto: "UDP", esCorrecta: true },
          { texto: "HTTP", esCorrecta: false },
        ],
        etiquetas: [],
      }).success,
    ).toBe(true);
  });

  it("rechaza corrección parcial para selección única", () => {
    expect(
      bankQuestionFormSchema.safeParse({
        titulo: "TCP",
        enunciado: "Elegí una opción",
        tipo: "mc",
        estado: "borrador",
        estrategiaCorreccion: "parcial_penalizada",
        opciones: [],
        etiquetas: [],
      }).success,
    ).toBe(false);
  });

  it("rechaza justificación adicional en preguntas de programación", () => {
    expect(
      bankQuestionFormSchema.safeParse({
        titulo: "SQL",
        enunciado: "Escribí una consulta",
        tipo: "code",
        estado: "borrador",
        modoJustificacion: "opcional",
        opciones: [],
        etiquetas: [],
      }).success,
    ).toBe(false);
  });

  it("permite crear un grupo vacío como borrador", () => {
    expect(
      bankGroupFormSchema.safeParse({
        tituloReferencia: "Redes",
        estado: "borrador",
        preguntas: [],
        etiquetas: [],
      }).success,
    ).toBe(true);
  });
});
