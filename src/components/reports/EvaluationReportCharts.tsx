"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ReporteEvaluacionesDistribucionItem } from "@/types/index";
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
}: {
  distribution: ReporteEvaluacionesDistribucionItem[];
}) {
  const data = distribution.filter((item) => item.cantidad > 0);

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
        title="Cómo interpretar el reporte"
        description="Las métricas académicas se calculan por intento calificado."
      >
        <div className="flex h-full flex-col justify-center gap-4 text-sm text-slate-600">
          <p>
            Aprobación y promedio consideran únicamente intentos entregados con
            nota final.
          </p>
          <p>
            Los pendientes de corrección son entregas que todavía no tienen una
            nota definitiva.
          </p>
          <p className="text-xs text-slate-400">
            Los intentos múltiples no se consolidan como una única nota del
            alumno porque esa regla académica aún no está definida.
          </p>
        </div>
      </ChartCard>
    </div>
  );
}
