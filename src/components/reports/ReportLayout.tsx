import type { ReactNode } from "react";

interface ReportLayoutProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ReportLayout({ title, description, actions, children }: ReportLayoutProps) {
  return (
    <section className="space-y-6 antialiased" aria-labelledby="report-title">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Reportes</p>
          <h1 id="report-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
