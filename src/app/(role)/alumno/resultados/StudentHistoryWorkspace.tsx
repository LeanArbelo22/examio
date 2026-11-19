"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReportFilterPanel, type ReportFilterDefinition } from "@/components/reports/ReportFilterPanel";
import { ReportKpiGrid } from "@/components/reports/ReportKpiGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge";
import { useMisIntentos } from "@/hooks/useEvaluaciones";
import { useGetMaterias } from "@/hooks/useMaterias";
import { useGetComisiones } from "@/hooks/useComisiones";
import type {
  DireccionOrdenIntentosAlumno,
  EstadoIntento,
  MisIntentosFiltros,
  OrdenIntentosAlumno,
  ResultadoIntentoAlumno,
  Materia,
  Comision,
  MisIntentosResultado,
} from "@/types/index";

const FILTER_KEYS = [
  "idMateria",
  "idMateriaDivision",
  "fechaDesde",
  "fechaHasta",
  "estado",
  "resultado",
  "ordenarPor",
  "ordenDireccion",
] as const;

const stateLabels: Record<EstadoIntento, string> = {
  en_progreso: "En progreso",
  entregado: "Entregado",
  vencido: "Vencido",
  anulado: "Anulado",
};

const stateTones: Record<EstadoIntento, StatusBadgeTone> = {
  en_progreso: "warning",
  entregado: "success",
  vencido: "neutral",
  anulado: "danger",
};

const resultLabels: Record<ResultadoIntentoAlumno, string> = {
  aprobado: "Aprobado",
  desaprobado: "Desaprobado",
  pendiente: "Pendiente",
};

const resultTones: Record<ResultadoIntentoAlumno, StatusBadgeTone> = {
  aprobado: "success",
  desaprobado: "danger",
  pendiente: "warning",
};

const validStates = new Set<EstadoIntento>([
  "en_progreso",
  "entregado",
  "vencido",
  "anulado",
]);
const validResults = new Set<ResultadoIntentoAlumno>([
  "aprobado",
  "desaprobado",
  "pendiente",
]);
const validOrders = new Set<OrdenIntentosAlumno>([
  "fecha",
  "materia",
  "evaluacion",
  "nota",
]);

function positiveNumber(value: string | null): number | undefined {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin finalizar";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StudentHistoryWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [validationError, setValidationError] = useState<string | null>(null);

  const filters = useMemo<MisIntentosFiltros>(() => {
    const state = searchParams.get("estado") as EstadoIntento | null;
    const result = searchParams.get("resultado") as ResultadoIntentoAlumno | null;
    const order = searchParams.get("ordenarPor") as OrdenIntentosAlumno | null;
    const direction = searchParams.get("ordenDireccion") as DireccionOrdenIntentosAlumno | null;

    return {
      idMateria: positiveNumber(searchParams.get("idMateria")),
      idMateriaDivision: positiveNumber(searchParams.get("idMateriaDivision")),
      fechaDesde: searchParams.get("fechaDesde") || undefined,
      fechaHasta: searchParams.get("fechaHasta") || undefined,
      estado: state && validStates.has(state) ? state : undefined,
      resultado: result && validResults.has(result) ? result : undefined,
      pagina: positiveNumber(searchParams.get("pagina")) ?? 1,
      limite: 10,
      ordenarPor: order && validOrders.has(order) ? order : "fecha",
      ordenDireccion: direction === "asc" ? "asc" : "desc",
    };
  }, [searchParams]);

  const historyQuery = useMisIntentos(filters);
  const materiasQuery = useGetMaterias();
  const commissionsQuery = useGetComisiones();
  const materias = useMemo(
    () => (materiasQuery.materias ?? []) as Materia[],
    [materiasQuery.materias],
  );
  const commissions = useMemo(
    () => (commissionsQuery.comisiones ?? []) as Comision[],
    [commissionsQuery.comisiones],
  );

  const updateUrl = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  };

  const definitions = useMemo<ReportFilterDefinition[]>(
    () => [
      {
        key: "idMateria",
        label: "Materia",
        type: "select",
        options: materias.map((subject) => ({
          value: String(subject.id),
          label: subject.nombre,
        })),
      },
      {
        key: "idMateriaDivision",
        label: "Comisión",
        type: "select",
        options: commissions.map((commission) => ({
          value: String(commission.idMateriaDivision),
          label: `${commission.materia} / ${commission.division}`,
        })),
      },
      { key: "fechaDesde", label: "Fecha desde", type: "date" },
      { key: "fechaHasta", label: "Fecha hasta", type: "date" },
      {
        key: "estado",
        label: "Estado del intento",
        type: "select",
        options: Object.entries(stateLabels).map(([value, label]) => ({ value, label })),
      },
      {
        key: "resultado",
        label: "Resultado",
        type: "select",
        options: Object.entries(resultLabels).map(([value, label]) => ({ value, label })),
      },
    ],
    [commissions, materias],
  );

  const visibleFilters = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, String(filters[key] ?? "")]),
  );

  const search = (values: Record<string, string>) => {
    if (values.fechaDesde && values.fechaHasta && values.fechaDesde > values.fechaHasta) {
      setValidationError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    setValidationError(null);
    updateUrl({ ...values, pagina: 1 });
  };

  const data = historyQuery.data as MisIntentosResultado | undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6 antialiased">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mi historial de actividades
          </h1>
          <p className="mt-2 max-w-[65ch] text-pretty text-base leading-relaxed text-slate-600">
            Consultá tus intentos, resultados y evaluaciones pendientes de corrección.
          </p>
        </div>
        <Link
          href="/alumno"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Volver al panel
        </Link>
      </header>

      <ReportFilterPanel
        primaryKeys={["idMateria", "idMateriaDivision", "fechaDesde", "fechaHasta"]}
        key={searchParams.toString()}
        title="Filtrar historial"
        filters={visibleFilters}
        definitions={definitions}
        onSearch={search}
        onClear={() => {
          setValidationError(null);
          router.replace(pathname, { scroll: false });
        }}
      />

      {validationError && <ErrorMessage message={validationError} />}
      {historyQuery.isLoading && <LoadingState message="Cargando historial..." />}
      {historyQuery.isError && (
        <RequestErrorState
          error={historyQuery.error}
          fallback="No se pudo cargar tu historial."
          onRetry={() => void historyQuery.refetch()}
        />
      )}

      {data && (
        <div
          className={`space-y-6 transition-opacity ${historyQuery.isFetching ? "opacity-60" : "opacity-100"}`}
          aria-busy={historyQuery.isFetching}
        >
          <ReportKpiGrid
            items={[
              {
                label: "Evaluaciones",
                value: String(data.resumen.totalEvaluaciones),
                helper: `${data.resumen.totalIntentos} intentos encontrados`,
                tone: "indigo",
              },
              {
                label: "Aprobadas",
                value: String(data.resumen.evaluacionesAprobadas),
                helper: "Según el intento válido",
                tone: "emerald",
              },
              {
                label: "Desaprobadas",
                value: String(data.resumen.evaluacionesDesaprobadas),
                helper: "Según el intento válido",
                tone: "amber",
              },
              {
                label: "Pendientes",
                value: String(data.resumen.evaluacionesPendientes),
                helper: "Aún sin nota final",
                tone: "blue",
              },
            ]}
          />

          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Intentos encontrados</h2>
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-sm font-semibold text-slate-600">Ordenar por
                <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-700" value={filters.ordenarPor ?? "fecha"} onChange={(event) => updateUrl({ ordenarPor: event.target.value, pagina: 1 })}>
                  <option value="fecha">Fecha</option><option value="materia">Materia</option><option value="evaluacion">Evaluación</option><option value="nota">Nota</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-600">Dirección
                <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-700" value={filters.ordenDireccion ?? "desc"} onChange={(event) => updateUrl({ ordenDireccion: event.target.value, pagina: 1 })}>
                  <option value="desc">Descendente</option><option value="asc">Ascendente</option>
                </select>
              </label>
            </div>
          </div>

          {data.items.length === 0 ? (
            <EmptyState
              title="No encontramos intentos"
              description="Probá cambiar o limpiar los filtros aplicados."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.items.map((attempt) => {
                const isCancelled = attempt.estado === "anulado";
                const isAcademicResult = attempt.esIntentoValido && !isCancelled;

                return (
                  <article
                    key={attempt.idIntento}
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${
                      isAcademicResult
                        ? "border-indigo-200 ring-1 ring-indigo-100"
                        : "border-slate-200/80"
                    }`}
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-indigo-600">
                        {attempt.materia} · {attempt.division}
                      </p>
                      <h2 className="mt-1 break-words text-balance text-lg font-bold leading-snug text-slate-900">
                        {attempt.titulo}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isAcademicResult && <StatusBadge label="Resultado académico" tone="indigo" />}
                    <StatusBadge
                      label={stateLabels[attempt.estado]}
                      tone={stateTones[attempt.estado]}
                    />
                    {!isCancelled && (
                      <StatusBadge
                        label={resultLabels[attempt.resultado]}
                        tone={resultTones[attempt.resultado]}
                      />
                    )}
                    <StatusBadge
                      label={`Intento ${attempt.numeroIntento}/${attempt.cantidadIntentosMaximos}`}
                    />
                  </div>

                  <dl className={`mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-sm ${isCancelled ? "grid-cols-1" : "grid-cols-2"}`}>
                    <div>
                      <dt className="font-semibold text-slate-500">Fecha de inicio</dt>
                      <dd className="mt-1 font-bold text-slate-800">
                        {formatDate(attempt.fechaInicio)}
                      </dd>
                    </div>
                    {!isCancelled && (
                      <div>
                        <dt className="font-semibold text-slate-500">Nota</dt>
                        <dd className="mt-1 font-black text-slate-800">
                          {attempt.notaFinal == null
                            ? "Pendiente"
                            : `${attempt.notaFinal.toFixed(2)} / ${attempt.escalaCalificacion}`}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {isCancelled ? (
                    <p className="mt-4 text-sm font-medium text-slate-600">
                      Este intento no forma parte de tu resultado académico.
                    </p>
                  ) : (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">
                        Aprobación: {attempt.notaAprobacion} / {attempt.escalaCalificacion}
                      </p>
                      {attempt.revisionDisponible ? (
                      <Link
                        href={`/alumno/intento/${attempt.idIntento}`}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        Revisar examen →
                      </Link>
                      ) : (
                        <span className="text-sm font-semibold text-slate-500">
                          {attempt.correccionPendiente
                            ? "Corrección en curso"
                            : "Revisión no disponible"}
                        </span>
                      )}
                    </div>
                  )}
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            page={data.paginacion.pagina}
            totalPages={data.paginacion.totalPaginas}
            total={data.paginacion.total}
            itemLabel="intentos"
            onPageChange={(pagina) => updateUrl({ pagina })}
          />
        </div>
      )}
    </div>
  );
}
