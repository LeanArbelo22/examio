import type { ReactNode } from "react";

export interface ReportKpiItem {
  id?: string;
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
  tone?: "indigo" | "blue" | "emerald" | "amber";
}

const tones = {
  indigo: "bg-indigo-50 text-indigo-600",
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

export function ReportKpiGrid({ items }: { items: ReportKpiItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <article key={item.id ?? item.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.005)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-800">{item.value}</p>
              {item.helper && <p className="mt-1 text-[11px] text-slate-400">{item.helper}</p>}
            </div>
            {item.icon && <div className={`rounded-xl p-2 ${tones[item.tone ?? "indigo"]}`}>{item.icon}</div>}
          </div>
        </article>
      ))}
    </div>
  );
}
