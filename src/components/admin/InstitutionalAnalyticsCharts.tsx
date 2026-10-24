"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  PuntoSerieMensualInstitucional,
} from "@/types";

export type InstitutionalComparisonItem =
  | (ComparativaCarrera & { posicion: number })
  | (ComparativaMateria & { posicion: number })
  | (ComparativaComision & { posicion: number });

type ComparisonDatum = {
  key: string;
  label: string;
  fullLabel: string;
  approval: number;
  item: InstitutionalComparisonItem;
};

function formatPercent(value: number | null) {
  return value === null
    ? "Sin resultados confirmados"
    : `${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function comparisonLabel(item: InstitutionalComparisonItem) {
  if ("division" in item) return `Comisión ${item.division}`;
  if ("materia" in item) return item.materia;
  return item.carrera;
}

function comparisonKey(item: InstitutionalComparisonItem) {
  if ("idMateriaDivision" in item) return `commission-${item.idMateriaDivision}`;
  if ("idMateria" in item) return `matter-${item.idCarrera}-${item.idMateria}`;
  return `career-${item.idCarrera}`;
}

export function InstitutionalComparisonChart({
  title,
  description,
  items,
  onSelect,
}: {
  title: string;
  description: string;
  items: InstitutionalComparisonItem[];
  onSelect: (item: InstitutionalComparisonItem) => void;
}) {
  const data: ComparisonDatum[] = items.map((item) => ({
    key: comparisonKey(item),
    label: comparisonLabel(item).length > 26
      ? `${comparisonLabel(item).slice(0, 25)}…`
      : comparisonLabel(item),
    fullLabel: comparisonLabel(item),
    approval: item.resultadosOficiales.porcentajeAprobacion ?? 0,
    item,
  }));
  const chartHeight = Math.max(220, data.length * 58);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={`${title}-title`}>
      <div className="mb-5">
        <h2 id={`${title}-title`} className="text-lg font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {data.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No hay entidades con evidencia suficiente para comparar.
        </p>
      ) : (
        <>
          <div aria-hidden="true" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 22, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: "#334155" }} />
                <Tooltip
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullLabel ?? ""}
                  formatter={(value) => [`${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`, "Aprobación observada"]}
                />
                <Bar
                  dataKey="approval"
                  name="Aprobación observada"
                  radius={[0, 7, 7, 0]}
                  cursor="pointer"
                  onClick={(entry: unknown) => {
                    const datum = (entry as { payload?: ComparisonDatum }).payload;
                    if (datum) onSelect(datum.item);
                  }}
                >
                  {data.map((item, index) => (
                    <Cell key={item.key} fill={index === 0 ? "#4f46e5" : "#818cf8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 grid gap-2 lg:grid-cols-2">
            {items.map((item) => {
              const official = item.resultadosOficiales;
              return (
                <li key={comparisonKey(item)}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-bold text-slate-900">{item.posicion}. {comparisonLabel(item)}</span>
                      <span className="shrink-0 font-black text-indigo-700">{formatPercent(official.porcentajeAprobacion)}</span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {official.aprobados} aprobados de {official.resultadosConsiderados} resultados · {official.resultadosPendientes} pendientes · {formatPercent(official.porcentajeCoberturaConfirmada)} confirmados
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function monthLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

export function InstitutionalMonthlyChart({
  points,
}: {
  points: PuntoSerieMensualInstitucional[];
}) {
  const data = points.map((point) => ({
    period: point.periodo,
    label: monthLabel(point.periodo),
    complete: point.periodoCompleto,
    considered: point.resultadosOficiales.resultadosConsiderados,
    pending: point.resultadosOficiales.resultadosPendientes,
    approval: point.resultadosOficiales.porcentajeAprobacion,
    coverage: point.resultadosOficiales.porcentajeCoberturaConfirmada,
  }));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="monthly-evolution-title">
      <h2 id="monthly-evolution-title" className="text-lg font-black text-slate-900">Evolución mensual</h2>
      <p className="mt-1 text-sm text-slate-500">
        Resultados actuales de las evaluaciones iniciadas en cada mes. Los meses parciales están identificados.
      </p>
      <div aria-hidden="true" className="mt-5 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
            <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
            <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: "#64748b" }} />
            <Tooltip
              labelFormatter={(_, payload) => {
                const point = payload[0]?.payload as { period?: string; complete?: boolean } | undefined;
                return `${point?.period ?? ""}${point?.complete === false ? " · mes parcial" : ""}`;
              }}
            />
            <Legend verticalAlign="bottom" iconType="circle" />
            <Bar yAxisId="count" dataKey="considered" name="Resultados confirmados" stackId="results" fill="#6366f1" />
            <Bar yAxisId="count" dataKey="pending" name="Resultados pendientes" stackId="results" fill="#f59e0b" radius={[5, 5, 0, 0]} />
            <Line yAxisId="percent" dataKey="approval" name="Aprobación observada" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs">
          <caption className="sr-only">Detalle textual de la evolución mensual</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-2 py-2 font-bold">Mes</th>
              <th className="px-2 py-2 text-right font-bold">Aprobación</th>
              <th className="px-2 py-2 text-right font-bold">Confirmados</th>
              <th className="px-2 py-2 text-right font-bold">Pendientes</th>
              <th className="px-2 py-2 text-right font-bold">Resultados confirmados</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.period} className="border-b border-slate-100 last:border-0">
                <td className="px-2 py-2.5 font-semibold text-slate-700">{point.label}{!point.complete ? " · parcial" : ""}</td>
                <td className="px-2 py-2.5 text-right text-slate-700">{formatPercent(point.approval)}</td>
                <td className="px-2 py-2.5 text-right text-slate-700">{point.considered}</td>
                <td className="px-2 py-2.5 text-right text-amber-700">{point.pending}</td>
                <td className="px-2 py-2.5 text-right text-slate-700">{formatPercent(point.coverage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
