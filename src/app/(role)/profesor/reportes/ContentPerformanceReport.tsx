"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { ContentPerformanceCharts } from "@/components/reports/ContentPerformanceCharts";
import { ContentPerformanceRankings } from "@/components/reports/ContentPerformanceRankings";
import {
  ReportFilterPanel,
  type ReportFilterDefinition,
} from "@/components/reports/ReportFilterPanel";
import { ReportKpiGrid } from "@/components/reports/ReportKpiGrid";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import {
  ReportTable,
  type ReportColumn,
} from "@/components/reports/ReportTable";
import { QuestionOptionsDetail } from "@/components/reports/QuestionOptionsDetail";
import { useGetEvaluacionesDocente } from "@/hooks/useEvaluaciones";
import {
  useReporteRendimientoGrupos,
  useReporteRendimientoPreguntas,
} from "@/hooks/useReportes";
import type {
  OrdenDireccion,
  ReporteContenidoFiltrosBase,
  ReporteGruposFiltros,
  ReporteGruposOrden,
  ReporteOpcionesFiltros,
  ReporteGrupoItem,
  ReportePreguntaItem,
  ReportePreguntasFiltros,
  ReportePreguntasOrden,
} from "@/types";
import { normalizeAuthorizedReportFilters } from "./report-filter-options";

const COMMON_FILTER_KEYS = [
  "idMateria",
  "idMateriaDivision",
  "idActividad",
  "idPublicacion",
  "idGrupoPregunta",
  "fechaDesde",
  "fechaHasta",
  "estadoIntento",
  "alcanceIntentos",
  "estadoCorreccion",
] as const;

const CLOSED_TYPES = new Set(["mc", "multiple", "vf"]);

function uniqueOptions<T>(
  items: T[],
  getId: (item: T) => number | undefined,
  getLabel: (item: T) => string,
) {
  const options = new Map<string, { value: string; label: string }>();
  for (const item of items) {
    const id = getId(item);
    if (!Number.isInteger(id) || !id || id <= 0) continue;
    options.set(String(id), { value: String(id), label: getLabel(item) });
  }
  return [...options.values()];
}

function percentage(value: number | null) {
  return value === null ? "—" : `${Number(value).toFixed(1)}%`;
}

function duration(milliseconds: number | null) {
  if (milliseconds === null) return "Sin datos";
  const seconds = Number(milliseconds) / 1000;
  if (seconds < 60) return `${seconds.toLocaleString("es-AR", { maximumFractionDigits: 1 })} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder > 0 ? `${minutes} min ${remainder} s` : `${minutes} min`;
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    mc: "Selección única",
    multiple: "Selección múltiple",
    vf: "Verdadero / Falso",
    abierta: "A desarrollar",
    code: "Programación",
  };
  return labels[type] ?? type;
}

interface ContentPerformanceReportProps {
  kind: "preguntas" | "grupos";
}

export function ContentPerformanceReport({ kind }: ContentPerformanceReportProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<ReportePreguntaItem | null>(null);

  const baseFilters = useMemo<ReporteContenidoFiltrosBase>(
    () => ({
      ...Object.fromEntries(
        COMMON_FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""]),
      ),
      estadoIntento: (searchParams.get("estadoIntento") ?? "") as ReporteContenidoFiltrosBase["estadoIntento"],
      alcanceIntentos:
        (searchParams.get("alcanceIntentos") as ReporteContenidoFiltrosBase["alcanceIntentos"]) ||
        undefined,
      estadoCorreccion:
        (searchParams.get("estadoCorreccion") as ReporteContenidoFiltrosBase["estadoCorreccion"]) ||
        undefined,
      pagina: Math.max(1, Number(searchParams.get("pagina")) || 1),
      limite: 20,
      ordenDireccion:
        (searchParams.get("ordenDireccion") as OrdenDireccion) || "desc",
    }),
    [searchParams],
  );
  const questionFilters = useMemo<ReportePreguntasFiltros>(
    () => ({
      ...baseFilters,
      idPregunta: searchParams.get("idPregunta") ?? "",
      ordenarPor:
        (searchParams.get("ordenarPor") as ReportePreguntasOrden) ||
        "presentadas",
    }),
    [baseFilters, searchParams],
  );
  const groupFilters = useMemo<ReporteGruposFiltros>(
    () => ({
      ...baseFilters,
      ordenarPor:
        (searchParams.get("ordenarPor") as ReporteGruposOrden) ||
        "presentadas",
    }),
    [baseFilters, searchParams],
  );

  const questionsQuery = useReporteRendimientoPreguntas(
    questionFilters,
    kind === "preguntas",
  );
  const groupsQuery = useReporteRendimientoGrupos(groupFilters, kind === "grupos");
  const lowestQuestionsQuery = useReporteRendimientoPreguntas(
    {
      ...questionFilters,
      pagina: 1,
      limite: 5,
      ordenarPor: "porcentajePuntaje",
      ordenDireccion: "asc",
    },
    kind === "preguntas",
  );
  const longestQuestionsQuery = useReporteRendimientoPreguntas(
    {
      ...questionFilters,
      pagina: 1,
      limite: 5,
      ordenarPor: "tiempoPromedio",
      ordenDireccion: "desc",
    },
    kind === "preguntas",
  );
  const lowestGroupsQuery = useReporteRendimientoGrupos(
    {
      ...groupFilters,
      pagina: 1,
      limite: 5,
      ordenarPor: "porcentajePuntaje",
      ordenDireccion: "asc",
    },
    kind === "grupos",
  );
  const longestGroupsQuery = useReporteRendimientoGrupos(
    {
      ...groupFilters,
      pagina: 1,
      limite: 5,
      ordenarPor: "tiempoPromedio",
      ordenDireccion: "desc",
    },
    kind === "grupos",
  );
  const query = kind === "preguntas" ? questionsQuery : groupsQuery;
  const lowestRankingQuery =
    kind === "preguntas" ? lowestQuestionsQuery : lowestGroupsQuery;
  const longestRankingQuery =
    kind === "preguntas" ? longestQuestionsQuery : longestGroupsQuery;
  const legajo = Number(session?.user?.identificadorInstitucional) || 0;
  const { data: evaluaciones = [] } = useGetEvaluacionesDocente(legajo);

  const updateUrl = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    params.set("reporte", kind);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const filterDefinitions = useMemo<ReportFilterDefinition[]>(
    () => [
      {
        key: "idMateria",
        label: "Materia",
        type: "select",
        options: uniqueOptions(
          evaluaciones,
          (item) => item.idMateria,
          (item) => item.materia,
        ),
      },
      {
        key: "idMateriaDivision",
        label: "Materia / División",
        type: "select",
        options: uniqueOptions(
          evaluaciones.filter(
            (item) => !baseFilters.idMateria || item.idMateria === Number(baseFilters.idMateria),
          ),
          (item) => item.idMateriaDivision,
          (item) => `${item.materia} / ${item.division}`,
        ),
      },
      {
        key: "idActividad",
        label: "Actividad",
        type: "select",
        options: uniqueOptions(
          evaluaciones.filter(
            (item) =>
              (!baseFilters.idMateria || item.idMateria === Number(baseFilters.idMateria)) &&
              (!baseFilters.idMateriaDivision ||
                item.idMateriaDivision === Number(baseFilters.idMateriaDivision)),
          ),
          (item) => item.idActividad,
          (item) => item.titulo,
        ),
      },
      {
        key: "idPublicacion",
        label: "Publicación",
        type: "select",
        options: uniqueOptions(
          evaluaciones.filter(
            (item) =>
              (!baseFilters.idMateria || item.idMateria === Number(baseFilters.idMateria)) &&
              (!baseFilters.idMateriaDivision ||
                item.idMateriaDivision === Number(baseFilters.idMateriaDivision)) &&
              (!baseFilters.idActividad || item.idActividad === Number(baseFilters.idActividad)),
          ),
          (item) => item.idPublicacion,
          (item) => `${item.titulo} / ${item.division}`,
        ),
      },
      { key: "idGrupoPregunta", label: "ID del grupo", type: "number", min: 1, step: 1 },
      ...(kind === "preguntas"
        ? [{ key: "idPregunta", label: "ID de la pregunta", type: "number" as const, min: 1, step: 1 }]
        : []),
      { key: "fechaDesde", label: "Fecha desde", type: "date" as const },
      { key: "fechaHasta", label: "Fecha hasta", type: "date" as const },
      {
        key: "estadoIntento",
        label: "Estado del intento",
        type: "select" as const,
        options: [
          { value: "entregado", label: "Entregado" },
          { value: "en_progreso", label: "En progreso" },
          { value: "vencido", label: "Vencido" },
          { value: "anulado", label: "Anulado" },
        ],
      },
      {
        key: "alcanceIntentos",
        label: "Intentos académicos",
        type: "select" as const,
        options: [
          { value: "todos", label: "Todos los intentos" },
          { value: "validos", label: "Sólo intento válido" },
        ],
      },
      {
        key: "estadoCorreccion",
        label: "Corrección",
        type: "select" as const,
        options: [
          { value: "todas", label: "Todas" },
          { value: "pendiente", label: "Pendiente" },
          { value: "confirmada", label: "Confirmada" },
        ],
      },
    ],
    [
      baseFilters.idActividad,
      baseFilters.idMateria,
      baseFilters.idMateriaDivision,
      evaluaciones,
      kind,
    ],
  );

  const visibleFilters = Object.fromEntries([
    ...COMMON_FILTER_KEYS.map((key) => [key, String(baseFilters[key] ?? "")]),
    ...(kind === "preguntas" ? [["idPregunta", questionFilters.idPregunta ?? ""]] : []),
  ]);

  const search = (values: Record<string, string>) => {
    const normalizedValues = normalizeAuthorizedReportFilters(values, evaluaciones);
    if (normalizedValues.fechaDesde && normalizedValues.fechaHasta && normalizedValues.fechaDesde > normalizedValues.fechaHasta) {
      setFilterError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    for (const key of ["idGrupoPregunta", "idPregunta"] as const) {
      if (normalizedValues[key] && (!Number.isInteger(Number(normalizedValues[key])) || Number(normalizedValues[key]) <= 0)) {
        setFilterError("Los identificadores deben ser números enteros mayores que cero.");
        return;
      }
    }
    setFilterError(null);
    updateUrl({ ...normalizedValues, pagina: 1 });
  };

  const questionColumns = useMemo<
    ReportColumn<ReportePreguntaItem, ReportePreguntasOrden>[]
  >(
    () => [
      {
        key: "pregunta",
        header: "Pregunta",
        sortKey: "pregunta",
        render: (row) => (
          <div className="max-w-md">
            <p className="font-bold text-slate-800">{row.enunciado}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              {typeLabel(row.tipo)} · {row.grupo || "Grupo sin título"}
            </p>
          </div>
        ),
      },
      { key: "presentadas", header: "Presentadas", align: "center", sortKey: "presentadas", render: (row) => Number(row.presentadas).toLocaleString("es-AR") },
      { key: "respondidas", header: "Respondidas", align: "center", sortKey: "respondidas", render: (row) => Number(row.respondidas).toLocaleString("es-AR") },
      { key: "omitidas", header: "Omitidas", align: "center", sortKey: "omitidas", render: (row) => Number(row.omitidas).toLocaleString("es-AR") },
      { key: "pendientes", header: "Pendientes", align: "center", sortKey: "pendientesCorreccion", render: (row) => <span className="font-bold text-amber-600">{Number(row.pendientesCorreccion).toLocaleString("es-AR")}</span> },
      { key: "puntaje", header: "Puntaje promedio", align: "right", sortKey: "porcentajePuntaje", render: (row) => percentage(row.porcentajePuntajePromedio) },
      { key: "acierto", header: "Respuestas correctas", align: "right", sortKey: "tasaAcierto", render: (row) => percentage(row.tasaAcierto) },
      { key: "tiempo", header: "Tiempo promedio", align: "right", sortKey: "tiempoPromedio", render: (row) => duration(row.tiempoPromedioMilisegundos) },
      {
        key: "opciones",
        header: "Detalle",
        align: "right",
        render: (row) => CLOSED_TYPES.has(row.tipo) ? (
          <Button
            type="button"
            onClick={() => setSelectedQuestion(row)}
            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
          >
            Ver opciones
          </Button>
        ) : <span className="text-slate-400">No aplica</span>,
      },
    ],
    [],
  );

  const groupColumns = useMemo<
    ReportColumn<ReporteGrupoItem, ReporteGruposOrden>[]
  >(
    () => [
      {
        key: "grupo",
        header: "Grupo",
        sortKey: "grupo",
        render: (row) => (
          <div className="max-w-md">
            <p className="font-bold text-slate-800">{row.grupo || "Grupo sin título"}</p>
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] font-bold text-indigo-600">
                {row.cantidadVariantes} variante{row.cantidadVariantes === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 space-y-1 border-l-2 border-indigo-100 pl-3 text-[10px] text-slate-500">
                {row.variantes.map((variant) => (
                  <li key={variant.claveContenido}>
                    {variant.enunciado} · {percentage(variant.porcentajePuntajePromedio)}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ),
      },
      { key: "presentadas", header: "Presentadas", align: "center", sortKey: "presentadas", render: (row) => Number(row.presentadas).toLocaleString("es-AR") },
      { key: "respondidas", header: "Respondidas", align: "center", sortKey: "respondidas", render: (row) => Number(row.respondidas).toLocaleString("es-AR") },
      { key: "omitidas", header: "Omitidas", align: "center", sortKey: "omitidas", render: (row) => Number(row.omitidas).toLocaleString("es-AR") },
      { key: "pendientes", header: "Pendientes", align: "center", sortKey: "pendientesCorreccion", render: (row) => <span className="font-bold text-amber-600">{Number(row.pendientesCorreccion).toLocaleString("es-AR")}</span> },
      { key: "puntaje", header: "Puntaje promedio", align: "right", sortKey: "porcentajePuntaje", render: (row) => percentage(row.porcentajePuntajePromedio) },
      { key: "acierto", header: "Respuestas correctas", align: "right", sortKey: "tasaAcierto", render: (row) => percentage(row.tasaAcierto) },
      { key: "diferencia", header: "Diferencia entre variantes", align: "right", render: (row) => percentage(row.diferenciaVariantesPuntosPorcentuales) },
      { key: "tiempo", header: "Tiempo promedio", align: "right", sortKey: "tiempoPromedio", render: (row) => duration(row.tiempoPromedioMilisegundos) },
    ],
    [],
  );

  const optionFilters: ReporteOpcionesFiltros = {
    ...baseFilters,
    pagina: undefined,
    limite: undefined,
    ordenDireccion: undefined,
  };

  return (
    <ReportLayout
      title={kind === "preguntas" ? "Rendimiento por pregunta" : "Rendimiento por grupo"}
      description={
        kind === "preguntas"
          ? "Detectá preguntas difíciles, omisiones, tiempos elevados y distractores frecuentes."
          : "Compará el desempeño de grupos y sus variantes con puntajes normalizados."
      }
      actions={
        <Button
          onClick={() => router.push("/profesor")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Volver al panel
        </Button>
      }
    >
      <ReportFilterPanel
        key={searchParams.toString()}
        filters={visibleFilters}
        definitions={filterDefinitions}
        onSearch={search}
        onClear={() => {
          setFilterError(null);
          router.replace(`${pathname}?reporte=${kind}`, { scroll: false });
        }}
      />
      {filterError && <ErrorMessage message={filterError} />}
      {query.isLoading && <ReportSkeleton />}
      {query.isError && (
        <RequestErrorState
          error={query.error}
          fallback="No se pudo cargar el reporte."
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && (
        <div
          className={`space-y-6 transition-opacity ${query.isFetching ? "opacity-60" : "opacity-100"}`}
          aria-busy={query.isFetching}
        >
          <ReportKpiGrid
            items={[
              { label: "Presentadas", value: Number(query.data.kpis.presentadas).toLocaleString("es-AR"), helper: "Apariciones en intentos", tone: "indigo" },
              { label: "Respondidas", value: Number(query.data.kpis.respondidas).toLocaleString("es-AR"), helper: `${Number(query.data.kpis.omitidas).toLocaleString("es-AR")} omitidas`, tone: "blue" },
              { label: "Pendientes", value: Number(query.data.kpis.pendientesCorreccion).toLocaleString("es-AR"), helper: "Sin puntaje definitivo", tone: "amber" },
              { label: "Tasa de acierto", value: percentage(query.data.kpis.tasaAcierto), helper: "Sobre respuestas corregidas", tone: "emerald" },
              { label: "Puntaje promedio", value: percentage(query.data.kpis.porcentajePuntajePromedio), helper: "Normalizado por puntaje máximo", tone: "indigo" },
              { label: "Cobertura de tiempos", value: `${(Number(query.data.kpis.coberturaTemporal) * 100).toFixed(1)}%`, helper: `${Number(query.data.kpis.muestrasTiempo).toLocaleString("es-AR")} muestras`, tone: "blue" },
              { label: "Tiempo promedio", value: duration(query.data.kpis.tiempoPromedioMilisegundos), helper: "Sólo presentaciones con medición", tone: "amber" },
              { label: "Justificaciones", value: Number(query.data.kpis.justificacionesEntregadas).toLocaleString("es-AR"), helper: "Registradas por alumnos", tone: "emerald" },
            ]}
          />
          <ContentPerformanceCharts
            kpis={query.data.kpis}
            kind={kind}
          />
          {!lowestRankingQuery.isPlaceholderData &&
            !longestRankingQuery.isPlaceholderData &&
            lowestRankingQuery.data &&
            longestRankingQuery.data && (
              <ContentPerformanceRankings
                kind={kind}
                lowestScores={lowestRankingQuery.data.items}
                longestTimes={longestRankingQuery.data.items}
                onSelectQuestion={
                  kind === "preguntas" ? setSelectedQuestion : undefined
                }
              />
            )}
          {kind === "preguntas" && questionsQuery.data ? (
            <ReportTable
              columns={questionColumns}
              rows={questionsQuery.data.items}
              rowKey={(row) => row.claveContenido}
              sortBy={questionFilters.ordenarPor ?? "presentadas"}
              sortDirection={questionFilters.ordenDireccion ?? "desc"}
              onSort={(ordenarPor, ordenDireccion) => updateUrl({ ordenarPor, ordenDireccion, pagina: 1 })}
              page={questionsQuery.data.pagination.page}
              totalPages={questionsQuery.data.pagination.totalPages}
              total={questionsQuery.data.pagination.total}
              itemLabel="preguntas"
              onPageChange={(pagina) => updateUrl({ pagina })}
            />
          ) : groupsQuery.data ? (
            <ReportTable
              columns={groupColumns}
              rows={groupsQuery.data.items}
              rowKey={(row) => row.idGrupoPregunta}
              sortBy={groupFilters.ordenarPor ?? "presentadas"}
              sortDirection={groupFilters.ordenDireccion ?? "desc"}
              onSort={(ordenarPor, ordenDireccion) => updateUrl({ ordenarPor, ordenDireccion, pagina: 1 })}
              page={groupsQuery.data.pagination.page}
              totalPages={groupsQuery.data.pagination.totalPages}
              total={groupsQuery.data.pagination.total}
              itemLabel="grupos"
              onPageChange={(pagina) => updateUrl({ pagina })}
            />
          ) : null}
        </div>
      )}
      <QuestionOptionsDetail
        question={selectedQuestion}
        filters={optionFilters}
        onClose={() => setSelectedQuestion(null)}
      />
    </ReportLayout>
  );
}
