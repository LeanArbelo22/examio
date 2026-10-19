"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { EvaluationReportCharts } from "@/components/reports/EvaluationReportCharts";
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
import { useGetComisiones } from "@/hooks/useComisiones";
import { useGetEvaluacionesDocente } from "@/hooks/useEvaluaciones";
import { useGetMaterias } from "@/hooks/useMaterias";
import { useReporteRendimientoEvaluaciones } from "@/hooks/useReportes";
import type {
  OrdenDireccion,
  ReporteEvaluacionItem,
  ReporteEvaluacionesFiltros,
  ReporteEvaluacionesOrden,
} from "@/types/index";

const FILTER_KEYS = [
  "idMateria",
  "idMateriaDivision",
  "idActividad",
  "idPublicacion",
  "estado",
  "fechaDesde",
  "fechaHasta",
  "alcanceIntentos",
  "conPendientesCorreccion",
  "conIncidentes",
  "tipoIncidente",
  "severidad",
  "soloIncidentesSinRevisar",
] as const;

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatNullable(value: number | null, suffix = "") {
  return value === null ? "—" : `${value.toFixed(2)}${suffix}`;
}

export function EvaluacionesReport() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [filterError, setFilterError] = useState<string | null>(null);

  const filters = useMemo<ReporteEvaluacionesFiltros>(
    () => ({
      ...Object.fromEntries(
        FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""]),
      ),
      estado: (searchParams.get("estado") ?? "") as ReporteEvaluacionesFiltros["estado"],
      alcanceIntentos:
        (searchParams.get("alcanceIntentos") as ReporteEvaluacionesFiltros["alcanceIntentos"]) ||
        undefined,
      conPendientesCorreccion:
        searchParams.get("conPendientesCorreccion") === null
          ? ""
          : searchParams.get("conPendientesCorreccion") === "true",
      conIncidentes:
        searchParams.get("conIncidentes") === null
          ? ""
          : searchParams.get("conIncidentes") === "true",
      soloIncidentesSinRevisar:
        searchParams.get("soloIncidentesSinRevisar") === null
          ? ""
          : searchParams.get("soloIncidentesSinRevisar") === "true",
      ordenarPor:
        (searchParams.get("ordenarPor") as ReporteEvaluacionesOrden) ||
        "fecha",
      ordenDireccion:
        (searchParams.get("ordenDireccion") as OrdenDireccion) || "desc",
      pagina: Math.max(1, Number(searchParams.get("pagina")) || 1),
      limite: 20,
    }),
    [searchParams],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useReporteRendimientoEvaluaciones(filters);
  const { materias = [] } = useGetMaterias();
  const { comisiones = [] } = useGetComisiones();
  const legajo = Number(session?.user?.identificadorInstitucional) || 0;
  const { data: evaluaciones = [] } = useGetEvaluacionesDocente(legajo);

  const updateUrl = (
    updates: Record<string, string | number | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    params.set("reporte", "evaluaciones");
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const filterDefinitions = useMemo<ReportFilterDefinition[]>(
    () => [
      {
        key: "idMateria",
        label: "Materia",
        type: "select",
        options: uniqueOptions(
          materias,
          (item) =>
            (item as typeof item & { idMateria?: number }).idMateria ?? item.id,
          (item) => item.nombre,
        ),
      },
      {
        key: "idMateriaDivision",
        label: "Materia / División",
        type: "select",
        options: uniqueOptions(
          comisiones,
          (item) =>
            item.idMateriaDivision ??
            (item as typeof item & { idComision?: number }).idComision,
          (item) => `${item.materia} / ${item.division}`,
        ),
      },
      {
        key: "idActividad",
        label: "Actividad base",
        type: "select",
        options: uniqueOptions(
          evaluaciones,
          (item) => item.idActividad,
          (item) => item.titulo,
        ),
      },
      {
        key: "idPublicacion",
        label: "Publicación",
        type: "select",
        options: uniqueOptions(
          evaluaciones,
          (item) => item.idPublicacion,
          (item) => `${item.titulo} / ${item.division}`,
        ),
      },
      {
        key: "estado",
        label: "Estado",
        type: "select",
        options: [
          { value: "borrador", label: "Borrador" },
          { value: "publicada", label: "Publicada" },
          { value: "archivada", label: "Archivada" },
        ],
      },
      { key: "fechaDesde", label: "Fecha desde", type: "date" },
      { key: "fechaHasta", label: "Fecha hasta", type: "date" },
      {
        key: "alcanceIntentos",
        label: "Resultados académicos",
        type: "select",
        options: [{ value: "validos", label: "Sólo intento válido" }],
      },
      {
        key: "conPendientesCorreccion",
        label: "Correcciones pendientes",
        type: "select",
        options: [
          { value: "true", label: "Con pendientes" },
          { value: "false", label: "Sin pendientes" },
        ],
      },
      {
        key: "conIncidentes",
        label: "Incidentes",
        type: "select",
        options: [
          { value: "true", label: "Con incidentes" },
          { value: "false", label: "Sin incidentes" },
        ],
      },
      {
        key: "tipoIncidente",
        label: "Tipo de incidente",
        type: "select",
        options: [
          { value: "focus_lost", label: "Pérdida de foco" },
          { value: "fullscreen_exit", label: "Salida de pantalla completa" },
          { value: "connectivity_lost", label: "Pérdida de conexión" },
          { value: "auth_session_unavailable", label: "Sesión no disponible" },
          { value: "sync_error", label: "Error de sincronización" },
          { value: "submission_failed", label: "Entrega fallida" },
        ],
      },
      {
        key: "severidad",
        label: "Consecuencia",
        type: "select",
        options: [
          { value: "sin_clasificar", label: "Sin clasificación" },
          { value: "informar", label: "Informativa" },
          { value: "advertir", label: "Advertencia" },
          { value: "bloquear_interfaz", label: "Bloqueo temporal" },
          { value: "anular_intento", label: "Anulación del intento" },
        ],
      },
      {
        key: "soloIncidentesSinRevisar",
        label: "Revisión de incidentes",
        type: "select",
        options: [{ value: "true", label: "Sólo pendientes" }],
      },
    ],
    [materias, comisiones, evaluaciones],
  );

  const visibleFilters = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, String(filters[key] ?? "")]),
  );

  const search = (values: Record<string, string>) => {
    if (
      values.fechaDesde &&
      values.fechaHasta &&
      values.fechaDesde > values.fechaHasta
    ) {
      setFilterError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    if (
      values.conIncidentes === "false" &&
      (values.tipoIncidente ||
        values.severidad ||
        values.soloIncidentesSinRevisar === "true")
    ) {
      setFilterError(
        "Para filtrar por tipo, consecuencia o revisión, seleccioná evaluaciones con incidentes.",
      );
      return;
    }
    setFilterError(null);
    updateUrl({ ...values, pagina: 1 });
  };

  const columns = useMemo<
    ReportColumn<ReporteEvaluacionItem, ReporteEvaluacionesOrden>[]
  >(
    () => [
      {
        key: "evaluacion",
        header: "Evaluación",
        sortKey: "evaluacion",
        render: (row) => (
          <div>
            <p className="font-bold text-slate-800">{row.titulo}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Publicación #{row.idPublicacion}
            </p>
          </div>
        ),
      },
      {
        key: "comision",
        header: "Materia / comisión",
        render: (row) => (
          <div>
            <p className="font-semibold text-slate-700">{row.materia}</p>
            <p className="text-[10px] text-slate-400">{row.division}</p>
          </div>
        ),
      },
      {
        key: "fecha",
        header: "Inicio",
        sortKey: "fecha",
        render: (row) => formatDate(row.fechaInicio),
      },
      {
        key: "alcanzados",
        header: "Alcanzados",
        align: "center",
        render: (row) => row.alumnosAlcanzados,
      },
      {
        key: "entregados",
        header: "Entregados",
        align: "center",
        sortKey: "entregados",
        render: (row) => row.entregados,
      },
      {
        key: "pendientes",
        header: "Pendientes",
        align: "center",
        sortKey: "pendientesCorreccion",
        render: (row) => (
          <span className="font-bold text-amber-600">
            {row.intentosPendientesCorreccion}
          </span>
        ),
      },
      {
        key: "incidentes",
        header: "Incidentes",
        align: "center",
        render: (row) => (
          <div className="flex flex-col items-center gap-1">
            <span className="font-black text-slate-800">
              {row.totalIncidentes}
            </span>
            {row.incidentesSinRevisar > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {row.incidentesSinRevisar} pendientes
              </span>
            )}
            {row.intentosAnulados > 0 && (
              <span className="text-[10px] font-bold text-red-700">
                {row.intentosAnulados} anulados
              </span>
            )}
          </div>
        ),
      },
      {
        key: "promedio",
        header: "Promedio por intento",
        align: "right",
        sortKey: "promedio",
        render: (row) => (
          <span className="font-black text-slate-800">
            {formatNullable(row.promedioIntentosCalificados)} / {row.escalaCalificacion}
          </span>
        ),
      },
      {
        key: "aprobacion",
        header: "% aprobación intentos",
        align: "right",
        sortKey: "aprobacion",
        render: (row) =>
          formatNullable(row.porcentajeAprobacionIntentos, "%"),
      },
    ],
    [],
  );

  return (
    <ReportLayout
      title="Rendimiento por evaluación"
      description="Compará entregas, correcciones y resultados de cada publicación dentro de tus materias y comisiones."
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
          router.replace(`${pathname}?reporte=evaluaciones`, { scroll: false });
        }}
      />
      {filterError && <ErrorMessage message={filterError} />}
      {isLoading && <ReportSkeleton />}
      {isError && (
        <RequestErrorState
          error={error}
          fallback="No se pudo cargar el reporte por evaluación."
          onRetry={() => void refetch()}
        />
      )}
      {data && (
        <div
          className={`space-y-6 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}
          aria-busy={isFetching}
        >
          <ReportKpiGrid
            items={[
              {
                id: "evaluaciones",
                label: "Evaluaciones",
                value: data.kpis.totalEvaluaciones.toLocaleString("es-AR"),
                helper: `${data.kpis.totalAlumnosUnicos.toLocaleString("es-AR")} alumnos únicos`,
                tone: "indigo",
              },
              {
                id: "intentos",
                label: "Intentos",
                value: data.kpis.totalIntentos.toLocaleString("es-AR"),
                helper: `${data.kpis.totalEntregados.toLocaleString("es-AR")} entregados`,
                tone: "blue",
              },
              {
                id: "promedio",
                label: "Promedio por intento",
                value: formatNullable(data.kpis.promedioIntentosCalificadosBase10),
                helper: `Sobre 10 · ${data.kpis.totalIntentosCalificados.toLocaleString("es-AR")} calificados`,
                tone: "amber",
              },
              {
                id: "aprobacion",
                label: "Aprobación por intento",
                value: formatNullable(data.kpis.tasaAprobacionIntentos, "%"),
                helper: `${data.kpis.intentosPendientesCorreccion.toLocaleString("es-AR")} pendientes · ${data.criterios.alcanceIntentos === "validos" ? "intentos válidos" : "todos los intentos"}`,
                tone: "emerald",
              },
              {
                id: "incidentes",
                label: "Incidentes",
                value: data.kpis.totalIncidentes.toLocaleString("es-AR"),
                helper: "Eventos operativos registrados",
                tone: "blue",
              },
              {
                id: "alumnos-con-incidentes",
                label: "Alumnos con incidentes",
                value: data.kpis.alumnosConIncidentes.toLocaleString("es-AR"),
                helper: "Alumnos únicos afectados",
                tone: "blue",
              },
              {
                id: "incidentes-pendientes",
                label: "Incidentes pendientes",
                value: data.kpis.incidentesSinRevisar.toLocaleString("es-AR"),
                helper: "Pendientes de revisión operativa",
                tone: "amber",
              },
              {
                id: "intentos-anulados",
                label: "Intentos anulados",
                value: data.kpis.intentosAnulados.toLocaleString("es-AR"),
                helper: "No implica una conclusión de fraude",
                tone: "amber",
              },
            ]}
          />
          <EvaluationReportCharts
            distribution={data.graficos.distribucionResultados}
          />
          <ReportTable
            columns={columns}
            rows={data.evaluaciones}
            rowKey={(row) => row.idPublicacion}
            sortBy={filters.ordenarPor ?? "fecha"}
            sortDirection={filters.ordenDireccion ?? "desc"}
            onSort={(ordenarPor, ordenDireccion) =>
              updateUrl({ ordenarPor, ordenDireccion, pagina: 1 })
            }
            onRowClick={(row) =>
              router.push(`/profesor/examen/${row.idPublicacion}`)
            }
            page={data.paginacion.pagina}
            totalPages={data.paginacion.totalPaginas}
            total={data.paginacion.total}
            itemLabel="evaluaciones"
            onPageChange={(pagina) => updateUrl({ pagina })}
          />
        </div>
      )}
    </ReportLayout>
  );
}
