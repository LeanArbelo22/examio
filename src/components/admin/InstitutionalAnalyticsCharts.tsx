"use client";

import { chartColors, chartTypography } from "@/lib/chart-tokens";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ComparativaCarrera,
  ComparativaComision,
  ComparativaMateria,
  PuntoSerieTemporalInstitucional,
} from "@/types";

export type InstitutionalComparisonItem =
  | (ComparativaCarrera & { posicion: number })
  | (ComparativaMateria & { posicion: number })
  | (ComparativaComision & { posicion: number });

export type InstitutionalEvolutionSeries =
  | "approval"
  | "average"
  | "confirmed"
  | "pending";

function formatPercent(value: number | null) {
  return value === null
    ? "Sin resultados confirmados"
    : `${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function formatAverage(value: number | null) {
  return value === null
    ? "Sin resultados confirmados"
    : value.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function itemLabel(item: InstitutionalComparisonItem) {
  if ("division" in item) return `Comisión ${item.division}`;
  if ("materia" in item) return item.materia;
  return item.carrera;
}

function itemContext(item: InstitutionalComparisonItem) {
  if ("division" in item) return `${item.materia} · ${item.carrera}`;
  if ("materia" in item) return item.carrera;
  return undefined;
}

function itemKey(item: InstitutionalComparisonItem) {
  if ("idMateriaDivision" in item) return `commission-${item.idMateriaDivision}`;
  if ("idMateria" in item) return `matter-${item.idCarrera}-${item.idMateria}`;
  return `career-${item.idCarrera}`;
}

export function InstitutionalRankingView({
  items,
  totalAvailable,
  requestedLabel,
  onSelect,
}: {
  items: InstitutionalComparisonItem[];
  totalAvailable: number;
  requestedLabel: string;
  onSelect: (item: InstitutionalComparisonItem) => void;
}) {
  const useBars = items.length <= 10;
  if (items.length === 0) {
    return <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No hay entidades con evidencia suficiente para comparar.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-500">
        Mostrando {items.length} de {totalAvailable} disponibles · selección: {requestedLabel}
      </p>
      {useBars ? (
        <ol className="space-y-3">
          {items.map((item) => {
            const official = item.resultadosOficiales;
            const percentage = official.porcentajeAprobacion ?? 0;
            return (
              <li key={itemKey(item)}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-indigo-50 transition group-hover:bg-indigo-100" style={{ width: `${percentage}%` }} />
                  <span className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="font-black text-indigo-700">{item.posicion}.</span>{" "}
                      <span className="font-bold text-slate-900">{itemLabel(item)}</span>
                      {itemContext(item) && <span className="mt-0.5 block text-sm text-slate-500">{itemContext(item)}</span>}
                    </span>
                    <span className="text-sm text-slate-600 sm:text-right">
                      <span className="block text-base font-black text-slate-900">{formatPercent(official.porcentajeAprobacion)}</span>
                      <span>{official.aprobados}/{official.resultadosConsiderados} aprobados · promedio {formatAverage(official.promedioNotaBase10)} sobre 10 ({official.resultadosConsiderados} resultados) · {official.resultadosPendientes} pendientes · {formatPercent(official.porcentajeCoberturaConfirmada)} confirmados</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Posición</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3 text-right">Aprobación</th>
                <th className="px-4 py-3 text-right">Promedio · sobre 10</th>
                <th className="px-4 py-3 text-right">Muestra</th>
                <th className="px-4 py-3 text-right">Pendientes</th>
                <th className="px-4 py-3 text-right">Resultados confirmados</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const official = item.resultadosOficiales;
                return (
                  <tr key={itemKey(item)} className="border-t border-slate-100 hover:bg-indigo-50/40">
                    <td className="px-4 py-3 font-black text-indigo-700">{item.posicion}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => onSelect(item)} className="font-bold text-slate-900 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{itemLabel(item)}</button>{itemContext(item) && <span className="block text-sm text-slate-500">{itemContext(item)}</span>}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{formatPercent(official.porcentajeAprobacion)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatAverage(official.promedioNotaBase10)}<span className="block text-sm font-normal text-slate-500">{official.resultadosConsiderados} resultados</span></td>
                    <td className="px-4 py-3 text-right text-slate-600">{official.resultadosConsiderados}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{official.resultadosPendientes}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatPercent(official.porcentajeCoberturaConfirmada)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function InstitutionalTemporalChart({
  points,
  selectedSeries = ["approval", "average", "confirmed"],
  hideEmptyPeriods = false,
}: {
  points: PuntoSerieTemporalInstitucional[];
  selectedSeries?: InstitutionalEvolutionSeries[];
  hideEmptyPeriods?: boolean;
}) {
  const showApproval = selectedSeries.includes("approval");
  const showAverage = selectedSeries.includes("average");
  const showConfirmed = selectedSeries.includes("confirmed");
  const showPending = selectedSeries.includes("pending");
  const showCounts = showConfirmed || showPending;
  const data = points.filter((point) => !hideEmptyPeriods || point.publicaciones > 0).map((point) => ({
    period: point.periodo,
    label: point.etiqueta,
    complete: point.periodoCompleto,
    considered: point.resultadosOficiales.resultadosConsiderados,
    pending: point.resultadosOficiales.resultadosPendientes,
    approval: point.resultadosOficiales.porcentajeAprobacion,
    average: point.resultadosOficiales.promedioNotaBase10,
    coverage: point.resultadosOficiales.porcentajeCoberturaConfirmada,
  }));
  const tooltipFormatter = (value: string | number | ReadonlyArray<string | number> | undefined, name: string | number | undefined): [string, string] => {
    const rawValue = typeof value === "string" || typeof value === "number" ? value : value?.[0];
    const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (value === undefined || value === null || Number.isNaN(numericValue)) {
      return ["Sin resultados", String(name ?? "")];
    }
    if (name === "Aprobación observada") return [`${numericValue.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`, String(name)];
    if (name === "Promedio de notas") return [`${numericValue.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sobre 10`, String(name)];
    return [numericValue.toLocaleString("es-AR"), String(name ?? "")];
  };
  const labelFormatter = (_: unknown, payload: ReadonlyArray<{ payload?: { label?: string; complete?: boolean } }>) => {
    const point = payload[0]?.payload;
    return `${point?.label ?? ""}${point?.complete === false ? " · período parcial" : ""}`;
  };
  return (
    <div>
      <div aria-hidden="true" className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 18, right: 28, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="label" tick={{ fontSize: chartTypography.tickSize, fill: chartColors.axis }} />
            {showCounts && <YAxis yAxisId="count" width={0} hide allowDecimals={false} />}
            {showApproval && <YAxis yAxisId="percent" width={64} orientation="left" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value: number) => `${value}%`} allowDataOverflow tick={{ fontSize: chartTypography.tickSize, fill: chartColors.axis }} label={{ value: "Aprobación (%)", angle: -90, position: "insideLeft", fill: chartColors.approvalLabel, fontSize: chartTypography.tickSize }} />}
            {showAverage && <YAxis yAxisId="average" width={56} orientation="right" domain={[0, 10]} tick={{ fontSize: chartTypography.tickSize, fill: chartColors.axis }} label={{ value: "Nota sobre 10", angle: 90, position: "insideRight", fill: chartColors.averageLabel, fontSize: chartTypography.tickSize }} />}
            <Tooltip filterNull={false} labelFormatter={labelFormatter} formatter={tooltipFormatter} />
            <Legend verticalAlign="top" iconType="circle" formatter={(value) => <span className="text-sm text-slate-700">{value}</span>} />
            {showConfirmed && <Bar yAxisId="count" dataKey="considered" name="Resultados confirmados" stackId="results" fill={chartColors.confirmedFill}><LabelList dataKey="considered" position="insideTop" fill={chartColors.confirmedLabel} fontSize={chartTypography.tickSize} fontWeight={700} /></Bar>}
            {showPending && <Bar yAxisId="count" dataKey="pending" name="Resultados pendientes" stackId="results" fill={chartColors.pendingFill} radius={[5, 5, 0, 0]}><LabelList dataKey="pending" position="insideTop" fill={chartColors.pendingLabel} fontSize={chartTypography.tickSize} fontWeight={700} /></Bar>}
            {showApproval && <Line yAxisId="percent" dataKey="approval" stroke={chartColors.approval} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls legendType="none" tooltipType="none" />}
            {showApproval && <Line yAxisId="percent" dataKey="approval" name="Aprobación observada" stroke={chartColors.approval} strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />}
            {showAverage && <Line yAxisId="average" dataKey="average" stroke={chartColors.average} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls legendType="none" tooltipType="none" />}
            {showAverage && <Line yAxisId="average" dataKey="average" name="Promedio de notas" stroke={chartColors.average} strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 rounded-xl border border-slate-200 px-4 py-3">
        <summary className="cursor-pointer text-sm font-bold text-indigo-700">Ver datos de la evolución</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="px-2 py-2">Período</th>{showApproval && <th className="px-2 py-2 text-right">Aprobación</th>}{showAverage && <th className="px-2 py-2 text-right">Promedio de notas · sobre 10</th>}{showConfirmed && <th className="px-2 py-2 text-right">Confirmados</th>}{showPending && <th className="px-2 py-2 text-right">Pendientes</th>}<th className="px-2 py-2 text-right">Cobertura</th></tr></thead>
            <tbody>{data.map((point) => <tr key={point.period} className="border-b border-slate-100 last:border-0"><td className="px-2 py-2.5 font-semibold text-slate-700">{point.label}{!point.complete ? " · parcial" : ""}</td>{showApproval && <td className="px-2 py-2.5 text-right">{point.approval === null ? "Sin resultados" : formatPercent(point.approval)}</td>}{showAverage && <td className="px-2 py-2.5 text-right">{point.average === null ? "Sin resultados" : <>{formatAverage(point.average)} <span className="text-slate-500">· {point.considered} resultados</span></>}</td>}{showConfirmed && <td className="px-2 py-2.5 text-right">{point.considered}</td>}{showPending && <td className="px-2 py-2.5 text-right text-amber-700">{point.pending}</td>}<td className="px-2 py-2.5 text-right">{point.coverage === null ? "Sin resultados" : formatPercent(point.coverage)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
