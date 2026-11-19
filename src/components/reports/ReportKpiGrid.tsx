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
        <article key={item.id ?? item.label} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 break-words">
              <p className="text-sm font-semibold leading-snug text-slate-600">{item.label}</p>
              <p className="mt-2 break-words text-2xl font-bold tabular-nums tracking-tight text-slate-900">{item.value}</p>
              {item.helper && <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.helper}</p>}
            </div>
            {item.icon && <div aria-hidden="true" className={`hidden shrink-0 rounded-xl p-2 sm:block ${tones[item.tone ?? "indigo"]}`}>{item.icon}</div>}
          </div>
        </article>
      ))}
    </div>
  );
}
