import { describe, expect, it } from "vitest";
import { calendarMonthRange, calendarMonthsIncluded, customDateRange, defaultRankingDimension, isValidMonthAmount } from "./institutional-report-config";

describe("configuración temporal institucional", () => {
  const now = new Date("2026-10-24T15:30:00.000Z");

  it("incluye el mes actual sin superar doce meses calendario", () => {
    expect(calendarMonthRange(12, "current", now)).toEqual({
      fechaDesde: "2025-11-01T03:00:00.000Z",
      fechaHasta: now.toISOString(),
    });
  });

  it("calcula doce meses completos en la zona institucional", () => {
    expect(calendarMonthRange(12, "complete", now)).toEqual({
      fechaDesde: "2025-10-01T03:00:00.000Z",
      fechaHasta: "2026-10-01T02:59:59.999Z",
    });
  });

  it("limita el rango personalizado al instante actual", () => {
    expect(customDateRange("2026-10-01", "2026-10-31", now).fechaHasta).toBe(now.toISOString());
    expect(calendarMonthsIncluded("2022-01-01", "2026-12-31")).toBe(60);
    expect(calendarMonthsIncluded("2021-12-01", "2026-12-31")).toBe(61);
  });

  it("valida el límite de sesenta meses y los defaults por alcance", () => {
    expect(isValidMonthAmount(1)).toBe(true);
    expect(isValidMonthAmount(60)).toBe(true);
    expect(isValidMonthAmount(61)).toBe(false);
    expect(defaultRankingDimension(false, false)).toBe("carreras");
    expect(defaultRankingDimension(true, false)).toBe("materias");
    expect(defaultRankingDimension(true, true)).toBe("comisiones");
  });
});
