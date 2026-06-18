"use client";

import type { AdminAnalyticsKPIs } from "@/types/index";

interface AdminKpisProps {
  kpis: AdminAnalyticsKPIs;
}

function FileCheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

const kpiConfig = [
  {
    key: "totalIntentos" as const,
    label: "Total Intentos",
    icon: FileCheckIcon,
    color: "text-blue-600 bg-blue-50",
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "promedioGeneral" as const,
    label: "Promedio General",
    icon: TrendingUpIcon,
    color: "text-indigo-600 bg-indigo-50",
    format: (v: number) => v.toFixed(2),
  },
  {
    key: "tasaAprobacion" as const,
    label: "Tasa de Aprobación",
    icon: AwardIcon,
    color: "text-emerald-600 bg-emerald-50",
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    key: "totalAlertasFraude" as const,
    label: "Alertas de Fraude",
    icon: AlertTriangleIcon,
    color: "text-rose-600 bg-rose-50",
    format: (v: number) => v.toLocaleString(),
  },
];

export function AdminKpis({ kpis }: AdminKpisProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiConfig.map(({ key, label, icon: Icon, color, format }) => {
        const valor = kpis[key];
        return (
          <div key={key} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_4px_rgba(0,0,0,0.005)]">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <div className={`p-2 rounded-xl ${color}`}>
                <Icon />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {format(valor)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
