import type { EscalaCalificacion } from "@/types";

const SCORE_DECIMALS = 2;

export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatScoreInput(value: number) {
  return roundScore(value).toFixed(SCORE_DECIMALS).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function scaleScoreInput(
  value: string | undefined,
  previousScale: EscalaCalificacion,
  nextScale: EscalaCalificacion,
) {
  if (!value?.trim()) return value ?? "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return formatScoreInput((parsed * nextScale) / previousScale);
}

export function distributeEqualScores(
  count: number,
  scale: EscalaCalificacion,
) {
  if (count <= 0) return [];
  const totalCents = scale * 100;
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from(
    { length: count },
    (_, index) => formatScoreInput((base + (index < remainder ? 1 : 0)) / 100),
  );
}

export function scoreInputToCents(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}
