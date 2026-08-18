"use client";

import type { ReactNode } from "react";
import type { OrdenDireccion } from "@/types/index";
import { Button } from "@/components/ui/Button";

export interface ReportColumn<T, TSort extends string> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  sortKey?: TSort;
  render: (row: T) => ReactNode;
}

interface ReportTableProps<T, TSort extends string> {
  columns: ReportColumn<T, TSort>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  sortBy: TSort;
  sortDirection: OrdenDireccion;
  onSort: (sortBy: TSort, direction: OrdenDireccion) => void;
  onRowClick?: (row: T) => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyMessage?: string;
  itemLabel?: string;
}

const alignClasses = { left: "text-left", center: "text-center", right: "text-right" };

export function ReportTable<T, TSort extends string>({
  columns,
  rows,
  rowKey,
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
  page,
  totalPages,
  total,
  onPageChange,
  emptyMessage = "No hay resultados para los filtros seleccionados.",
  itemLabel = "resultados",
}: ReportTableProps<T, TSort>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      {rows.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 rounded-full bg-slate-50 p-3 text-slate-400" aria-hidden="true">◎</div>
          <p className="text-sm font-semibold text-slate-600">Sin resultados</p>
          <p className="mt-1 text-xs text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/70">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={`px-4 py-3 font-bold uppercase tracking-wider text-slate-400 ${alignClasses[column.align ?? "left"]}`}>
                    {column.sortKey ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        onClick={() => onSort(column.sortKey!, sortBy === column.sortKey && sortDirection === "asc" ? "desc" : "asc")}
                        aria-label={`Ordenar por ${column.header}`}
                      >
                        {column.header}
                        <span aria-hidden="true">{sortBy === column.sortKey ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                      </button>
                    ) : column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  className={`border-b border-slate-50 transition last:border-0 ${onRowClick ? "cursor-pointer hover:bg-indigo-50/40 focus:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500" : ""}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3.5 text-slate-600 ${alignClasses[column.align ?? "left"]}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">{total.toLocaleString("es-AR")} {itemLabel} · Página {page} de {Math.max(totalPages, 1)}</p>
        <div className="flex gap-2">
          <Button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Anterior</Button>
          <Button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Siguiente</Button>
        </div>
      </footer>
    </div>
  );
}
