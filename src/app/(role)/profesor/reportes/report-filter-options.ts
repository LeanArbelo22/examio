import type { EvaluacionDocente } from "@/types";

export function normalizeAuthorizedReportFilters(
  values: Record<string, string>,
  evaluations: EvaluacionDocente[],
) {
  const normalized = { ...values };
  const bySubject = evaluations.filter(
    (item) => !normalized.idMateria || item.idMateria === Number(normalized.idMateria),
  );

  if (
    normalized.idMateriaDivision &&
    !bySubject.some(
      (item) => item.idMateriaDivision === Number(normalized.idMateriaDivision),
    )
  ) {
    normalized.idMateriaDivision = "";
  }

  const byCommission = bySubject.filter(
    (item) =>
      !normalized.idMateriaDivision ||
      item.idMateriaDivision === Number(normalized.idMateriaDivision),
  );
  if (
    normalized.idActividad &&
    !byCommission.some((item) => item.idActividad === Number(normalized.idActividad))
  ) {
    normalized.idActividad = "";
  }

  const byActivity = byCommission.filter(
    (item) =>
      !normalized.idActividad || item.idActividad === Number(normalized.idActividad),
  );
  if (
    normalized.idPublicacion &&
    !byActivity.some(
      (item) => item.idPublicacion === Number(normalized.idPublicacion),
    )
  ) {
    normalized.idPublicacion = "";
  }

  return normalized;
}
