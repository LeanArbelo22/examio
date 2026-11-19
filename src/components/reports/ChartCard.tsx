import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      <h2 className="text-balance text-lg font-bold leading-snug text-slate-900">{title}</h2>
      {description && <p className="mt-2 max-w-[65ch] text-pretty text-base leading-relaxed text-slate-600">{description}</p>}
      <div className="mt-5 h-72 w-full">{children}</div>
    </article>
  );
}
