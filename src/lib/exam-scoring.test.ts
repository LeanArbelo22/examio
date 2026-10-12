import { describe, expect, it } from "vitest";
import {
  distributeEqualScores,
  scaleScoreInput,
  scoreInputToCents,
} from "./exam-scoring";

describe("exam scoring helpers", () => {
  it("ajusta puntajes proporcionalmente al cambiar de escala", () => {
    expect(scaleScoreInput("4", 10, 100)).toBe("40");
    expect(scaleScoreInput("2.55", 10, 100)).toBe("25.5");
    expect(scaleScoreInput("40", 100, 10)).toBe("4");
    expect(scaleScoreInput("", 10, 100)).toBe("");
  });

  it("distribuye centavos con el mismo criterio determinístico del backend", () => {
    expect(distributeEqualScores(3, 10)).toEqual(["3.34", "3.33", "3.33"]);
    expect(distributeEqualScores(6, 100)).toEqual([
      "16.67",
      "16.67",
      "16.67",
      "16.67",
      "16.66",
      "16.66",
    ]);
  });

  it("convierte entradas decimales a centavos para comparar sumas exactas", () => {
    expect(scoreInputToCents("3.34")).toBe(334);
    expect(scoreInputToCents("")).toBeNull();
  });
});
