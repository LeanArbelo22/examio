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
  rowActionLabel?: (row: T) => string;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyMessage?: string;
  itemLabel?: string;
  minWidth?: number;
  selectedRowKey?: string | number | null;
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
  rowActionLabel,
  page,
  totalPages,
  total,
  onPageChange,
  emptyMessage = "No hay resultados para los filtros seleccionados.",
  itemLabel = "resultados",
  minWidth = 820,
  selectedRowKey,
}: ReportTableProps<T, TSort>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      {rows.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold text-slate-600">Sin resultados</p>
          <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-slate-600">{emptyMessage}</p>
        </div>
      ) : (
        <div role="region" aria-label={`Tabla de ${itemLabel}, desplazamiento horizontal`} tabIndex={0} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
          <table aria-label={`Tabla de ${itemLabel}`} style={{ minWidth }} className="w-full text-sm tabular-nums">
            <thead className="border-b border-slate-100 bg-slate-50/70">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} scope="col" aria-sort={column.sortKey && sortBy === column.sortKey ? sortDirection === "asc" ? "ascending" : "descending" : undefined} className={`px-4 py-2 font-semibold text-slate-700 ${alignClasses[column.align ?? "left"]}`}>
                    {column.sortKey ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        onClick={() => onSort(column.sortKey!, sortBy === column.sortKey && sortDirection === "asc" ? "desc" : "asc")}
                        aria-label={`Ordenar por ${column.header}`}
                      >
                        {column.header}
                        <span aria-hidden="true">{sortBy === column.sortKey ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                      </button>
                    ) : column.header}
                  </th>
                ))}
                {onRowClick && <th scope="col" className="px-4 py-2 text-right font-semibold text-slate-700">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-50 transition last:border-0 ${selectedRowKey === rowKey(row) ? "bg-indigo-50" : ""} ${onRowClick ? "cursor-pointer hover:bg-indigo-50/40" : ""}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3.5 text-slate-600 ${alignClasses[column.align ?? "left"]}`}>
                      {column.render(row)}
                    </td>
                  ))}
                  {onRowClick && <td className="px-4 py-3.5 text-right">
                    <button type="button" aria-label={rowActionLabel?.(row) ?? "Ver detalle"} aria-expanded={selectedRowKey !== undefined ? selectedRowKey === rowKey(row) : undefined} onClick={(event) => { event.stopPropagation(); onRowClick(row); }} className="min-h-11 whitespace-nowrap rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                      Ver detalle
                    </button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm tabular-nums text-slate-600">{total.toLocaleString("es-AR")} {itemLabel} · Página {page} de {Math.max(totalPages, 1)}</p>
        <div className="flex gap-2">
          <Button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Anterior</Button>
          <Button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Siguiente</Button>
        </div>
      </footer>
    </div>
  );
}
