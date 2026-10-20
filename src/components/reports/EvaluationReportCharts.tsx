"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ReporteEvaluacionItem,
  ReporteEvaluacionesDistribucionItem,
} from "@/types/index";
import { ChartCard } from "./ChartCard";

const categoryColors: Record<string, string> = {
  Aprobados: "#10b981",
  Desaprobados: "#f43f5e",
  "Pendientes de corrección": "#f59e0b",
  "En progreso": "#3b82f6",
  Vencidos: "#64748b",
  Anulados: "#a855f7",
};

export function EvaluationReportCharts({
  distribution,
  participation,
  comparisons,
}: {
  distribution: ReporteEvaluacionesDistribucionItem[];
  participation?: {
    alcanzados: number;
    iniciaron: number;
    entregaron: number;
  };
  comparisons?: ReporteEvaluacionItem[];
}) {
  const comparisonData = (comparisons ?? []).map((item, index) => ({
    reference: `E${index + 1}`,
    title: `${item.titulo} · ${item.materia} · ${item.division}`,
    alcanzados: item.alumnosAlcanzados,
    iniciaron: item.alumnosQueIniciaron,
    entregaron: item.entregados,
    aprobados: item.resultadosOficiales.aprobados,
    desaprobados: item.resultadosOficiales.desaprobados,
    pendientes: item.resultadosOficiales.resultadosPendientes,
  }));
  const data = distribution.filter((item) => item.cantidad > 0);
  const participationRows = participation
    ? [
        { label: "Estudiantes alcanzados", value: participation.alcanzados, color: "bg-indigo-500" },
        { label: "Iniciaron", value: participation.iniciaron, color: "bg-blue-500" },
        { label: "Entregaron", value: participation.entregaron, color: "bg-emerald-500" },
      ]
    : [];
  const participationBase = Math.max(participation?.alcanzados ?? 0, 1);

  if (comparisonData.length > 0) {
    const evaluationName = (reference: string) =>
      comparisonData.find((item) => item.reference === reference)?.title ?? reference;

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Participación por evaluación"
          description={`Compara ${comparisonData.length === 1 ? "la evaluación visible" : `las ${comparisonData.length} evaluaciones visibles`} en esta página.`}
        >
          <ul className="sr-only">
            {comparisonData.map((item) => (
              <li key={item.reference}>
                {item.reference}, {item.title}: {item.alcanzados} alcanzados, {item.iniciaron} iniciaron y {item.entregaron} entregaron.
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="reference" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip labelFormatter={(label) => evaluationName(String(label))} />
                <Legend verticalAlign="bottom" iconType="circle" />
                <Bar dataKey="alcanzados" name="Alcanzados" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="iniciaron" name="Iniciaron" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="entregaron" name="Entregaron" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard
          title="Resultados por evaluación"
          description="Compara resultados oficiales y correcciones pendientes de las evaluaciones visibles."
        >
          <ul className="sr-only">
            {comparisonData.map((item) => (
              <li key={item.reference}>
                {item.reference}, {item.title}: {item.aprobados} aprobados, {item.desaprobados} desaprobados y {item.pendientes} pendientes.
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="reference" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip labelFormatter={(label) => evaluationName(String(label))} />
                <Legend verticalAlign="bottom" iconType="circle" />
                <Bar dataKey="aprobados" name="Aprobados" stackId="results" fill="#10b981" />
                <Bar dataKey="desaprobados" name="Desaprobados" stackId="results" fill="#f43f5e" />
                <Bar dataKey="pendientes" name="Pendientes" stackId="results" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <div className="xl:col-span-2">
          <h3 className="sr-only">Referencias de evaluaciones</h3>
          <ul className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
            {comparisonData.map((item) => (
              <li key={item.reference} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <strong className="text-indigo-700">{item.reference}</strong> · {item.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title="Distribución global de resultados"
        description="Incluye todos los intentos del conjunto filtrado, no solamente la página visible."
      >
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No hay intentos para graficar.
          </div>
        ) : (
          <><ul className="sr-only">{data.map((item) => <li key={item.categoria}>{item.categoria}: {item.cantidad}</li>)}</ul><div aria-hidden="true" className="h-full w-full"><ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="cantidad"
                nameKey="categoria"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
              >
                {data.map((item) => (
                  <Cell
                    key={item.categoria}
                    fill={categoryColors[item.categoria] ?? "#6366f1"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => Number(value).toLocaleString("es-AR")}
              />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer></div></>
        )}
      </ChartCard>
      <ChartCard
        title={participation ? "Participación" : "Qué incluye este resultado"}
        description={
          participation
            ? "Recorrido de los estudiantes desde la asignación hasta la entrega."
            : "Los resultados distinguen entregas calificadas y pendientes."
        }
      >
        {participation ? (
          <div className="flex h-full flex-col justify-center gap-5">
            {participationRows.map((item) => {
              const width = Math.min(100, (item.value / participationBase) * 100);
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-black text-slate-900">
                      {item.value.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center gap-4 text-sm text-slate-600">
            <p>La aprobación y el promedio corresponden a entregas con nota final.</p>
            <p>Las entregas pendientes todavía necesitan una corrección definitiva.</p>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
