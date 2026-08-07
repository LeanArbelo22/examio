import { describe, expect, it } from "vitest";
import { materiaFormSchema } from "./materiaSchema";

describe("materiaFormSchema", () => {
  it("valida y transforma los campos numéricos", () => {
    const result = materiaFormSchema.parse({
      Nombre: "Bases de Datos",
      Semestre: "2",
      IdCarrera: "4",
    });
    expect(result).toEqual({
      Nombre: "Bases de Datos",
      Semestre: 2,
      IdCarrera: 4,
    });
  });

  it("rechaza nombre vacío, semestre cero y carrera ausente", () => {
    const result = materiaFormSchema.safeParse({
      Nombre: " ",
      Semestre: "0",
      IdCarrera: "",
    });
    expect(result.success).toBe(false);
  });
});
