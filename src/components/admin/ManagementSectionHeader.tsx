import type { ReactNode } from "react";

export function ManagementSectionHeader({
  title,
  summary,
  actions,
}: {
  title: string;
  summary?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        {summary && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
            {summary}
          </span>
        )}
        {actions}
      </div>
    </header>
  );
}
