"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  InstitutionalComparisonChart,
  InstitutionalMonthlyChart,
  type InstitutionalComparisonItem,
} from "@/components/admin/InstitutionalAnalyticsCharts";
import {
  ReportFilterPanel,
  type ReportFilterDefinition,
} from "@/components/reports/ReportFilterPanel";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useReporteRendimientoEvaluaciones } from "@/hooks/useReportes";
import type {
  MotivoNoElegibilidadInstitucional,
  OrdenDireccion,
  ReporteEvaluacionItem,
  ReporteEvaluacionesFiltros,
  ReporteEvaluacionesOrden,
  ResumenInstitucionalBase,
  ResumenInstitucionalCarrera,
  ResumenInstitucionalComision,
  ResumenInstitucionalMateria,
} from "@/types";

const FILTER_DEFINITIONS: ReportFilterDefinition[] = [
  {
    key: "estado",
    label: "Estado de la evaluación",
    type: "select",
    options: [
      { value: "borrador", label: "Borrador" },
      { value: "publicada", label: "Publicada" },
      { value: "archivada", label: "Archivada" },
    ],
  },
  { key: "fechaDesde", label: "Inicio desde", type: "date" },
  { key: "fechaHasta", label: "Inicio hasta", type: "date" },
];

type EvidenceEntry = {
  key: string;
  title: string;
  context?: string;
  summary: ResumenInstitucionalBase;
  reasons: MotivoNoElegibilidadInstitucional[];
  onSelect: () => void;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateToInputValue(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDayToUtc(value: string, endOfDay: boolean, now = new Date()) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return new Date(Math.min(date.getTime(), now.getTime())).toISOString();
}

function defaultPeriod(now = new Date()) {
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
  return { fechaDesde: since.toISOString(), fechaHasta: now.toISOString() };
}

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function formatPercentage(value: number | null) {
  return value === null
    ? "Sin resultados confirmados"
    : `${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function AcademicSummary({ summary, title }: { summary: ResumenInstitucionalBase; title: string }) {
  const official = summary.resultadosOficiales;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="academic-summary-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Resultados académicos</p>
          <h2 id="academic-summary-title" className="mt-1 text-xl font-black text-slate-900">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Resultados de evaluaciones, no aprobación final de materias ni cantidad de alumnos únicos.</p>
        </div>
        <p className="text-sm font-semibold text-slate-600">{summary.publicaciones.toLocaleString("es-AR")} evaluaciones analizadas</p>
      </div>
      <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Aprobación observada</dt>
          <dd className="mt-1 text-3xl font-black text-slate-900">{formatPercentage(official.porcentajeAprobacion)}</dd>
          <dd className="mt-1 text-xs text-slate-500">{official.aprobados} aprobados de {official.resultadosConsiderados} resultados confirmados</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultados confirmados</dt>
          <dd className="mt-1 text-3xl font-black text-slate-900">{official.resultadosConsiderados.toLocaleString("es-AR")}</dd>
          <dd className="mt-1 text-xs text-slate-500">de {official.intentosValidosEntregados.toLocaleString("es-AR")} entregas válidas</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Correcciones pendientes</dt>
          <dd className="mt-1 text-3xl font-black text-amber-700">{official.resultadosPendientes.toLocaleString("es-AR")}</dd>
          <dd className="mt-1 text-xs text-slate-500">en {summary.publicacionesConResultadosPendientes.toLocaleString("es-AR")} evaluaciones</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultados ya confirmados</dt>
          <dd className="mt-1 text-3xl font-black text-indigo-700">{formatPercentage(official.porcentajeCoberturaConfirmada)}</dd>
          <dd className="mt-1 text-xs text-slate-500">{official.resultadosConsiderados} de {official.intentosValidosEntregados} entregas válidas</dd>
        </div>
      </dl>
    </section>
  );
}

function OperationalSummary({ summary }: { summary: ResumenInstitucionalBase }) {
  const pending = summary.pendientesOperativos;
  return (
    <details className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <summary className="cursor-pointer list-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Correcciones pendientes</h2>
            <p className="mt-1 text-sm text-slate-600">{pending.intentosEntregadosPendientes.toLocaleString("es-AR")} intentos pendientes en {summary.publicacionesConPendientesOperativos.toLocaleString("es-AR")} evaluaciones.</p>
          </div>
          <span className="text-xs font-bold text-amber-800">Ver desglose</span>
        </div>
      </summary>
      <div className="mt-5 border-t border-amber-200 pt-4">
        <p className="text-xs text-slate-600">Un mismo intento puede aparecer en más de una categoría; no deben sumarse.</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Sin confirmar", pending.intentosPendientesConfirmacion],
            ["Sin nota final", pending.intentosSinNotaFinal],
            ["Intentos con preguntas sin puntaje", pending.intentosConPreguntasSinPuntaje],
            ["Preguntas sin puntaje", pending.preguntasSinPuntaje],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-amber-100 bg-white p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 text-xl font-black text-slate-900">{Number(value).toLocaleString("es-AR")}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

function ScopeBreadcrumbs({ career, matter, commission, onInstitution, onCareer, onMatter }: {
  career?: ResumenInstitucionalCarrera;
  matter?: ResumenInstitucionalMateria;
  commission?: ResumenInstitucionalComision;
  onInstitution: () => void;
  onCareer: () => void;
  onMatter: () => void;
}) {
  return (
    <nav aria-label="Ubicación del análisis" className="flex flex-wrap items-center gap-2 text-xs">
      <button type="button" onClick={onInstitution} className="font-bold text-indigo-600 hover:text-indigo-800">Institución</button>
      {career && <><span aria-hidden="true" className="text-slate-300">/</span><button type="button" onClick={onCareer} className="font-bold text-indigo-600 hover:text-indigo-800">{career.carrera}</button></>}
      {matter && <><span aria-hidden="true" className="text-slate-300">/</span><button type="button" onClick={onMatter} className="font-bold text-indigo-600 hover:text-indigo-800">{matter.materia}</button></>}
      {commission && <><span aria-hidden="true" className="text-slate-300">/</span><span className="font-semibold text-slate-600">Comisión {commission.division}</span></>}
    </nav>
  );
}

function reasonLabel(reason: MotivoNoElegibilidadInstitucional) {
  if (reason === "MUESTRA_INSUFICIENTE") return "Pocos resultados confirmados";
  if (reason === "COBERTURA_INSUFICIENTE") return "Muchas correcciones pendientes";
  return "Sin resultados confirmados";
}

function EvidenceSection({ limited, withoutResults, criteria }: {
  limited: EvidenceEntry[];
  withoutResults: EvidenceEntry[];
  criteria: { muestraMinima: number; coberturaMinimaPorcentaje: number };
}) {
  if (limited.length === 0 && withoutResults.length === 0) return null;
  const entries = [...limited, ...withoutResults];
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer list-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Resultados insuficientes para comparar</h2>
            <p className="mt-1 text-sm text-slate-500">{limited.length} con evidencia limitada y {withoutResults.length} sin resultados confirmados.</p>
          </div>
          <span className="text-xs font-bold text-indigo-700">Ver entidades</span>
        </div>
      </summary>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">La comparación requiere al menos {criteria.muestraMinima} resultados y {criteria.coberturaMinimaPorcentaje}% de resultados confirmados.</p>
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {entries.map((entry) => (
            <li key={entry.key}>
              <button type="button" onClick={entry.onSelect} className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:flex-row sm:items-center sm:justify-between">
                <span><span className="block font-bold text-slate-900">{entry.title}</span>{entry.context && <span className="mt-0.5 block text-xs text-slate-500">{entry.context}</span>}</span>
                <span className="text-xs text-slate-600 sm:text-right"><span className="block font-semibold">{entry.reasons.map(reasonLabel).join(" · ")}</span><span className="mt-0.5 block">{entry.summary.resultadosOficiales.resultadosConsiderados} resultados · {formatPercentage(entry.summary.resultadosOficiales.porcentajeCoberturaConfirmada)} confirmados</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function ScopeDirectory({ title, description, entries }: {
  title: string;
  description: string;
  entries: Array<{ key: string; title: string; context?: string; status: string; summary: ResumenInstitucionalBase; onSelect: () => void }>;
}) {
  return (
    <section className="space-y-3" aria-labelledby="scope-directory-title">
      <div><h2 id="scope-directory-title" className="text-lg font-black text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>
      {entries.length === 0 ? <EmptyState title="No hay entidades para los filtros seleccionados" /> : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {entries.map((entry) => (
            <li key={entry.key}>
              <button type="button" onClick={entry.onSelect} className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 lg:flex-row lg:items-center lg:justify-between">
                <span><span className="font-bold text-slate-900">{entry.title}</span>{entry.context && <span className="mt-0.5 block text-xs text-slate-500">{entry.context}</span>}</span>
                <span className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 lg:justify-end"><span>{formatPercentage(entry.summary.resultadosOficiales.porcentajeAprobacion)} aprobación</span><span>{entry.summary.resultadosOficiales.resultadosConsiderados} resultados</span><span>{entry.summary.resultadosOficiales.resultadosPendientes} pendientes</span><span className="font-semibold text-indigo-700">{entry.status}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function InstitutionalAnalyticsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterError, setFilterError] = useState<string | null>(null);
  const selectedCareerId = searchParams.get("idCarrera") ?? "";
  const selectedMatterId = searchParams.get("idMateria") ?? "";
  const selectedCommissionId = searchParams.get("idMateriaDivision") ?? "";
  const rawDateFrom = searchParams.get("fechaDesde") ?? "";
  const rawDateTo = searchParams.get("fechaHasta") ?? "";
  const hasStablePeriod = Boolean(rawDateFrom && rawDateTo);
  const visibleFilters = { estado: searchParams.get("estado") ?? "", fechaDesde: dateToInputValue(rawDateFrom), fechaHasta: dateToInputValue(rawDateTo) };
  const page = Math.max(1, Number(searchParams.get("pagina")) || 1);
  const sortBy = (searchParams.get("ordenarPor") as ReporteEvaluacionesOrden) || "fecha";
  const sortDirection = (searchParams.get("ordenDireccion") as OrdenDireccion) || "desc";

  useEffect(() => {
    if (hasStablePeriod) return;
    const period = defaultPeriod();
    const params = new URLSearchParams(searchParams.toString());
    params.set("fechaDesde", period.fechaDesde);
    params.set("fechaHasta", period.fechaHasta);
    params.set("pagina", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [hasStablePeriod, pathname, router, searchParams]);

  const filters = useMemo<ReporteEvaluacionesFiltros>(() => ({
    incluirResumenInstitucional: true,
    incluirSerieMensual: true,
    idCarrera: selectedCareerId || undefined,
    idMateria: selectedMatterId || undefined,
    idMateriaDivision: selectedCommissionId || undefined,
    estado: (visibleFilters.estado as ReporteEvaluacionesFiltros["estado"]) || undefined,
    fechaDesde: rawDateFrom || undefined,
    fechaHasta: rawDateTo || undefined,
    ordenarPor: sortBy,
    ordenDireccion: sortDirection,
    pagina: page,
    limite: 10,
  }), [page, rawDateFrom, rawDateTo, selectedCareerId, selectedCommissionId, selectedMatterId, sortBy, sortDirection, visibleFilters.estado]);

  const query = useReporteRendimientoEvaluaciones(filters, hasStablePeriod);
  const usableData = query.isPlaceholderData ? undefined : query.data;
  const institutional = usableData?.resumenInstitucional;
  const selectedCareer = selectedCareerId ? institutional?.carreras.find((career) => String(career.idCarrera) === selectedCareerId) : undefined;
  const selectedMatter = selectedMatterId ? selectedCareer?.materias.find((matter) => String(matter.idMateria) === selectedMatterId) : undefined;
  const selectedCommission = selectedCommissionId ? selectedMatter?.comisiones.find((commission) => String(commission.idMateriaDivision) === selectedCommissionId) : undefined;
  const currentSummary = selectedCommission ?? selectedMatter ?? selectedCareer ?? institutional?.global;

  const updateUrl = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };
  const navigateToCareer = (idCarrera: number) => updateUrl({ idCarrera, idMateria: undefined, idMateriaDivision: undefined, pagina: 1 });
  const navigateToMatter = (idCarrera: number, idMateria: number) => updateUrl({ idCarrera, idMateria, idMateriaDivision: undefined, pagina: 1 });
  const navigateToCommission = (idCarrera: number, idMateria: number, idMateriaDivision: number) => updateUrl({ idCarrera, idMateria, idMateriaDivision, pagina: 1 });
  const selectComparison = (item: InstitutionalComparisonItem) => {
    if ("idMateriaDivision" in item) navigateToCommission(item.idCarrera, item.idMateria, item.idMateriaDivision);
    else if ("idMateria" in item) navigateToMatter(item.idCarrera, item.idMateria);
    else navigateToCareer(item.idCarrera);
  };

  const applyFilters = (values: Record<string, string>) => {
    if (values.fechaDesde && values.fechaHasta && values.fechaDesde > values.fechaHasta) {
      setFilterError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    if (!values.fechaDesde || !values.fechaHasta) {
      setFilterError("Seleccioná una fecha de inicio y una fecha de fin.");
      return;
    }
    setFilterError(null);
    const now = new Date();
    updateUrl({ estado: values.estado || undefined, fechaDesde: localDayToUtc(values.fechaDesde, false, now), fechaHasta: localDayToUtc(values.fechaHasta, true, now), pagina: 1 });
  };

  const columns = useMemo<ReportColumn<ReporteEvaluacionItem, ReporteEvaluacionesOrden>[]>(() => [
    { key: "evaluacion", header: "Evaluación", sortKey: "evaluacion", render: (row) => <div><p className="font-bold text-slate-900">{row.titulo}</p><p className="mt-0.5 text-[10px] text-slate-500">{formatDate(row.fechaInicio)} · {row.estado}</p></div> },
    { key: "aprobacion", header: "Aprobación observada", align: "right", sortKey: "aprobacion", render: (row) => <div><p className="font-bold text-slate-900">{formatPercentage(row.resultadosOficiales.porcentajeAprobacion)}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.resultadosOficiales.aprobados} de {row.resultadosOficiales.resultadosConsiderados}</p></div> },
    { key: "coverage", header: "Resultados confirmados", align: "right", render: (row) => <div><p className="font-bold text-slate-900">{formatPercentage(row.resultadosOficiales.porcentajeCoberturaConfirmada)}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.resultadosOficiales.resultadosConsiderados} de {row.resultadosOficiales.intentosValidosEntregados}</p></div> },
    { key: "academic-pending", header: "Correcciones pendientes", align: "center", sortKey: "pendientesCorreccion", render: (row) => <span className="font-bold text-amber-700">{row.resultadosOficiales.resultadosPendientes}</span> },
    { key: "operational-pending", header: "Intentos pendientes", align: "center", render: (row) => <span className="font-bold text-amber-700">{row.pendientesOperativos.intentosEntregadosPendientes}</span> },
  ], []);

  const scopeTitle = selectedCommission ? `Comisión ${selectedCommission.division}` : selectedMatter?.materia ?? selectedCareer?.carrera ?? "Toda la institución";
  const comparison = institutional
    ? !selectedCareerId
      ? { title: "Comparación entre carreras", description: "Carreras con evidencia suficiente, ordenadas por menor aprobación observada.", items: institutional.comparativas.carreras.elegibles }
      : !selectedMatterId
        ? { title: "Comparación entre materias", description: "Materias con evidencia suficiente dentro de la carrera seleccionada.", items: institutional.comparativas.materias.elegibles }
        : !selectedCommissionId
          ? { title: "Comparación entre comisiones", description: "Comisiones con evidencia suficiente dentro de la materia seleccionada.", items: institutional.comparativas.comisiones.elegibles }
          : null
    : null;

  const evidenceEntries = institutional ? (() => {
    if (!selectedCareerId) return {
      limited: institutional.comparativas.carreras.evidenciaLimitada.map((item): EvidenceEntry => ({ key: `career-${item.idCarrera}`, title: item.carrera, summary: item, reasons: item.motivosNoElegibilidad, onSelect: () => navigateToCareer(item.idCarrera) })),
      withoutResults: institutional.comparativas.carreras.sinResultados.map((item): EvidenceEntry => ({ key: `career-${item.idCarrera}`, title: item.carrera, summary: item, reasons: item.motivosNoElegibilidad, onSelect: () => navigateToCareer(item.idCarrera) })),
    };
    if (!selectedMatterId) return {
      limited: institutional.comparativas.materias.evidenciaLimitada.map((item): EvidenceEntry => ({ key: `matter-${item.idCarrera}-${item.idMateria}`, title: item.materia, context: item.carrera, summary: item, reasons: item.motivosNoElegibilidad, onSelect: () => navigateToMatter(item.idCarrera, item.idMateria) })),
      withoutResults: institutional.comparativas.materias.sinResultados.map((item): EvidenceEntry => ({ key: `matter-${item.idCarrera}-${item.idMateria}`, title: item.materia, context: item.carrera, summary: item, reasons: item.motivosNoElegibilidad, onSelect: () => navigateToMatter(item.idCarrera, item.idMateria) })),
    };
    return {
      limited: institutional.comparativas.comisiones.evidenciaLimitada.map((item): EvidenceEntry => ({ key: `commission-${item.idMateriaDivision}`, title: `Comisión ${item.division}`, context: `${item.materia} · ${item.carrera}`, summary: item, reasons: item.motivosNoElegibilidad, onSelect: () => navigateToCommission(item.idCarrera, item.idMateria, item.idMateriaDivision) })),
      withoutResults: institutional.comparativas.comisiones.sinResultados.map((item): EvidenceEntry => ({ key: `commission-${item.idMateriaDivision}`, title: `Comisión ${item.division}`, context: `${item.materia} · ${item.carrera}`, summary: item, reasons: item.motivosNoElegibilidad, onSelect: () => navigateToCommission(item.idCarrera, item.idMateria, item.idMateriaDivision) })),
    };
  })() : { limited: [], withoutResults: [] };

  const matterStatus = (matter: ResumenInstitucionalMateria) => {
    const key = `${matter.idCarrera}-${matter.idMateria}`;
    if (institutional?.comparativas.materias.elegibles.some((item) => `${item.idCarrera}-${item.idMateria}` === key)) return "Incluida en la comparación";
    if (institutional?.comparativas.materias.evidenciaLimitada.some((item) => `${item.idCarrera}-${item.idMateria}` === key)) return "Evidencia limitada";
    return "Sin resultados confirmados";
  };
  const commissionStatus = (commission: ResumenInstitucionalComision) => {
    if (institutional?.comparativas.comisiones.elegibles.some((item) => item.idMateriaDivision === commission.idMateriaDivision)) return "Incluida en la comparación";
    if (institutional?.comparativas.comisiones.evidenciaLimitada.some((item) => item.idMateriaDivision === commission.idMateriaDivision)) return "Evidencia limitada";
    return "Sin resultados confirmados";
  };

  return (
    <ReportLayout title="Panorama institucional" description="Explorá resultados académicos y correcciones pendientes desde la institución hasta cada evaluación." actions={<Button onClick={() => router.push("/admin")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Volver al panel</Button>}>
      <ReportFilterPanel
        key={`${visibleFilters.estado}-${visibleFilters.fechaDesde}-${visibleFilters.fechaHasta}`}
        filters={visibleFilters}
        definitions={FILTER_DEFINITIONS}
        onSearch={applyFilters}
        onClear={() => { setFilterError(null); const period = defaultPeriod(); updateUrl({ estado: undefined, fechaDesde: period.fechaDesde, fechaHasta: period.fechaHasta, pagina: 1 }); }}
        title="Período consultado"
        description="Las fechas corresponden al inicio de cada evaluación."
      />
      {filterError && <ErrorMessage message={filterError} />}
      {(!hasStablePeriod || query.isLoading || query.isPlaceholderData) && <ReportSkeleton />}
      {query.isError && <RequestErrorState error={query.error} fallback="No se pudo cargar el panorama institucional." onRetry={() => void query.refetch()} />}
      {usableData && !institutional && <ErrorMessage message="No se pudo mostrar el panorama institucional. Intentá nuevamente." />}

      {institutional && currentSummary && (
        <div className={`space-y-7 transition-opacity ${query.isFetching ? "opacity-60" : "opacity-100"}`} aria-busy={query.isFetching}>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <ScopeBreadcrumbs career={selectedCareer} matter={selectedMatter} commission={selectedCommission} onInstitution={() => updateUrl({ idCarrera: undefined, idMateria: undefined, idMateriaDivision: undefined, pagina: 1 })} onCareer={() => updateUrl({ idMateria: undefined, idMateriaDivision: undefined, pagina: 1 })} onMatter={() => updateUrl({ idMateriaDivision: undefined, pagina: 1 })} />
            <p className="text-xs font-semibold text-slate-500">{formatDate(institutional.periodoEfectivo.desde)} — {formatDate(institutional.periodoEfectivo.hasta, true)} · {institutional.periodoEfectivo.mesesCalendarioIncluidos} meses</p>
          </div>
          <AcademicSummary summary={currentSummary} title={scopeTitle} />
          {comparison && <InstitutionalComparisonChart title={comparison.title} description={comparison.description} items={comparison.items} onSelect={selectComparison} />}

          {!selectedCareerId && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="matter-ranking-title">
              <h2 id="matter-ranking-title" className="text-lg font-black text-slate-900">Materias con menor aprobación observada</h2>
              <p className="mt-1 text-sm text-slate-500">Hasta cinco materias con evidencia suficiente. La posición y el criterio corresponden al alcance consultado.</p>
              {institutional.comparativas.materias.elegibles.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No hay materias con evidencia suficiente para ordenar.</p> : (
                <ol className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {institutional.comparativas.materias.elegibles.slice(0, 5).map((item) => (
                    <li key={`${item.idCarrera}-${item.idMateria}`}>
                      <button type="button" onClick={() => navigateToMatter(item.idCarrera, item.idMateria)} className="flex w-full flex-col gap-3 px-4 py-3 text-left hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:flex-row sm:items-center sm:justify-between">
                        <span><span className="font-black text-indigo-700">{item.posicion}.</span> <span className="font-bold text-slate-900">{item.materia}</span><span className="mt-0.5 block text-xs text-slate-500">{item.carrera}</span></span>
                        <span className="text-xs text-slate-600 sm:text-right"><span className="block text-base font-black text-slate-900">{formatPercentage(item.resultadosOficiales.porcentajeAprobacion)}</span><span>{item.resultadosOficiales.aprobados} de {item.resultadosOficiales.resultadosConsiderados} · {item.resultadosOficiales.resultadosPendientes} pendientes · {formatPercentage(item.resultadosOficiales.porcentajeCoberturaConfirmada)} confirmados</span></span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          <InstitutionalMonthlyChart points={institutional.serieMensual} />
          <EvidenceSection limited={evidenceEntries.limited} withoutResults={evidenceEntries.withoutResults} criteria={institutional.comparativas.criteriosElegibilidad} />

          {selectedCareer && !selectedMatterId && (
            <ScopeDirectory title="Todas las materias" description="Incluye también materias con evidencia limitada o sin resultados confirmados." entries={selectedCareer.materias.map((matter) => ({ key: `${matter.idCarrera}-${matter.idMateria}`, title: matter.materia, status: matterStatus(matter), summary: matter, onSelect: () => navigateToMatter(matter.idCarrera, matter.idMateria) }))} />
          )}
          {selectedMatter && !selectedCommissionId && (
            <ScopeDirectory title="Todas las comisiones" description="Accedé a cada comisión, aunque no integre la comparación principal." entries={selectedMatter.comisiones.map((commission) => ({ key: String(commission.idMateriaDivision), title: `Comisión ${commission.division}`, context: commission.materia, status: commissionStatus(commission), summary: commission, onSelect: () => navigateToCommission(commission.idCarrera, commission.idMateria, commission.idMateriaDivision) }))} />
          )}
          {selectedCommission && (
            <section className="space-y-4" aria-labelledby="evaluations-title">
              <div><h2 id="evaluations-title" className="text-lg font-black text-slate-900">Evaluaciones de la comisión {selectedCommission.division}</h2><p className="mt-1 text-sm text-slate-500">El resumen contempla todo el período; la tabla está paginada.</p></div>
              <ReportTable columns={columns} rows={usableData.evaluaciones} rowKey={(row) => row.idPublicacion} sortBy={sortBy} sortDirection={sortDirection} onSort={(nextSort, nextDirection) => updateUrl({ ordenarPor: nextSort, ordenDireccion: nextDirection, pagina: 1 })} page={usableData.paginacion.pagina} totalPages={usableData.paginacion.totalPaginas} total={usableData.paginacion.total} onPageChange={(nextPage) => updateUrl({ pagina: nextPage })} itemLabel="evaluaciones" emptyMessage="No hay evaluaciones para la comisión y el período seleccionados." />
            </section>
          )}
          <OperationalSummary summary={currentSummary} />
        </div>
      )}
    </ReportLayout>
  );
}
