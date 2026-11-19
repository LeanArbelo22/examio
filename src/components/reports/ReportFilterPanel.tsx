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
  primaryKeys?: string[];
}

export function ReportFilterPanel({
  filters,
  definitions,
  onSearch,
  onClear,
  title = "Filtros del reporte",
  description,
  primaryKeys,
}: ReportFilterPanelProps) {
  const [draft, setDraft] = useState(filters);
  const primary = primaryKeys ? definitions.filter((field) => primaryKeys.includes(field.key)) : definitions;
  const advanced = primaryKeys ? definitions.filter((field) => !primaryKeys.includes(field.key)) : [];
  const advancedCount = advanced.filter((field) => Boolean(filters[field.key])).length;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(draft);
  };

  const renderField = (definition: ReportFilterDefinition) => (
          <label key={definition.key} className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-600">
            {definition.label}
            {definition.type === "select" ? (
              <select
                value={draft[definition.key] ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, [definition.key]: event.target.value }))}
                className="h-11 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
                className="h-11 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            )}
          </label>
  );

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {primary.map(renderField)}
      </div>
      {advanced.length > 0 && (
        <details open={advancedCount > 0 || undefined} className="mt-4 border-t border-slate-100 pt-3">
          <summary className="w-fit cursor-pointer rounded py-2 text-sm font-semibold text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Más filtros{advancedCount > 0 ? ` · ${advancedCount} ${advancedCount === 1 ? "aplicado" : "aplicados"}` : ""}
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{advanced.map(renderField)}</div>
        </details>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button type="button" onClick={onClear} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Limpiar filtros
        </Button>
        <Button type="submit" className="min-h-11 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Buscar
        </Button>
      </div>
    </form>
  );
}
