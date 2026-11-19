"use client";

import { chartColors, chartTypography } from "@/lib/chart-tokens";

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
import { ChartCard } from "./ChartCard";
import type { ReporteRendimientoAlumno } from "@/types/index";

export function ReportCharts({ alumnos }: { alumnos: ReporteRendimientoAlumno[] }) {
  const promedios = alumnos.map((alumno) => ({
    id: alumno.matricula,
    alumno: `${alumno.nombre.charAt(0)}. ${alumno.apellido}`,
    promedio: alumno.promedio,
  }));
  const aprobados = alumnos.reduce((total, alumno) => total + alumno.aprobados, 0);
  const desaprobados = alumnos.reduce((total, alumno) => total + alumno.desaprobados, 0);
  const resultados = [
    { name: "Aprobados", value: aprobados, color: chartColors.success },
    { name: "Desaprobados", value: desaprobados, color: chartColors.danger },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Promedio por alumno" description="Comparación de los alumnos visibles en la página actual.">
        <ul className="sr-only">
          {promedios.map((item) => <li key={item.id}>{item.alumno}: promedio {item.promedio.toFixed(2)}</li>)}
        </ul>
        <div aria-hidden="true" className="h-full w-full"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={promedios} margin={{ top: 8, right: 8, left: -16, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="alumno" tick={{ fontSize: chartTypography.tickSize, fill: chartColors.axis }} angle={-20} textAnchor="end" interval={0} />
            <YAxis domain={[0, 10]} tick={{ fontSize: chartTypography.tickSize, fill: chartColors.axis }} />
            <Tooltip formatter={(value) => [Number(value).toFixed(2), "Promedio"]} />
            <Bar dataKey="promedio" fill={chartColors.primary} radius={[6, 6, 0, 0]} maxBarSize={42} />
          </BarChart>
        </ResponsiveContainer></div>
      </ChartCard>
      <ChartCard title="Resultados corregidos" description="Aprobados y desaprobados de los alumnos visibles.">
        {aprobados + desaprobados === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No hay intentos corregidos para graficar.</div>
        ) : (
          <><p className="sr-only">Aprobados: {aprobados}. Desaprobados: {desaprobados}.</p><div aria-hidden="true" className="h-full w-full"><ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={resultados} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {resultados.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip formatter={(value) => Number(value).toLocaleString("es-AR")} />
              <Legend verticalAlign="bottom" iconType="circle" formatter={(value) => <span className="text-sm text-slate-700">{value}</span>} />
            </PieChart>
          </ResponsiveContainer></div></>
        )}
      </ChartCard>
    </div>
  );
}
