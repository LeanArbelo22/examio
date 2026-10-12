export function formatGrade(value: number | null, scale?: number): string {
  if (value === null) return "—";
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return scale === undefined ? formatted : `${formatted} / ${scale}`;
}

export function formatGradeInput(value: number | null): string {
  if (value === null) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function parseGradeInput(
  value: string,
  maximum: number,
): { value: number | null; error: string | null } {
  if (value.trim() === "") {
    return { value: null, error: "Ingresá un puntaje." };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: "Ingresá un número válido." };
  }

  if (Math.round(parsed * 100) !== parsed * 100) {
    return { value: null, error: "Usá como máximo dos decimales." };
  }

  if (parsed < 0 || parsed > maximum) {
    return {
      value: null,
      error: `El puntaje debe estar entre 0 y ${formatGrade(maximum)}.`,
    };
  }

  return { value: parsed, error: null };
}
