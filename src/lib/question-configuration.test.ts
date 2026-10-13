import { describe, expect, it } from "vitest";
import {
  normalizeQuestionConfiguration,
} from "./question-configuration";

describe("question configuration", () => {
  it("mantiene defaults legacy", () => {
    expect(normalizeQuestionConfiguration("mc", {})).toEqual({
      modoJustificacion: "sin_justificacion",
      estrategiaCorreccion: "exacta",
      tratamientoJustificacion: "informativa",
    });
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
