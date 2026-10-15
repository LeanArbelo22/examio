"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ReporteContenidoKpis,
  ReporteGrupoItem,
  ReportePreguntaItem,
} from "@/types";
import { ChartCard } from "./ChartCard";

interface ContentPerformanceChartsProps {
  kpis: ReporteContenidoKpis;
  items: Array<ReportePreguntaItem | ReporteGrupoItem>;
  kind: "preguntas" | "grupos";
}

function shortLabel(value: string) {
  return value.length > 30 ? `${value.slice(0, 29)}…` : value;
}

export function ContentPerformanceCharts({
  kpis,
  items,
  kind,
}: ContentPerformanceChartsProps) {
  const distribution = [
    { name: "Correctas", value: Number(kpis.correctas), color: "#10b981" },
    { name: "Parciales", value: Number(kpis.parciales), color: "#f59e0b" },
    { name: "Incorrectas", value: Number(kpis.incorrectas), color: "#f43f5e" },
  ].filter((item) => item.value > 0);
  const scores = items.slice(0, 12).map((item) => ({
    nombre: shortLabel(
      "enunciado" in item ? item.enunciado : item.grupo || "Grupo sin título",
    ),
    porcentaje: Number(item.porcentajePuntajePromedio ?? 0),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title="Resultados corregidos"
        description="Distribución global del conjunto filtrado, antes de paginar."
      >
        {distribution.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No hay respuestas corregidas para graficar.
          </div>
        ) : (
          <>
            <ul className="sr-only">
              {distribution.map((item) => (
                <li key={item.name}>{item.name}: {item.value}</li>
              ))}
            </ul>
            <div aria-hidden="true" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {distribution.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => Number(value).toLocaleString("es-AR")} />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </ChartCard>
      <ChartCard
        title={`Rendimiento por ${kind === "preguntas" ? "pregunta" : "grupo"}`}
        description="Porcentaje del puntaje máximo de los elementos visibles en esta página."
      >
        {scores.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No hay resultados para graficar.
          </div>
        ) : (
          <>
            <ul className="sr-only">
              {scores.map((item) => (
                <li key={item.nombre}>{item.nombre}: {item.porcentaje.toFixed(1)}%</li>
              ))}
            </ul>
            <div aria-hidden="true" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scores} margin={{ top: 8, right: 8, left: -8, bottom: 38 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="nombre"
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    angle={-24}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} unit="%" />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Puntaje"]} />
                  <Bar dataKey="porcentaje" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </ChartCard>
    </div>
  );
}
