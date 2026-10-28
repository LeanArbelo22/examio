import type {
  AgrupacionSerieInstitucional,
  OrdenRankingInstitucional,
} from "@/types";

export const REPORT_DEFAULTS = {
  months: 12,
  periodMode: "current" as const,
  grouping: "mensual" as AgrupacionSerieInstitucional,
  rankingOrder: "aprobacion_asc" as OrdenRankingInstitucional,
  rankingAmount: "5",
  sampleMinimum: 10,
  coverageMinimum: 70,
  visibility: {
    summary: true,
    ranking: true,
    evolution: true,
    evidence: true,
    operational: true,
  },
};

export type PeriodMode = "current" | "complete" | "custom";
export type RankingDimension = "carreras" | "materias" | "comisiones";
export type ReportSectionVisibility = typeof REPORT_DEFAULTS.visibility;

function buenosAiresDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function buenosAiresBoundary(year: number, monthIndex: number, day = 1) {
  return new Date(Date.UTC(year, monthIndex, day, 3, 0, 0, 0));
}

export function calendarMonthRange(
  months: number,
  mode: Exclude<PeriodMode, "custom">,
  now = new Date(),
) {
  const safeMonths = Math.min(60, Math.max(1, Math.trunc(months)));
  const current = buenosAiresDateParts(now);
  const currentMonthStart = buenosAiresBoundary(current.year, current.month - 1);
  if (mode === "complete") {
    const since = buenosAiresBoundary(current.year, current.month - 1 - safeMonths);
    return {
      fechaDesde: since.toISOString(),
      fechaHasta: new Date(currentMonthStart.getTime() - 1).toISOString(),
    };
  }
  const since = buenosAiresBoundary(
    current.year,
    current.month - safeMonths,
  );
  return { fechaDesde: since.toISOString(), fechaHasta: now.toISOString() };
}

export function customDateRange(from: string, to: string, now = new Date()) {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const since = buenosAiresBoundary(fromYear, fromMonth - 1, fromDay);
  const untilExclusive = buenosAiresBoundary(toYear, toMonth - 1, toDay + 1);
  return {
    fechaDesde: since.toISOString(),
    fechaHasta: new Date(
      Math.min(untilExclusive.getTime() - 1, now.getTime()),
    ).toISOString(),
  };
}

export function calendarMonthsIncluded(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
}

export function dateInputValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = buenosAiresDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function isValidMonthAmount(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 60;
}

export function parseBooleanParam(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  if (value === "1") return true;
  if (value === "0") return false;
  return fallback;
}

export function defaultRankingDimension(
  hasCareer: boolean,
  hasMatter: boolean,
): RankingDimension {
  if (!hasCareer) return "carreras";
  if (!hasMatter) return "materias";
  return "comisiones";
}
