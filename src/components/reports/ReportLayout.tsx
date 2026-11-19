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
        <div className="min-w-0">
          <h1 id="report-title" className="break-words text-balance text-2xl font-bold leading-tight tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-2 max-w-[65ch] text-pretty text-base leading-relaxed text-slate-600">{description}</p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
