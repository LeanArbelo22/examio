import { describe, expect, it } from "vitest";
import { formatGrade, formatGradeInput, parseGradeInput } from "./attempt-grading";

describe("attempt grading", () => {
  it("formatea notas sin perder decimales significativos", () => {
    expect(formatGrade(8.5, 10)).toBe("8.50 / 10");
    expect(formatGrade(100, 100)).toBe("100 / 100");
    expect(formatGrade(null)).toBe("—");
    expect(formatGradeInput(1.5)).toBe("1.50");
  });

  it("acepta cero, el máximo y puntajes parciales con dos decimales", () => {
    expect(parseGradeInput("0", 2)).toEqual({ value: 0, error: null });
    expect(parseGradeInput("1.25", 2)).toEqual({ value: 1.25, error: null });
    expect(parseGradeInput("2", 2)).toEqual({ value: 2, error: null });
  });

  it("rechaza valores vacíos, fuera de rango o con más de dos decimales", () => {
    expect(parseGradeInput("", 2).error).toBe("Ingresá un puntaje.");
    expect(parseGradeInput("2.001", 2).error).toBe("Usá como máximo dos decimales.");
    expect(parseGradeInput("3", 2).error).toContain("entre 0 y 2");
  });
});
