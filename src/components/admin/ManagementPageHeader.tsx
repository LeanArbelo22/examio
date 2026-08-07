import type { ReactNode } from "react";

export function ManagementPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-slate-200/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
