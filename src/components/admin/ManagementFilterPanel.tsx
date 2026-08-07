import type { ReactNode } from "react";

const columns = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function ManagementFilterPanel({
  children,
  columnCount = 2,
}: {
  children: ReactNode;
  columnCount?: keyof typeof columns;
}) {
  return (
    <section
      aria-label="Filtros"
      className={`grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ${columns[columnCount]}`}
    >
      {children}
    </section>
  );
}
