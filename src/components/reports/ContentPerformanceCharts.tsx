"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type {
  ReporteContenidoKpis,
} from "@/types";
import { ChartCard } from "./ChartCard";

interface ContentPerformanceChartsProps {
  kpis: ReporteContenidoKpis;
  kind: "preguntas" | "grupos";
}

export function ContentPerformanceCharts({
  kpis,
  kind,
}: ContentPerformanceChartsProps) {
  const distribution = [
    { name: "Correctas", value: Number(kpis.correctas), color: "#10b981" },
    { name: "Parciales", value: Number(kpis.parciales), color: "#f59e0b" },
    { name: "Incorrectas", value: Number(kpis.incorrectas), color: "#f43f5e" },
  ].filter((item) => item.value > 0);
  const responseStatus = [
    { name: "Respondidas", value: Number(kpis.respondidas), color: "#3b82f6" },
    { name: "Omitidas", value: Number(kpis.omitidas), color: "#94a3b8" },
    { name: "Pendientes de corrección", value: Number(kpis.pendientesCorreccion), color: "#f59e0b" },
  ].filter((item) => item.value > 0);

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
        title={`Respuestas en ${kind === "preguntas" ? "preguntas" : "grupos"}`}
        description="Distribución global entre respuestas registradas, omisiones y correcciones pendientes."
      >
        {responseStatus.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No hay resultados para graficar.
          </div>
        ) : (
          <>
            <ul className="sr-only">
              {responseStatus.map((item) => (
                <li key={item.name}>{item.name}: {item.value}</li>
              ))}
            </ul>
            <div aria-hidden="true" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={responseStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {responseStatus.map((item) => (
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
    </div>
  );
}
