import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import {
  getErrorCategory,
  getUserErrorMessage,
  isRetryableError,
  validationErrorsByField,
} from "./errors";

describe("errors", () => {
  it("distingue autorización de expiración de sesión", () => {
    const error = new ApiError("Fuera de alcance", 403, "REPORT_SCOPE_FORBIDDEN");

    expect(getErrorCategory(error)).toBe("authorization");
    expect(getUserErrorMessage(error)).toBe(
      "Los filtros seleccionados están fuera de tu alcance docente.",
    );
  });

  it("solo considera reintentables los fallos transitorios", () => {
    expect(isRetryableError(new ApiError("Sin red", 0, "NETWORK_UNAVAILABLE"))).toBe(true);
    expect(isRetryableError(new ApiError("Inválido", 400, "REQUEST_INVALID"))).toBe(false);
  });

  it("explica un conflicto de revisión sin exponer detalles internos", () => {
    expect(
      getUserErrorMessage(
        new ApiError(
          "Revisión obsoleta",
          409,
          "RESPONSE_REVISION_CONFLICT",
        ),
      ),
    ).toContain("otra pestaña");
  });

  it("explica una escala inválida sin reemplazar el promedio por cero", () => {
    expect(
      getUserErrorMessage(
        new ApiError(
          "Detalle interno",
          500,
          "REPORT_INVALID_GRADING_SCALE",
        ),
      ),
    ).toBe(
      "No se puede calcular el promedio porque una evaluación tiene una escala de calificación inválida.",
    );
  });

  it("agrupa el primer error de validación de cada campo", () => {
    expect(
      validationErrorsByField([
        { path: ["preguntas", 0, "texto"], message: "Requerido", code: "required" },
        { path: ["preguntas", 0, "texto"], message: "Duplicado", code: "duplicate" },
      ]),
    ).toEqual({ "preguntas.0.texto": "Requerido" });
  });
});
