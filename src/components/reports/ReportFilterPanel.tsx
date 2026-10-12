"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

export interface ReportFilterOption {
  label: string;
  value: string;
}

export interface ReportFilterDefinition {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: ReportFilterOption[];
}

interface ReportFilterPanelProps {
  filters: Record<string, string>;
  definitions: ReportFilterDefinition[];
  onSearch: (filters: Record<string, string>) => void;
  onClear: () => void;
  title?: string;
  description?: string;
}

export function ReportFilterPanel({
  filters,
  definitions,
  onSearch,
  onClear,
  title = "Filtros del reporte",
  description = "Combiná criterios para acotar los resultados.",
}: ReportFilterPanelProps) {
  const [draft, setDraft] = useState(filters);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(draft);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {definitions.map((definition) => (
          <label key={definition.key} className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {definition.label}
            {definition.type === "select" ? (
              <select
                value={draft[definition.key] ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, [definition.key]: event.target.value }))}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Todos</option>
                {definition.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : (
              <input
                type={definition.type ?? "text"}
                value={draft[definition.key] ?? ""}
                placeholder={definition.placeholder}
                min={definition.min}
                max={definition.max}
                step={definition.step}
                onChange={(event) => setDraft((current) => ({ ...current, [definition.key]: event.target.value }))}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            )}
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button type="button" onClick={onClear} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
          Limpiar filtros
        </Button>
        <Button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700">
          Buscar
        </Button>
      </div>
    </form>
  );
}
