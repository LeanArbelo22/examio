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

  it("agrupa el primer error de validación de cada campo", () => {
    expect(
      validationErrorsByField([
        { path: ["preguntas", 0, "texto"], message: "Requerido", code: "required" },
        { path: ["preguntas", 0, "texto"], message: "Duplicado", code: "duplicate" },
      ]),
    ).toEqual({ "preguntas.0.texto": "Requerido" });
  });
});
