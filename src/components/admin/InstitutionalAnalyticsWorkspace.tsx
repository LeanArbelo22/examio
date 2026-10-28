"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  InstitutionalRankingView,
  InstitutionalTemporalChart,
  type InstitutionalComparisonItem,
  type InstitutionalEvolutionSeries,
} from "@/components/admin/InstitutionalAnalyticsCharts";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useReporteRendimientoEvaluaciones } from "@/hooks/useReportes";
import {
  REPORT_DEFAULTS,
  calendarMonthsIncluded,
  calendarMonthRange,
  customDateRange,
  dateInputValue,
  defaultRankingDimension,
  isValidMonthAmount,
  parseBooleanParam,
  type PeriodMode,
  type RankingDimension,
  type ReportSectionVisibility,
} from "@/lib/institutional-report-config";
import type {
  AgrupacionSerieInstitucional,
  ComparativaCarrera,
  ComparativaComision,
  ComparativaMateria,
  MotivoNoElegibilidadInstitucional,
  OrdenDireccion,
  OrdenRankingInstitucional,
  ReporteEvaluacionItem,
  ReporteEvaluacionesFiltros,
  ReporteEvaluacionesOrden,
  ResumenInstitucionalBase,
  ResumenInstitucionalCarrera,
  ResumenInstitucionalComision,
  ResumenInstitucionalMateria,
} from "@/types";

type RankedItem = InstitutionalComparisonItem;
type ExcludedItem =
  | (ComparativaCarrera & { motivosNoElegibilidad: MotivoNoElegibilidadInstitucional[] })
  | (ComparativaMateria & { motivosNoElegibilidad: MotivoNoElegibilidadInstitucional[] })
  | (ComparativaComision & { motivosNoElegibilidad: MotivoNoElegibilidadInstitucional[] });
type RankingCollection = { eligible: RankedItem[]; limited: ExcludedItem[]; withoutResults: ExcludedItem[] };
type AdvancedDraft = { sample: string; coverage: string; visibility: ReportSectionVisibility };

const inputClass = "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const quickButtonClass = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function formatPercentage(value: number | null) {
  return value === null ? "Sin resultados confirmados" : `${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function formatAverage(value: number | null) {
  return value === null ? "Sin resultados confirmados" : value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const evolutionSeriesValues: InstitutionalEvolutionSeries[] = ["approval", "average", "confirmed", "pending"];

function parseEvolutionSeries(value: string | null, legacyView: string | null): InstitutionalEvolutionSeries[] {
  if (value) {
    const parsed = value.split(",").filter((item): item is InstitutionalEvolutionSeries => evolutionSeriesValues.includes(item as InstitutionalEvolutionSeries));
    if (parsed.length > 0) return [...new Set(parsed)];
  }
  if (legacyView === "approval") return ["approval"];
  if (legacyView === "approval_confirmed") return ["approval", "confirmed"];
  if (legacyView === "approval_pending") return ["approval", "pending"];
  if (legacyView === "complete") return ["approval", "confirmed", "pending"];
  return ["approval", "average", "confirmed"];
}

function rankingDimensionLabel(value: RankingDimension) {
  return value === "carreras" ? "carreras" : value === "materias" ? "materias" : "comisiones";
}

function groupingLabel(value: AgrupacionSerieInstitucional) {
  return value === "mensual" ? "mensual" : value === "semestral" ? "semestral" : "anual";
}

function AcademicSummary({ summary, title }: { summary: ResumenInstitucionalBase; title: string }) {
  const official = summary.resultadosOficiales;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="academic-summary-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Resultados académicos</p><h2 id="academic-summary-title" className="mt-1 text-xl font-black text-slate-900">{title}</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Resultados de evaluaciones, no aprobación final de materias ni cantidad de alumnos únicos.</p></div>
        <p className="text-sm font-semibold text-slate-600">{summary.publicaciones.toLocaleString("es-AR")} evaluaciones analizadas</p>
      </div>
      <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-5">
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Aprobación observada</dt><dd className="mt-1 text-3xl font-black text-slate-900">{formatPercentage(official.porcentajeAprobacion)}</dd><dd className="mt-1 text-xs text-slate-500">{official.aprobados} aprobados de {official.resultadosConsiderados} resultados confirmados</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Promedio de notas · sobre 10</dt><dd className="mt-1 text-3xl font-black text-slate-900">{formatAverage(official.promedioNotaBase10)}</dd><dd className="mt-1 text-xs text-slate-500">{official.resultadosConsiderados} resultados considerados</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultados confirmados</dt><dd className="mt-1 text-3xl font-black text-slate-900">{official.resultadosConsiderados.toLocaleString("es-AR")}</dd><dd className="mt-1 text-xs text-slate-500">de {official.intentosValidosEntregados.toLocaleString("es-AR")} entregas válidas</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Correcciones pendientes</dt><dd className="mt-1 text-3xl font-black text-amber-700">{official.resultadosPendientes.toLocaleString("es-AR")}</dd><dd className="mt-1 text-xs text-slate-500">en {summary.publicacionesConResultadosPendientes.toLocaleString("es-AR")} evaluaciones</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultados ya confirmados</dt><dd className="mt-1 text-3xl font-black text-indigo-700">{formatPercentage(official.porcentajeCoberturaConfirmada)}</dd><dd className="mt-1 text-xs text-slate-500">{official.resultadosConsiderados} de {official.intentosValidosEntregados} entregas válidas</dd></div>
      </dl>
    </section>
  );
}

function OperationalSummary({ summary }: { summary: ResumenInstitucionalBase }) {
  const pending = summary.pendientesOperativos;
  return (
    <details className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <summary className="cursor-pointer list-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black text-slate-900">Correcciones pendientes</h2><p className="mt-1 text-sm text-slate-600">{pending.intentosEntregadosPendientes.toLocaleString("es-AR")} intentos pendientes en {summary.publicacionesConPendientesOperativos.toLocaleString("es-AR")} evaluaciones.</p></div><span className="text-xs font-bold text-amber-800">Ver desglose</span></div></summary>
      <div className="mt-5 border-t border-amber-200 pt-4"><p className="text-xs text-slate-600">Un mismo intento puede aparecer en más de una categoría; no deben sumarse.</p><dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Sin confirmar", pending.intentosPendientesConfirmacion], ["Sin nota final", pending.intentosSinNotaFinal], ["Intentos con preguntas sin puntaje", pending.intentosConPreguntasSinPuntaje], ["Preguntas sin puntaje", pending.preguntasSinPuntaje]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-amber-100 bg-white p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-xl font-black text-slate-900">{Number(value).toLocaleString("es-AR")}</dd></div>)}</dl></div>
    </details>
  );
}

function ScopeBreadcrumbs({ career, matter, commission, onInstitution, onCareer, onMatter }: { career?: ResumenInstitucionalCarrera; matter?: ResumenInstitucionalMateria; commission?: ResumenInstitucionalComision; onInstitution: () => void; onCareer: () => void; onMatter: () => void }) {
  return <nav aria-label="Ubicación del análisis" className="flex flex-wrap items-center gap-2 text-xs"><button type="button" onClick={onInstitution} className="font-bold text-indigo-600 hover:text-indigo-800">Institución</button>{career && <><span aria-hidden="true" className="text-slate-300">/</span><button type="button" onClick={onCareer} className="font-bold text-indigo-600 hover:text-indigo-800">{career.carrera}</button></>}{matter && <><span aria-hidden="true" className="text-slate-300">/</span><button type="button" onClick={onMatter} className="font-bold text-indigo-600 hover:text-indigo-800">{matter.materia}</button></>}{commission && <><span aria-hidden="true" className="text-slate-300">/</span><span className="font-semibold text-slate-600">Comisión {commission.division}</span></>}</nav>;
}

function reasonLabel(reason: MotivoNoElegibilidadInstitucional) {
  if (reason === "MUESTRA_INSUFICIENTE") return "Pocos resultados confirmados";
  if (reason === "COBERTURA_INSUFICIENTE") return "Muchas correcciones pendientes";
  return "Sin resultados confirmados";
}

function comparisonName(item: ExcludedItem) {
  if ("division" in item) return { title: `Comisión ${item.division}`, context: `${item.materia} · ${item.carrera}` };
  if ("materia" in item) return { title: item.materia, context: item.carrera };
  return { title: item.carrera, context: undefined };
}

function EvidenceSection({ collection, criteria, onSelect }: { collection: RankingCollection; criteria: { muestraMinima: number; coberturaMinimaPorcentaje: number }; onSelect: (item: ExcludedItem) => void }) {
  const entries = [...collection.limited, ...collection.withoutResults];
  if (entries.length === 0) return null;
  return <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer list-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black text-slate-900">Resultados insuficientes para comparar</h2><p className="mt-1 text-sm text-slate-500">{collection.limited.length} con evidencia limitada y {collection.withoutResults.length} sin resultados confirmados.</p></div><span className="text-xs font-bold text-indigo-700">Ver entidades</span></div></summary><div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">La comparación requiere al menos {criteria.muestraMinima} resultados y {criteria.coberturaMinimaPorcentaje}% de resultados confirmados.</p><ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">{entries.map((entry) => { const name = comparisonName(entry); const key = "idMateriaDivision" in entry ? `commission-${entry.idMateriaDivision}` : "idMateria" in entry ? `matter-${entry.idCarrera}-${entry.idMateria}` : `career-${entry.idCarrera}`; return <li key={key}><button type="button" onClick={() => onSelect(entry)} className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:flex-row sm:items-center sm:justify-between"><span><span className="block font-bold text-slate-900">{name.title}</span>{name.context && <span className="mt-0.5 block text-xs text-slate-500">{name.context}</span>}</span><span className="text-xs text-slate-600 sm:text-right"><span className="block font-semibold">{entry.motivosNoElegibilidad.map(reasonLabel).join(" · ")}</span><span className="mt-0.5 block">Promedio {formatAverage(entry.resultadosOficiales.promedioNotaBase10)} sobre 10 · {entry.resultadosOficiales.resultadosConsiderados} resultados · {formatPercentage(entry.resultadosOficiales.porcentajeCoberturaConfirmada)} confirmados</span></span></button></li>; })}</ul></div></details>;
}

function ScopeDirectory({ title, description, entries }: { title: string; description: string; entries: Array<{ key: string; title: string; context?: string; status: string; summary: ResumenInstitucionalBase; onSelect: () => void }> }) {
  return <section className="space-y-3" aria-labelledby="scope-directory-title"><div><h2 id="scope-directory-title" className="text-lg font-black text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{entries.length === 0 ? <EmptyState title="No hay entidades para los filtros seleccionados" /> : <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{entries.map((entry) => <li key={entry.key}><button type="button" onClick={entry.onSelect} className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 lg:flex-row lg:items-center lg:justify-between"><span><span className="font-bold text-slate-900">{entry.title}</span>{entry.context && <span className="mt-0.5 block text-xs text-slate-500">{entry.context}</span>}</span><span className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 lg:justify-end"><span>{formatPercentage(entry.summary.resultadosOficiales.porcentajeAprobacion)} aprobación</span><span>Promedio {formatAverage(entry.summary.resultadosOficiales.promedioNotaBase10)} sobre 10 · {entry.summary.resultadosOficiales.resultadosConsiderados} resultados</span><span>{entry.summary.resultadosOficiales.resultadosPendientes} pendientes</span><span className="font-semibold text-indigo-700">{entry.status}</span></span></button></li>)}</ul>}</section>;
}

export function InstitutionalAnalyticsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const initialMonths = Number(searchParams.get("periodoMeses"));
  const [customMonths, setCustomMonths] = useState(String(isValidMonthAmount(initialMonths) ? initialMonths : REPORT_DEFAULTS.months));
  const [customFrom, setCustomFrom] = useState(() => dateInputValue(searchParams.get("fechaDesde") ?? ""));
  const [customTo, setCustomTo] = useState(() => dateInputValue(searchParams.get("fechaHasta") ?? ""));
  const initialRankingAmount = searchParams.get("cantidadRanking");
  const [customRankingAmount, setCustomRankingAmount] = useState(initialRankingAmount && initialRankingAmount !== "all" ? initialRankingAmount : "5");
  const [rankingCustomOpen, setRankingCustomOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const selectedCareerId = searchParams.get("idCarrera") ?? "";
  const selectedMatterId = searchParams.get("idMateria") ?? "";
  const selectedCommissionId = searchParams.get("idMateriaDivision") ?? "";
  const rawDateFrom = searchParams.get("fechaDesde") ?? "";
  const rawDateTo = searchParams.get("fechaHasta") ?? "";
  const hasStablePeriod = Boolean(rawDateFrom && rawDateTo && !Number.isNaN(Date.parse(rawDateFrom)) && !Number.isNaN(Date.parse(rawDateTo)) && Date.parse(rawDateFrom) <= Date.parse(rawDateTo));
  const periodMode = (["current", "complete", "custom"] as const).includes(searchParams.get("periodoModo") as PeriodMode) ? searchParams.get("periodoModo") as PeriodMode : REPORT_DEFAULTS.periodMode;
  const parsedMonths = Number(searchParams.get("periodoMeses"));
  const months = isValidMonthAmount(parsedMonths) ? parsedMonths : REPORT_DEFAULTS.months;
  const grouping = (["mensual", "semestral", "anual"] as const).includes(searchParams.get("agrupacionSerie") as AgrupacionSerieInstitucional) ? searchParams.get("agrupacionSerie") as AgrupacionSerieInstitucional : REPORT_DEFAULTS.grouping;
  const rawEvolutionView = searchParams.get("vistaEvolucion");
  const evolutionSeries = parseEvolutionSeries(searchParams.get("seriesEvolucion"), rawEvolutionView);
  const hideEmptyPeriods = parseBooleanParam(searchParams.get("ocultarPeriodosSinDatos"), false);
  const rankingOrder = (["aprobacion_asc", "aprobacion_desc"] as const).includes(searchParams.get("ordenRanking") as OrdenRankingInstitucional) ? searchParams.get("ordenRanking") as OrdenRankingInstitucional : REPORT_DEFAULTS.rankingOrder;
  const explicitDimension = searchParams.get("dimensionRanking");
  const rankingDimension: RankingDimension = (["carreras", "materias", "comisiones"] as const).includes(explicitDimension as RankingDimension) ? explicitDimension as RankingDimension : defaultRankingDimension(Boolean(selectedCareerId), Boolean(selectedMatterId));
  const amountParam = searchParams.get("cantidadRanking") ?? REPORT_DEFAULTS.rankingAmount;
  const rankingAmount = amountParam === "all" || (Number.isInteger(Number(amountParam)) && Number(amountParam) > 0) ? amountParam : REPORT_DEFAULTS.rankingAmount;
  const rawSampleMinimum = Number(searchParams.get("muestraMinimaRanking"));
  const sampleMinimum = Number.isInteger(rawSampleMinimum) && rawSampleMinimum >= 1 && rawSampleMinimum <= 100000 ? rawSampleMinimum : REPORT_DEFAULTS.sampleMinimum;
  const rawCoverageMinimum = Number(searchParams.get("coberturaMinimaRanking"));
  const coverageMinimum = Number.isFinite(rawCoverageMinimum) && rawCoverageMinimum >= 0 && rawCoverageMinimum <= 100 && searchParams.has("coberturaMinimaRanking") ? rawCoverageMinimum : REPORT_DEFAULTS.coverageMinimum;
  const visibility: ReportSectionVisibility = { summary: parseBooleanParam(searchParams.get("verResumen"), true), ranking: parseBooleanParam(searchParams.get("verRanking"), true), evolution: parseBooleanParam(searchParams.get("verEvolucion"), true), evidence: parseBooleanParam(searchParams.get("verEvidencia"), true), operational: parseBooleanParam(searchParams.get("verOperativo"), true) };
  const [advancedDraft, setAdvancedDraft] = useState<AdvancedDraft>({ sample: String(sampleMinimum), coverage: String(coverageMinimum), visibility });
  const page = Math.max(1, Number(searchParams.get("pagina")) || 1);
  const sortBy = (searchParams.get("ordenarPor") as ReporteEvaluacionesOrden) || "fecha";
  const sortDirection = (searchParams.get("ordenDireccion") as OrdenDireccion) || "desc";
  const stateFilter = searchParams.get("estado") ?? "";

  useEffect(() => {
    if (hasStablePeriod) return;
    const range = calendarMonthRange(REPORT_DEFAULTS.months, REPORT_DEFAULTS.periodMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("fechaDesde", range.fechaDesde); params.set("fechaHasta", range.fechaHasta); params.set("periodoModo", REPORT_DEFAULTS.periodMode); params.set("periodoMeses", String(REPORT_DEFAULTS.months)); params.set("pagina", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [hasStablePeriod, pathname, router, searchParams]);

  useEffect(() => {
    if (!hasStablePeriod) return;
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    const setDefault = (key: string, value?: string) => {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
      changed = true;
    };
    const rawMode = params.get("periodoModo");
    if (rawMode && !["current", "complete", "custom"].includes(rawMode)) setDefault("periodoModo", REPORT_DEFAULTS.periodMode);
    if (params.has("periodoMeses") && !isValidMonthAmount(Number(params.get("periodoMeses")))) setDefault("periodoMeses", String(REPORT_DEFAULTS.months));
    const rawGrouping = params.get("agrupacionSerie");
    if (rawGrouping && !["mensual", "semestral", "anual"].includes(rawGrouping)) setDefault("agrupacionSerie", REPORT_DEFAULTS.grouping);
    const rawView = params.get("vistaEvolucion");
    if (rawView && !["approval", "approval_confirmed", "approval_pending", "complete"].includes(rawView)) setDefault("vistaEvolucion");
    const rawSeries = params.get("seriesEvolucion");
    if (rawSeries) {
      const requestedSeries = rawSeries.split(",");
      const validSeries = requestedSeries.filter((item): item is InstitutionalEvolutionSeries => evolutionSeriesValues.includes(item as InstitutionalEvolutionSeries));
      if (validSeries.length === 0) setDefault("seriesEvolucion");
      else if (validSeries.length !== requestedSeries.length || new Set(validSeries).size !== validSeries.length) setDefault("seriesEvolucion", [...new Set(validSeries)].join(","));
    }
    const rawOrder = params.get("ordenRanking");
    if (rawOrder && !["aprobacion_asc", "aprobacion_desc"].includes(rawOrder)) setDefault("ordenRanking", REPORT_DEFAULTS.rankingOrder);
    const rawDimension = params.get("dimensionRanking");
    if (rawDimension && !["carreras", "materias", "comisiones"].includes(rawDimension)) setDefault("dimensionRanking");
    const rawAmount = params.get("cantidadRanking");
    if (rawAmount && rawAmount !== "all" && (!Number.isInteger(Number(rawAmount)) || Number(rawAmount) < 1)) setDefault("cantidadRanking", REPORT_DEFAULTS.rankingAmount);
    if (params.has("muestraMinimaRanking") && sampleMinimum !== Number(params.get("muestraMinimaRanking"))) setDefault("muestraMinimaRanking", String(REPORT_DEFAULTS.sampleMinimum));
    if (params.has("coberturaMinimaRanking") && coverageMinimum !== Number(params.get("coberturaMinimaRanking"))) setDefault("coberturaMinimaRanking", String(REPORT_DEFAULTS.coverageMinimum));
    (["verResumen", "verRanking", "verEvolucion", "verEvidencia", "verOperativo", "ocultarPeriodosSinDatos"] as const).forEach((key) => {
      const value = params.get(key);
      if (value !== null && value !== "0" && value !== "1") setDefault(key);
    });
    if (changed) router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [coverageMinimum, hasStablePeriod, pathname, router, sampleMinimum, searchParams]);

  const filters = useMemo<ReporteEvaluacionesFiltros>(() => ({
    incluirResumenInstitucional: true,
    agrupacionSerie: grouping,
    ordenRanking: rankingOrder,
    muestraMinimaRanking: sampleMinimum,
    coberturaMinimaRanking: coverageMinimum,
    idCarrera: selectedCareerId || undefined,
    idMateria: selectedMatterId || undefined,
    idMateriaDivision: selectedCommissionId || undefined,
    estado: (stateFilter as ReporteEvaluacionesFiltros["estado"]) || undefined,
    fechaDesde: rawDateFrom || undefined,
    fechaHasta: rawDateTo || undefined,
    ordenarPor: sortBy,
    ordenDireccion: sortDirection,
    pagina: page,
    limite: 10,
  }), [coverageMinimum, grouping, page, rankingOrder, rawDateFrom, rawDateTo, sampleMinimum, selectedCareerId, selectedCommissionId, selectedMatterId, sortBy, sortDirection, stateFilter]);

  const query = useReporteRendimientoEvaluaciones(filters, hasStablePeriod);
  const usableData = query.isPlaceholderData ? undefined : query.data;
  const institutional = usableData?.resumenInstitucional;
  const selectedCareer = selectedCareerId ? institutional?.carreras.find((item) => String(item.idCarrera) === selectedCareerId) : undefined;
  const selectedMatter = selectedMatterId ? selectedCareer?.materias.find((item) => String(item.idMateria) === selectedMatterId) : undefined;
  const selectedCommission = selectedCommissionId ? selectedMatter?.comisiones.find((item) => String(item.idMateriaDivision) === selectedCommissionId) : undefined;
  const currentSummary = selectedCommission ?? selectedMatter ?? selectedCareer ?? institutional?.global;

  const updateUrl = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => { if (value === undefined || value === "") params.delete(key); else params.set(key, String(value)); });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const navigateToCareer = (idCarrera: number) => updateUrl({ idCarrera, idMateria: undefined, idMateriaDivision: undefined, pagina: 1 });
  const navigateToMatter = (idCarrera: number, idMateria: number) => updateUrl({ idCarrera, idMateria, idMateriaDivision: undefined, pagina: 1 });
  const navigateToCommission = (idCarrera: number, idMateria: number, idMateriaDivision: number) => updateUrl({ idCarrera, idMateria, idMateriaDivision, pagina: 1 });
  const selectEntity = (item: RankedItem | ExcludedItem) => { if ("idMateriaDivision" in item) navigateToCommission(item.idCarrera, item.idMateria, item.idMateriaDivision); else if ("idMateria" in item) navigateToMatter(item.idCarrera, item.idMateria); else navigateToCareer(item.idCarrera); };

  const applyPreset = (nextMonths: number, mode: Exclude<PeriodMode, "custom"> = periodMode === "complete" ? "complete" : "current") => {
    const range = calendarMonthRange(nextMonths, mode); setPeriodError(null); setCustomMonths(String(nextMonths)); updateUrl({ fechaDesde: range.fechaDesde, fechaHasta: range.fechaHasta, periodoModo: mode, periodoMeses: nextMonths, pagina: 1 });
  };
  const applyCustomMonths = () => { const value = Number(customMonths); if (!isValidMonthAmount(value)) { setPeriodError("Ingresá una cantidad entre 1 y 60 meses."); return; } applyPreset(value, periodMode === "complete" ? "complete" : "current"); };
  const applyCustomDates = () => {
    if (!customFrom || !customTo) { setPeriodError("Seleccioná una fecha de inicio y una fecha de fin."); return; }
    if (customFrom > customTo) { setPeriodError("La fecha desde no puede ser posterior a la fecha hasta."); return; }
    if (calendarMonthsIncluded(customFrom, customTo) > 60) { setPeriodError("El rango puede abarcar hasta 60 meses calendario."); return; }
    const range = customDateRange(customFrom, customTo); if (Date.parse(range.fechaDesde) > Date.parse(range.fechaHasta)) { setPeriodError("El rango seleccionado todavía no comenzó."); return; }
    setPeriodError(null); updateUrl({ fechaDesde: range.fechaDesde, fechaHasta: range.fechaHasta, periodoModo: "custom", periodoMeses: undefined, pagina: 1 });
  };
  const openAdvanced = () => { setAdvancedDraft({ sample: String(sampleMinimum), coverage: String(coverageMinimum), visibility }); setAdvancedOpen(true); };
  const applyAdvanced = () => {
    const sample = Number(advancedDraft.sample); const coverage = Number(advancedDraft.coverage);
    if (!Number.isInteger(sample) || sample < 1 || sample > 100000 || Number.isNaN(coverage) || coverage < 0 || coverage > 100) { setMessage("Revisá la muestra mínima y la cobertura antes de aplicar."); return; }
    setMessage(null); setAdvancedOpen(false); updateUrl({ muestraMinimaRanking: sample, coberturaMinimaRanking: coverage, verResumen: advancedDraft.visibility.summary ? undefined : 0, verRanking: advancedDraft.visibility.ranking ? undefined : 0, verEvolucion: advancedDraft.visibility.evolution ? undefined : 0, verEvidencia: advancedDraft.visibility.evidence ? undefined : 0, verOperativo: advancedDraft.visibility.operational ? undefined : 0, pagina: 1 });
  };
  const resetConfiguration = () => {
    const range = calendarMonthRange(REPORT_DEFAULTS.months, REPORT_DEFAULTS.periodMode); const params = new URLSearchParams();
    if (selectedCareerId) params.set("idCarrera", selectedCareerId); if (selectedMatterId) params.set("idMateria", selectedMatterId); if (selectedCommissionId) params.set("idMateriaDivision", selectedCommissionId);
    params.set("fechaDesde", range.fechaDesde); params.set("fechaHasta", range.fechaHasta); params.set("periodoModo", REPORT_DEFAULTS.periodMode); params.set("periodoMeses", String(REPORT_DEFAULTS.months)); params.set("agrupacionSerie", REPORT_DEFAULTS.grouping); params.set("ordenRanking", REPORT_DEFAULTS.rankingOrder); params.set("pagina", "1");
    setMessage("Se restableció la configuración sin cambiar el alcance seleccionado."); router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setMessage("Enlace copiado. Al abrirlo se aplicarán los mismos criterios."); } catch { setMessage("No se pudo copiar el enlace. Podés copiarlo desde la barra del navegador."); } };
  const toggleEvolutionSeries = (series: InstitutionalEvolutionSeries) => {
    const isSelected = evolutionSeries.includes(series);
    if (isSelected && evolutionSeries.length === 1) {
      setMessage("La evolución debe conservar al menos una serie visible.");
      return;
    }
    const next = isSelected ? evolutionSeries.filter((item) => item !== series) : evolutionSeriesValues.filter((item) => item === series || evolutionSeries.includes(item));
    setMessage(null);
    updateUrl({ seriesEvolucion: next.join(","), vistaEvolucion: undefined });
  };

  const rankingCollection: RankingCollection | undefined = institutional ? (() => { const source = institutional.comparativas[rankingDimension]; return { eligible: source.elegibles as RankedItem[], limited: source.evidenciaLimitada as ExcludedItem[], withoutResults: source.sinResultados as ExcludedItem[] }; })() : undefined;
  const visibleRanking = rankingCollection ? (rankingAmount === "all" ? rankingCollection.eligible : rankingCollection.eligible.slice(0, Number(rankingAmount))) : [];
  const matterStatus = (matter: ResumenInstitucionalMateria) => { const key = `${matter.idCarrera}-${matter.idMateria}`; if (institutional?.comparativas.materias.elegibles.some((item) => `${item.idCarrera}-${item.idMateria}` === key)) return "Incluida en la comparación"; if (institutional?.comparativas.materias.evidenciaLimitada.some((item) => `${item.idCarrera}-${item.idMateria}` === key)) return "Evidencia limitada"; return "Sin resultados confirmados"; };
  const commissionStatus = (commission: ResumenInstitucionalComision) => { if (institutional?.comparativas.comisiones.elegibles.some((item) => item.idMateriaDivision === commission.idMateriaDivision)) return "Incluida en la comparación"; if (institutional?.comparativas.comisiones.evidenciaLimitada.some((item) => item.idMateriaDivision === commission.idMateriaDivision)) return "Evidencia limitada"; return "Sin resultados confirmados"; };

  const columns = useMemo<ReportColumn<ReporteEvaluacionItem, ReporteEvaluacionesOrden>[]>(() => [
    { key: "evaluacion", header: "Evaluación", sortKey: "evaluacion", render: (row) => <div><p className="font-bold text-slate-900">{row.titulo}</p><p className="mt-0.5 text-[10px] text-slate-500">{formatDate(row.fechaInicio)} · {row.estado}</p></div> },
    { key: "aprobacion", header: "Aprobación observada", align: "right", sortKey: "aprobacion", render: (row) => <div><p className="font-bold text-slate-900">{formatPercentage(row.resultadosOficiales.porcentajeAprobacion)}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.resultadosOficiales.aprobados} de {row.resultadosOficiales.resultadosConsiderados}</p></div> },
    { key: "official-average", header: "Promedio de notas · sobre 10", align: "right", render: (row) => <div><p className="font-bold text-slate-900">{formatAverage(row.resultadosOficiales.promedioNotaBase10)}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.resultadosOficiales.resultadosConsiderados} resultados considerados</p></div> },
    { key: "coverage", header: "Resultados confirmados", align: "right", render: (row) => <div><p className="font-bold text-slate-900">{formatPercentage(row.resultadosOficiales.porcentajeCoberturaConfirmada)}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.resultadosOficiales.resultadosConsiderados} de {row.resultadosOficiales.intentosValidosEntregados}</p></div> },
    { key: "academic-pending", header: "Correcciones pendientes", align: "center", sortKey: "pendientesCorreccion", render: (row) => <span className="font-bold text-amber-700">{row.resultadosOficiales.resultadosPendientes}</span> },
    { key: "operational-pending", header: "Intentos pendientes", align: "center", render: (row) => <span className="font-bold text-amber-700">{row.pendientesOperativos.intentosEntregadosPendientes}</span> },
  ], []);
  const scopeTitle = selectedCommission ? `Comisión ${selectedCommission.division}` : selectedMatter?.materia ?? selectedCareer?.carrera ?? "Toda la institución";
  const scopeDescription = selectedCommission ? `${selectedCommission.materia} · ${selectedCommission.carrera}` : selectedMatter ? selectedMatter.carrera : selectedCareer ? "Carrera seleccionada" : "Toda la institución";
  const periodSummary = institutional ? `${formatDate(institutional.periodoEfectivo.desde)} — ${formatDate(institutional.periodoEfectivo.hasta, true)} · ${institutional.periodoEfectivo.mesesCalendarioIncluidos} meses calendario` : "";

  return (
    <ReportLayout title="Panorama institucional" description="Explorá resultados académicos y correcciones pendientes desde la institución hasta cada evaluación." actions={<Button onClick={() => router.push("/admin")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Volver al panel</Button>}>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="period-title">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h2 id="period-title" className="text-lg font-black text-slate-900">Período consultado</h2><p className="mt-1 text-sm text-slate-500">Las fechas corresponden al inicio de cada evaluación.</p></div><div className="flex flex-wrap gap-2">{[3, 6, 12, 24, 60].map((value) => <button key={value} type="button" onClick={() => applyPreset(value)} className={`${quickButtonClass} ${periodMode !== "custom" && months === value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : ""}`}>{value} meses</button>)}</div></div>
        <div className="mt-4 grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.8fr)_minmax(280px,0.9fr)_minmax(460px,2fr)_auto]">
          <label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Meses incluidos<select className={inputClass} value={periodMode} onChange={(event) => { if (event.target.value !== "custom") applyPreset(months, event.target.value as Exclude<PeriodMode, "custom">); }}><option value="current">Incluir mes actual</option><option value="complete">Sólo meses completos</option>{periodMode === "custom" && <option value="custom">Rango personalizado</option>}</select></label>
          <div className="min-w-0"><label htmlFor="custom-months" className="text-xs font-bold text-slate-600">Cantidad personalizada</label><div className="mt-1 flex min-w-0 gap-2"><input id="custom-months" type="number" min={1} max={60} value={customMonths} onChange={(event) => setCustomMonths(event.target.value)} className={`${inputClass} flex-1`} /><Button onClick={applyCustomMonths} className="h-11 shrink-0 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white">Aplicar</Button></div></div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 md:col-span-2 xl:col-span-1"><label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Desde<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className={inputClass} /></label><label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Hasta<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className={inputClass} /></label></div>
          <Button onClick={applyCustomDates} className="h-11 w-full self-end rounded-xl border border-indigo-200 px-4 text-xs font-bold text-indigo-700 md:col-span-2 xl:col-span-1 xl:w-auto">Aplicar rango</Button>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Período efectivo</p><p className="mt-1 text-sm font-bold text-slate-800">{periodSummary || "Preparando período…"}</p></div><div className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-xs font-bold text-slate-600">Estado<select className={inputClass} value={stateFilter} onChange={(event) => updateUrl({ estado: event.target.value || undefined, pagina: 1 })}><option value="">Todos</option><option value="borrador">Borrador</option><option value="publicada">Publicada</option><option value="archivada">Archivada</option></select></label><Button onClick={openAdvanced} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700">Opciones avanzadas</Button><Button onClick={resetConfiguration} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700">Restablecer</Button><Button onClick={() => void copyLink()} className="rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white">Copiar enlace</Button></div></div>
        {periodError && <div className="mt-3"><ErrorMessage message={periodError} /></div>}{message && <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-indigo-700">{message}</p>}
      </section>

      {advancedOpen && <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5" aria-labelledby="advanced-title"><div><h2 id="advanced-title" className="text-lg font-black text-slate-900">Opciones avanzadas</h2><p className="mt-1 text-sm text-slate-500">Aplicá todos los cambios juntos o cancelá para conservar el reporte actual.</p></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><label className="grid gap-1 text-xs font-bold text-slate-600">Muestra mínima<input type="number" min={1} max={100000} className={inputClass} value={advancedDraft.sample} onChange={(event) => setAdvancedDraft((draft) => ({ ...draft, sample: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold text-slate-600">Cobertura mínima (%)<input type="number" min={0} max={100} step="0.01" className={inputClass} value={advancedDraft.coverage} onChange={(event) => setAdvancedDraft((draft) => ({ ...draft, coverage: event.target.value }))} /></label></div><fieldset className="mt-4"><legend className="text-xs font-bold uppercase tracking-wide text-slate-600">Secciones visibles</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{([['summary', 'Resumen'], ['ranking', 'Comparación'], ['evolution', 'Evolución'], ['evidence', 'Evidencia limitada'], ['operational', 'Correcciones pendientes']] as Array<[keyof ReportSectionVisibility, string]>).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={advancedDraft.visibility[key]} onChange={(event) => setAdvancedDraft((draft) => ({ ...draft, visibility: { ...draft.visibility, [key]: event.target.checked } }))} />{label}</label>)}</div></fieldset><div className="mt-5 flex justify-end gap-2"><Button onClick={() => { setAdvancedOpen(false); setMessage(null); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700">Cancelar</Button><Button onClick={applyAdvanced} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white">Aplicar</Button></div></section>}

      {(!hasStablePeriod || query.isLoading || query.isPlaceholderData) && <ReportSkeleton />}
      {query.isError && <RequestErrorState error={query.error} fallback="No se pudo cargar el panorama institucional." onRetry={() => void query.refetch()} />}
      {usableData && !institutional && <ErrorMessage message="No se pudo mostrar el panorama institucional. Intentá nuevamente." />}

      {institutional && currentSummary && rankingCollection && <div className="space-y-7" aria-busy={query.isFetching}>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><ScopeBreadcrumbs career={selectedCareer} matter={selectedMatter} commission={selectedCommission} onInstitution={() => updateUrl({ idCarrera: undefined, idMateria: undefined, idMateriaDivision: undefined, pagina: 1 })} onCareer={() => updateUrl({ idMateria: undefined, idMateriaDivision: undefined, pagina: 1 })} onMatter={() => updateUrl({ idMateriaDivision: undefined, pagina: 1 })} /><p className="text-xs font-semibold text-slate-500">{periodSummary}</p></div>
        {visibility.summary && <AcademicSummary summary={currentSummary} title={scopeTitle} />}
        {visibility.ranking && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="ranking-title"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h2 id="ranking-title" className="text-lg font-black text-slate-900">Comparación y ranking</h2><p className="mt-1 text-sm text-slate-500">{rankingOrder === "aprobacion_asc" ? "Menor" : "Mayor"} aprobación observada en {rankingDimensionLabel(rankingDimension)} · {scopeDescription}.</p><p className="mt-1 text-xs text-slate-500">Criterio: al menos {institutional.comparativas.criteriosElegibilidad.muestraMinima} resultados y {institutional.comparativas.criteriosElegibilidad.coberturaMinimaPorcentaje}% confirmados.</p></div><div className="grid gap-2 sm:grid-cols-3"><label className="grid gap-1 text-xs font-bold text-slate-600">Dimensión<select className={inputClass} value={rankingDimension} onChange={(event) => updateUrl({ dimensionRanking: event.target.value, pagina: 1 })}><option value="carreras">Carreras</option><option value="materias">Materias</option><option value="comisiones">Comisiones</option></select></label><label className="grid gap-1 text-xs font-bold text-slate-600">Orden<select className={inputClass} value={rankingOrder} onChange={(event) => updateUrl({ ordenRanking: event.target.value, pagina: 1 })}><option value="aprobacion_asc">Menor aprobación</option><option value="aprobacion_desc">Mayor aprobación</option></select></label><label className="grid gap-1 text-xs font-bold text-slate-600">Cantidad<select className={inputClass} value={rankingCustomOpen || !["5", "10", "20", "all"].includes(rankingAmount) ? "custom" : rankingAmount} onChange={(event) => { if (event.target.value === "custom") { setCustomRankingAmount(rankingAmount === "all" ? "5" : rankingAmount); setRankingCustomOpen(true); } else { setRankingCustomOpen(false); updateUrl({ cantidadRanking: event.target.value }); } }}><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="all">Todas</option><option value="custom">Personalizada</option></select></label></div></div>{(rankingCustomOpen || !["5", "10", "20", "all"].includes(rankingAmount)) && <div className="mt-3 flex justify-end gap-2"><label className="flex items-center gap-2 text-xs font-bold text-slate-600">Cantidad<input type="number" min={1} value={customRankingAmount} onChange={(event) => setCustomRankingAmount(event.target.value)} className={`${inputClass} w-24`} /></label><Button onClick={() => { const value = Number(customRankingAmount); if (Number.isInteger(value) && value > 0) { setRankingCustomOpen(false); updateUrl({ cantidadRanking: value }); } else setMessage("Ingresá una cantidad mayor que cero."); }} className="rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white">Aplicar</Button></div>}<div className="mt-5"><InstitutionalRankingView items={visibleRanking} totalAvailable={rankingCollection.eligible.length} requestedLabel={rankingAmount === "all" ? "todas" : rankingAmount} onSelect={selectEntity} /></div></section>}
        {visibility.evolution && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="evolution-title"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h2 id="evolution-title" className="text-lg font-black text-slate-900">Evolución {groupingLabel(grouping)}</h2><p className="mt-1 text-sm text-slate-500">Resultados actuales de las evaluaciones iniciadas en cada período. Los períodos parciales están identificados.</p></div><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]"><fieldset><legend className="text-xs font-bold text-slate-600">Series visibles</legend><div className="mt-1 flex flex-wrap gap-2">{([['approval', 'Aprobación (%)'], ['average', 'Promedio de notas'], ['confirmed', 'Resultados confirmados'], ['pending', 'Resultados pendientes']] as Array<[InstitutionalEvolutionSeries, string]>).map(([series, label]) => <label key={series} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={evolutionSeries.includes(series)} onChange={() => toggleEvolutionSeries(series)} />{label}</label>)}</div></fieldset><label className="grid gap-1 text-xs font-bold text-slate-600">Agrupación<select className={inputClass} value={grouping} onChange={(event) => updateUrl({ agrupacionSerie: event.target.value, pagina: 1 })}><option value="mensual">Mensual</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></label><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 lg:col-span-2"><input type="checkbox" checked={hideEmptyPeriods} onChange={(event) => updateUrl({ ocultarPeriodosSinDatos: event.target.checked ? 1 : undefined })} />Ocultar períodos sin información</label></div></div><div className="mt-4">{institutional.serieTemporal ? <InstitutionalTemporalChart points={institutional.serieTemporal.puntos} selectedSeries={evolutionSeries} hideEmptyPeriods={hideEmptyPeriods} /> : <ErrorMessage message="No se pudo mostrar la evolución para el período seleccionado." />}</div></section>}
        {visibility.evidence && <EvidenceSection collection={rankingCollection} criteria={institutional.comparativas.criteriosElegibilidad} onSelect={selectEntity} />}
        {selectedCareer && !selectedMatterId && <ScopeDirectory title="Todas las materias" description="Incluye también materias con evidencia limitada o sin resultados confirmados." entries={selectedCareer.materias.map((item) => ({ key: `${item.idCarrera}-${item.idMateria}`, title: item.materia, status: matterStatus(item), summary: item, onSelect: () => navigateToMatter(item.idCarrera, item.idMateria) }))} />}
        {selectedMatter && !selectedCommissionId && <ScopeDirectory title="Todas las comisiones" description="Accedé a cada comisión, aunque no integre la comparación principal." entries={selectedMatter.comisiones.map((item) => ({ key: String(item.idMateriaDivision), title: `Comisión ${item.division}`, context: item.materia, status: commissionStatus(item), summary: item, onSelect: () => navigateToCommission(item.idCarrera, item.idMateria, item.idMateriaDivision) }))} />}
        {selectedCommission && <section className="space-y-4" aria-labelledby="evaluations-title"><div><h2 id="evaluations-title" className="text-lg font-black text-slate-900">Evaluaciones de la comisión {selectedCommission.division}</h2><p className="mt-1 text-sm text-slate-500">El resumen contempla todo el período; la tabla está paginada.</p></div><ReportTable columns={columns} rows={usableData.evaluaciones} rowKey={(row) => row.idPublicacion} sortBy={sortBy} sortDirection={sortDirection} onSort={(nextSort, nextDirection) => updateUrl({ ordenarPor: nextSort, ordenDireccion: nextDirection, pagina: 1 })} page={usableData.paginacion.pagina} totalPages={usableData.paginacion.totalPaginas} total={usableData.paginacion.total} onPageChange={(nextPage) => updateUrl({ pagina: nextPage })} itemLabel="evaluaciones" emptyMessage="No hay evaluaciones para la comisión y el período seleccionados." /></section>}
        {visibility.operational && <OperationalSummary summary={currentSummary} />}
      </div>}
    </ReportLayout>
  );
}
