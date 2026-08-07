import { describe, expect, it } from "vitest";
import { buildQueryString } from "./query-string";

describe("buildQueryString", () => {
  it("omite valores vacíos y conserva cero y false", () => {
    expect(
      buildQueryString({ search: "", page: 0, active: false, missing: null }),
    ).toBe("?page=0&active=false");
  });

  it("codifica valores de forma segura", () => {
    expect(buildQueryString({ materia: "Bases de Datos & SQL" })).toBe(
      "?materia=Bases+de+Datos+%26+SQL",
    );
  });
});
