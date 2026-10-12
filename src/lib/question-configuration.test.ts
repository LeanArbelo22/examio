import { describe, expect, it } from "vitest";
import {
  normalizeQuestionConfiguration,
  requiresPendingQuestionRuntime,
} from "./question-configuration";

describe("question configuration", () => {
  it("mantiene defaults legacy", () => {
    expect(normalizeQuestionConfiguration("mc", {})).toEqual({
      modoJustificacion: "sin_justificacion",
      estrategiaCorreccion: "exacta",
      tratamientoJustificacion: "informativa",
    });
  });

  it("detecta contenido que todavía no puede publicarse", () => {
    expect(requiresPendingQuestionRuntime({ tipo: "multiple" })).toBe(true);
    expect(
      requiresPendingQuestionRuntime({
        tipo: "mc",
        modoJustificacion: "opcional",
      }),
    ).toBe(true);
    expect(requiresPendingQuestionRuntime({ tipo: "mc" })).toBe(false);
  });

  it("descarta justificación para desarrollo y programación", () => {
    expect(
      normalizeQuestionConfiguration("abierta", {
        modoJustificacion: "obligatoria",
        tratamientoJustificacion: "revision_manual",
      }),
    ).toEqual({
      modoJustificacion: "sin_justificacion",
      estrategiaCorreccion: "exacta",
      tratamientoJustificacion: "informativa",
    });
  });
});
