"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportFilterPanel, type ReportFilterDefinition } from "@/components/reports/ReportFilterPanel";
import { ReportKpiGrid } from "@/components/reports/ReportKpiGrid";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { StudentReportDetail } from "@/components/reports/StudentReportDetail";
import { useGetEvaluacionesDocente } from "@/hooks/useEvaluaciones";
import { useReporteRendimiento } from "@/hooks/useReportes";
import type { OrdenDireccion, ReporteRendimientoAlumno, ReporteRendimientoFiltros, ReporteRendimientoOrden } from "@/types/index";
import { normalizeAuthorizedReportFilters } from "./report-filter-options";

const FILTER_KEYS = ["matricula", "idMateria", "idMateriaDivision", "idActividad", "estado", "fechaDesde", "fechaHasta", "promedioMin", "promedioMax", "alcanceIntentos"] as const;

function uniqueFilterOptions<T>(
  items: T[],
  getId: (item: T) => number | undefined,
  getLabel: (item: T) => string,
) {
  const options = new Map<string, { value: string; label: string }>();

  for (const item of items) {
    const id = getId(item);
    if (!Number.isFinite(id)) continue;

    const value = String(id);
    if (!options.has(value)) {
      options.set(value, { value, label: getLabel(item) });
    }
  }

  return [...options.values()];
}

export function RendimientoReport() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [filterValidationError, setFilterValidationError] = useState<string | null>(null);
  const filters = useMemo<ReporteRendimientoFiltros>(() => ({
    ...Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])),
    estado: (searchParams.get("estado") ?? "") as ReporteRendimientoFiltros["estado"],
    alcanceIntentos: (searchParams.get("alcanceIntentos") as ReporteRendimientoFiltros["alcanceIntentos"]) || undefined,
    ordenarPor: (searchParams.get("ordenarPor") as ReporteRendimientoOrden) || "alumno",
    ordenDireccion: (searchParams.get("ordenDireccion") as OrdenDireccion) || "asc",
    pagina: Math.max(1, Number(searchParams.get("pagina")) || 1),
    limite: 20,
  }), [searchParams]);
  const { data, isLoading, isFetching, isError, error, refetch } = useReporteRendimiento(filters);
  const legajo = Number(session?.user?.identificadorInstitucional) || 0;
  const { data: evaluaciones = [] } = useGetEvaluacionesDocente(legajo);

  const updateUrl = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => value === undefined || value === "" ? params.delete(key) : params.set(key, String(value)));
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  const filterDefinitions = useMemo<ReportFilterDefinition[]>(() => [
    { key: "matricula", label: "Matrícula", type: "number", placeholder: "Ej. 30500", min: 1 },
    {
      key: "idMateria",
      label: "Materia",
      type: "select",
      options: uniqueFilterOptions(
        evaluaciones,
        (item) => item.idMateria,
        (item) => item.materia,
      ),
    },
    {
      key: "idMateriaDivision",
      label: "Materia / División",
      type: "select",
      options: uniqueFilterOptions(
        evaluaciones.filter(
          (item) => !filters.idMateria || item.idMateria === Number(filters.idMateria),
        ),
        (item) => item.idMateriaDivision,
        (item) => `${item.materia} / ${item.division}`,
      ),
    },
    {
      key: "idActividad",
      label: "Actividad",
      type: "select",
      options: uniqueFilterOptions(
        evaluaciones.filter(
          (item) =>
            (!filters.idMateria || item.idMateria === Number(filters.idMateria)) &&
            (!filters.idMateriaDivision ||
              item.idMateriaDivision === Number(filters.idMateriaDivision)),
        ),
        (item) => item.idActividad,
        (item) => item.titulo,
      ),
    },
    { key: "estado", label: "Estado", type: "select", options: [{ value: "entregado", label: "Entregado" }, { value: "en_progreso", label: "En progreso" }, { value: "vencido", label: "Vencido" }, { value: "anulado", label: "Anulado" }] },
    { key: "fechaDesde", label: "Fecha desde", type: "date" }, { key: "fechaHasta", label: "Fecha hasta", type: "date" },
    { key: "promedioMin", label: "Promedio mínimo", type: "number", min: 0, max: 10, step: 0.01 }, { key: "promedioMax", label: "Promedio máximo", type: "number", min: 0, max: 10, step: 0.01 },
    { key: "alcanceIntentos", label: "Resultados académicos", type: "select", options: [{ value: "validos", label: "Sólo intento válido" }] },
  ], [evaluaciones, filters.idMateria, filters.idMateriaDivision]);
  const visibleFilters = Object.fromEntries(FILTER_KEYS.map((key) => [key, String(filters[key] ?? "")]));
  const search = (values: Record<string, string>) => {
    const normalizedValues = normalizeAuthorizedReportFilters(values, evaluaciones);
    if (normalizedValues.idActividad && !normalizedValues.matricula) {
      setFilterValidationError("El filtro Actividad requiere una matrícula porque el endpoint solo lo admite en modo detalle.");
      return;
    }
    if (normalizedValues.fechaDesde && normalizedValues.fechaHasta && normalizedValues.fechaDesde > normalizedValues.fechaHasta) {
      setFilterValidationError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    if (normalizedValues.promedioMin && normalizedValues.promedioMax && Number(normalizedValues.promedioMin) > Number(normalizedValues.promedioMax)) {
      setFilterValidationError("El promedio mínimo no puede superar al promedio máximo.");
      return;
    }
    setFilterValidationError(null);
    updateUrl({ ...normalizedValues, pagina: 1 });
  };
  const columns = useMemo<ReportColumn<ReporteRendimientoAlumno, ReporteRendimientoOrden>[]>(() => [
    { key: "alumno", header: "Alumno", sortKey: "alumno", render: (row) => <div><p className="font-bold text-slate-800">{row.apellido}, {row.nombre}</p><p className="mt-0.5 text-[10px] text-slate-400">Ver detalle</p></div> },
    { key: "matricula", header: "Matrícula", render: (row) => <span className="font-mono font-semibold">{row.matricula}</span> },
    { key: "promedio", header: "Promedio", align: "right", sortKey: "promedio", render: (row) => <span className="text-sm font-black text-slate-800">{row.promedio.toFixed(2)}</span> },
    { key: "intentos", header: "Intentos", align: "center", sortKey: "intentos", render: (row) => row.totalIntentos },
    { key: "aprobados", header: "Aprobados", align: "center", sortKey: "aprobados", render: (row) => <span className="font-bold text-emerald-600">{row.aprobados}</span> },
    { key: "desaprobados", header: "Desaprobados", align: "center", render: (row) => <span className="font-bold text-rose-600">{row.desaprobados}</span> },
    { key: "porcentaje", header: "% aprobación", align: "right", render: (row) => `${row.porcentajeAprobacion.toFixed(1)}%` },
  ], []);

  return <ReportLayout title="Rendimiento por alumno" description="Analizá promedios, intentos y aprobación de los alumnos dentro de tus materias y comisiones." actions={<Button onClick={() => router.push("/profesor")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Volver al panel</Button>}>
    <ReportFilterPanel key={searchParams.toString()} filters={visibleFilters} definitions={filterDefinitions} onSearch={search} onClear={() => { setFilterValidationError(null); router.replace(pathname, { scroll: false }); }} />
    {filterValidationError && <ErrorMessage message={filterValidationError} />}
    {isLoading && <ReportSkeleton />}
    {isError && (
      <RequestErrorState
        error={error}
        fallback="No se pudo cargar el reporte."
        onRetry={() => void refetch()}
      />
    )}
    {data && <div className={`space-y-6 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`} aria-busy={isFetching}>
      <ReportKpiGrid items={[{ label: "Promedio general", value: data.kpis.promedioGeneral.toFixed(2), helper: `Sobre 10 · ${data.kpis.alcanceIntentos === "validos" ? "intentos válidos" : "todos los intentos"}`, tone: "indigo" }, { label: "Total de alumnos", value: data.kpis.totalAlumnos.toLocaleString("es-AR"), helper: `${data.kpis.conIntentos} con intentos`, tone: "blue" }, { label: "Total de intentos", value: data.kpis.totalIntentos.toLocaleString("es-AR"), helper: `${data.kpis.intentosAlcanceAcademico} en el cálculo académico`, tone: "amber" }, { label: "Tasa de aprobación", value: `${data.kpis.tasaAprobacion.toFixed(1)}%`, tone: "emerald" }]} />
      <ReportTable columns={columns} rows={data.alumnos} rowKey={(row) => row.matricula} sortBy={filters.ordenarPor ?? "alumno"} sortDirection={filters.ordenDireccion ?? "asc"} onSort={(ordenarPor, ordenDireccion) => updateUrl({ ordenarPor, ordenDireccion, pagina: 1 })} onRowClick={(row) => setSelectedStudent(row.matricula)} page={data.paginacion.pagina} totalPages={data.paginacion.totalPaginas} total={data.paginacion.total} itemLabel="alumnos" onPageChange={(pagina) => updateUrl({ pagina })} />
    </div>}
    <StudentReportDetail matricula={selectedStudent} filters={filters} onClose={() => setSelectedStudent(null)} />
  </ReportLayout>;
}
