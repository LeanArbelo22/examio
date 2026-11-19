import { describe, expect, it } from "vitest";
import { formatReportNumber, personRows, reportPeriod } from "./admin-report-data";
import type { Alumno } from "@/types";

describe("datos de reportes administrativos", () => {
  it("delimita días completos de Buenos Aires sin mezclar fechas UTC", () => {
    expect(reportPeriod("2026-11-01", "2026-11-19")).toEqual({ fechaDesde: "2026-11-01T03:00:00.000Z", fechaHasta: "2026-11-20T02:59:59.999Z" });
    expect(reportPeriod("2026-02-30", "2026-03-01")).toBeNull();
    expect(reportPeriod("2026-11-20", "2026-11-19")).toBeNull();
    expect(reportPeriod("", "2026-11-19")).toBeNull();
  });
  it("mantiene cero y ausencia de resultado distintos", () => {
    expect(formatReportNumber(0, 2)).toBe("0,00");
    expect(formatReportNumber(null, 2)).toBe("Sin resultado");
  });
  it("mantiene una fila por matrícula y no mezcla personas homónimas", () => {
    const student: Alumno = { matricula: 1, nombre: "Ana", apellido: "Pérez", correo: "a@example.test", cuil: "", estado: "activo" };
    const rows = personRows([student, student, { ...student, matricula: 2 }], "alumnos");
    expect(rows.map((x) => x.code)).toEqual([1, 2]);
    expect(rows.every((x) => x.state === "activo")).toBe(true);
    expect(personRows([{ ...student, estado: "suspendido" }], "alumnos")[0].state).toBe("suspendido");
  });
});
